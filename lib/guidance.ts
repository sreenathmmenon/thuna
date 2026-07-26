import type { TaskSkill, SessionCtx, ScreenState, SimulatedReceipt, EngineEvent } from './types';

const now = () => new Date().toISOString();

export function stepPrompt(skill: TaskSkill, ctx: SessionCtx): string {
  const step = skill.steps[ctx.stepIndex];
  if (!step) return skill.completionCondition;
  return ctx.pace === 'slow' ? `Slowly: ${step.prompt}` : step.prompt;
}

export function readback(skill: TaskSkill, ctx: SessionCtx): string {
  if (skill.handler?.readback) return skill.handler.readback(ctx);
  return Object.entries(ctx.fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
}

export function answerContextual(skill: TaskSkill, question: string, ctx: SessionCtx, screen: ScreenState): string | null {
  return skill.handler?.answerContextual?.(question, ctx, screen) ?? null;
}

export function buildScreen(skill: TaskSkill | undefined, ctx: SessionCtx): ScreenState {
  const status: ScreenState['status'] = ctx.awaitingConfirmation ? 'awaiting_confirmation' : 'idle';
  if (!skill) return { fields: ctx.fields, status };
  if (skill.handler?.buildScreen) return skill.handler.buildScreen(ctx);
  const step = skill.steps[ctx.stepIndex];
  return { skillId: skill.id, step: step?.id, fields: ctx.fields, status };
}

export function simulateReceipt(skill: TaskSkill, ctx: SessionCtx): SimulatedReceipt {
  return {
    simulated: true,
    skillId: skill.id,
    summary: skill.handler?.readback?.(ctx) ?? Object.entries(ctx.fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', '),
    fields: { ...ctx.fields },
    corrections: [...ctx.correctionHistory],
    ts: now(),
  };
}
