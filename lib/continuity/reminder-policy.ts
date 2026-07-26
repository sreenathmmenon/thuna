import type {
  CandidateField,
  LifeEventType,
  QuietHours,
  ReminderOccurrence,
} from './types';

interface ReminderRule {
  offsetDays: number;
  hour: number;
  purpose: string;
  priority: number;
}

const POLICIES: Record<LifeEventType, readonly ReminderRule[]> = {
  WEDDING: [
    { offsetDays: -7, hour: 9, purpose: 'Wedding coming up in one week.', priority: 40 },
    { offsetDays: -1, hour: 18, purpose: 'Wedding is tomorrow.', priority: 70 },
    { offsetDays: 0, hour: 8, purpose: 'Wedding is today.', priority: 90 },
  ],
  FAMILY_EVENT: [
    { offsetDays: -1, hour: 18, purpose: 'Family event is tomorrow.', priority: 65 },
    { offsetDays: 0, hour: 8, purpose: 'Family event is today.', priority: 85 },
  ],
  BIRTHDAY: [{ offsetDays: 0, hour: 8, purpose: 'Birthday is today.', priority: 70 }],
  APPOINTMENT: [
    { offsetDays: -1, hour: 18, purpose: 'Appointment is tomorrow.', priority: 80 },
    { offsetDays: 0, hour: 8, purpose: 'Appointment is today.', priority: 95 },
  ],
  BILL: [
    { offsetDays: -3, hour: 9, purpose: 'Bill is due in three days.', priority: 85 },
    { offsetDays: 0, hour: 9, purpose: 'Bill is due today.', priority: 100 },
  ],
  DELIVERY: [{ offsetDays: 0, hour: 9, purpose: 'Delivery is expected today.', priority: 75 }],
  RENEWAL: [{ offsetDays: -7, hour: 9, purpose: 'Renewal is due in one week.', priority: 65 }],
  SERVICE_VISIT: [{ offsetDays: 0, hour: 8, purpose: 'Service visit is today.', priority: 70 }],
  TRAVEL: [{ offsetDays: -1, hour: 18, purpose: 'Travel is tomorrow.', priority: 80 }],
  OTHER: [{ offsetDays: 0, hour: 9, purpose: 'Saved event is today.', priority: 50 }],
};

function dateField(fields: CandidateField[]): string | null {
  const value = fields.find((field) => field.key === 'date')?.value;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null;
  return value;
}

export function isQuietHours(at: Date, quietHours: QuietHours): boolean {
  const hour = at.getHours();
  if (quietHours.startHour === quietHours.endHour) return false;
  if (quietHours.startHour > quietHours.endHour) {
    return hour >= quietHours.startHour || hour < quietHours.endHour;
  }
  return hour >= quietHours.startHour && hour < quietHours.endHour;
}

export function deferPastQuietHours(at: Date, quietHours: QuietHours): Date {
  if (!isQuietHours(at, quietHours)) return at;
  const next = new Date(at);
  next.setHours(quietHours.endHour, 0, 0, 0);
  if (next <= at) next.setDate(next.getDate() + 1);
  return next;
}

export function remindersFor(
  eventId: string,
  type: LifeEventType,
  fields: CandidateField[],
  quietHours: QuietHours,
): ReminderOccurrence[] {
  const anchor = dateField(fields);
  if (!anchor) return [];
  const base = new Date(anchor);
  return POLICIES[type].map((rule, index) => {
    const scheduled = new Date(base);
    scheduled.setDate(scheduled.getDate() + rule.offsetDays);
    scheduled.setHours(rule.hour, 0, 0, 0);
    const allowed = deferPastQuietHours(scheduled, quietHours);
    return {
      id: `${eventId}:reminder:${index}`,
      scheduledFor: allowed.toISOString(),
      purpose: rule.purpose,
      dedupKey: `${eventId}:${rule.offsetDays}`,
      priority: rule.priority,
      state: 'SCHEDULED' as const,
    };
  });
}

export function policyFor(type: LifeEventType): readonly ReminderRule[] {
  return POLICIES[type];
}
