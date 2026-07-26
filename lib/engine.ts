import type {
  EngineResult, EngineResponse, SessionState, SessionCtx, ScreenState,
  ParsedCommand, EngineEvent, TaskSkill,
} from './types';
import { quickCheck } from './router';
import { routeByText, recoveryType, isConfirmation, isContextualQuestion } from './command-parser';
import { getSkill } from './skills/registry';
import { stepPrompt, readback, answerContextual, buildScreen, simulateReceipt } from './guidance';

const now = () => new Date().toISOString();
const ev = (type: string, detail: string): EngineEvent => ({ type, ts: now(), detail });
const ok = (response: EngineResponse, ctx: SessionCtx, screen: ScreenState, events: EngineEvent[]): EngineResult =>
  ({ response, nextCtx: ctx, nextScreen: screen, events });

function cloneCtx(ctx: SessionCtx): SessionCtx {
  return { ...ctx, fields: { ...ctx.fields }, correctionHistory: [...ctx.correctionHistory], preferences: { ...ctx.preferences } };
}

// advance to the readback/confirm step if all required fields are present; else step to first missing.
function advanceOrConfirm(skill: TaskSkill, ctx: SessionCtx): SessionCtx {
  const missing = skill.requiredFields.filter(f => ctx.fields[f] == null);
  if (missing.length === 0) {
    const rbIndex = skill.steps.findIndex(s => s.confirmBefore);
    return { ...ctx, stepIndex: rbIndex >= 0 ? rbIndex : ctx.stepIndex, awaitingConfirmation: true };
  }
  const stepForMissing = skill.steps.findIndex(s => s.field && s.field === missing[0]);
  return { ...ctx, stepIndex: stepForMissing >= 0 ? stepForMissing : ctx.stepIndex, awaitingConfirmation: false };
}

