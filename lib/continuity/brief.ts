import type { Routine } from '../routines/types';
import { isQuietHours } from './reminder-policy';
import type {
  ContinuityDocument,
  DailyBrief,
  DailyBriefItem,
  LifeEvent,
} from './types';

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function eventDate(event: LifeEvent): string | undefined {
  const value = event.fields.find((field) => field.key === 'date')?.value;
  return typeof value === 'string' ? value : undefined;
}

function eventDetail(event: LifeEvent): string {
  const details = event.fields
    .filter((field) => field.value !== null)
    .map((field) => `${field.key}: ${field.value}${field.unit ? ` ${field.unit}` : ''}`);
  return details.join(', ') || 'Saved event';
}

function eventCategory(event: LifeEvent): DailyBriefItem['category'] {
  if (event.type === 'BILL') return 'BILL';
  if (event.type === 'DELIVERY') return 'DELIVERY';
  if (event.type === 'FAMILY_EVENT' || event.type === 'WEDDING' || event.type === 'BIRTHDAY') {
    return 'FAMILY';
  }
  return 'EVENT';
}

function isOpenEvent(event: LifeEvent): boolean {
  return !['COMPLETED', 'CANCELLED', 'MISSED'].includes(event.state);
}

function isOpenRoutine(routine: Routine): boolean {
  return !['COMPLETED', 'CANCELLED', 'MISSED'].includes(routine.state);
}

export function buildDailyBrief(input: {
  document: ContinuityDocument;
  routines: Routine[];
  now: Date;
  onDemand?: boolean;
  maxItems?: number;
}): DailyBrief {
  const generatedAt = input.now.toISOString();
  if (!input.onDemand && !input.document.dailyBriefEnabled) {
    return {
      generatedAt,
      deferredForQuietHours: false,
      items: [],
      omittedCount: 0,
      spokenSummary: null,
    };
  }
  if (!input.onDemand && isQuietHours(input.now, input.document.quietHours)) {
    return {
      generatedAt,
      deferredForQuietHours: true,
      items: [],
      omittedCount: 0,
      spokenSummary: null,
    };
  }

  const candidates: DailyBriefItem[] = [
    ...input.document.lifeEvents.filter(isOpenEvent).map((event) => ({
      id: event.id,
      category: eventCategory(event),
      title: event.title,
      detail: eventDetail(event),
      dueAt: eventDate(event),
      priority: event.type === 'BILL' ? 100 : event.type === 'DELIVERY' ? 75 : 65,
      dedupKey: `life:${normalized(event.title)}:${eventDate(event) ?? ''}`,
    })),
    ...input.document.pendingLoops
      .filter((loop) => !['COMPLETED', 'CANCELLED'].includes(loop.state))
      .map((loop) => ({
        id: loop.id,
        category: 'PENDING_PROMISE' as const,
        title: loop.description,
        detail: `Follow up ${loop.trigger.stated}.`,
        dueAt: loop.dueAt,
        priority: 80,
        dedupKey: `loop:${normalized(loop.description)}:${loop.dueAt ?? loop.trigger.kind}`,
      })),
    ...input.routines.filter(isOpenRoutine).map((routine) => ({
      id: routine.id,
      category: 'ROUTINE' as const,
      title: routine.title,
      detail: routine.reminderText,
      dueAt: routine.scheduledFor,
      priority: routine.type === 'MEDICINE_REMINDER' ? 95 : 60,
      dedupKey: `routine:${normalized(routine.title)}:${routine.scheduledFor.slice(0, 10)}`,
    })),
    ...input.document.familyRequests
      .filter((request) => !['COMPLETED', 'ELDER_CONFIRMED', 'CANCELLED'].includes(request.state))
      .map((request) => ({
        id: request.id,
        category: 'FAMILY' as const,
        title: 'Family attention request',
        detail: request.purpose,
        dueAt: request.scheduledFor,
        priority: 70,
        dedupKey: `family:${normalized(request.purpose)}:${request.scheduledFor ?? ''}`,
      })),
  ];

  const unique = new Map<string, DailyBriefItem>();
  for (const item of candidates) {
    const existing = unique.get(item.dedupKey);
    if (!existing || item.priority > existing.priority) unique.set(item.dedupKey, item);
  }

  const sorted = [...unique.values()].sort((left, right) => {
    if (left.priority !== right.priority) return right.priority - left.priority;
    const leftDue = left.dueAt ? Date.parse(left.dueAt) : Number.POSITIVE_INFINITY;
    const rightDue = right.dueAt ? Date.parse(right.dueAt) : Number.POSITIVE_INFINITY;
    return leftDue - rightDue;
  });
  const maxItems = input.maxItems ?? 3;
  const items = sorted.slice(0, maxItems);

  return {
    generatedAt,
    deferredForQuietHours: false,
    items,
    omittedCount: Math.max(0, sorted.length - items.length),
    spokenSummary: items.length
      ? `Here is your daily brief. ${items.map((item) => `${item.title}: ${item.detail}`).join(' ')}`
      : null,
  };
}
