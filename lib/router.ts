import type { RouteDecision, SessionCtx } from './types';
import { allSkillIds } from './skills/registry';

// Intent Router: classify the elder's utterance into task | question | risky | unsupported.
// Safety-first: credential patterns are ALWAYS refused, before any model call.
const RISKY = /\b(otp|pin|cvv|card number|password|secret)\b/i;
const RECOVERY = /^(wait|stop|go back|repeat|slower|i cannot find|where is)/i;

// Cheap deterministic safety + recovery checks (run before the LLM classifier)
export function quickCheck(text: string): RouteDecision | null {
  if (RISKY.test(text)) return { type: 'risky', reason: 'sensitive credential' };
  return null;
}
export function isRecovery(text: string): boolean { return RECOVERY.test(text.trim()); }

// LLM-backed classifier. askLLM(prompt) -> raw model text; we parse to a RouteDecision.
// Track A implements the real prompt; this is the contract.
export async function routeIntent(
  utterance: string,
  ctx: SessionCtx,
  askLLM: (prompt: string) => Promise<string>,
): Promise<RouteDecision> {
 const unsafe = quickCheck(utterance);
  if (unsafe) return unsafe;
  const ids = allSkillIds().join(', ');
  const prompt = `Classify this elder's request into ONE of: ${ids}, GENERAL_HELP (a question/explanation), or UNSUPPORTED.
Respond with only the label.
Request: "${utterance}"
Current skill (if any): ${ctx.skillId || 'none'}`;
  const label = (await askLLM(prompt)).trim().toUpperCase();
  if (allSkillIds().includes(label) || label === 'GENERAL_HELP') return { type: label === 'GENERAL_HELP' ? 'question' : 'task', skillId: label };
  return { type: 'unsupported', reason: `unmatched: ${label}` };
}
