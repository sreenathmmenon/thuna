import type { Routine } from '../routines/types';

export function isDue(routine: Routine, now: Date): boolean {
  return (
    (routine.state === 'SCHEDULED' || routine.state === 'SNOOZED') &&
    new Date(routine.scheduledFor).getTime() <= now.getTime()
  );
}
