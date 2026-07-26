import type {
  CandidateField,
  CaptureSource,
  FieldSource,
  InboxCandidate,
  InboxClass,
  LifeEventType,
  LoopTrigger,
} from './types';

export function classifyContinuityInput(text: string): InboxClass {
  const input = text.trim().toLowerCase();
  if (/^(what|why|how|when|who|which|can you explain)\b/.test(input) || input.endsWith('?')) {
    return 'QUESTION';
  }
  if (/\b(ask|contact|call|tell)\b.*\b(sree|family|daughter|son|brother|sister)\b/.test(input)) {
    return 'FAMILY_REQUEST';
  }
  if (/\b(bill|electricity|water bill|phone bill|amount due|due date)\b/.test(input)) {
    return 'BILL';
  }
  if (/\b(wedding|invitation|birthday|appointment|anniversary|service visit|renewal|family event)\b/.test(input)) {
    return 'LIFE_EVENT';
  }
  if (/\b(remind me after|after dinner|continue .*(tomorrow|later)|follow up|unfinished|promise)\b/.test(input)) {
    return 'PENDING_PROMISE';
  }
  if (/\b(every day|every morning|every evening|medicine reminder|water reminder)\b/.test(input)) {
    return 'ROUTINE';
  }
  if (/\b(order|payment|phone setting|wi-?fi|track order)\b/.test(input)) {
    return 'TASK';
  }
  return 'UNSUPPORTED';
}

function fieldSource(source: CaptureSource): FieldSource {
  if (source === 'VOICE') return 'ELDER_SPEECH';
  if (source === 'DOCUMENT') return 'DOCUMENT_EXTRACTION';
  if (source === 'FAMILY') return 'FAMILY_ENTRY';
  return 'ELDER_TYPED';
}

function isoDateFrom(text: string): string | null {
  const exact = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (exact && !Number.isNaN(Date.parse(exact))) {
    return new Date(`${exact}T09:00:00`).toISOString();
  }
  const named = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,\s*(20\d{2}))?/i,
  );
  if (!named) return null;
  const parsed = new Date(`${named[1]} ${named[2]}, ${named[3] ?? new Date().getFullYear()}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function addField(
  fields: CandidateField[],
  key: string,
  value: CandidateField['value'],
  source: FieldSource,
  rawText: string,
  confidence = 0.95,
  unit?: string,
): void {
  if (value === null || value === '') return;
  fields.push({
    key,
    value,
    source,
    rawText,
    confidence,
    status: 'EXTRACTED',
    ...(unit ? { unit } : {}),
  });
}

export function lifeEventTypeFor(text: string, classification: InboxClass): LifeEventType {
  const input = text.toLowerCase();
  if (classification === 'BILL') return 'BILL';
  if (input.includes('wedding')) return 'WEDDING';
  if (input.includes('birthday')) return 'BIRTHDAY';
  if (input.includes('appointment')) return 'APPOINTMENT';
  if (input.includes('delivery')) return 'DELIVERY';
  if (input.includes('renewal')) return 'RENEWAL';
  if (input.includes('service visit')) return 'SERVICE_VISIT';
  return 'FAMILY_EVENT';
}

export function triggerForPromise(text: string, now: Date): LoopTrigger {
  const input = text.toLowerCase();
  if (input.includes('after dinner')) {
    const at = new Date(now);
    at.setHours(20, 30, 0, 0);
    if (at <= now) at.setDate(at.getDate() + 1);
    return { kind: 'AFTER_DINNER', at: at.toISOString(), stated: 'after dinner, around 8:30 PM' };
  }
  if (input.includes('tomorrow')) {
    const at = new Date(now);
    at.setDate(at.getDate() + 1);
    at.setHours(9, 0, 0, 0);
    return { kind: 'TOMORROW', at: at.toISOString(), stated: 'tomorrow morning' };
  }
  return { kind: 'MANUAL', stated: 'when you ask for it' };
}

export function fieldsForInput(
  text: string,
  classification: InboxClass,
  source: CaptureSource,
): CandidateField[] {
  const fields: CandidateField[] = [];
  const origin = fieldSource(source);
  const date = isoDateFrom(text);
  if (date) addField(fields, 'date', date, origin, text);

  if (classification === 'BILL') {
    const amount = text.match(/(?:rs\.?|₹|rupees?)\s*(\d+(?:\.\d+)?)/i)?.[1];
    const provider = text.match(/\b(electricity|water|phone|internet|gas)\b/i)?.[1];
    if (provider) addField(fields, 'provider', provider, origin, provider);
    if (amount) addField(fields, 'amount', Number(amount), origin, amount, 0.98, 'INR');
  } else if (classification === 'LIFE_EVENT') {
    const venue = text.match(/\b(?:at|in)\s+([A-Z][A-Za-z ]{2,30})(?:\s+on|\s*$)/)?.[1];
    const people = text.match(/\b([A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+)?)'?s?\s+wedding/)?.[1];
    if (people) addField(fields, 'people', people, origin, people);
    if (venue) addField(fields, 'venue', venue.trim(), origin, venue.trim(), 0.85);
  }
  return fields;
}

function titleFor(text: string, classification: InboxClass): string {
  if (classification === 'BILL') {
    const provider = text.match(/\b(electricity|water|phone|internet|gas)\b/i)?.[1];
    return `${provider ? `${provider[0].toUpperCase()}${provider.slice(1)} ` : ''}bill`;
  }
  if (classification === 'LIFE_EVENT') {
    if (/wedding/i.test(text)) return 'Wedding invitation';
    if (/birthday/i.test(text)) return 'Birthday';
    if (/appointment/i.test(text)) return 'Appointment';
    return 'Family event';
  }
  if (classification === 'PENDING_PROMISE') {
    return /wi-?fi/i.test(text) ? 'Continue Wi-Fi setup' : 'Pending promise';
  }
  if (classification === 'FAMILY_REQUEST') return 'Ask family';
  return classification.toLowerCase().replace('_', ' ');
}

export function renderCandidateReadback(candidate: Pick<InboxCandidate, 'classification' | 'title' | 'fields'>): string {
  const details = candidate.fields
    .map((field) => `${field.key}: ${field.value}${field.unit ? ` ${field.unit}` : ''}`)
    .join(', ');
  const base = details ? `${candidate.title} — ${details}.` : `${candidate.title}.`;
  return `${base} Shall I remember this?`;
}

export function buildCandidate(
  id: string,
  text: string,
  source: CaptureSource,
  now: Date,
): InboxCandidate {
  const classification = classifyContinuityInput(text);
  const candidate: InboxCandidate = {
    id,
    capturedText: text.trim(),
    classification,
    title: titleFor(text, classification),
    fields: fieldsForInput(text, classification, source),
    source: { source, capturedAt: now.toISOString() },
    confidence: 'CANDIDATE',
    state: 'CANDIDATE',
    readback: '',
    revision: 1,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
  candidate.readback = renderCandidateReadback(candidate);
  return candidate;
}
