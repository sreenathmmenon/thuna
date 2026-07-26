import type { SessionState, SessionCtx, ScreenState, EngineEvent, EngineResult } from './types';
import { handle, handleInterpreted } from './engine';
import type { ParsedCommand } from './types';

const store = new Map<string, SessionState>();

export function emptyState(): SessionState {
  return {
    ctx: { stepIndex: 0, fields: {}, correctionHistory: [], pace: 'normal', preferences: {}, awaitingConfirmation: false },
    history: [],
    screen: { fields: {}, status: 'idle' },
  };
}
export function getOrCreate(sessionId: string): SessionState {
  if (!store.has(sessionId)) store.set(sessionId, emptyState());
  return store.get(sessionId)!;
}
export function getState(sessionId: string): SessionState | undefined { return store.get(sessionId); }

// The ONLY mutator. The engine returns a proposed next state (pure); the store commits it.
export function commit(sessionId: string, result: EngineResult): void {
  const prev = store.get(sessionId);
  const history = prev ? [...prev.history, ...result.events] : [...result.events];
  store.set(sessionId, { ctx: result.nextCtx, screen: result.nextScreen, history });
}

// Run the engine on a session and commit. Returns the engine result (incl. response).
export function process(sessionId: string, utterance: string): EngineResult {
  const state = getOrCreate(sessionId);
  const result = handle(utterance, state);
  commit(sessionId, result);
  return result;
}

export function processInterpreted(
  sessionId: string,
  utterance: string,
  command: ParsedCommand,
): EngineResult {
  const state = getOrCreate(sessionId);
  const result = handleInterpreted(utterance, command, state);
  commit(sessionId, result);
  return result;
}

// Seed memory (test setup) — not the model.
export function setPreference(sessionId: string, key: string, value: unknown): void {
  const state = getOrCreate(sessionId);
  state.ctx.preferences[key] = value;
}
export function getHistory(sessionId: string): EngineEvent[] { return store.get(sessionId)?.history ?? []; }
export function reset(sessionId: string): void { store.set(sessionId, emptyState()); }
