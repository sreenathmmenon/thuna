/**
 * DRAFT CONTRACT — life event adapter (the PORT, not the lifecycle)
 * =================================================================
 *
 * DOCUMENTATION ONLY. Not imported by the Thuna app. Not compiled into the build.
 *
 * ---------------------------------------------------------------------------
 * SCOPE — READ THIS FIRST
 * ---------------------------------------------------------------------------
 *
 * This file is the STORAGE / SCHEDULING / QUERY PORT for life events.
 * It is NOT the definition of the life event lifecycle.
 *
 * The lifecycle —
 *
 *     DRAFT → NEEDS_CONFIRMATION → CONFIRMED → UPCOMING → DUE → ACTIVE
 *           → COMPLETED / (and the terminal branches)
 *
 * — is defined in `docs/companion/LIFE_EVENT_SCHEMA.md` and owned by another
 * workstream. This file REFERENCES it via `LifeEventState` and deliberately adds
 * no semantics to it. If the two disagree, the schema doc wins and this file is
 * wrong.
 *
 * The same applies to the PendingLoop lifecycle (OPEN → SCHEDULED → DUE → ACTIVE
 * → COMPLETED / ...) — referenced here as a foreign key, never redefined.
 *
 * ---------------------------------------------------------------------------
 * WHY A PORT AT ALL
 * ---------------------------------------------------------------------------
 *
 * A "life event" is the elder's own thing-that-is-happening: a hospital
 * appointment, a grandchild's visit, a bill due date, a delivery expected
 * Thursday, a promise to call Priya. They arrive from many places —
 *
 *   - the elder says one aloud
 *   - a document is photographed and extracted (./document-input-adapter.ts)
 *   - a family member suggests one (elder-approved only)
 *   - a completed action creates a follow-up ("your order arrives at 7")
 *   - a calendar sync (./calendar-adapter.ts)
 *
 * — and they must all land in ONE queryable place, or the daily brief
 * (docs/companion/DAILY_LIFE_BRIEF.md) has to know about five sources and will
 * miss one. The port exists so the brief, the routine engine, and the resume
 * layer all read from a single surface.
 *
 * ---------------------------------------------------------------------------
 * THE ONE RULE THAT SHAPES THIS FILE
 * ---------------------------------------------------------------------------
 *
 * A life event is the ELDER'S record, not Thuna's dossier. Every field here is
 * something the elder would recognise as theirs and would be content to have
 * read back aloud. There is no `inferredMood`, no `attendanceLikelihood`, no
 * `riskScore`. Those are not omitted for lack of time — see MEMORY_MODEL.md §9.
 */

import type { AdapterResult } from './food-commerce-adapter.ts';
import type { PreparedActionId, CapabilityKind } from './prepared-action.ts';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type LifeEventId = string & { readonly __brand: 'LifeEventId' };
/** Owned by the pending-loop workstream. Referenced here, never defined here. */
export type PendingLoopId = string & { readonly __brand: 'PendingLoopId' };
/** Owned by the memory workstream. Referenced here, never defined here. */
export type MemoryRecordId = string & { readonly __brand: 'MemoryRecordId' };

/**
 * DEFINED IN docs/companion/LIFE_EVENT_SCHEMA.md. Mirrored here only so this
 * port can express queries and transitions. Do not add members here.
 */
export type LifeEventState =
  | 'DRAFT'
  | 'NEEDS_CONFIRMATION'
  | 'CONFIRMED'
  | 'UPCOMING'
  | 'DUE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'SNOOZED'
  | 'MISSED'
  | 'CANCELLED'
  | 'ESCALATED';

/**
 * What kind of thing this is. Drives brief grouping and priority, not behaviour —
 * behaviour comes from the lifecycle.
 */
