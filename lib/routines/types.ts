export const ROUTINE_TYPES = [
  'MEDICINE_REMINDER',
  'WATER_REMINDER',
  'BILL_REMINDER',
  'FAMILY_CALL_REMINDER',
  'DELIVERY_FOLLOW_UP',
  'APPOINTMENT_REMINDER',
  'MEAL_REMINDER',
  'EXERCISE_REMINDER',
  'GENERAL_CHECK_IN',
] as const;

export type RoutineType = (typeof ROUTINE_TYPES)[number];

export const ROUTINE_STATES = [
  'SCHEDULED',
  'DUE',
  'ACTIVE',
  'SNOOZED',
  'COMPLETED',
  'MISSED',
  'ESCALATED',
  'CANCELLED',
] as const;

export type RoutineState = (typeof ROUTINE_STATES)[number];

export type RoutineEventType =
  | 'CREATED'
  | 'BECAME_DUE'
  | 'CHECK_IN_STARTED'
  | 'SNOOZED'
  | 'NO_RESPONSE'
  | 'RETRY_SCHEDULED'
  | 'COMPLETED'
  | 'RESCHEDULED'
  | 'MISSED'
  | 'FAMILY_REQUESTED'
  | 'FAMILY_NOTIFIED'
  | 'CANCELLED';

export const ROUTINE_CHANNELS = ['DEVICE_ALERT', 'PHONE_CALL', 'IN_APP'] as const;
export type RoutineChannel = (typeof ROUTINE_CHANNELS)[number];

export type RecurrenceRule =
  | { frequency: 'ONCE' }
  | { frequency: 'DAILY'; interval?: number }
  | { frequency: 'WEEKLY'; interval?: number; weekdays?: number[] }
  | { frequency: 'MONTHLY'; interval?: number; dayOfMonth?: number };

export interface EscalationPolicy {
  retryAfterMinutes: number;
  maxRetries: number;
  notifyFamilyAfterMissed: boolean;
}

export interface RoutineEvent {
  id: string;
  routineId: string;
  type: RoutineEventType;
  at: string;
  detail: string;
}

export interface Routine {
  id: string;
  type: RoutineType;
  title: string;
  reminderText: string;
  state: RoutineState;
  scheduledFor: string;
  timezone: string;
  recurrence: RecurrenceRule;
  channels: RoutineChannel[];
  escalation: EscalationPolicy;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  snoozeCount: number;
  retryCount: number;
  familyRequested: boolean;
  history: RoutineEvent[];
}

export interface CreateRoutineInput {
  type: RoutineType;
  scheduledFor: string;
  title?: string;
  reminderText?: string;
  timezone?: string;
  recurrence?: RecurrenceRule;
  channels?: RoutineChannel[];
  escalation?: Partial<EscalationPolicy>;
}

export interface RoutineClockOptions {
  demoMode?: boolean;
  now?: () => Date;
}

export interface TriggeredRoutine {
  routine: Routine;
  channel: {
    channel: string;
    simulated: boolean;
    acceptedAt: string;
    externalId?: string;
    detail?: string;
  };
}
