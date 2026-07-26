// Thuna — skill-registry architecture types (frozen seams; all tracks implement to these)

export interface Contact { id: string; name: string; relation: string; }
export interface OrderItem { name: string; qty: number; customisations: string[]; price: number; }

export type TxnKind = 'order' | 'payment' | 'phone' | 'track';
export type TxnStatus = 'success' | 'paused' | 'refused' | 'handedoff';
export interface Txn { id: string; kind: TxnKind; summary: string; status: TxnStatus; ts: string; corrections: string[]; }
export interface Receipt extends Txn { familyNotified: boolean; }

// A governed Task Skill definition (data, not logic)
export type SafetyType = 'readback' | 'refuse_pattern' | 'mismatch_check';
export interface SafetyRule { id: string; type: SafetyType; pattern?: string; message: string; }
export interface SkillStep { id: string; prompt: string; field?: string; confirmBefore?: boolean; }
export interface TaskSkill {
  id: string;                       // ORDER_FOOD | SEND_PAYMENT | PHONE_HELP | TRACK_ORDER | GENERAL_HELP
  label: string;
  requiredFields: string[];
  steps: SkillStep[];
  safetyRules: SafetyRule[];
  completionCondition: string;
}

// Runtime session + response
export interface ScreenState {
  skillId?: string;
  step?: string;
  fields: Record<string, unknown>;
  candidates?: unknown[];
  status: 'idle' | 'awaiting_confirmation' | 'done' | 'refused' | 'paused' | 'handedoff';
}
export interface SessionCtx {
  skillId?: string;
  stepIndex: number;
  fields: Record<string, unknown>;
  correctionHistory: string[];
  pace: 'normal' | 'slow';
  preferences: Record<string, unknown>;   // e.g. { usualOrder: 'masala dosa, no chutney' }
}
export type EngineAction = 'route' | 'ask' | 'confirm' | 'complete' | 'refuse' | 'handoff' | 'repeat_slowly' | 'answer_question';
export interface EngineResponse {
  speak?: string;
  screen?: ScreenState;
  action?: EngineAction;
  skillId?: string;
  clearMic?: boolean;
}

// Intent router
export type RouteType = 'task' | 'question' | 'risky' | 'unsupported';
export interface RouteDecision { type: RouteType; skillId?: string; reason?: string; }
