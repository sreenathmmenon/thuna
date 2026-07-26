import { beforeEach, describe, expect, it } from 'vitest';
import { DemoNotificationAdapter } from '../lib/notifications/console';
import { buildDailyBrief } from '../lib/continuity/brief';
import { classifyContinuityInput } from '../lib/continuity/classification';
import { ContinuityError } from '../lib/continuity/errors';
import { createCheckpoint, decideResume } from '../lib/continuity/resume';
import { ContinuityService } from '../lib/continuity/service';
import { ContinuityStore, emptyContinuityDocument } from '../lib/continuity/store';

describe('continuity companion foundations', () => {
  let clock: Date;
  let id: number;
  let notifications: DemoNotificationAdapter;
  let service: ContinuityService;

  const now = () => new Date(clock);
  const createId = () => `continuity-${++id}`;

  beforeEach(() => {
    clock = new Date('2026-07-26T08:00:00.000Z');
    id = 0;
    notifications = new DemoNotificationAdapter(now);
    service = new ContinuityService(
      new ContinuityStore(),
      notifications,
      { now, createId },
    );
  });

  it('creates a confirmed wedding event only after elder read-back approval', () => {
    const candidate = service.intake(
      'Meera and Arun wedding at Guruvayur on 2026-08-09',
      'VOICE',
    );
    expect(candidate.classification).toBe('LIFE_EVENT');
    expect(candidate.state).toBe('CANDIDATE');
    expect(service.snapshot().lifeEvents).toHaveLength(0);

    const result = service.confirmCandidate(candidate.id, 'Yes');
    expect(result.lifeEvent).toMatchObject({
      type: 'WEDDING',
      state: 'CONFIRMED',
      memory: {
        source: { source: 'VOICE' },
        confidence: 'CONFIRMED',
      },
    });
    expect(result.lifeEvent?.reminders).toHaveLength(3);
  });

  it('corrects only the wedding date before saving', () => {
    const candidate = service.intake(
      'Meera and Arun wedding at Guruvayur on 2026-08-09',
      'TYPED',
    );
    const people = candidate.fields.find((field) => field.key === 'people');
    const venue = candidate.fields.find((field) => field.key === 'venue');
    const corrected = service.correctCandidate(candidate.id, 'date', '2026-08-10');

    expect(corrected.fields.find((field) => field.key === 'people')).toEqual(people);
    expect(corrected.fields.find((field) => field.key === 'venue')).toEqual(venue);
    expect(corrected.fields.find((field) => field.key === 'date')).toMatchObject({
      source: 'ELDER_CORRECTION',
      status: 'CORRECTED',
      correctedFrom: expect.stringContaining('2026-08-09'),
      value: expect.stringContaining('2026-08-10'),
    });
  });

  it('retains source provenance and removes raw extraction text from persisted facts', () => {
    const candidate = service.intake('Electricity bill Rs 840 due 2026-08-01', 'TYPED');
    const event = service.confirmCandidate(candidate.id, 'Correct').lifeEvent!;
    expect(event.memory.source).toEqual({
      source: 'TYPED',
      capturedAt: clock.toISOString(),
    });
    expect(event.fields.every((field) => field.rawText === undefined)).toBe(true);
  });

  it('creates due reminders for a confirmed bill', () => {
    const candidate = service.intake('Electricity bill Rs 840 due 2026-08-01', 'TYPED');
    const bill = service.confirmCandidate(candidate.id, 'Yes').lifeEvent!;
    expect(bill.type).toBe('BILL');
    expect(bill.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'provider', value: 'Electricity' }),
      expect.objectContaining({ key: 'amount', value: 840, unit: 'INR' }),
    ]));
    expect(bill.reminders.map((reminder) => reminder.purpose)).toEqual([
      'Bill is due in three days.',
      'Bill is due today.',
    ]);
  });

  it('does not mark a bill paid from silence', () => {
    const candidate = service.intake('Water bill Rs 300 due 2026-08-01', 'VOICE');
    const bill = service.confirmCandidate(candidate.id, 'Yes').lifeEvent!;
    expect(() => service.completeLifeEvent(bill.id, '')).toThrowError(ContinuityError);
    expect(() => service.completeLifeEvent(bill.id, 'Okay')).toThrowError(/explicitly say/i);
    expect(() => service.completeLifeEvent(bill.id, 'Yes')).toThrowError(/explicitly say/i);
    expect(service.snapshot().lifeEvents[0].state).toBe('CONFIRMED');
    expect(service.completeLifeEvent(bill.id, 'I paid it').state).toBe('COMPLETED');
  });

  it('creates, snoozes and explicitly completes a pending promise', () => {
    const candidate = service.intake('Remind me after dinner', 'VOICE');
    const loop = service.confirmCandidate(candidate.id, 'Yes').pendingLoop!;
    expect(loop).toMatchObject({
      state: 'SCHEDULED',
      trigger: { kind: 'AFTER_DINNER' },
      originalUtterance: 'Remind me after dinner',
    });

    const snoozed = service.snoozePendingLoop(loop.id, 10);
    expect(snoozed).toMatchObject({ state: 'SNOOZED', snoozeCount: 1 });
    expect(() => service.completePendingLoop(loop.id, '')).toThrowError(/silence/i);
    expect(service.completePendingLoop(loop.id, 'Yes, done').state).toBe('COMPLETED');
  });

  it.each([
    ['Order my usual dosa', 'TASK'],
    ['Wedding at Guruvayur on 2026-08-09', 'LIFE_EVENT'],
    ['Medicine reminder every morning', 'ROUTINE'],
    ['Electricity bill Rs 840 due 2026-08-01', 'BILL'],
    ['Continue Wi-Fi tomorrow', 'PENDING_PROMISE'],
    ['Ask family to call me', 'FAMILY_REQUEST'],
    ['Why is this here?', 'QUESTION'],
    ['Sing a song from the radio', 'UNSUPPORTED'],
  ] as const)('classifies universal inbox input %s as %s', (text, expected) => {
    expect(classifyContinuityInput(text)).toBe(expected);
  });

  it('requires confirmation before any continuity memory is persisted', () => {
    const candidate = service.intake('Birthday on 2026-08-12', 'VOICE');
    expect(service.snapshot()).toMatchObject({
      lifeEvents: [],
      pendingLoops: [],
    });
    expect(() => service.confirmCandidate(candidate.id, 'maybe')).toThrowError(
      /clear elder confirmation/i,
    );
    expect(service.getCandidate(candidate.id).state).toBe('CANDIDATE');
  });

  it('refuses credential-bearing remember-this input before retaining a candidate', () => {
    expect(() => service.intake('Remember my PIN 1234', 'VOICE')).toThrowError(
      /will not accept or remember/i,
    );
    expect(service.snapshot().candidates).toHaveLength(0);
  });

  it('deduplicates equivalent daily brief items and preserves priority order', () => {
    for (let count = 0; count < 2; count += 1) {
      const candidate = service.intake('Electricity bill Rs 840 due 2026-08-01', 'TYPED');
      service.confirmCandidate(candidate.id, 'Yes');
    }
    const brief = service.dailyBrief(true);
    expect(brief.items).toHaveLength(1);
    expect(brief.items[0]).toMatchObject({ category: 'BILL', priority: 100 });
  });

  it('defers a scheduled daily brief during quiet hours but allows an on-demand brief', () => {
    const document = emptyContinuityDocument();
    document.dailyBriefEnabled = true;
    const quietTime = new Date(2026, 6, 26, 22, 30, 0);
    expect(buildDailyBrief({ document, routines: [], now: quietTime }).deferredForQuietHours)
      .toBe(true);
    expect(buildDailyBrief({ document, routines: [], now: quietTime, onDemand: true }))
      .toMatchObject({ deferredForQuietHours: false, spokenSummary: null });
  });

  it('keeps scheduled daily briefs off by default', () => {
    const document = emptyContinuityDocument();
    const brief = buildDailyBrief({
      document,
      routines: [],
      now: new Date(2026, 6, 26, 9, 0, 0),
    });
    expect(brief).toMatchObject({
      deferredForQuietHours: false,
      items: [],
      spokenSummary: null,
    });
  });

  it('records explicit family-content consent and sends minimum disclosure only', async () => {
    expect(() => service.setFamilyContentConsent({
      contactId: 'sree',
      granted: true,
      explicitApproval: false,
    })).toThrowError(/explicitly approve/i);

    service.setFamilyContentConsent({
      contactId: 'sree',
      granted: true,
      explicitApproval: true,
    });
    const request = service.createFamilyRequest({
      contactId: 'sree',
      purpose: 'Call about the wedding',
      disclosure: 'Appa asked for a call.',
      explicitApproval: true,
    });
    const offered = await service.offerFamilyRequest(request.id);
    expect(offered.request.state).toBe('OFFERED');
    expect(notifications.sent).toEqual([
      expect.objectContaining({
        message: 'Appa asked for a call.',
        category: 'CONSENTED_FAMILY_CONTENT',
        minimumDisclosure: true,
        elderApproved: true,
      }),
    ]);
    expect(service.snapshot().consentHistory).toEqual([
      expect.objectContaining({
        previousConsent: false,
        nextConsent: true,
        source: 'ELDER_EXPLICIT_APPROVAL',
      }),
    ]);
  });

  it('supports the requested-to-elder-confirmed family attention lifecycle', async () => {
    service.setFamilyContentConsent({
      contactId: 'sree',
      granted: true,
      explicitApproval: true,
    });
    let request = service.createFamilyRequest({
      contactId: 'sree',
      purpose: 'Help with the invitation',
      explicitApproval: true,
    });
    request = (await service.offerFamilyRequest(request.id)).request;
    request = service.transitionFamilyRequest(request.id, 'ACCEPTED');
    request = service.transitionFamilyRequest(
      request.id,
      'SCHEDULED',
      undefined,
      '2026-07-27T09:00:00.000Z',
    );
    request = service.transitionFamilyRequest(request.id, 'COMPLETED');
    expect(() => service.transitionFamilyRequest(request.id, 'ELDER_CONFIRMED'))
      .toThrowError(/elder must confirm/i);
    expect(service.transitionFamilyRequest(request.id, 'ELDER_CONFIRMED', undefined, undefined, 'Yes').state)
      .toBe('ELDER_CONFIRMED');
  });

  it('supersedes a confirmed event and invalidates its stale reminders', () => {
    const candidate = service.intake('Birthday on 2026-08-12', 'TYPED');
    const original = service.confirmCandidate(candidate.id, 'Yes').lifeEvent!;
    const replacement = service.correctLifeEvent(original.id, 'date', '2026-08-13', 'Yes');
    const events = service.snapshot().lifeEvents;

    expect(replacement.memory.supersedesId).toBe(original.id);
    expect(events.find((event) => event.id === original.id)).toMatchObject({
      state: 'CANCELLED',
      memory: { supersededBy: replacement.id },
    });
    expect(events.find((event) => event.id === original.id)?.reminders.every(
      (reminder) => reminder.state === 'CANCELLED',
    )).toBe(true);
  });
});

