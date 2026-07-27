import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChannelAdapter, ChannelDelivery } from '../lib/channels/types';
import { CompanionChannel } from '../lib/channels/companion';
import { ExotelVoiceCallChannel } from '../lib/channels/exotel';
import { parseExotelDeliveryEvidence } from '../lib/channels/delivery-evidence';
import {
  deliveryPolicyFor,
  planReminder,
} from '../lib/companion/reminder-planner';
import { DemoNotificationAdapter } from '../lib/notifications/console';
import { RoutineService } from '../lib/routines/service';
import { RoutineStore } from '../lib/routines/store';
import type { Routine } from '../lib/routines/types';

const originalSecret = process.env.THUNA_TELEPHONY_WEBHOOK_SECRET;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalSecret === undefined) delete process.env.THUNA_TELEPHONY_WEBHOOK_SECRET;
  else process.env.THUNA_TELEPHONY_WEBHOOK_SECRET = originalSecret;
});

function channel(
  name: string,
  handler?: (routine: Routine) => Promise<ChannelDelivery>,
): ChannelAdapter {
  return {
    name,
    startCheckIn:
      handler ??
      (async () => ({
        channel: name,
        simulated: name !== 'PHONE_CALL',
        acceptedAt: '2026-07-27T08:00:00.000Z',
      })),
  };
}

function routineStore(now: () => Date): RoutineStore {
  let sequence = 0;
  return new RoutineStore(now, () => `event-${++sequence}`);
}

describe('proactive elder reminder delivery', () => {
  it('automatically records no response and schedules the next attempt', async () => {
    let clock = new Date('2026-07-27T08:00:00.000Z');
    const now = () => new Date(clock);
    const service = new RoutineService(
      routineStore(now),
      channel('IN_APP'),
      new DemoNotificationAdapter(now),
      { now, demoMode: false },
    );
    const created = service.create({
      type: 'MEDICINE_REMINDER',
      scheduledFor: clock.toISOString(),
      channels: ['DEVICE_ALERT', 'PHONE_CALL'],
      escalation: { retryAfterMinutes: 1, maxRetries: 2 },
    });
    await service.triggerDue();

    clock = new Date('2026-07-27T08:01:00.000Z');
    const processed = service.processUnanswered();

    expect(processed).toHaveLength(1);
    expect(service.get(created.id)).toMatchObject({
      state: 'SNOOZED',
      retryCount: 1,
      scheduledFor: '2026-07-27T08:02:00.000Z',
    });
    expect(service.get(created.id).history.map((event) => event.type)).toContain(
      'NO_RESPONSE',
    );
  });

  it('uses deterministic call escalation only for medicine and appointments', () => {
    expect(deliveryPolicyFor('MEDICINE_REMINDER').channels).toEqual([
      'DEVICE_ALERT',
      'PHONE_CALL',
    ]);
    expect(deliveryPolicyFor('APPOINTMENT_REMINDER').channels).toEqual([
      'DEVICE_ALERT',
      'PHONE_CALL',
    ]);
    expect(deliveryPolicyFor('WATER_REMINDER').channels).toEqual(['DEVICE_ALERT']);
    expect(deliveryPolicyFor('GENERAL_CHECK_IN').escalation?.notifyFamilyAfterMissed).toBe(
      false,
    );
  });

  it('repairs one malformed model proposal before applying deterministic policy', async () => {
    const askChat = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          type: 'APPOINTMENT_REMINDER',
          title: 'Clinic appointment',
          readback: 'Shall I remind you tomorrow morning?',
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          type: 'APPOINTMENT_REMINDER',
          title: 'Clinic appointment',
          reminderText: 'It is time to prepare for your clinic appointment.',
          scheduledLocal: '2026-07-28T08:00:00',
          recurrence: { frequency: 'ONCE' },
          confidence: 0.95,
        }),
      );
    const plan = await planReminder(
      'Remind me tomorrow at 8 AM about my clinic appointment',
      {
        now: new Date('2026-07-27T12:00:00.000Z'),
        timezone: 'Asia/Kolkata',
        askChat,
      },
    );

    expect(askChat).toHaveBeenCalledTimes(2);
    expect(plan.scheduledFor).toBe('2026-07-28T02:30:00.000Z');
    expect(plan.readback).toMatch(/8:00\s*am/i);
    expect(plan.channels).toEqual(['DEVICE_ALERT', 'PHONE_CALL']);
    expect(plan.escalation?.maxRetries).toBe(2);
  });

  it.each([
    {
      language: 'Malayalam',
      title: 'ക്ലിനിക് അപ്പോയിന്റ്മെന്റ്',
      marker: 'ഇത് ശരിയാണോ?',
    },
    {
      language: 'Hindi',
      title: 'क्लिनिक की अपॉइंटमेंट',
      marker: 'क्या यह सही है?',
    },
  ])('builds a deterministic $language readback', async ({ language, title, marker }) => {
    const askChat = vi.fn().mockResolvedValue(
      JSON.stringify({
        type: 'APPOINTMENT_REMINDER',
        title,
        reminderText: title,
        scheduledLocal: '2026-07-28T08:00:00',
        recurrence: { frequency: 'ONCE' },
        confidence: 0.95,
      }),
    );
    const plan = await planReminder(title, {
      now: new Date('2026-07-27T12:00:00.000Z'),
      timezone: 'Asia/Kolkata',
      language,
      askChat,
    });

    expect(plan.readback).toContain(title);
    expect(plan.readback).toContain(marker);
    expect(plan.scheduledFor).toBe('2026-07-28T02:30:00.000Z');
  });

  it('calls only on a retry and preserves the alert when the provider fails', async () => {
    const now = () => new Date('2026-07-27T08:00:00.000Z');
    const stored = routineStore(now).create({
      type: 'APPOINTMENT_REMINDER',
      title: 'Clinic appointment',
      scheduledFor: now().toISOString(),
      channels: ['DEVICE_ALERT', 'PHONE_CALL'],
    });
    const phone = vi.fn(async () => {
      throw new Error('provider unavailable');
    });
    const adapter = new CompanionChannel(channel('IN_APP'), channel('PHONE_CALL', phone));

    expect((await adapter.startCheckIn(stored)).channel).toBe('IN_APP');
    expect(phone).not.toHaveBeenCalled();
    const retried = await adapter.startCheckIn({ ...stored, retryCount: 1 });
    expect(phone).toHaveBeenCalledOnce();
    expect(retried).toMatchObject({
      channel: 'IN_APP',
      detail: 'Device alert remains active; the configured phone call failed closed.',
    });
  });

  it('reschedules a recurring reminder only after explicit completion', async () => {
    const clock = new Date('2026-07-27T08:00:00.000Z');
    const now = () => new Date(clock);
    const service = new RoutineService(
      routineStore(now),
      channel('IN_APP'),
      new DemoNotificationAdapter(now),
      { now },
    );
    const created = service.create({
      type: 'MEAL_REMINDER',
      scheduledFor: clock.toISOString(),
      recurrence: { frequency: 'DAILY' },
    });
    await service.triggerDue();
    const completed = service.complete(created.id, 'done');

    expect(completed).toMatchObject({
      state: 'SCHEDULED',
      scheduledFor: '2026-07-28T08:00:00.000Z',
      retryCount: 0,
    });
    expect(completed.history.map((event) => event.type).slice(-2)).toEqual([
      'COMPLETED',
      'RESCHEDULED',
    ]);
  });
});

