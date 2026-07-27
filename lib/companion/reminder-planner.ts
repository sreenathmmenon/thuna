import { z } from 'zod';
import { completeChat } from '../sarvam';
import { safeRoutineCopy } from '../routines/safety';
import {
  ROUTINE_TYPES,
  type CreateRoutineInput,
  type RecurrenceRule,
  type RoutineType,
} from '../routines/types';

const recurrenceSchema = z.discriminatedUnion('frequency', [
  z.object({ frequency: z.literal('ONCE') }),
  z.object({
    frequency: z.literal('DAILY'),
    interval: z.number().int().min(1).max(365).optional(),
  }),
  z.object({
    frequency: z.literal('WEEKLY'),
    interval: z.number().int().min(1).max(52).optional(),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  }),
  z.object({
    frequency: z.literal('MONTHLY'),
    interval: z.number().int().min(1).max(12).optional(),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
  }),
]);

const modelPlanSchema = z.object({
  type: z.enum(ROUTINE_TYPES),
  title: z.string().min(1).max(120),
  reminderText: z.string().min(1).max(500),
  scheduledLocal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/),
  recurrence: recurrenceSchema,
  confidence: z.number().min(0).max(1),
});

export interface ReminderPlan extends CreateRoutineInput {
  type: RoutineType;
  title: string;
  reminderText: string;
  scheduledFor: string;
  timezone: string;
  recurrence: RecurrenceRule;
  readback: string;
  confidence: number;
}

export class ReminderPlanningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReminderPlanningError';
  }
}

const SYSTEM = `You plan reminders for Thuna, an elder companion in India.
Return exactly one JSON object and no markdown.
Resolve relative dates from the supplied current ISO time and IANA timezone.
Use only these routine types: ${ROUTINE_TYPES.join(', ')}.
Never include diagnosis, dosage, treatment changes, OTPs, PINs, CVVs, payment passwords, or bank details.
For medicine, keep the title and text generic and refer only to instructions already given by a healthcare professional.
Use recurrence ONCE, DAILY, WEEKLY, or MONTHLY. Weekday numbers are 0=Sunday through 6=Saturday.
The readback must briefly ask the elder to confirm the exact reminder and schedule.
Do not choose delivery channels, retry counts, calls, or family escalation; deterministic policy owns those fields.
Return every key in this exact shape:
{"type":"APPOINTMENT_REMINDER","title":"Clinic appointment","reminderText":"It is time to prepare for your clinic appointment.","scheduledLocal":"2026-07-28T08:00:00","recurrence":{"frequency":"ONCE"},"confidence":0.95}
scheduledLocal is the elder's wall-clock date and time in the supplied timezone.
Use the supplied language for title and reminderText.
Do not convert scheduledLocal to UTC and do not generate a readback; deterministic code owns both.`;

function extractJson(raw: string): unknown | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function validTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function partsInTimezone(value: Date, timezone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
}

function localDateTimeToUtc(value: string, timezone: string): Date {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) {
    throw new ReminderPlanningError('Please include a clear reminder date and time.');
  }
  const expected = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  };
  const expectedAsUtc = Date.UTC(
    expected.year,
    expected.month - 1,
    expected.day,
    expected.hour,
    expected.minute,
    expected.second,
  );
  let candidate = expectedAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = partsInTimezone(new Date(candidate), timezone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const adjustment = expectedAsUtc - actualAsUtc;
    candidate += adjustment;
    if (adjustment === 0) break;
  }
  const finalParts = partsInTimezone(new Date(candidate), timezone);
  if (
    Object.entries(expected).some(([key, part]) => finalParts[key] !== part)
  ) {
    throw new ReminderPlanningError(
      'That local time is unavailable. Please choose another reminder time.',
    );
  }
  return new Date(candidate);
}