describe('interruption and resume contracts', () => {
  const now = new Date('2026-07-26T08:00:00.000Z');

  it('preserves confirmed fields, pending question and next safe step', () => {
    const checkpoint = createCheckpoint({
      id: 'checkpoint-1',
      subjectId: 'event-1',
      confirmedFields: { venue: 'Guruvayur' },
      pendingQuestion: 'Is the date August 9?',
      pauseReason: 'ELDER_ASKED_TO_WAIT',
      nextSafeStep: 'ASK_PENDING_QUESTION',
      stateRevision: 'revision-1',
      originChannel: 'WEB',
      now,
    });
    expect(decideResume({
      checkpoint,
      currentRevision: 'revision-1',
      targetChannel: 'WEB',
      now: new Date(now.getTime() + 1_000),
    })).toMatchObject({
      resumable: true,
      confirmedFields: { venue: 'Guruvayur' },
      pendingQuestion: 'Is the date August 9?',
      nextSafeStep: 'ASK_PENDING_QUESTION',
      staleConfirmationInvalidated: false,
    });
  });

  it('invalidates stale confirmation when resuming on the phone interface', () => {
    const checkpoint = createCheckpoint({
      id: 'checkpoint-2',
      subjectId: 'bill-1',
      confirmedFields: { provider: 'Electricity', amount: 840 },
      pauseReason: 'CHANNEL_DROPPED',
      nextSafeStep: 'RESUME',
      stateRevision: 'revision-1',
      confirmationRevision: 'confirmation-1',
      originChannel: 'WEB',
      now,
    });
    expect(decideResume({
      checkpoint,
      currentRevision: 'revision-1',
      targetChannel: 'PHONE_INTERFACE',
      now: new Date(now.getTime() + 1_000),
    })).toMatchObject({
      resumable: true,
      nextSafeStep: 'RE_READ_AND_RECONFIRM',
      staleConfirmationInvalidated: true,
    });
  });
});
