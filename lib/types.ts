// Thuna — skill-registry architecture types

export interface Contact { id: string; name: string; relation: string; }
export interface OrderItem { name: string; qty: number; customisations: string[]; price: number; }

export type TxnKind = 'order' | 'payment' | 'phone' | 'track';
export type TxnStatus = 'success' | 'paused' | 'refused' | 'handedoff';
export interface Txn { id: string; kind: TxnKind; summary: string; status: TxnStatus; ts: string; corrections: string[]; }
export interface Receipt extends Txn { familyNotified: boolean; }

export type SafetyType = 'readback' | 'refuse_pattern' | 'mismatch_check';
export interface SafetyRule { id: string; type: SafetyType; pattern?: string; message: string; }
export interface SkillStep { id: string; prompt: string; field?: string; confirmBefore?: boolean; }

// Skill-specific logic the GENERIC engine delegates to (keeps ORDER_FOOD logic out of the engine).
export type CommandKind = 'start' | 'correction' | 'contextual_question' | 'confirmation' | 'recovery' | 'refuse' | 'unknown';
export interface ParsedCommand {
  kind: CommandKind;
  skillId?: string;
  patch?: Record<string, unknown>;        // field overrides (skill computes structured values)
  question?: string;
  recoveryType?: 'wait' | 'repeat_slowly' | 'go_back' | 'stop';
  restorePreference?: boolean;
  reason?: string;
}
export interface SkillHandler {
  parseCommand?(utterance: string, ctx: SessionCtx): ParsedCommand | null;
  answerContextual?(question: string, ctx: SessionCtx, screen: ScreenState): string | null;
  restorePreference?(ctx: SessionCtx): Record<string, unknown> | null;
  readback?(ctx: SessionCtx): string;
  buildScreen?(ctx: SessionCtx): ScreenState;
}

export interface TaskSkill {
  id: string;
  label: string;
  requiredFields: string[];
  steps: SkillStep[];
  safetyRules: SafetyRule[];
  completionCondition: string;
  handler?: SkillHandler;
}

export interface ScreenState {
  skillId?: string;
  step?: string;
  fields: Record<string, unknown>;
  candidates?: unknown[];
  deliveryFee?: number;
  total?: number;
  status: 'idle' | 'awaiting_confirmation' | 'done' | 'refused' | 'paused' | 'handedoff';
}
export interface SessionCtx {
  skillId?: string;
  stepIndex: number;
  fields: Record<string, unknown>;
  correctionHistory: string[];
  pace: 'normal' | 'slow';
  preferences: Record<string, unknown>;
  awaitingConfirmation: boolean;
}
export type EngineAction = 'route' | 'ask' | 'confirm' | 'complete' | 'refuse' | 'handoff' | 'repeat_slowly' | 'answer_question' | 'go_back';
export interface EngineResponse {
  speak?: string;
  screen?: ScreenState;
  action?: EngineAction;
  skillId?: string;
  clearMic?: boolean;
}

export type RouteType = 'task' | 'question' | 'risky' | 'unsupported';
export interface RouteDecision { type: RouteType; skillId?: string; reason?: string; }

// Engine purity: the model never mutates session state; the engine returns a proposed next state.
export interface EngineEvent { type: string; ts: string; detail: string; }
export interface SessionState {
  ctx: SessionCtx;
  history: EngineEvent[];
  screen: ScreenState;
}
export interface EngineResult {
  response: EngineResponse;
  nextCtx: SessionCtx;
  nextScreen: ScreenState;
  events: EngineEvent[];
}
export interface SimulatedReceipt {
  simulated: true;            // always labelled simulated
  skillId: string;
  summary: string;
  fields: Record<string, unknown>;
  corrections: string[];
  ts: string;
}
