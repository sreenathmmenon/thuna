import type { RouteDecision } from './types';

// Clear affirmative only. Silence / vague / recovery words NEVER count as confirmation.
const CONFIRM = /^(yes|yep|yeah|confirm|confirmed|correct|okay|ok|haan|right|sure|place it|go ahead|please do|do it)\b/i;
const VAGUE = /^(wait|stop|no|repeat|slowly|go back|slower|i cannot|maybe|um|uh|hmm|not sure|actually)\b/i;
const CONTEXTUAL = /^(why|what|where|how|when|who|which|is|are|can you|explain|tell me why)\b/i;

export function isConfirmation(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;                 // silence
  if (VAGUE.test(t)) return false;      // vague / recovery never confirms
  return CONFIRM.test(t);
}

export function isContextualQuestion(text: string): boolean {
  return CONTEXTUAL.test(text.trim());
}

export function recoveryType(text: string): 'wait' | 'repeat_slowly' | 'go_back' | 'stop' | null {
  const t = text.trim().toLowerCase();
  if (/^(stop|cancel|quit|exit)\b/.test(t)) return 'stop';
  if (/(repeat|slower|slowly|again|say it again)\b/.test(t)) return 'repeat_slowly';
  if (/(go back|back|previous)\b/.test(t)) return 'go_back';
  if (/(wait|pause|hold|i cannot find|where is)\b/.test(t)) return 'wait';
  return null;
}

// Typed-mode keyword routing (no LLM). Maps an utterance to a skill id deterministically.
export function routeByText(utterance: string): RouteDecision {
  const t = utterance.toLowerCase();
  if (/(track|where is|status).*(order|delivery|parcel)|\bthuna[\s-]?100[1-4]\b/.test(t)) {
    return { type: 'task', skillId: 'TRACK_ORDER' };
  }
  if (/(order|food|dosa|eat|restaurant|swiggy|zomato|meal|hungry|lunch|dinner)/.test(t)) return { type: 'task', skillId: 'ORDER_FOOD' };
  if (/(send|transfer|pay|payment|money|upi|gpay|rupees|rs\.?\s*\d)/.test(t)) return { type: 'task', skillId: 'SEND_PAYMENT' };
  if (/(phone|setting|font|text size|volume|wifi|brightness|letters|bigger|smaller|screen)/.test(t)) return { type: 'task', skillId: 'PHONE_HELP' };
  if (/(what is|explain|meaning|qr code|airplane mode|location permission|payment pending|\bcvv\b)/.test(t)) {
    return { type: 'task', skillId: 'GENERAL_HELP' };
  }
  return { type: 'unsupported', reason: 'no skill matched' };
}
