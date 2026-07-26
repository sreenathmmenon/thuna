import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { RoutineError } from './errors';
import type {
  CreateRoutineInput,
  Routine,
  RoutineEvent,
  RoutineEventType,
  RoutineState,
} from './types';
import { safeRoutineCopy } from './safety';

interface RoutineDocument {
  version: 1;
  routines: Routine[];
}

function isRoutineDocument(value: unknown): value is RoutineDocument {
  if (typeof value !== 'object' || value === null) return false;
  const document = value as { version?: unknown; routines?: unknown };
  if (document.version !== 1 || !Array.isArray(document.routines)) return false;
  return document.routines.every((entry) => {
    if (typeof entry !== 'object' || entry === null) return false;
    const routine = entry as Record<string, unknown>;
    return (
      typeof routine.id === 'string' &&
      typeof routine.type === 'string' &&
      typeof routine.state === 'string' &&
      typeof routine.scheduledFor === 'string' &&
      Array.isArray(routine.history)
    );
  });
}

function cloneRoutine(routine: Routine): Routine {
  return {
    ...routine,
    history: routine.history.map((event) => ({ ...event })),
  };
}

export class RoutineStore {
  private readonly routines = new Map<string, Routine>();

  /**
   * When filePath is set, every mutation is persisted with the same
   * atomic temp-write-then-rename pattern the continuity and memory stores
   * use. A reminder an elder was promised must survive a restart.
   */
  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
    private readonly filePath?: string,
  ) {
    if (filePath && existsSync(filePath)) {
      const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
      if (!isRoutineDocument(parsed)) {
        throw new Error('Stored routine data does not match the current contract.');
      }
      for (const routine of parsed.routines) {
        this.routines.set(routine.id, cloneRoutine(routine));
      }
    } else if (filePath) {
      this.persist();
    }
  }

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
    this.persist();
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
    this.persist();
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
    this.persist();
  }

  private persist(): void {
    if (!this.filePath) return;
    const document: RoutineDocument = { version: 1, routines: this.list() };
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    renameSync(temporaryPath, this.filePath);
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
