/**
 * DRAFT CONTRACT — calendar adapter
 * =================================
 *
 * DOCUMENTATION ONLY. Not imported by the Thuna app. Not compiled into the build.
 *
 * ---------------------------------------------------------------------------
 * LOCAL STORE FIRST. EXTERNAL CALENDAR LATER, IF EVER.
 * ---------------------------------------------------------------------------
 *
 * Thuna's calendar is its own local store by default. Connecting Google/Apple/
 * Outlook is a LATER, OPTIONAL, ELDER-INITIATED step, and the contract is shaped
 * so that never happening is a perfectly good outcome.
 *
 * The reasoning is not technical convenience:
 *
 *   1. An external calendar is a firehose of a person's whole life — work
 *      meetings, other people's shared calendars, events with attendee lists and
 *      locations. Thuna needs a handful of the elder's own commitments. Reading
 *      everything to use three items is the definition of over-collection under
 *      DPDP, and it is exactly the "no implicit surveillance" line in AGENTS.md.
 *
 *   2. A shared family calendar makes family-imposed events look like the
 *      elder's own. `MEMORY_MODEL.md` §3 has no `FAMILY_IMPOSED` value by design;
 *      an unfiltered calendar sync would smuggle one in through the back door.
 *
 *   3. Write access to a real calendar is destructive in a way Thuna's other
 *      capabilities are not — a bad edit removes information the elder relies on
 *      elsewhere. Hence `supportsWrite` defaults false, and deletion of
 *      externally-owned entries is structurally impossible (see `CalendarAdapter`).
 *
 * So: local store is the product. External sync is an adapter behind the same
 * port, read-mostly, scope-limited, and revocable.
 *
 * ---------------------------------------------------------------------------
 * RELATIONSHIP TO life-event-adapter.ts
 * ---------------------------------------------------------------------------
 *
 * They are different things and both are needed.
 *
 *   - `LifeEvent` is THE ELDER'S COMMITMENT, with a lifecycle, lead times, and a
 *     confirmation requirement. It is what the daily brief reads.
 *   - `CalendarEntry` is A ROW IN A CALENDAR — dumb, external, possibly not the
 *     elder's, possibly not even about them.
 *
 * The bridge is one-way and gated: a `CalendarEntry` may be PROPOSED as a
 * `LifeEvent` with `source: 'CALENDAR_SYNC'`, landing in `NEEDS_CONFIRMATION`.
 * It never becomes a confirmed life event without the elder saying so. That
 * gate is why these are two types and not one.
 */

import type { AdapterResult } from './food-commerce-adapter.ts';
import type { EventTime } from './life-event-adapter.ts';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type CalendarId = string & { readonly __brand: 'CalendarId' };
export type CalendarEntryId = string & { readonly __brand: 'CalendarEntryId' };

/**
 * Who owns the underlying row. Governs what Thuna may do to it.
 *
 * `THUNA_LOCAL`     — Thuna's own store. Full control.
 * `ELDER_EXTERNAL`  — the elder's own external calendar. Read; write only with
 *                     explicit write permission.
 * `SHARED_EXTERNAL` — someone else's calendar shared with the elder.
 *                     **READ ONLY, ALWAYS.** Thuna never writes to or deletes
 *                     from a calendar it does not own — that would be editing a
 *                     third party's data on an elder's behalf without their
 *                     knowledge.
 */
export type CalendarOwnership = 'THUNA_LOCAL' | 'ELDER_EXTERNAL' | 'SHARED_EXTERNAL';

export interface Calendar {
  id: CalendarId;
  /** "Your calendar", "Family calendar". Speakable. */
  displayName: string;
  ownership: CalendarOwnership;
  /** TRUE when the elder chose to include this in briefs and reminders. */
  includedInBrief: boolean;
  timezone: string;
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

/**
 * A calendar row, normalised. Deliberately THIN.
 *
 * Note what is absent and will stay absent:
 *   - attendee lists          (other people's data, and not Thuna's business)
 *   - free/busy availability  (behavioural analytics by another name)
 *   - conferencing links, attachments, descriptions of arbitrary length
 *   - recurrence rule internals (see `recurrenceSummary` — a speakable string)
 *
 * Thuna needs to know that the elder has a thing, roughly when, and roughly
 * where. Everything beyond that is collection without a use.
 */
export interface CalendarEntry {
  id: CalendarEntryId;
  calendarId: CalendarId;
  ownership: CalendarOwnership;

