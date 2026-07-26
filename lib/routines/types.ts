export const ROUTINE_TYPES = [
  'MEDICINE_REMINDER',
  'WATER_REMINDER',
  'BILL_REMINDER',
  'FAMILY_CALL_REMINDER',
  'DELIVERY_FOLLOW_UP',
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
  | 'MISSED'
  | 'FAMILY_REQUESTED'
  | 'FAMILY_NOTIFIED'
  | 'CANCELLED';

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
  };
}