// The generic, skill-driven engine. Pure: returns a proposed next state; never mutates the store.
export function handle(utterance: string, state: SessionState): EngineResult {
  const text = (utterance || '').trim();
  let ctx = cloneCtx(state.ctx);
  let screen: ScreenState = { ...state.screen, fields: ctx.fields };
  const events: EngineEvent[] = [];
  let response: EngineResponse = {};

  // 1. SAFETY: refuse OTP/PIN/CVV before any processing or model call.
  const unsafe = quickCheck(text);
  if (unsafe) {
    events.push(ev('refuse_credential', unsafe.reason || 'sensitive credential'));
    response = { action: 'refuse', speak: "I can't accept or ask for an OTP, PIN, or CVV. Please never share those. We can continue your task — what would you like to do next?", screen };
    return ok(response, ctx, screen, events);
  }

  // ACTIVE SKILL PATH
  if (ctx.skillId) {
    const skill = getSkill(ctx.skillId)!;

    // 2. Correction / field update via skill handler (checked before recovery so "wait, plain dosa" corrects).
    const parsed = skill.handler?.parseCommand?.(text, ctx) ?? null;
    if (parsed?.patch && Object.keys(parsed.patch).length > 0) {
      ctx = { ...ctx, fields: { ...ctx.fields, ...parsed.patch } };
      const summ = Object.keys(parsed.patch).join(', ');
      ctx = { ...ctx, correctionHistory: [...ctx.correctionHistory, summ] };
      events.push(ev('correction', summ));
      ctx = advanceOrConfirm(skill, ctx);
      screen = buildScreen(skill, ctx);
      response = ctx.awaitingConfirmation
        ? { action: 'confirm', speak: `${readback(skill, ctx)} Shall I place the order? Say "yes" to confirm.`, screen }
        : { action: 'ask', speak: stepPrompt(skill, ctx), screen };
      return ok(response, ctx, screen, events);
    }

    // 3. Recovery (bare WAIT / REPEAT_SLOWLY / GO_BACK / STOP — only when no correction was parsed).
    const rt = recoveryType(text);
    if (rt) {
      events.push(ev('recovery', rt));
      if (rt === 'stop') {
        screen = { ...screen, status: 'handedoff' };
        response = { action: 'handoff', speak: "Stopping here. You can come back anytime, or I can hand this to a family member — just say so.", screen };
      } else if (rt === 'go_back') {
        ctx = { ...ctx, stepIndex: Math.max(0, ctx.stepIndex - 1) };
        screen = buildScreen(skill, ctx);
        response = { action: 'go_back', speak: stepPrompt(skill, ctx), screen };
      } else if (rt === 'repeat_slowly') {
        ctx = { ...ctx, pace: 'slow' };
        screen = buildScreen(skill, ctx);
        response = { action: 'repeat_slowly', speak: stepPrompt(skill, ctx), screen };
      } else { // wait
        screen = { ...screen, status: 'paused' };
        response = { action: 'handoff', speak: "Paused. Take your time — say 'continue' when you're ready.", screen };
      }
      return ok(response, ctx, screen, events);
    }

    // 4. Contextual question (answered from current screen context; works even at the confirm step).
    if (isContextualQuestion(text)) {
      const ans = answerContextual(skill, text, ctx, screen);
      events.push(ev('contextual_question', text));
      response = { action: 'answer_question', speak: ans || "I'm not sure about that, but we can keep going. What would you like to do?", screen };
      return ok(response, ctx, screen, events);
    }

    // 5. Awaiting confirmation: only a clear confirmation completes; silence/vague never counts.
    if (ctx.awaitingConfirmation) {
      if (isConfirmation(text)) {
        ctx = { ...ctx, awaitingConfirmation: false };
        screen = { ...screen, status: 'done' };
        const receipt = simulateReceipt(skill, ctx);
        events.push(ev('confirmation', 'explicit yes'));
        events.push(ev('complete', receipt.summary));
        response = { action: 'complete', speak: `SIMULATED ORDER SUCCESS — ${receipt.summary}. (This is a simulated result — no real order was placed.)`, screen };
        return ok(response, ctx, screen, events);
      }
      events.push(ev('confirmation_refused', 'not a clear confirmation'));
      response = { action: 'confirm', speak: `I need a clear "yes" to confirm. Your order: ${readback(skill, ctx)}. Say "yes" to place it, or tell me what to change.`, screen };
      return ok(response, ctx, screen, events);
    }

    // 6. Otherwise: treat as advancing the current step (typed answer to a step prompt).
    const step = skill.steps[ctx.stepIndex];
    if (step?.field && ctx.fields[step.field] == null) ctx.fields[step.field] = text;
    ctx = { ...ctx, stepIndex: ctx.stepIndex + 1 };
    events.push(ev('step_advance', `→ step ${ctx.stepIndex}`));
    ctx = advanceOrConfirm(skill, ctx);
    screen = buildScreen(skill, ctx);
    response = ctx.awaitingConfirmation
      ? { action: 'confirm', speak: `${readback(skill, ctx)} Shall I place the order? Say "yes" to confirm.`, screen }
      : { action: 'ask', speak: stepPrompt(skill, ctx), screen };
    return ok(response, ctx, screen, events);
  }

  // START PATH — no active skill
  const route = routeByText(text);
  if (route.type !== 'task' || !route.skillId) {
    events.push(ev('unsupported', route.reason || 'no skill matched'));
    response = { action: 'refuse', speak: "I can help with ordering food, sending a payment, or phone settings. What would you like to do?", screen };
    return ok(response, ctx, screen, events);
  }
  const skill = getSkill(route.skillId)!;
  ctx = { ...ctx, skillId: skill.id, stepIndex: 0, fields: {}, pace: 'normal', awaitingConfirmation: false };
  events.push(ev('start_skill', skill.id));

  // restore preference FIRST (memory), then parse the same utterance for corrections against the restored state.
  const parsed = skill.handler?.parseCommand?.(text, ctx) ?? null;
  if (parsed?.restorePreference) {
    const restored = skill.handler?.restorePreference?.(ctx) ?? null;
    if (restored) {
      ctx = { ...ctx, fields: { ...ctx.fields, ...restored } };
      events.push(ev('restore_preference', JSON.stringify(restored)));
    }
  }
  // re-parse against the restored order so "no chutney" applies to the usual order, not an empty one.
  const reparsed = skill.handler?.parseCommand?.(text, ctx) ?? null;
  if (reparsed?.patch && Object.keys(reparsed.patch).length > 0) {
    ctx = { ...ctx, fields: { ...ctx.fields, ...reparsed.patch } };
    const summ = Object.keys(reparsed.patch).join(', ');
    ctx = { ...ctx, correctionHistory: [...ctx.correctionHistory, summ] };
    events.push(ev('correction', summ));
  }
  ctx = advanceOrConfirm(skill, ctx);
  screen = buildScreen(skill, ctx);
  response = ctx.awaitingConfirmation
    ? { action: 'confirm', speak: `${readback(skill, ctx)} Shall I place the order? Say "yes" to confirm.`, screen }
    : { action: 'ask', speak: stepPrompt(skill, ctx), screen };
  return ok(response, ctx, screen, events);
}