describe('Exotel boundary', () => {
  const configuredEnvironment: NodeJS.ProcessEnv = {
    NODE_ENV: 'test',
    THUNA_ENABLE_REAL_TELEPHONY: 'true',
    EXOTEL_API_KEY: 'test-api-key',
    EXOTEL_API_TOKEN: 'test-api-token',
    EXOTEL_ACCOUNT_SID: 'test-account',
    EXOTEL_CALLER_ID: '08012345678',
    THUNA_ELDER_PHONE_NUMBER: '+919800000000',
    EXOTEL_VOICEBOT_FLOW_URL: 'https://my.exotel.com/example-flow',
    EXOTEL_API_BASE: 'https://api.in.exotel.com',
    THUNA_PUBLIC_BASE_URL: 'https://thuna.example',
  };

  it('requires the explicit real-telephony feature flag', () => {
    expect(
      ExotelVoiceCallChannel.fromEnv({
        ...configuredEnvironment,
        THUNA_ENABLE_REAL_TELEPHONY: 'false',
      }),
    ).toBeNull();
  });

  it('sends minimum-disclosure campaign data and captures the provider id', async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          response: [{ status: 'success', data: { id: 'campaign-123' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const adapter = ExotelVoiceCallChannel.fromEnv(
      configuredEnvironment,
      fetcher as unknown as typeof fetch,
    );
    expect(adapter).not.toBeNull();
    const now = () => new Date('2026-07-27T08:00:00.000Z');
    const routine = routineStore(now).create({
      type: 'MEDICINE_REMINDER',
      title: 'Sensitive medicine name',
      scheduledFor: now().toISOString(),
      channels: ['DEVICE_ALERT', 'PHONE_CALL'],
    });

    const result = await adapter!.startCheckIn(routine);
    const [endpoint, request] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const body = String(request.body);
    expect(endpoint).toBe(
      'https://api.in.exotel.com/v2/accounts/test-account/campaigns',
    );
    expect(body).toContain(routine.id);
    expect(body).toContain('MEDICINE_REMINDER');
    expect(body).not.toContain(routine.title);
    expect(body).not.toContain(routine.reminderText);
    expect(body).not.toContain('test-api-token');
    expect(result).toMatchObject({
      channel: 'PHONE_CALL',
      simulated: false,
      externalId: 'campaign-123',
    });
  });

  it('rejects an unauthorised voice outcome without exposing details', async () => {
    process.env.THUNA_TELEPHONY_WEBHOOK_SECRET = 'a'.repeat(40);
    const { POST } = await import('../app/api/telephony/outcome/route');
    const response = await POST(
      new Request('http://localhost/api/telephony/outcome', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${'b'.repeat(40)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routineId: '73a77c84-3d37-47ef-9737-711af3f293ea',
          outcome: 'completed',
        }),
      }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { message: 'Unauthorised.' } });
  });

  it('keeps only redacted Exotel delivery evidence from a status callback', () => {
    const evidence = parseExotelDeliveryEvidence(
      JSON.stringify({
        campaign_sid: 'campaign-private-reference',
        call_sid: 'call-private-reference',
        number: '+919876543210',
        status: 'completed',
      }),
      'application/json',
      new Date('2026-07-27T08:00:00.000Z'),
    );

    expect(evidence).toMatchObject({
      provider: 'EXOTEL',
      kind: 'CALL_STATUS',
      status: 'completed',
      recordedAt: '2026-07-27T08:00:00.000Z',
    });
    expect(JSON.stringify(evidence)).not.toContain('+919876543210');
    expect(JSON.stringify(evidence)).not.toContain('campaign-private-reference');
  });
});