function readbackFor(
  title: string,
  scheduledFor: Date,
  timezone: string,
  recurrence: RecurrenceRule,
  language: string,
): string {
  const when = new Intl.DateTimeFormat('en-IN', {
    localeMatcher: 'best fit',
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(scheduledFor);
  if (language === 'Malayalam') {
    const date = new Intl.DateTimeFormat('ml-IN', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(scheduledFor);
    const clock = partsInTimezone(scheduledFor, timezone);
    const period = clock.hour < 12 ? 'രാവിലെ' : 'വൈകുന്നേരം';
    const hour = clock.hour % 12 || 12;
    const time = `${period} ${hour}:${String(clock.minute).padStart(2, '0')}`;
    const repeats: Record<RecurrenceRule['frequency'], string> = {
      ONCE: '',
      DAILY: ', എല്ലാ ദിവസവും ആവർത്തിക്കും',
      WEEKLY: ', എല്ലാ ആഴ്ചയും ആവർത്തിക്കും',
      MONTHLY: ', എല്ലാ മാസവും ആവർത്തിക്കും',
    };
    return `${date} ${time}-ന് ${title} ഓർമ്മിപ്പിക്കാം${repeats[recurrence.frequency]}. ഇത് ശരിയാണോ?`;
  }
  if (language === 'Hindi') {
    const date = new Intl.DateTimeFormat('hi-IN', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(scheduledFor);
    const clock = partsInTimezone(scheduledFor, timezone);
    const period = clock.hour < 12 ? 'सुबह' : 'शाम';
    const hour = clock.hour % 12 || 12;
    const time = `${period} ${hour}:${String(clock.minute).padStart(2, '0')} बजे`;
    const repeats: Record<RecurrenceRule['frequency'], string> = {
      ONCE: '',
      DAILY: ', हर दिन दोहराया जाएगा',
      WEEKLY: ', हर सप्ताह दोहराया जाएगा',
      MONTHLY: ', हर महीने दोहराया जाएगा',
    };
    return `मैं आपको ${date} को ${time} ${title} की याद दिलाऊँगा${repeats[recurrence.frequency]}। क्या यह सही है?`;
  }
  const repeats =
    recurrence.frequency === 'ONCE' ? '' : `, repeating ${recurrence.frequency.toLowerCase()}`;
  return `I will remind you about ${title} on ${when}${repeats}. Is that right?`;
}

export function deliveryPolicyFor(type: RoutineType): Pick<
  CreateRoutineInput,
  'channels' | 'escalation'
> {
  const important = type === 'MEDICINE_REMINDER' || type === 'APPOINTMENT_REMINDER';
  return {
    channels: important ? ['DEVICE_ALERT', 'PHONE_CALL'] : ['DEVICE_ALERT'],
    escalation: {
      retryAfterMinutes: 10,
      maxRetries: important ? 2 : 1,
      notifyFamilyAfterMissed: false,
    },
  };
}

export async function planReminder(
  utterance: string,
  options: {
    now?: Date;
    timezone?: string;
    language?: string;
    askChat?: typeof completeChat;
  } = {},
): Promise<ReminderPlan> {
  const clean = utterance.trim();
  if (!clean) throw new ReminderPlanningError('Tell Thuna what to remind you about.');
  const now = options.now ?? new Date();
  const timezone = options.timezone || 'Asia/Kolkata';
  if (!validTimezone(timezone)) {
    throw new ReminderPlanningError('Please check the reminder timezone.');
  }
  const request = {
    request: clean,
    currentTime: now.toISOString(),
    timezone,
    language: options.language || 'English',
  };
  const askChat = options.askChat ?? completeChat;
  const raw = await askChat(
    SYSTEM,
    JSON.stringify(request),
  );
  let parsed = modelPlanSchema.safeParse(extractJson(raw));
  if (!parsed.success) {
    const repaired = await askChat(
      SYSTEM,
      JSON.stringify({
        ...request,
        instruction:
          'Your previous answer did not match the required shape. Return a corrected object with every required key.',
        previousAnswer: extractJson(raw),
        missingOrInvalidFields: parsed.error.issues.map((issue) => issue.path.join('.')),
      }),
    );
    parsed = modelPlanSchema.safeParse(extractJson(repaired));
  }
  if (!parsed.success) {
    throw new ReminderPlanningError(
      'I could not understand that reminder yet. Please include what to remember and when.',
    );
  }
  const scheduled = localDateTimeToUtc(parsed.data.scheduledLocal, timezone);
  if (scheduled.getTime() < now.getTime() - 30_000) {
    throw new ReminderPlanningError('That time has already passed. Please choose a future time.');
  }
  const safeCopy = safeRoutineCopy({
    type: parsed.data.type,
    title: parsed.data.title,
    reminderText: parsed.data.reminderText,
    scheduledFor: scheduled.toISOString(),
  });
  return {
    type: parsed.data.type,
    scheduledFor: scheduled.toISOString(),
    recurrence: parsed.data.recurrence,
    confidence: parsed.data.confidence,
    readback: readbackFor(
      safeCopy.title,
      scheduled,
      timezone,
      parsed.data.recurrence,
      request.language,
    ),
    ...safeCopy,
    timezone,
    ...deliveryPolicyFor(parsed.data.type),
  };
}

export { recurrenceSchema };
