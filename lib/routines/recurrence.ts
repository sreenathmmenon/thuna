import type { RecurrenceRule } from './types';

function positiveInterval(value: number | undefined, maximum: number): number {
  return Number.isInteger(value) && value! > 0 && value! <= maximum ? value! : 1;
}

export function nextOccurrence(afterIso: string, rule: RecurrenceRule): string | null {
  if (rule.frequency === 'ONCE') return null;
  const current = new Date(afterIso);
  if (!Number.isFinite(current.getTime())) return null;
  const next = new Date(current);

  if (rule.frequency === 'DAILY') {
    next.setUTCDate(next.getUTCDate() + positiveInterval(rule.interval, 365));
    return next.toISOString();
  }

  if (rule.frequency === 'MONTHLY') {
    const wanted = Math.min(28, Math.max(1, rule.dayOfMonth ?? current.getUTCDate()));
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + positiveInterval(rule.interval, 12));
    next.setUTCDate(wanted);
    return next.toISOString();
  }

  const interval = positiveInterval(rule.interval, 52);
  const weekdays = (rule.weekdays?.length ? rule.weekdays : [current.getUTCDay()])
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  for (let offset = 1; offset <= 7 * interval + 7; offset += 1) {
    const candidate = new Date(current);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    if (weekdays.includes(candidate.getUTCDay())) return candidate.toISOString();
  }
  return null;
}
