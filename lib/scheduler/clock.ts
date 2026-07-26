import { RoutineError } from '../routines/errors';

export function durationToMilliseconds(minutes: number, demoMode: boolean): number {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
    throw new RoutineError(
      'INVALID_INPUT',
      'Snooze duration must be between 1 and 1440 minutes.',
    );
  }
  return Math.round(minutes * (demoMode ? 1000 : 60_000));
}

export function nextTriggerAt(now: Date, minutes: number, demoMode: boolean): Date {
  return new Date(now.getTime() + durationToMilliseconds(minutes, demoMode));
}
