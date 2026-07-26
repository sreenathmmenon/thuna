import { isConfirmation, isContextualQuestion, recoveryType, routeByText } from '../command-parser';
import { quickCheck } from '../router';
import { completeChat } from '../sarvam';
import { getSkill } from '../skills/registry';
import { allSkillIds } from '../skills/registry';
import type { ParsedCommand, SessionCtx } from '../types';
import { modelCommandSchema } from './schemas';

export interface InterpretationContext {
  transcript: string;
  activeSession: Record<string, unknown>;
  currentTaskOrRoutine?: string | null;
  currentStep?: string | number | null;
  confirmedFields: Record<string, unknown>;
  screenContext: Record<string, unknown>;
  allowedActions: ParsedCommand['kind'][];
}

export interface InterpretationResult extends ParsedCommand {
  confidence: number;
  latencyMs: number;
  demoFallback: boolean;
}

export type ChatInterpreter = (systemPrompt: string, userPrompt: string) => Promise<string>;

const SYSTEM_PROMPT = `You interpret an elder's spoken request for Thuna.
Return exactly one strict JSON object and no markdown.
The deterministic application, not you, owns all state changes.
Never claim that an order, payment, reminder, or other action has completed.
Never request or reproduce an OTP, PIN, CVV, card number, password, or banking credential.
Allowed kind values: start, correction, contextual_question, confirmation, recovery, refuse, unknown.
Allowed skillId values: ORDER_FOOD, SEND_PAYMENT, PHONE_HELP, TRACK_ORDER, GENERAL_HELP, UNSUPPORTED.
Schema example for a food start:
{"kind":"start","skillId":"ORDER_FOOD","restorePreference":true,"confidence":0.95}
Include only relevant schema keys. Never invent another kind or skillId. Use a patch only to propose fields explicitly corrected by the utterance.`;

function safeContext(value: unknown, key = ''): unknown {
  if (/\b(otp|pin|cvv|password|secret|card.?number|credential)\b/i.test(key)) return '[REDACTED]';
  if (typeof value === 'string') {
    return /\b(otp|pin|cvv|password|card number)\b/i.test(value) ? '[REDACTED]' : value.slice(0, 1000);
  }
  if (Array.isArray(value)) return value.slice(0, 100).map(item => safeContext(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([childKey, child]) => [childKey, safeContext(child, childKey)]),
    );
  }
  return value;
}

function sessionContext(input: InterpretationContext): SessionCtx {
  const nested = input.activeSession.ctx;
  const raw = nested && typeof nested === 'object'
    ? nested as Record<string, unknown>
    : input.activeSession;
  return {
    skillId: typeof raw.skillId === 'string'
      ? raw.skillId
      : input.currentTaskOrRoutine || undefined,
    stepIndex: typeof raw.stepIndex === 'number' ? raw.stepIndex : 0,
    fields: raw.fields && typeof raw.fields === 'object'
      ? { ...raw.fields as Record<string, unknown> }
      : { ...input.confirmedFields },
    correctionHistory: Array.isArray(raw.correctionHistory)
      ? raw.correctionHistory.filter((item): item is string => typeof item === 'string')
      : [],
    pace: raw.pace === 'slow' ? 'slow' : 'normal',
    preferences: raw.preferences && typeof raw.preferences === 'object'
      ? { ...raw.preferences as Record<string, unknown> }
      : {},
    awaitingConfirmation: raw.awaitingConfirmation === true,
  };
}

export function deterministicInterpret(input: InterpretationContext): ParsedCommand {
  const text = input.transcript.trim();
  const unsafe = quickCheck(text);
  if (unsafe) return { kind: 'refuse', reason: unsafe.reason || 'sensitive credential' };

  const ctx = sessionContext(input);
  if (ctx.skillId) {
    const skill = getSkill(ctx.skillId);
    const skillCommand = skill?.handler?.parseCommand?.(text, ctx);
    if (skillCommand) return skillCommand;
    const recovery = recoveryType(text);
    if (recovery) return { kind: 'recovery', recoveryType: recovery };
    if (isContextualQuestion(text)) return { kind: 'contextual_question', question: text };
    if (ctx.awaitingConfirmation && isConfirmation(text)) return { kind: 'confirmation' };
  }

  const route = routeByText(text);
  if (route.type === 'task' && route.skillId) {
    return { kind: 'start', skillId: route.skillId };
  }
  if (route.type === 'question') return { kind: 'contextual_question', question: text };
  return { kind: 'unknown', reason: route.reason || 'no deterministic match' };
}

function promptFor(input: InterpretationContext): string {
  return JSON.stringify({
    transcript: input.transcript,
    activeSession: safeContext(input.activeSession),
    currentTaskOrRoutine: input.currentTaskOrRoutine,
    currentStep: input.currentStep,
    confirmedFields: safeContext(input.confirmedFields),
    screenContext: safeContext(input.screenContext),
    allowedActions: input.allowedActions,
  });
}

function parseModelCommand(raw: string, allowed: ParsedCommand['kind'][]): (ParsedCommand & { confidence: number }) | null {
  try {
    const trimmed = raw.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end < start) return null;
    const candidate = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    for (const [key, value] of Object.entries(candidate)) {
      if (value === null) delete candidate[key];
    }
    const result = modelCommandSchema.safeParse(candidate);
    if (!result.success || !allowed.includes(result.data.kind)) return null;
    if (result.data.skillId && !allSkillIds().includes(result.data.skillId)) return null;
    if (result.data.kind === 'start' && !result.data.skillId) return null;
    if (result.data.kind === 'correction' && !result.data.patch) return null;
    if (result.data.kind === 'recovery' && !result.data.recoveryType) return null;
    return result.data as ParsedCommand & { confidence: number };
  } catch {
    return null;
  }
}

/**
 * Interprets text without changing a session. Unsafe credential requests return
 * before chat is invoked. Invalid JSON gets one repair retry, then deterministic fallback.
 */
export async function interpretTranscript(
  input: InterpretationContext,
  askChat: ChatInterpreter = completeChat,
): Promise<InterpretationResult> {
  const started = performance.now();
  const unsafe = quickCheck(input.transcript);
  if (unsafe) {
    return {
      kind: 'refuse',
      reason: unsafe.reason || 'sensitive credential',
      confidence: 1,
      latencyMs: Math.round(performance.now() - started),
      demoFallback: false,
    };
  }

  const userPrompt = promptFor(input);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const suffix = attempt === 0
        ? ''
        : '\nYour previous response was invalid. Return one valid JSON object matching the schema exactly.';
      const parsed = parseModelCommand(await askChat(SYSTEM_PROMPT, userPrompt + suffix), input.allowedActions);
      if (parsed) {
        const { confidence, ...command } = parsed;
        return {
          ...command,
          confidence,
          latencyMs: Math.round(performance.now() - started),
          demoFallback: false,
        };
      }
    } catch {
      // A recoverable upstream error uses the same safe deterministic fallback.
      break;
    }
  }

  return {
    ...deterministicInterpret(input),
    confidence: 0.65,
    latencyMs: Math.round(performance.now() - started),
    demoFallback: true,
  };
}
