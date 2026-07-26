import type { ChannelAdapter } from '../channels/types';
import type { NotificationAdapter, NotificationResult } from '../notifications/types';
import { isDue } from '../scheduler/due';
import { nextTriggerAt } from '../scheduler/clock';
import { RoutineError } from './errors';
import { isExplicitCompletion } from './safety';
import { RoutineStore } from './store';
import type {
  CreateRoutineInput,
  Routine,
  RoutineClockOptions,
  TriggeredRoutine,
} from './types';

export class RoutineService {
  private readonly demoMode: boolean;
  private readonly now: () => Date;

  constructor(
    private readonly store: RoutineStore,
    private readonly channel: ChannelAdapter,
    private readonly notifications: NotificationAdapter,
    options: RoutineClockOptions = {},
  ) {
    this.demoMode = options.demoMode ?? false;
    this.now = options.now ?? (() => new Date());
  }

  create(input: CreateRoutineInput): Routine {
    return this.store.create(input);
  }

  list(): Routine[] {
    return this.store.list();
  }

  get(id: string): Routine {
    return this.store.get(id);
  }

  async triggerDue(at: Date = this.now()): Promise<TriggeredRoutine[]> {
    const due = this.store.list().filter((routine) => isDue(routine, at));
    const triggered: TriggeredRoutine[] = [];

    for (const pending of due) {
      this.store.transition(
        pending.id,
        ['SCHEDULED', 'SNOOZED'],
        'DUE',
        'BECAME_DUE',
        'Routine became due.',
      );
      const delivery = await this.channel.startCheckIn(this.store.get(pending.id));
      const routine = this.store.mutate(pending.id, (current) => {
        if (current.state !== 'DUE') {
          throw new RoutineError('INVALID_TRANSITION', 'Only a due routine can become active.', 409);
        }
        current.state = 'ACTIVE';
        current.lastTriggeredAt = at.toISOString();
        current.history.push({
          id: `${current.id}:check-in:${current.history.length}`,
          routineId: current.id,
          type: 'CHECK_IN_STARTED',
          at: at.toISOString(),
          detail: `${delivery.channel} check-in started${delivery.simulated ? ' (SIMULATED)' : ''}.`,
        });
      });
      triggered.push({ routine, channel: delivery });
    }

    return triggered;
  }

  snooze(id: string, minutes: number): Routine {
    const triggerAt = nextTriggerAt(this.now(), minutes, this.demoMode);
    return this.store.mutate(id, (routine) => {
      if (routine.state !== 'ACTIVE' && routine.state !== 'DUE') {
        throw new RoutineError(
          'INVALID_TRANSITION',
          'Only an active check-in can be snoozed.',
          409,
        );
      }
      routine.state = 'SNOOZED';
      routine.scheduledFor = triggerAt.toISOString();
      routine.snoozeCount += 1;
      routine.history.push({
        id: `${routine.id}:snooze:${routine.history.length}`,
        routineId: routine.id,
        type: 'SNOOZED',
        at: this.now().toISOString(),
        detail: `Snoozed for ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      });
    });
  }

  complete(id: string, explicitResponse: string | undefined): Routine {
    if (!isExplicitCompletion(explicitResponse)) {
      throw new RoutineError(
        'INVALID_TRANSITION',
        'A clear elder response is required; silence or uncertainty is not completion.',
        409,
      );
    }
    return this.store.transition(
      id,
      ['ACTIVE', 'DUE'],
      'COMPLETED',
      'COMPLETED',
      'Elder explicitly marked the reminder complete.',
    );
  }

  noResponse(id: string, retryAfterMinutes = 1): Routine {
    const routine = this.store.get(id);
    if (routine.state !== 'ACTIVE' && routine.state !== 'DUE') {
      throw new RoutineError(
        'INVALID_TRANSITION',
        'No-response handling requires an active check-in.',
        409,
      );
    }
    this.store.appendEvent(id, 'NO_RESPONSE', 'No elder response was received.');

    if (routine.retryCount < 1) {
      const triggerAt = nextTriggerAt(this.now(), retryAfterMinutes, this.demoMode);
      return this.store.mutate(id, (current) => {
        current.retryCount += 1;
        current.state = 'SNOOZED';
        current.scheduledFor = triggerAt.toISOString();
        current.history.push({
          id: `${current.id}:retry:${current.history.length}`,
          routineId: current.id,
          type: 'RETRY_SCHEDULED',
          at: this.now().toISOString(),
          detail: `One retry scheduled for ${current.scheduledFor}.`,
        });
      });
    }

    return this.store.transition(
      id,
      ['ACTIVE', 'DUE'],
      'MISSED',
      'MISSED',
      'Check-in marked missed after one retry and no response.',
    );
  }

  cancel(id: string): Routine {
    return this.store.transition(
      id,
      ['SCHEDULED', 'DUE', 'ACTIVE', 'SNOOZED'],
      'CANCELLED',
      'CANCELLED',
      'Routine cancelled by the elder.',
    );
  }

  async requestFamily(
    id: string,
    explicitConsent: boolean,
  ): Promise<{ routine: Routine; notification: NotificationResult }> {
    if (!explicitConsent) {
      throw new RoutineError(
        'CONSENT_REQUIRED',
        'Explicit elder consent is required before notifying family.',
        403,
      );
    }
    const before = this.store.get(id);
    if (['COMPLETED', 'CANCELLED'].includes(before.state)) {
      throw new RoutineError(
        'INVALID_TRANSITION',
        `Family help cannot be requested for a ${before.state.toLowerCase()} routine.`,
        409,
      );
    }

    this.store.appendEvent(id, 'FAMILY_REQUESTED', 'Elder explicitly requested family help.');
    const notification = await this.notifications.notifyFamily({
      routineId: before.id,
      routineType: before.type,
      message: `Thuna family-help request: ${before.title}. The elder explicitly asked for help.`,
    });
    const routine = this.store.mutate(id, (current) => {
      current.familyRequested = true;
      current.state = 'ESCALATED';
      current.history.push({
        id: `${current.id}:family:${current.history.length}`,
        routineId: current.id,
        type: 'FAMILY_NOTIFIED',
        at: this.now().toISOString(),
        detail: `Family notification accepted by ${notification.adapter}.`,
      });
    });
    return { routine, notification };
  }
}