  /** Speakable. From the external event's title. */
  title: string;
  /**
   * Reuses `EventTime` from ./life-event-adapter.ts rather than redefining a
   * near-identical shape. All-day external events map to `precision: 'DAY'`.
   */
  when: EventTime;

  /**
   * Location as a short speakable label where one can be derived.
   * Full addresses and coordinates from an external calendar are PII and are
   * NOT persisted — session-scoped only. Same rule as MEMORY_MODEL.md §7.
   */
  placeLabel?: string;

  /** "every Tuesday" — a spoken summary, not an RRULE the elder cannot hear. */
  recurrenceSummary?: string;

  /** TRUE when Thuna created this row. Only these may be edited or deleted. */
  createdByThuna: boolean;

  /** TRUE when this entry has already been proposed as a LifeEvent. */
  proposedAsLifeEvent?: boolean;

  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Sync scope — the over-collection guard
// ---------------------------------------------------------------------------

/**
 * What an external sync is allowed to pull. Required, non-optional, and there is
 * deliberately no "everything" value.
 *
 * A sync without a bounded window and a calendar allow-list is not a feature,
 * it is a data grab. The elder chooses which calendars; the window is bounded by
 * construction.
 */
export interface CalendarSyncScope {
  /** Explicit allow-list. Empty means sync nothing. There is no wildcard. */
  calendarIds: readonly CalendarId[];
  /** How far ahead to read. Capped by the adapter (suggest 60 days). */
  lookaheadDays: number;
  /**
   * How far back. Suggest 1 — enough to say "you had that yesterday", not enough
   * to reconstruct a history. Capped by the adapter (suggest 7).
   */
  lookbehindDays: number;
  /**
   * TRUE only where the elder explicitly granted calendar WRITE permission.
   * Default false. Never inferred from a read grant.
   */
  allowWrite: boolean;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface CalendarAdapterCapabilities {
  readonly providerId: string;      // 'local' | 'google' | 'apple' | 'caldav'
  readonly displayName: string;
  /** TRUE for the local store used in the demo. Drives SIMULATED labelling. */
  readonly isSimulated: boolean;
  /** TRUE for anything that leaves the device. Drives the consent copy. */
  readonly isExternal: boolean;
  readonly supportsRead: boolean;
  /** Default FALSE. Write is a separate, explicit grant. */
  readonly supportsWrite: boolean;
  readonly supportsRecurrence: boolean;
  /** Hard ceiling the adapter enforces on `CalendarSyncScope.lookaheadDays`. */
  readonly maxLookaheadDays: number;
  /** Minimum gap between syncs. Polling a calendar every minute is surveillance. */
  readonly minSyncIntervalMs: number;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface CreateCalendarEntryInput {
  calendarId: CalendarId;
  title: string;
  when: EventTime;
  placeLabel?: string;
  /**
   * The elder explicitly asked for this to go in their calendar, now.
   * Writing to a calendar is a consequential action and gets the same treatment
   * as any other: a PreparedAction, a readback, and a yes.
   */
  explicitUserIntent: boolean;
}

export interface CalendarQuery {
  calendarIds?: readonly CalendarId[];
  fromInstant: string;
  toInstant: string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

/**
 * Provider-neutral calendar port.
 *
 * Implementations: `LocalCalendarAdapter` (the default and, for the demo, the
 * only one). External adapters sit behind the identical interface so the
 * companion never learns whether a calendar is on the device or in a cloud.
 */
export interface CalendarAdapter {
  readonly capabilities: CalendarAdapterCapabilities;

  healthCheck(): Promise<AdapterResult<{ authenticated: boolean }>>;

  /** Calendars the elder has chosen to expose. May legitimately be just one. */
  listCalendars(): Promise<AdapterResult<Calendar[]>>;

  /**
   * Read entries in a bounded window. The window is required — there is no
   * "read everything" call, deliberately.
   */
  listEntries(q: CalendarQuery): Promise<AdapterResult<CalendarEntry[]>>;

  /**
   * Pull from an external source within an explicit scope.
   *
   * Implementations MUST:
   *   - refuse when `scope.calendarIds` is empty (sync nothing, not everything)
   *   - clamp `lookaheadDays` to `capabilities.maxLookaheadDays`
   *   - honour `minSyncIntervalMs`
   *   - drop attendee lists, descriptions and precise locations at the boundary
   *     rather than storing then filtering
   */
  sync(scope: CalendarSyncScope): Promise<AdapterResult<{ entriesRead: number; syncedAt: string }>>;

  /**
   * Create an entry. Requires `explicitUserIntent`, and requires
   * `capabilities.supportsWrite` plus a write grant for external calendars.
   * Entries created here carry `createdByThuna: true`.
   */
  createEntry(input: CreateCalendarEntryInput): Promise<AdapterResult<CalendarEntry>>;

  /**
   * Update — ONLY for entries with `createdByThuna: true`.
   * Implementations MUST return `not_supported` for anything else, including
   * entries on the elder's own external calendar that Thuna did not create.
   * Thuna does not silently edit a person's existing calendar.
   */
  updateEntry(
    id: CalendarEntryId,
    patch: Partial<Pick<CalendarEntry, 'title' | 'when' | 'placeLabel'>>,
    opts: { explicitUserIntent: boolean },
  ): Promise<AdapterResult<CalendarEntry>>;

  /**
   * Delete — ONLY for `createdByThuna: true` entries, and never for
   * `SHARED_EXTERNAL` ownership under any circumstances.
   */
  deleteEntry(
    id: CalendarEntryId,
    opts: { explicitUserIntent: boolean },
  ): Promise<AdapterResult<{ deleted: boolean }>>;

  /**
   * Sever an external connection. Must be available by voice, must take effect
   * immediately, and must purge synced entries — not merely stop refreshing them.
   * Same discipline as consent revocation in ACTION_PERMISSION_MODEL.md §3.
   */
  disconnect(): Promise<AdapterResult<{ disconnected: boolean; purgedEntries: number }>>;
}

// ---------------------------------------------------------------------------
// Notes for Codex
// ---------------------------------------------------------------------------

/**
 * 1. SHIP THE LOCAL ADAPTER ONLY. `LocalCalendarAdapter`, `isExternal: false`,
 *    `supportsWrite: true` for its own entries. No OAuth, no credentials.
 *
 * 2. A synced `CalendarEntry` is never automatically a `LifeEvent`. It is
 *    PROPOSED, lands in `NEEDS_CONFIRMATION`, and the elder decides. See
 *    ./life-event-adapter.ts and docs/companion/LIFE_EVENT_SCHEMA.md.
 *
 * 3. Filter at the boundary, not after storage. If attendee lists reach the
 *    store, "we delete them later" is not a privacy property.
 *
 * 4. `SHARED_EXTERNAL` is read-only in the type system's spirit and must be
 *    read-only in fact. Assert it in `updateEntry`/`deleteEntry`, do not rely on
 *    callers.
 *
 * 5. Calendar writes go through the normal `PreparedAction` ceremony — draft,
 *    readback, yes. "Shall I put that in your calendar for Thursday at eleven?"
 *
 * 6. Suggested tests:
 *      - sync with empty `calendarIds` syncs nothing
 *      - `lookaheadDays` clamped to the capability ceiling
 *      - updateEntry on a non-Thuna entry returns `not_supported`
 *      - deleteEntry on SHARED_EXTERNAL refused regardless of intent flag
 *      - disconnect() purges synced entries, not just the token
 *      - a synced entry does not appear in the daily brief until confirmed
 *      - attendee data never reaches the store
 */
