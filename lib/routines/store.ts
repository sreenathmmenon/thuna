import { randomUUID } from 'node:crypto';
import { RoutineError } from './errors';
import type {
  CreateRoutineInput,
  Routine,
  RoutineEvent,
  RoutineEventType,
  RoutineState,
} from './types';
import { safeRoutineCopy } from './safety';

function cloneRoutine(routine: Routine): Routine {
  return {
    ...routine,
    history: routine.history.map((event) => ({ ...event })),
  };
}

export class RoutineStore {
  private readonly routines = new Map<string, Routine>();

  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {}

  create(input: CreateRoutineInput): Routine {
    const scheduledFor = new Date(input.scheduledFor);
    if (!Number.isFinite(scheduledFor.getTime())) {
      throw new RoutineError('INVALID_INPUT', 'scheduledFor must be a valid ISO date.');
    }
    const copy = safeRoutineCopy(input);
    const at = this.now().toISOString();
    const id = this.createId();
    const routine: Routine = {
      id,
      type: input.type,
      ...copy,
      state: 'SCHEDULED',
      scheduledFor: scheduledFor.toISOString(),
      createdAt: at,
      updatedAt: at,
      snoozeCount: 0,
      retryCount: 0,
      familyRequested: false,
      history: [],
    };
    this.append(routine, 'CREATED', `Routine scheduled for ${routine.scheduledFor}.`);
    this.routines.set(id, routine);
    return cloneRoutine(routine);
  }

  list(): Routine[] {
    return [...this.routines.values()]
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
      .map(cloneRoutine);
  }

  get(id: string): Routine {
    const routine = this.routines.get(id);
    if (!routine) throw new RoutineError('NOT_FOUND', 'Routine not found.', 404);
    return cloneRoutine(routine);
  }

  mutate(id: string, mutator: (routine: Routine) => void): Routine {
    const routine = this.routines.get(id);
    if (!routine) throw new RoutineError('NOT_FOUND', 'Routine not found.', 404);
    mutator(routine);
    routine.updatedAt = this.now().toISOString();
    return cloneRoutine(routine);
  }

  transition(
    id: string,
    expected: RoutineState[],
    next: RoutineState,
    event: RoutineEventType,
    detail: string,
  ): Routine {
    return this.mutate(id, (routine) => {
      if (!expected.includes(routine.state)) {
        throw new RoutineError(
          'INVALID_TRANSITION',
          `Cannot move routine from ${routine.state} to ${next}.`,
          409,
        );
      }
      routine.state = next;
      this.append(routine, event, detail);
    });
  }

  appendEvent(id: string, type: RoutineEventType, detail: string): Routine {
    return this.mutate(id, (routine) => this.append(routine, type, detail));
  }

  reset(): void {
    this.routines.clear();
  }

  private append(routine: Routine, type: RoutineEventType, detail: string): void {
    const event: RoutineEvent = {
      id: this.createId(),
      routineId: routine.id,
      type,
      at: this.now().toISOString(),
      detail,
    };
    routine.history.push(event);
  }
}
