import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InAppChannelAdapter } from '../lib/channels/in-app';
import { authoriseFamilyHandoff } from '../lib/family';
import { MemoryStore } from '../lib/memory/store';
import { DemoNotificationAdapter } from '../lib/notifications/console';
import { RoutineService } from '../lib/routines/service';
import { RoutineStore } from '../lib/routines/store';
import {
  getHistory,
  getOrCreate,
  process,
  reset,
  setPreference,
} from '../lib/session-store';

const SESSION = 'final-integration';
const usualOrder = {
  restaurant: 'Udupi Cafe',
  items: { name: 'Masala Dosa', includes: ['chutney'], excludes: [] },
  address: 'Home',
};
const temporaryDirectories: string[] = [];

afterEach(() => {
  reset(SESSION);
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function seedFoodSession(): void {
  reset(SESSION);
  setPreference(SESSION, 'usualOrder', usualOrder);
}

describe('final integration scenarios', () => {
  it('A: restores food memory, explains fee, corrects one field, and confirms', () => {
    seedFoodSession();
    let result = process(SESSION, 'Order my usual dosa without chutney');
    expect(result.nextCtx.fields).toMatchObject({
      restaurant: 'Udupi Cafe',
      address: 'Home',
    });
    expect(result.nextScreen.deliveryFee).toBe(25);

    result = process(SESSION, 'Why is the total higher?');
    expect(result.response.speak).toContain('Rs 25 delivery charge');

    result = process(SESSION, 'Wait, plain dosa, not masala dosa');
    expect(result.nextCtx.fields.restaurant).toBe('Udupi Cafe');
    expect(result.nextCtx.fields.address).toBe('Home');
    expect(result.nextCtx.fields.items).toMatchObject({
      name: 'Plain Dosa',
      excludes: ['chutney'],
    });

    result = process(SESSION, 'Yes');
    expect(result.response.speak).toContain('SIMULATED ORDER SUCCESS');
    expect(result.nextScreen.status).toBe('done');
  });

  it('B: blocks a semantic wrong-recipient payment and preserves amount correction', () => {
    reset(SESSION);
    let result = process(SESSION, 'Send Rs 500 to my daughter Priya Stores');
    expect(result.nextCtx.skillId).toBe('SEND_PAYMENT');
    expect(result.nextCtx.fields.recipient).toBeNull();
    expect(result.nextCtx.fields.recipientWarning).toContain('store');
    expect(result.nextCtx.fields.amount).toBe(500);

    result = process(SESSION, 'No, send Rs 750 to Priya Menon');
    expect(result.nextCtx.fields.recipient).toBe('Priya Menon');
    expect(result.nextCtx.fields.amount).toBe(750);
    expect(result.nextCtx.awaitingConfirmation).toBe(true);

    result = process(SESSION, 'Yes');
    expect(result.response.speak).toContain('SIMULATED PAYMENT SUCCESS');
    expect(result.response.speak).toContain('Rs 750');
  });

  it('C: routes phone text-size help and presents one simulated instruction', () => {
    reset(SESSION);
    const result = process(SESSION, 'Help me increase the text size on my phone');
    expect(result.nextCtx.skillId).toBe('PHONE_HELP');
    expect(result.response.action).toBe('ask');
    expect(result.response.speak).toContain('Open Settings');
    expect(result.response.speak).toContain('simulated guidance');
  });

  it('D: refuses credentials without changing the active task', () => {
    seedFoodSession();
    process(SESSION, 'Order my usual dosa');
    const before = structuredClone(getOrCreate(SESSION).ctx);
    const result = process(SESSION, 'My OTP is 123456');
    expect(result.response.action).toBe('refuse');
    expect(result.events.some((event) => event.type === 'refuse_credential')).toBe(true);
    expect(result.nextCtx).toEqual(before);
  });

  it('E: triggers medicine reminder, snoozes, triggers again, and completes', async () => {
    let current = new Date('2026-07-26T09:00:00.000Z');
    const service = new RoutineService(
      new RoutineStore(() => current, () => `routine-${current.getTime()}`),
      new InAppChannelAdapter(() => current),
      new DemoNotificationAdapter(() => current),
      { demoMode: true, now: () => current },
    );
    const routine = service.create({
      type: 'MEDICINE_REMINDER',
      title: 'Morning medicine',
      scheduledFor: current.toISOString(),
    });
    await service.triggerDue(current);
    expect(service.get(routine.id).state).toBe('ACTIVE');

    service.snooze(routine.id, 5);
    expect(service.get(routine.id).state).toBe('SNOOZED');
    current = new Date(current.getTime() + 5_000);
    await service.triggerDue(current);
    expect(service.get(routine.id).state).toBe('ACTIVE');

    const completed = service.complete(routine.id, 'Yes');
    expect(completed.state).toBe('COMPLETED');
    expect(completed.history.map((event) => event.type)).toContain('SNOOZED');
  });

  it('F: requires audited consent before a simulated family handoff', () => {
    const directory = mkdtempSync(join(tmpdir(), 'thuna-integration-'));
    temporaryDirectories.push(directory);
    const store = new MemoryStore(join(directory, 'memory.json'));
    expect(() => authoriseFamilyHandoff(store, {
      contactId: 'sree',
      elderExplicitlyRequested: true,
      reason: 'Please help me finish.',
    })).toThrow(/consent/i);

    store.setNotificationConsent('sree', true, true, 'elder_settings');
    const handoff = authoriseFamilyHandoff(store, {
      contactId: 'sree',
      elderExplicitlyRequested: true,
      reason: 'Please help me finish.',
    });
    expect(handoff.authorised).toBe(true);
    expect(handoff.simulated).toBe(true);
    expect(store.getConsentAudit()).toHaveLength(1);
  });

  it('G/H: pauses unsupported work, then resets session history for a repeat', () => {
    reset(SESSION);
    const unsupported = process(SESSION, 'Book a flight to Mars');
    expect(unsupported.response.action).toBe('refuse');
    expect(getHistory(SESSION).some((event) => event.type === 'unsupported')).toBe(true);

    reset(SESSION);
    expect(getOrCreate(SESSION).history).toEqual([]);
    expect(getOrCreate(SESSION).screen.status).toBe('idle');
  });

  it('connects deterministic tracking and general-help skills', () => {
    reset(SESSION);
    let result = process(SESSION, 'Track order THUNA-1003');
    expect(result.nextCtx.skillId).toBe('TRACK_ORDER');
    expect(result.response.speak).toContain('out for delivery');
    expect(result.response.speak).not.toMatch(/arrive at|guaranteed at/i);

    reset(SESSION);
    result = process(SESSION, 'What is a QR code?');
    expect(result.nextCtx.skillId).toBe('GENERAL_HELP');
    expect(result.response.speak).toContain('QR code');
    expect(result.response.speak).toContain('does not control an external app');
  });
});
