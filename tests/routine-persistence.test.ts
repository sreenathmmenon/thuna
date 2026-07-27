import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RoutineStore } from '../lib/routines/store';

/**
 * A reminder an elder was promised must survive a restart. These tests prove
 * the routine store's file persistence: every mutation is durable, and a
 * fresh store instance (a new process, a redeploy, another route bundle)
 * sees exactly the state the previous one committed.
 */
describe('RoutineStore file persistence', () => {
  let directory: string;
  let filePath: string;
  let id = 0;

  const fixedNow = () => new Date('2026-07-26T09:00:00.000Z');
  const newStore = () =>
    new RoutineStore(fixedNow, () => `persist-${++id}`, filePath);

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'thuna-routines-'));
    filePath = join(directory, 'thuna-routines.json');
    id = 0;
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('persists a created routine so a fresh store instance can list it', () => {
    const first = newStore();
    const created = first.create({
      type: 'MEDICINE_REMINDER',
      title: 'Morning medicine',
      scheduledFor: '2026-07-26T09:05:00.000Z',
    });

    const second = newStore();
    const listed = second.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(created.id);
    expect(listed[0].state).toBe('SCHEDULED');
  });

  it('persists state transitions and event history across instances', () => {
    const first = newStore();
    const created = first.create({
      type: 'MEDICINE_REMINDER',
      title: 'Morning medicine',
      scheduledFor: '2026-07-26T09:05:00.000Z',
    });
    first.transition(created.id, ['SCHEDULED'], 'DUE', 'BECAME_DUE', 'Reminder due.');

    const second = newStore();
    const reloaded = second.get(created.id);
    expect(reloaded.state).toBe('DUE');
    expect(reloaded.history.map((event) => event.type)).toEqual(['CREATED', 'BECAME_DUE']);
  });

  it('persists reset so stale routines never reappear after restart', () => {
    const first = newStore();
    first.create({
      type: 'MEDICINE_REMINDER',
      title: 'Morning medicine',
      scheduledFor: '2026-07-26T09:05:00.000Z',
    });
    first.reset();

    const second = newStore();
    expect(second.list()).toHaveLength(0);
  });

  it('writes a well-formed document to disk', () => {
    const store = newStore();
    store.create({
      type: 'WATER_REMINDER',
      title: 'Drink water',
      scheduledFor: '2026-07-26T11:00:00.000Z',
    });

    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as {
      version: number;
      routines: Array<{ id: string }>;
    };
    expect(raw.version).toBe(2);
    expect(raw.routines).toHaveLength(1);
  });

  it('loads version 1 reminders with safe additive defaults', () => {
    writeFileSync(
      filePath,
      JSON.stringify({
        version: 1,
        routines: [
          {
            id: 'legacy-reminder',
            type: 'WATER_REMINDER',
            title: 'Water reminder',
            reminderText: 'This is your agreed water reminder.',
            state: 'SCHEDULED',
            scheduledFor: '2026-07-26T11:00:00.000Z',
            createdAt: '2026-07-26T09:00:00.000Z',
            updatedAt: '2026-07-26T09:00:00.000Z',
            snoozeCount: 0,
            retryCount: 0,
            familyRequested: false,
            history: [],
          },
        ],
      }),
    );

    const migrated = newStore().get('legacy-reminder');
    expect(migrated.recurrence).toEqual({ frequency: 'ONCE' });
    expect(migrated.channels).toEqual(['DEVICE_ALERT']);
    expect(migrated.escalation).toEqual({
      retryAfterMinutes: 10,
      maxRetries: 1,
      notifyFamilyAfterMissed: false,
    });
  });

  it('refuses to load a file that does not match the contract', () => {
    writeFileSync(filePath, JSON.stringify({ version: 1, routines: [{ broken: true }] }));
    expect(() => newStore()).toThrow(/does not match the current contract/);
  });

  it('remains a plain in-memory store when no file path is given', () => {
    const memoryOnly = new RoutineStore(fixedNow, () => `memory-${++id}`);
    memoryOnly.create({
      type: 'MEDICINE_REMINDER',
      title: 'Morning medicine',
      scheduledFor: '2026-07-26T09:05:00.000Z',
    });
    // Nothing was written next to the temp file used by the other tests.
    expect(() => readFileSync(filePath, 'utf8')).toThrow();
  });
});