export type LifeEventKind =
  | 'APPOINTMENT'          // doctor, bank, temple, anything with a time and a place
  | 'BILL_DUE'             // reminder ONLY. Thuna never pays — ACTION_PERMISSION_MODEL.md §7
  | 'DELIVERY_EXPECTED'
  | 'FAMILY_COMMITMENT'    // "Sree visiting Sunday"
  | 'PROMISE'              // "I'll call Priya about the water bill" — MEMORY_MODEL.md §4
  | 'ROUTINE_OCCURRENCE'   // a materialised instance of a ROUTINE_ENGINE routine
  | 'CELEBRATION'          // birthdays, anniversaries — often the most valued
  | 'TASK_FOLLOW_UP'       // "did your order arrive?"
  | 'NOTE';                // a dated thing with no action attached

/** Where this event came from. Governs trust, editing rights, and consent. */
export type LifeEventSource =
  /** The elder said it. Highest trust. */
  | 'ELDER_SPOKEN'
  /** Extracted from a photographed document. MUST be confirmed — see §extraction. */
  | 'DOCUMENT_EXTRACTION'
  /** Family proposed it. Requires elder approval before leaving NEEDS_CONFIRMATION. */
  | 'FAMILY_SUGGESTED'
  /** Created by a completed action (a placed order → a delivery follow-up). */
  | 'SYSTEM_DERIVED'
  /** Imported from a calendar the elder connected. */
  | 'CALENDAR_SYNC';

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/**
 * Life events are frequently VAGUE, and forcing precision loses information.
 * "Sometime Thursday" is a real answer, and rendering it as 00:00 Thursday makes
 * Thuna wrong in a way the elder can hear.
 *
 * `precision` lets the guidance layer say "Thursday" rather than "Thursday at
 * midnight", and lets the brief sort sensibly without inventing certainty.
 */
export interface EventTime {
  /** ISO 8601. For DAY/PART_OF_DAY precision, the anchor instant in the elder's tz. */
  at: string;
  precision: 'EXACT' | 'PART_OF_DAY' | 'DAY' | 'WEEK' | 'UNKNOWN';
  /** IANA zone, e.g. 'Asia/Kolkata'. Elder's local zone, never UTC-only. */
  timezone: string;
  /** Optional end, for things that occupy a span. */
  endsAt?: string;
  /** Pre-rendered speakable form: "Thursday morning", "the 14th". */
  spoken?: string;
}

/**
 * When to bring it up. Deliberately a LIST — a bill is worth a mention three days
 * out AND on the day, and one reminder is not the same as the other.
 *
 * Every entry is subject to quiet hours and to the elder's daily cap. A lead time
 * is a request, not a guarantee.
 */
export interface LeadTime {
  /** Minutes before `EventTime.at`. 4320 = three days. */
  minutesBefore: number;
  /** How it should surface. BRIEF entries never interrupt. */
  surface: 'BRIEF_ONLY' | 'PROACTIVE_CHECKIN';
}

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

/**
 * NOTE ON THE MEMORY ENVELOPE: the fields that every stored record shares
 * (category, sharingClass, createdAt, expiresAt, supersededBy) belong to the
 * MemoryRecord envelope owned by the memory workstream — MEMORY_MODEL.md §12.1.
 * They are NOT repeated here. A `LifeEvent` is a payload that the memory layer
 * wraps; `memoryRecordId` is the link.
 */
export interface LifeEvent {
  readonly id: LifeEventId;
  /** Link to the enveloping MemoryRecord. Envelope fields live there, not here. */
  readonly memoryRecordId?: MemoryRecordId;

  kind: LifeEventKind;
  /** Lifecycle state. Transitions are governed by LIFE_EVENT_SCHEMA.md. */
  state: LifeEventState;
  source: LifeEventSource;

  /**
   * The elder's own words wherever possible. "Appointment at Manipal, Thursday"
   * — not "MEDICAL_APPOINTMENT_2026_07_30". This is what gets spoken.
   */
  title: string;
  /** Optional extra detail, factual only. No inference, no interpretation. */
  detail?: string;

