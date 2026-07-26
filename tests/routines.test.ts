import { beforeEach, describe, expect, it } from 'vitest';
import { InAppChannelAdapter } from '../lib/channels/in-app';
import { DemoNotificationAdapter } from '../lib/notifications/console';
import { RoutineError } from '../lib/routines/errors';
import { RoutineService } from '../lib/routines/service';
import { RoutineStore } from '../lib/routines/store';

describe('proactive routine lifecycle', () => {
  let clock: Date;
  let id = 0;
  let notifications: DemoNotificationAdapter;
  let service: RoutineService;

  const now = () => new Date(clock);

  beforeEach(() => {
    clock = new Date('2026-07-26T08:00:00.000Z');
    id = 0;
    notifications = new DemoNotificationAdapter(now);
    service = new RoutineService(
      new RoutineStore(now, () => `id-${++id}`),
      new InAppChannelAdapter(now),
      notifications,
      { demoMode: true, now },
    );
  });

  it('triggers, snoozes in accelerated demo time, triggers again, and completes explicitly', async () => {
    const created = service.create({
      type: 'MEDICINE_REMINDER',
      scheduledFor: clock.toISOString(),
      title: 'Medicine reminder',
    });
    expect(created.state).toBe('SCHEDULED');

    let due = await service.triggerDue();
    expect(due).toHaveLength(1);
    expect(due[0].routine.state).toBe('ACTIVE');
    expect(due[0].channel).toMatchObject({ channel: 'IN_APP', simulated: true });

    const snoozed = service.snooze(created.id, 10);
    expect(snoozed.state).toBe('SNOOZED');
    expect(snoozed.scheduledFor).toBe('2026-07-26T08:00:10.000Z');
    expect(snoozed.snoozeCount).toBe(1);

    clock = new Date('2026-07-26T08:00:09.999Z');
    expect(await service.triggerDue()).toHaveLength(0);
    clock = new Date('2026-07-26T08:00:10.000Z');
    due = await service.triggerDue();
    expect(due).toHaveLength(1);
    expect(due[0].routine.state).toBe('ACTIVE');

    const completed = service.complete(created.id, 'I took it');
    expect(completed.state).toBe('COMPLETED');
    expect(completed.history.map((event) => event.type)).toEqual([
      'CREATED',
      'BECAME_DUE',
      'CHECK_IN_STARTED',
      'SNOOZED',
      'BECAME_DUE',
      'CHECK_IN_STARTED',
      'COMPLETED',
    ]);
  });

  it('does not treat silence or uncertainty as completion', async () => {
    const routine = service.create({
      type: 'MEDICINE_REMINDER',
      scheduledFor: clock.toISOString(),
    });
    await service.triggerDue();

    expect(() => service.complete(routine.id, '')).toThrowError(RoutineError);
    expect(() => service.complete(routine.id, 'I am not sure')).toThrowError(
      /clear elder response/i,
    );
    expect(service.get(routine.id).state).toBe('ACTIVE');
  });

  it('retries once after no response and then marks the check-in missed', async () => {
    const routine = service.create({
      type: 'WATER_REMINDER',
      scheduledFor: clock.toISOString(),
    });
    await service.triggerDue();

    const retry = service.noResponse(routine.id, 3);
    expect(retry.state).toBe('SNOOZED');
    expect(retry.retryCount).toBe(1);
    expect(retry.scheduledFor).toBe('2026-07-26T08:00:03.000Z');

    clock = new Date('2026-07-26T08:00:03.000Z');
    await service.triggerDue();
    const missed = service.noResponse(routine.id, 3);
    expect(missed.state).toBe('MISSED');
    expect(missed.history.filter((event) => event.type === 'NO_RESPONSE')).toHaveLength(2);
    expect(missed.history.filter((event) => event.type === 'RETRY_SCHEDULED')).toHaveLength(
      1,
    );
    expect(missed.history.at(-1)?.type).toBe('MISSED');
  });

  it('cancels a pending routine while retaining event history', () => {
    const routine = service.create({
      type: 'BILL_REMINDER',
      scheduledFor: new Date(clock.getTime() + 60_000).toISOString(),
    });
    const cancelled = service.cancel(routine.id);
    expect(cancelled.state).toBe('CANCELLED');
    expect(cancelled.history.map((event) => event.type)).toEqual(['CREATED', 'CANCELLED']);
  });

  it('requires explicit consent before family notification', async () => {
    const routine = service.create({
      type: 'GENERAL_CHECK_IN',
      scheduledFor: clock.toISOString(),
    });
    await service.triggerDue();

    await expect(service.requestFamily(routine.id, false)).rejects.toMatchObject({
      code: 'CONSENT_REQUIRED',
    });
    expect(notifications.sent).toHaveLength(0);
    expect(service.get(routine.id).familyRequested).toBe(false);

    const result = await service.requestFamily(routine.id, true);
    expect(result.routine.state).toBe('ESCALATED');
    expect(result.routine.familyRequested).toBe(true);
    expect(result.notification).toMatchObject({
      adapter: 'DEMO_CONSOLE',
      simulated: true,
    });
    expect(notifications.sent).toHaveLength(1);
    expect(result.routine.history.map((event) => event.type)).toContain(
      'FAMILY_NOTIFIED',
    );
  });
});

describe('medicine and credential safety', () => {
  const fixedNow = () => new Date('2026-07-26T08:00:00.000Z');

  function createService(): RoutineService {
    let id = 0;
    return new RoutineService(
      new RoutineStore(fixedNow, () => `safe-${++id}`),
      new InAppChannelAdapter(fixedNow),
      new DemoNotificationAdapter(fixedNow),
      { demoMode: true, now: fixedNow },
    );
  }

  it('uses canonical reminder-only medicine copy and stores no dosage', () => {
    const routine = createService().create({
      type: 'MEDICINE_REMINDER',
      scheduledFor: fixedNow().toISOString(),
      title: 'My medicine reminder',
    });
    expect(routine.title).toBe('Medicine reminder');
    expect(routine.reminderText).toContain('instructions already given');
    expect(JSON.stringify(routine)).not.toMatch(/\b(?:mg|dosage|dose)\b/i);
  });

  it.each([
    'Take 10 mg now',
    'Increase the medicine',
    'Should I take this medicine?',
    'Change my dosage',
  ])('rejects medical advice or dosage content: %s', (title) => {
    expect(() =>
      createService().create({
        type: 'MEDICINE_REMINDER',
        scheduledFor: fixedNow().toISOString(),
        title,
      }),
    ).toThrowError(/remind only|cannot store dosage/i);
  });

  it.each(['Save my OTP', 'PIN 1234', 'Keep the CVV'])(
    'never stores credential-bearing routine text: %s',
    (title) => {
      const service = createService();
      expect(() =>
        service.create({
          type: 'GENERAL_CHECK_IN',
          scheduledFor: fixedNow().toISOString(),
          title,
        }),
      ).toThrowError(/never stores OTP, PIN, CVV/i);
      expect(service.list()).toHaveLength(0);
    },
  );
});
