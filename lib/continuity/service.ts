import { randomUUID } from 'node:crypto';
import { isConfirmation } from '../command-parser';
import type { NotificationAdapter, NotificationResult } from '../notifications/types';
import { quickCheck } from '../router';
import { isExplicitCompletion } from '../routines/safety';
import type { Routine } from '../routines/types';
import { buildDailyBrief } from './brief';
import {
  buildCandidate,
  lifeEventTypeFor,
  renderCandidateReadback,
  triggerForPromise,
} from './classification';
import { ContinuityError } from './errors';
import { remindersFor } from './reminder-policy';
import { ContinuityStore } from './store';
import type {
  CandidateField,
  CaptureSource,
  ContinuitySnapshot,
  DailyBrief,
  FamilyAttentionRequest,
  FamilyContentConsent,
  FamilyRequestState,
  InboxCandidate,
  LifeEvent,
  PendingLoop,
} from './types';

interface ContinuityServiceOptions {
  now?: () => Date;
  createId?: () => string;
  listRoutines?: () => Routine[];
  authorizeFamilyRequest?: (request: FamilyAttentionRequest) => void;
}

function fieldValue(
  fields: CandidateField[],
  key: string,
): string | number | boolean | null | undefined {
  return fields.find((field) => field.key === key)?.value;
}