  when?: EventTime;
  /** Speakable place label. Provider PII (full addresses) is NOT stored here. */
  placeLabel?: string;

  leadTimes: LeadTime[];

  /**
   * TRUE when this event can be acted on by a capability — a BILL_DUE that could
   * be paid (it cannot, by policy), a DELIVERY_EXPECTED that can be tracked.
   * Drives whether the brief offers a next step.
   */
  actionableVia?: CapabilityKind;
  /** Link to an action the elder already prepared for this event. */
  preparedActionId?: PreparedActionId;

  /** The pending loop this event belongs to, if any. Lifecycle owned elsewhere. */
  pendingLoopId?: PendingLoopId;

  /**
   * Amount owed/expected, where the event carries one (BILL_DUE).
   * Stored as a minor-unit figure the elder told us or a document stated — NEVER
   * used to initiate a payment. See ACTION_PERMISSION_MODEL.md §7.
   */
  amountPaise?: number;

  /**
   * Only set for FAMILY_SUGGESTED. Records who proposed it, so the elder can be
   * told plainly: "Sree suggested this — shall I keep it?"
   * There is no field for "family imposed", by design.
   */
  suggestedByContactId?: string;

  /**
   * Confidence from an extraction pipeline, 0..1. Present ONLY for
   * DOCUMENT_EXTRACTION. It describes the OCR/extraction, never the elder.
   * Low confidence means ask more carefully, never means doubt the person.
   */
  extractionConfidence?: number;

  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * The query surface the daily brief is built on. Kept deliberately small: if the
 * brief needs a query this cannot express, the brief is probably doing something
 * it should not (analytics, pattern-finding, inference over time).
 */
export interface LifeEventQuery {
  states?: readonly LifeEventState[];
  kinds?: readonly LifeEventKind[];
  sources?: readonly LifeEventSource[];
  /** Inclusive window over `when.at`. */
  fromInstant?: string;
  toInstant?: string;
  /** Events with no time at all (open promises). */
  includeUndated?: boolean;
  limit?: number;
}

/**
 * A scheduling due-check result. Returned by `dueNow()`, which the scheduler
 * polls. Separated from the event so the scheduler can say WHICH lead time fired
 * — the three-days-out mention and the on-the-day mention are different messages.
 */
export interface DueLifeEvent {
  event: LifeEvent;
  /** The lead time that triggered. */
  firedLeadTime: LeadTime;
  /** TRUE when quiet hours deferred this. The scheduler must not fire it. */
  deferredForQuietHours: boolean;
  /** When it will be retried, if deferred. */
  deferredUntil?: string;
}

// ---------------------------------------------------------------------------
// The port
// ---------------------------------------------------------------------------

export interface CreateLifeEventInput {
  kind: LifeEventKind;
  source: LifeEventSource;
  title: string;
  detail?: string;
  when?: EventTime;
  placeLabel?: string;
  leadTimes?: LeadTime[];
  actionableVia?: CapabilityKind;
  amountPaise?: number;
  suggestedByContactId?: string;
  extractionConfidence?: number;
  pendingLoopId?: PendingLoopId;
}

/**
 * Storage, scheduling and query for life events.
 *
 * Implementations: `LocalLifeEventStore` (the only one needed for the demo).
 * A future implementation may be backed by an external calendar — which is why
 * this is a port and not a concrete store.
 */
export interface LifeEventAdapter {
  /**
   * Create. ALWAYS lands in `DRAFT` or `NEEDS_CONFIRMATION` — never directly in
   * `CONFIRMED`. Which one is decided by LIFE_EVENT_SCHEMA.md, but the rule that
   * matters here is: DOCUMENT_EXTRACTION and FAMILY_SUGGESTED can never skip
   * `NEEDS_CONFIRMATION`. An OCR reading of a hospital letter is a proposal, not
   * a fact, and a family member's suggestion is not the elder's decision.
   */
  create(input: CreateLifeEventInput): Promise<AdapterResult<LifeEvent>>;