function correctedValue(key: string, value: CandidateField['value']): CandidateField['value'] {
  if (key !== 'date' || typeof value !== 'string') return value;
  if (/^20\d{2}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T09:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return value;
}

export class ContinuityService {
  private readonly now: () => Date;
  private readonly createId: () => string;
  private readonly listRoutines: () => Routine[];
  private readonly authorizeFamilyRequest: (request: FamilyAttentionRequest) => void;
  private readonly candidates = new Map<string, InboxCandidate>();

  constructor(
    private readonly store: ContinuityStore,
    private readonly notifications: NotificationAdapter,
    options: ContinuityServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? randomUUID;
    this.listRoutines = options.listRoutines ?? (() => []);
    this.authorizeFamilyRequest = options.authorizeFamilyRequest ?? (() => undefined);
  }

  snapshot(): ContinuitySnapshot {
    this.expireCandidates();
    return {
      ...this.store.snapshot(),
      candidates: [...this.candidates.values()].map((candidate) => structuredClone(candidate)),
    };
  }

  reset(): ContinuitySnapshot {
    this.candidates.clear();
    this.store.reset();
    return this.snapshot();
  }

  intake(text: string, source: CaptureSource): InboxCandidate {
    if (!text.trim()) {
      throw new ContinuityError('INVALID_INPUT', 'Please say or type what Thuna should remember.');
    }
    if (quickCheck(text)?.type === 'risky') {
      throw new ContinuityError(
        'INVALID_INPUT',
        'Thuna will not accept or remember OTP, PIN, CVV, password, card-number, or other secret values.',
      );
    }
    if (text.length > 1_000) {
      throw new ContinuityError('INVALID_INPUT', 'Remember-this input must be 1,000 characters or fewer.');
    }
    const candidate = buildCandidate(this.createId(), text, source, this.now());
    this.candidates.set(candidate.id, candidate);
    return structuredClone(candidate);
  }

  getCandidate(id: string): InboxCandidate {
    this.expireCandidates();
    const candidate = this.candidates.get(id);
    if (!candidate) throw new ContinuityError('NOT_FOUND', 'Remember-this candidate was not found.', 404);
    return structuredClone(candidate);
  }

  correctCandidate(
    id: string,
    key: string,
    value: CandidateField['value'],
  ): InboxCandidate {
    const candidate = this.getCandidate(id);
    const previous = candidate.fields.find((field) => field.key === key);
    const nextValue = correctedValue(key, value);
    if (previous) {
      previous.correctedFrom = previous.value;
      previous.value = nextValue;
      previous.source = 'ELDER_CORRECTION';
      previous.status = 'CORRECTED';
      previous.confidence = 1;
      previous.correctedAt = this.now().toISOString();
    } else {
      candidate.fields.push({
        key,
        value: nextValue,
        source: 'ELDER_CORRECTION',
        confidence: 1,
        status: 'CORRECTED',
        correctedAt: this.now().toISOString(),
      });
    }
    candidate.revision += 1;
    candidate.readback = renderCandidateReadback(candidate);
    this.candidates.set(id, candidate);
    return structuredClone(candidate);
  }

  rejectCandidate(id: string): InboxCandidate {
    const candidate = this.getCandidate(id);
    candidate.state = 'REJECTED';
    this.candidates.delete(id);
    return candidate;
  }

  confirmCandidate(
    id: string,
    explicitResponse: string | undefined,
  ): { candidate: InboxCandidate; lifeEvent?: LifeEvent; pendingLoop?: PendingLoop; familyRequest?: FamilyAttentionRequest } {
    if (!isConfirmation(explicitResponse ?? '')) {
      throw new ContinuityError(
        'CONFIRMATION_REQUIRED',
        'A clear elder confirmation is required before this is remembered.',
        409,
      );
    }
    const candidate = this.getCandidate(id);
    candidate.fields = candidate.fields.map((field) => ({
      ...field,
      status: field.status === 'CORRECTED' ? 'CORRECTED' : 'CONFIRMED',
      rawText: undefined,
    }));

    let created:
      | { lifeEvent: LifeEvent }
      | { pendingLoop: PendingLoop }
      | { familyRequest: FamilyAttentionRequest }
      | Record<string, never> = {};
    if (candidate.classification === 'LIFE_EVENT' || candidate.classification === 'BILL') {
      created = { lifeEvent: this.persistLifeEvent(candidate) };
    } else if (candidate.classification === 'PENDING_PROMISE') {
      created = { pendingLoop: this.persistPendingLoop(candidate) };
    } else if (candidate.classification === 'FAMILY_REQUEST') {
      created = { familyRequest: this.persistFamilyRequest(candidate) };
    }

    this.candidates.delete(id);
    return { candidate, ...created };
  }

  correctLifeEvent(
    id: string,
    key: string,
    value: CandidateField['value'],
    explicitResponse: string | undefined,
  ): LifeEvent {
    if (!isConfirmation(explicitResponse ?? '')) {
      throw new ContinuityError(
        'CONFIRMATION_REQUIRED',
        'Please confirm the corrected event before replacing the saved version.',
        409,
      );
    }
    const document = this.store.snapshot();
    const previous = document.lifeEvents.find((event) => event.id === id);
    if (!previous) throw new ContinuityError('NOT_FOUND', 'Life event was not found.', 404);
    if (previous.memory.supersededBy || previous.state === 'CANCELLED') {
      throw new ContinuityError('INVALID_TRANSITION', 'Only the current event can be corrected.', 409);
    }

    const now = this.now().toISOString();
    const replacementId = this.createId();
    const fields = structuredClone(previous.fields);
    const field = fields.find((item) => item.key === key);
    const nextValue = correctedValue(key, value);
    if (field) {
      field.correctedFrom = field.value;
      field.value = nextValue;
      field.source = 'ELDER_CORRECTION';
      field.status = 'CORRECTED';
      field.confidence = 1;
      field.correctedAt = now;
    } else {
      fields.push({
        key,
        value: nextValue,
        source: 'ELDER_CORRECTION',
        status: 'CORRECTED',
        confidence: 1,
        correctedAt: now,
      });
    }
    const replacement: LifeEvent = {
      ...structuredClone(previous),
      id: replacementId,
      state: 'CONFIRMED',
      fields,
      reminders: remindersFor(replacementId, previous.type, fields, document.quietHours),
      completion: undefined,
      memory: {
        ...structuredClone(previous.memory),
        supersedesId: id,
        supersededBy: undefined,
      },
      createdAt: now,
      updatedAt: now,
      history: [{
        id: this.createId(),
        at: now,
        event: 'CORRECTED_AND_CONFIRMED',
        detail: `Field ${key} was corrected; this record supersedes ${id}.`,
      }],
    };
    this.store.update((next) => {
      const original = next.lifeEvents.find((event) => event.id === id);
      if (!original) throw new ContinuityError('NOT_FOUND', 'Life event was not found.', 404);
      original.state = 'CANCELLED';
      original.memory.supersededBy = replacement.id;
      original.updatedAt = now;
      original.reminders = original.reminders.map((reminder) => ({
        ...reminder,
        state: 'CANCELLED',
      }));
      original.history.push({
        id: this.createId(),
        at: now,
        event: 'SUPERSEDED',
        detail: `Replaced by corrected event ${replacement.id}.`,
      });
      next.lifeEvents.push(replacement);
    });
    return structuredClone(replacement);
  }

  completeLifeEvent(id: string, explicitResponse: string | undefined): LifeEvent {
    const existing = this.store.snapshot().lifeEvents.find((event) => event.id === id);
    if (!existing) throw new ContinuityError('NOT_FOUND', 'Life event was not found.', 404);
    const explicitlyPaid = existing.type === 'BILL'
      && /^(?:yes[,.!\s]*)?(?:i paid it|paid|the bill is paid|it is paid)$/i.test(
        explicitResponse?.trim() ?? '',
      );
    const explicitlyCompleted = existing.type === 'BILL'
      ? explicitlyPaid
      : isExplicitCompletion(explicitResponse);
    if (!explicitlyCompleted) {
      throw new ContinuityError(
        'CONFIRMATION_REQUIRED',
        existing.type === 'BILL'
          ? 'The elder must explicitly say the bill was paid; silence or acknowledgement is not payment.'
          : 'The elder must explicitly say the event is complete.',
        409,
      );
    }
    return this.updateLifeEvent(id, (event, now) => {
      if (['COMPLETED', 'CANCELLED'].includes(event.state)) {
        throw new ContinuityError('INVALID_TRANSITION', 'This event is already closed.', 409);
      }
      event.state = 'COMPLETED';
      event.completion = { completedAt: now, method: 'ELDER_CONFIRMED' };
      event.reminders = event.reminders.map((reminder) => ({
        ...reminder,
        state: 'CANCELLED',
      }));
      this.appendHistory(event, 'COMPLETED', 'Elder explicitly confirmed completion.', now);
    });
  }

  snoozeLifeEvent(id: string, minutes: number): LifeEvent {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new ContinuityError('INVALID_INPUT', 'Snooze minutes must be positive.');
    }
    return this.updateLifeEvent(id, (event, now) => {
      if (['COMPLETED', 'CANCELLED'].includes(event.state)) {
        throw new ContinuityError('INVALID_TRANSITION', 'A closed event cannot be snoozed.', 409);
      }
      event.state = 'SNOOZED';
      event.reminders.push({
        id: this.createId(),
        scheduledFor: new Date(Date.parse(now) + minutes * 60_000).toISOString(),
        purpose: `Elder requested a ${minutes}-minute reminder.`,
        dedupKey: `${event.id}:snooze:${event.history.length}`,
        priority: 90,
        state: 'SNOOZED',
      });
      this.appendHistory(event, 'SNOOZED', `Snoozed for ${minutes} minutes.`, now);
    });
  }

  cancelLifeEvent(id: string): LifeEvent {
    return this.updateLifeEvent(id, (event, now) => {
      if (event.state === 'COMPLETED') {
        throw new ContinuityError('INVALID_TRANSITION', 'A completed event cannot be cancelled.', 409);
      }
      event.state = 'CANCELLED';
      event.reminders = event.reminders.map((reminder) => ({ ...reminder, state: 'CANCELLED' }));
      this.appendHistory(event, 'CANCELLED', 'Elder cancelled the event.', now);
    });
  }

  snoozePendingLoop(id: string, minutes: number): PendingLoop {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new ContinuityError('INVALID_INPUT', 'Snooze minutes must be positive.');
    }
    return this.updatePendingLoop(id, (loop, now) => {
      if (['COMPLETED', 'CANCELLED'].includes(loop.state)) {
        throw new ContinuityError('INVALID_TRANSITION', 'A closed promise cannot be snoozed.', 409);
      }
      loop.state = 'SNOOZED';
      loop.snoozeCount += 1;
      loop.dueAt = new Date(Date.parse(now) + minutes * 60_000).toISOString();
      loop.trigger = { kind: 'AT_TIME', at: loop.dueAt, stated: `in ${minutes} minutes` };
      this.appendHistory(loop, 'SNOOZED', `Snoozed for ${minutes} minutes.`, now);
    });
  }

  completePendingLoop(id: string, explicitResponse: string | undefined): PendingLoop {
    if (!isExplicitCompletion(explicitResponse)) {
      throw new ContinuityError(
        'CONFIRMATION_REQUIRED',
        'Silence does not complete a pending promise.',
        409,
      );
    }
    return this.updatePendingLoop(id, (loop, now) => {
      if (['COMPLETED', 'CANCELLED'].includes(loop.state)) {
        throw new ContinuityError('INVALID_TRANSITION', 'This promise is already closed.', 409);
      }
      loop.state = 'COMPLETED';
      loop.completion = { completedAt: now, method: 'ELDER_CONFIRMED' };
      this.appendHistory(loop, 'COMPLETED', 'Elder explicitly confirmed completion.', now);
    });
  }

  cancelPendingLoop(id: string): PendingLoop {
    return this.updatePendingLoop(id, (loop, now) => {
      if (loop.state === 'COMPLETED') {
        throw new ContinuityError('INVALID_TRANSITION', 'A completed promise cannot be cancelled.', 409);
      }
      loop.state = 'CANCELLED';
      this.appendHistory(loop, 'CANCELLED', 'Elder cancelled the pending promise.', now);
    });
  }

  setFamilyContentConsent(input: {
    contactId: string;
    granted: boolean;
    explicitApproval: boolean;
  }): FamilyContentConsent {
    if (!input.contactId.trim()) {
      throw new ContinuityError('INVALID_INPUT', 'A family contact is required.');
    }
    if (!input.explicitApproval) {
      throw new ContinuityError(
        'CONSENT_REQUIRED',
        'The elder must explicitly approve this family sharing choice.',
        403,
      );
    }
    const now = this.now().toISOString();
    let result: FamilyContentConsent | undefined;
    this.store.update((document) => {
      const existing = document.familyContentConsent.find(
        (consent) => consent.contactId === input.contactId,
      );
      const previousConsent = existing?.granted ?? false;
      result = {
        contactId: input.contactId,
        category: 'CONSENTED_FAMILY_CONTENT',
        granted: input.granted,
        grantedAt: input.granted ? now : (existing?.grantedAt ?? now),
        revokedAt: input.granted ? undefined : now,
      };
      if (existing) Object.assign(existing, result);
      else document.familyContentConsent.push(result);
      document.consentHistory.push({
        id: this.createId(),
        contactId: input.contactId,
        category: 'CONSENTED_FAMILY_CONTENT',
        previousConsent,
        nextConsent: input.granted,
        changedAt: now,
        source: 'ELDER_EXPLICIT_APPROVAL',
      });
    });
    return structuredClone(result!);
  }

  createFamilyRequest(input: {
    contactId: string;
    purpose: string;
    disclosure?: string;
    explicitApproval: boolean;
  }): FamilyAttentionRequest {
    if (!input.explicitApproval) {
      throw new ContinuityError('CONSENT_REQUIRED', 'The elder must explicitly request family attention.', 403);
    }
    if (!input.contactId.trim() || !input.purpose.trim()) {
      throw new ContinuityError('INVALID_INPUT', 'A contact and purpose are required.');
    }
    const now = this.now().toISOString();
    const request: FamilyAttentionRequest = {
      id: this.createId(),
      contactId: input.contactId,
      purpose: input.purpose.trim(),
      disclosure: input.disclosure?.trim() || 'The elder asked for a family follow-up.',
      state: 'REQUESTED',
      elderApprovedAt: now,
      createdAt: now,
      updatedAt: now,
      history: [{
        id: this.createId(),
        at: now,
        event: 'REQUESTED',
        detail: 'Elder explicitly requested family attention.',
      }],
    };
    this.store.update((document) => document.familyRequests.push(request));
    return structuredClone(request);
  }

  async offerFamilyRequest(id: string): Promise<{
    request: FamilyAttentionRequest;
    notification: NotificationResult;
  }> {
    const document = this.store.snapshot();
    const request = document.familyRequests.find((item) => item.id === id);
    if (!request) throw new ContinuityError('NOT_FOUND', 'Family request was not found.', 404);
    const consent = document.familyContentConsent.find(
      (item) => item.contactId === request.contactId && item.granted,
    );
    if (!consent) {
      throw new ContinuityError(
        'CONSENT_REQUIRED',
        'Family-content consent is required for this contact.',
        403,
      );
    }
    if (request.state !== 'REQUESTED') {
      throw new ContinuityError('INVALID_TRANSITION', 'Only a requested item can be offered.', 409);
    }
    this.authorizeFamilyRequest(request);
    const notification = await this.notifications.notifyFamily({
      routineId: request.id,
      routineType: 'FAMILY_ATTENTION',
      message: request.disclosure,
      category: 'CONSENTED_FAMILY_CONTENT',
      contactId: request.contactId,
      minimumDisclosure: true,
      elderApproved: true,
    });
    const updated = this.transitionFamilyRequest(
      id,
      'OFFERED',
      'Minimum-disclosure family notification accepted by the adapter.',
    );
    return { request: updated, notification };
  }

  transitionFamilyRequest(
    id: string,
    target: FamilyRequestState,
    detail?: string,
    scheduledFor?: string,
    explicitResponse?: string,
  ): FamilyAttentionRequest {
    const allowed: Record<FamilyRequestState, FamilyRequestState[]> = {
      REQUESTED: ['OFFERED', 'CANCELLED'],
      OFFERED: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
      SCHEDULED: ['COMPLETED', 'CANCELLED'],
      COMPLETED: ['ELDER_CONFIRMED'],
      ELDER_CONFIRMED: [],
      CANCELLED: [],
    };
    let result: FamilyAttentionRequest | undefined;
    const now = this.now().toISOString();
    this.store.update((document) => {
      const request = document.familyRequests.find((item) => item.id === id);
      if (!request) throw new ContinuityError('NOT_FOUND', 'Family request was not found.', 404);
      if (!allowed[request.state].includes(target)) {
        throw new ContinuityError(
          'INVALID_TRANSITION',
          `${request.state} cannot transition to ${target}.`,
          409,
        );
      }
      if (target === 'ELDER_CONFIRMED' && !isConfirmation(explicitResponse ?? '')) {
        throw new ContinuityError(
          'CONFIRMATION_REQUIRED',
          'The elder must confirm that the family follow-up happened.',
          409,
        );
      }
      if (target === 'SCHEDULED') {
        if (!scheduledFor || Number.isNaN(Date.parse(scheduledFor))) {
          throw new ContinuityError('INVALID_INPUT', 'A valid family follow-up time is required.');
        }
        request.scheduledFor = scheduledFor;
      }
      request.state = target;
      request.updatedAt = now;
      request.history.push({
        id: this.createId(),
        at: now,
        event: target,
        detail: detail ?? `Family attention moved to ${target.toLowerCase()}.`,
      });
      result = structuredClone(request);
    });
    return result!;
  }

  dailyBrief(onDemand = false): DailyBrief {
    return buildDailyBrief({
      document: this.store.snapshot(),
      routines: this.listRoutines(),
      now: this.now(),
      onDemand,
    });
  }

  private persistLifeEvent(candidate: InboxCandidate): LifeEvent {
    const document = this.store.snapshot();
    const now = this.now().toISOString();
    const id = this.createId();
    const type = lifeEventTypeFor(candidate.capturedText, candidate.classification);
    const event: LifeEvent = {
      id,
      type,
      state: 'CONFIRMED',
      title: candidate.title,
      fields: structuredClone(candidate.fields),
      reminders: remindersFor(id, type, candidate.fields, document.quietHours),
      memory: {
        source: structuredClone(candidate.source),
        confidence: 'CONFIRMED',
        sharingScope: 'ELDER_ONLY',
      },
      createdAt: now,
      updatedAt: now,
      history: [{
        id: this.createId(),
        at: now,
        event: 'CONFIRMED',
        detail: 'Saved only after elder read-back and confirmation.',
      }],
    };
    this.store.update((next) => next.lifeEvents.push(event));
    return structuredClone(event);
  }

  private persistPendingLoop(candidate: InboxCandidate): PendingLoop {
    const nowDate = this.now();
    const now = nowDate.toISOString();
    const trigger = triggerForPromise(candidate.capturedText, nowDate);
    const loop: PendingLoop = {
      id: this.createId(),
      description: candidate.title,
      originalUtterance: candidate.capturedText,
      state: trigger.at ? 'SCHEDULED' : 'OPEN',
      trigger,
      dueAt: trigger.at,
      snoozeCount: 0,
      memory: {
        source: structuredClone(candidate.source),
        confidence: 'CONFIRMED',
        sharingScope: 'ELDER_ONLY',
      },
      consentRequired: false,
      createdAt: now,
      updatedAt: now,
      history: [{
        id: this.createId(),
        at: now,
        event: 'CONFIRMED',
        detail: 'Pending promise saved after elder confirmation.',
      }],
    };
    this.store.update((document) => document.pendingLoops.push(loop));
    return structuredClone(loop);
  }

  private persistFamilyRequest(candidate: InboxCandidate): FamilyAttentionRequest {
    const contactId = String(fieldValue(candidate.fields, 'contactId') ?? 'family');
    return this.createFamilyRequest({
      contactId,
      purpose: candidate.capturedText,
      explicitApproval: true,
    });
  }

  private updateLifeEvent(
    id: string,
    mutate: (event: LifeEvent, now: string) => void,
  ): LifeEvent {
    let result: LifeEvent | undefined;
    const now = this.now().toISOString();
    this.store.update((document) => {
      const event = document.lifeEvents.find((item) => item.id === id);
      if (!event) throw new ContinuityError('NOT_FOUND', 'Life event was not found.', 404);
      mutate(event, now);
      event.updatedAt = now;
      result = structuredClone(event);
    });
    return result!;
  }

  private updatePendingLoop(
    id: string,
    mutate: (loop: PendingLoop, now: string) => void,
  ): PendingLoop {
    let result: PendingLoop | undefined;
    const now = this.now().toISOString();
    this.store.update((document) => {
      const loop = document.pendingLoops.find((item) => item.id === id);
      if (!loop) throw new ContinuityError('NOT_FOUND', 'Pending promise was not found.', 404);
      mutate(loop, now);
      loop.updatedAt = now;
      result = structuredClone(loop);
    });
    return result!;
  }

  private appendHistory(
    subject: Pick<LifeEvent | PendingLoop, 'history'>,
    event: string,
    detail: string,
    at: string,
  ): void {
    subject.history.push({ id: this.createId(), at, event, detail });
  }

  private expireCandidates(): void {
    const now = this.now().getTime();
    for (const [id, candidate] of this.candidates.entries()) {
      if (Date.parse(candidate.expiresAt) <= now) this.candidates.delete(id);
    }
  }
}