  get(id: LifeEventId): Promise<LifeEvent | null>;

  /**
   * Request a lifecycle transition. The ADAPTER does not decide legality —
   * it applies a transition the life-event engine has already validated against
   * LIFE_EVENT_SCHEMA.md. Keeping the decision out of the store mirrors
   * `lib/engine.ts` / `lib/session-store.ts`: pure decision, single mutator.
   */
  transition(
    id: LifeEventId,
    to: LifeEventState,
    opts?: { reason?: string; at?: string },
  ): Promise<AdapterResult<LifeEvent>>;

  /**
   * Targeted update. Correcting the time must not clear the place — the same
   * correction semantics as MEMORY_MODEL.md §8.
   *
   * An update to a CONFIRMED event returns it to `NEEDS_CONFIRMATION` where the
   * change is material (time, amount, place). A quiet edit under a confirmation
   * is the same failure as executing on a stale confirmation.
   */
  update(
    id: LifeEventId,
    patch: Partial<Pick<LifeEvent, 'title' | 'detail' | 'when' | 'placeLabel' | 'leadTimes' | 'amountPaise'>>,
  ): Promise<AdapterResult<LifeEvent>>;

  query(q: LifeEventQuery): Promise<LifeEvent[]>;

  /**
   * Everything whose lead time has fired and which has not yet been surfaced.
   * The scheduler polls this. Quiet hours are applied HERE, not by the caller,
   * so a future second caller cannot bypass them — the same chokepoint argument
   * as `ChannelAdapter.openSession`.
   */
  dueNow(now: string): Promise<DueLifeEvent[]>;

  /** Mark that a lead time was actually surfaced, so it does not repeat. */
  markSurfaced(id: LifeEventId, leadTime: LeadTime, at: string): Promise<void>;

  /** Elder-initiated deletion. Real deletion, not a tombstone. MEMORY_MODEL.md §6. */
  remove(id: LifeEventId): Promise<void>;

  /** Sweep. Past events expire per LIFE_EVENT_SCHEMA.md; promises do not. */
  expireStale(now: string): Promise<LifeEventId[]>;
}

// ---------------------------------------------------------------------------
// Notes for Codex
// ---------------------------------------------------------------------------

/**
 * 1. DO NOT implement lifecycle rules here. This is a store. The transition
 *    legality table lives in LIFE_EVENT_SCHEMA.md and its engine.
 *
 * 2. `DOCUMENT_EXTRACTION` events MUST pass through `NEEDS_CONFIRMATION` with the
 *    extracted values read back aloud. "I read this as a hospital appointment on
 *    Thursday the 30th at eleven — is that right?" An OCR error that silently
 *    becomes a confirmed appointment sends an elder to a hospital on the wrong day.
 *
 * 3. `FAMILY_SUGGESTED` likewise. There is no path from a family suggestion to a
 *    confirmed event that does not go through the elder.
 *
 * 4. Quiet hours belong in `dueNow()`. Do not let callers pass a
 *    `skipQuietHours` flag; there is no legitimate use for one.
 *
 * 5. Keep provider PII out. `placeLabel` is a speakable label; a full address
 *    stays a session-scoped handle. MEMORY_MODEL.md §7.
 *
 * 6. `BILL_DUE` is a reminder kind. There is no `pay()` on this port and there
 *    must never be one.
 *
 * 7. Suggested tests:
 *      - a DOCUMENT_EXTRACTION event cannot reach CONFIRMED without an elder yes
 *      - a FAMILY_SUGGESTED event cannot reach CONFIRMED without an elder yes
 *      - updating the time of a CONFIRMED event returns it to NEEDS_CONFIRMATION
 *      - correcting the time does not clear the place
 *      - dueNow() defers inside quiet hours
 *      - markSurfaced() prevents the same lead time firing twice
 *      - a PROMISE with no date is returned by query({ includeUndated: true })
 */
