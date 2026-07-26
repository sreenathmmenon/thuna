/**
 * DRAFT CONTRACT — PreparedAction
 * ===============================
 *
 * DOCUMENTATION ONLY. Not imported by the Thuna app. Not compiled into the build.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS
 * ---------------------------------------------------------------------------
 *
 * A `PreparedAction` is the ONE object an elder reviews before Thuna does anything
 * consequential — order food, book a ride, pay a bill, send a message to family,
 * accept a family request, schedule a household visit.
 *
 * It is the GENERALISATION of the pattern that food commerce already proved:
 *
 *     read authoritative state  →  render a readback  →  mint a token bound to
 *     that exact state  →  confirm  →  execute  →  reconcile if the outcome is
 *     ambiguous
 *
 * The point is UNIFORMITY. An elder should not have to learn a different
 * review-and-confirm ritual per capability. "Here is what I am about to do,
 * here is what it costs, shall I?" is the whole mental model, and it must read
 * the same whether the thing being confirmed is a dosa or an electricity bill.
 *
 * ---------------------------------------------------------------------------
 * RELATIONSHIP TO THE EXISTING food-commerce ConfirmationToken
 * ---------------------------------------------------------------------------
 *
 * This does NOT replace `ConfirmationToken` from `./food-commerce-adapter.ts`,
 * and it does not compete with it. The relationship is deliberate:
 *
 *   - `ConfirmationToken` is the CAPABILITY-LEVEL artefact. It belongs to the
 *     food adapter, is minted by `FoodCommerceAdapter.mintConfirmation()`, is
 *     consumed by `placeOrder()`, and carries food-specific fields
 *     (`cartRevision`, `confirmedPaymentMethod`, `addressId`).
 *     The same is true of `RideConfirmationToken` and
 *     `ReservationConfirmationToken` in their own adapters.
 *
 *   - `PreparedAction` is the COMPANION-LEVEL artefact. It is what the routine
 *     engine, the daily brief, the interruption/resume layer, and the autonomy
 *     gate all handle. It WRAPS the capability token rather than reimplementing
 *     it — see `ActionConfirmation.capabilityToken`.
 *
 * So the invariant "the elder confirmed THIS state, and if state moves the
 * confirmation dies" is enforced TWICE, at two layers, and that is intentional:
 *
 *   1. `PreparedAction.stateRevision` — the companion layer's fingerprint of the
 *      state it read back. Checked before execute() is even attempted.
 *   2. The wrapped `ConfirmationToken.cartRevision` (or the ride quote
 *      fingerprint) — the adapter's own check, enforced inside the provider call.
 *
 * A companion-layer bug cannot bypass the adapter check, and an adapter that
 * forgets its check is still caught by the companion layer. Neither layer is
 * permitted to assume the other did its job.
 *
 * ---------------------------------------------------------------------------
 * THE FIVE RULES THIS TYPE EXISTS TO ENFORCE
 * ---------------------------------------------------------------------------
 *
 * From docs/integrations/SWIGGY_CODEX_INTEGRATION_GUIDE.md §6, generalised from
 * food to every capability:
 *
 *   1. Readback figures come from an AUTHORITATIVE PROVIDER READ, never from a
 *      locally computed sum. Hence `authoritative: AuthoritativeSnapshot` is
 *      non-optional and carries `fetchedAt` + `source`.
 *   2. Confirmation is a token bound to a revision, not a boolean. Hence
 *      `stateRevision` and `ActionConfirmation`, and NO `confirmed: boolean`
 *      field anywhere in this file.
 *   3. Execution outcomes are three-state. Hence `ActionOutcomeStatus` reuses the
 *      food adapter's PLACED/REJECTED/UNKNOWN semantics via `PlacementStatus`.
 *   4. Double gate on real execution. Hence `ExecutionGate`, which no env flag
 *      alone can satisfy.
 *   5. Provider PII is not persisted. Hence `authoritative.lines` holds display
 *      strings and handles, and `recipient` holds a handle plus a speakable
 *      label — never a full address copied into memory.
 */

import type {
  Money,
  AdapterError,
  AdapterResult,
  PlacementStatus,
  ReconciliationHandle,
  ReconciliationOutcome,
  ConfirmationToken,
} from './food-commerce-adapter.ts';

import type { SessionId, ChannelKind } from './channel-adapter.ts';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type PreparedActionId = string & { readonly __brand: 'PreparedActionId' };

/**
 * Provider-neutral capability names. Deliberately NOT provider names.
 * Kept in sync with `ServiceCapabilityKind` in ./service-capability-adapter.ts —
 * that file re-exports this type so there is exactly one definition.
 */
export type CapabilityKind =
  | 'FOOD'
  | 'GROCERY'
  | 'DINING'
  | 'RIDES'
  | 'BILLS'
  | 'DELIVERY'
  | 'MAPS'
  | 'MESSAGING'
  | 'CALENDAR'
  | 'HOUSEHOLD_SERVICES';

/**
 * Opaque provider identity. 'swiggy-mcp', 'mock-food', 'local-calendar', ...
 * Never spoken to the elder as an id — use `providerDisplayName`.
 */
export type ProviderId = string & { readonly __brand: 'ProviderId' };

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * ```
 * DRAFT ──► VALIDATED ──► PRESENTED_TO_ELDER ──► CONFIRMED ──► EXECUTED ──► RECONCILED
 *   │            │                │                  │            │
 *   └────────────┴────────────────┴──────────────────┴────────────┴──► CANCELLED
 *                                                     └────────────────► FAILED
 * ```
 *
 * | State | Meaning | May touch a provider? |
 * |---|---|---|
 * | `DRAFT` | Model has proposed something. Nothing checked. | read-only only |
 * | `VALIDATED` | Deterministic code checked feasibility, limits, permissions | read-only only |
 * | `PRESENTED_TO_ELDER` | Readback spoken. Awaiting a real yes. | no |
 * | `CONFIRMED` | Explicit elder yes, bound to `stateRevision` | no |
 * | `EXECUTED` | Provider call returned PLACED or REJECTED | yes — the one write |
 * | `RECONCILED` | An UNKNOWN outcome was resolved | read-only recheck |
 * | `CANCELLED` | Elder said no / stop, or it expired, or state drifted | no |
 * | `FAILED` | Terminal error. Nothing happened, and we know that. | no |
 *
 * Why `RECONCILED` is a distinct state rather than a flag: an UNKNOWN outcome
 * means the action is in superposition. Until reconciliation resolves it, Thuna
 * may not say ANYTHING definitive to the elder. Making that a state rather than
 * a boolean means the "have we told the elder yet?" question has one answer per
 * state, and `EXECUTED` with `status: 'UNKNOWN'` is visibly not speakable.
 */
export type PreparedActionState =
  | 'DRAFT'
  | 'VALIDATED'
  | 'PRESENTED_TO_ELDER'
  | 'CONFIRMED'
  | 'EXECUTED'
  | 'RECONCILED'
  | 'CANCELLED'
  | 'FAILED';

/** Why a PreparedAction ended without executing. Auditable; some are spoken. */
export type CancellationReason =
  | 'ELDER_DECLINED'
  | 'ELDER_CORRECTED'        // they changed something; a NEW draft supersedes this one
  | 'EXPIRED'                // TTL lapsed before confirmation
  | 'STATE_DRIFTED'          // provider state moved; the confirmed thing no longer exists
  | 'PERMISSION_REVOKED'
  | 'QUIET_HOURS'
  | 'BLOCKED_BY_POLICY'
  | 'SUPERSEDED'             // replaced by a newer draft in the same conversation
  | 'SYSTEM_ERROR';

// ---------------------------------------------------------------------------
// Risk
// ---------------------------------------------------------------------------

/**
 * Drives how much ceremony the confirmation gets: TTL length, whether a
 * teach-back offer is appropriate (see docs/companion/TEACH_BACK_POLICY.md),
 * and whether a PREAPPROVED_ROUTINE_ACTION autonomy level may skip the prompt.
 *
 * NOTE: risk is a property of the ACTION, never of the person. Nothing here
 * grades the elder. See COMPREHENSION_VERIFICATION.md §2.
 */
export type ActionRisk =
  /** Reversible, no money, no third party. e.g. adding a calendar note. */
  | 'LOW'
  /** Spends money OR messages a third party, but bounded and reversible-ish. */
  | 'MEDIUM'
  /** Money above the elder's own threshold, a ride (a person in a vehicle),
   *  a bill payment, or anything with no cancellation route. */
  | 'HIGH';

// ---------------------------------------------------------------------------
// Authoritative snapshot — rule 1
// ---------------------------------------------------------------------------

/**
 * One reviewable line. Deliberately display-shaped rather than domain-shaped:
 * the elder is reviewing a THING, not a cart line or a slot or a fare bucket.
 *
 * Capability-specific detail stays in the adapter. This is what gets spoken.
 */
export interface ActionLine {
  /** "Masala Dosa x2", "Electricity bill — June", "Auto to Manipal Hospital". */
  label: string;
  quantity?: number;
  /** Absent for non-priced lines (a message, a calendar entry). */
  amount?: Money;
  /** Opaque provider handle for this line. NEVER spoken. */
  ref?: string;
}

/**
 * A fee/charge component. Kept separate from lines so the readback can say
 * "and twenty-five rupees delivery" without the elder hunting for it.
 *
 * These MUST come from the provider. Thuna hardcoding a delivery fee for a real
 * order is the exact bug SWIGGY_CODEX_INTEGRATION_GUIDE.md §6 rule 1 forbids.
 */
export interface ActionCharge {
  /** "Delivery", "Taxes", "Convenience fee", "Late fee". Speakable. */
  label: string;
  amount: Money;
  /** True when the provider flagged this as an estimate, not a fixed charge. */
  isEstimate?: boolean;
}

/**
 * Who or where this action lands. Generalises `AddressId` (food/grocery),
 * `Place` (rides), and a notification recipient (messaging).
 *
 * PII rule: `label` is speakable and Thuna-owned. `handle` is an opaque provider
 * id. `displayText` is provider PII — session-scoped, never persisted into the
 * memory store. See MEMORY_MODEL.md §7.
 */
export interface ActionTarget {
  /** "Home", "Sree", "Manipal Hospital", "BESCOM account ending 4821". */
  label: string;
  /** Opaque handle: AddressId, RecipientId, place id, biller ref. Never spoken. */
  handle?: string;
  /** Provider-sourced PII. Session-only. Do not copy into memory. */
  displayText?: string;
  kind: 'ADDRESS' | 'PERSON' | 'PLACE' | 'ACCOUNT' | 'NONE';
}

/**
 * The provider's own truth at a moment in time. This is what the readback is
 * rendered from — never a locally computed total.
 *
 * `revision` is the load-bearing field. It is the companion layer's fingerprint
 * of "the state the elder agreed to". If a fresh read produces a different
 * revision, the confirmation is dead. That is the same mechanism as
 * `CartSnapshot.revision`, lifted to every capability.
 */
export interface AuthoritativeSnapshot {
  /** Where this came from. `LOCAL` is only legitimate for Thuna-owned data
   *  (its own calendar store, its own simulated usualOrder). */
  source: 'PROVIDER' | 'LOCAL';
  providerId: ProviderId;
  /** "Swiggy". Safe to speak. */
  providerDisplayName: string;
  lines: ActionLine[];
  charges: ActionCharge[];
  /**
   * The ONE number read back before confirmation. Absent only for actions with
   * no monetary consequence (a message, a calendar entry).
   * When present it MUST equal what the provider reported, not a local sum.
   */
  total?: Money;
  /** True when `total` is a range/estimate (rides). Guidance must say "about". */
  totalIsEstimate?: boolean;
  target: ActionTarget;
  /** Opaque fingerprint. Drift here invalidates the confirmation. */
  revision: string;
  fetchedAt: string; // ISO 8601
  /**
   * Capability-specific extras the guidance layer may want, kept opaque so this
   * type never grows a union of every provider's fields.
   * MUST NOT contain anything that would be persisted.
   */
  extras?: Readonly<Record<string, string | number | boolean>>;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * A validation finding. `BLOCKING` findings prevent DRAFT → VALIDATED.
 *
 * Findings are spoken in the elder's terms, not the system's:
 * bad → "Validation failed: MAX_ORDER_VALUE_EXCEEDED"
 * good → "That comes to eleven hundred rupees, and I can only place orders up
 *         to a thousand. Shall we take something off?"
 */
export interface ValidationFinding {
  severity: 'BLOCKING' | 'ADVISORY';
  /** Symbolic, for logs and tests. */
  code: string;
  /** Elder-facing sentence. Plain, calm, no jargon, no blame. */
  spokenExplanation: string;
}

// ---------------------------------------------------------------------------
// Confirmation — rule 2
// ---------------------------------------------------------------------------

/**
 * Proof that a SPECIFIC state was agreed to. There is deliberately no
 * `confirmed: boolean` anywhere in this file — a boolean cannot express
 * "they agreed to THIS".
 */
export interface ActionConfirmation {
  /** Opaque companion-layer token. */
  readonly token: string;
  /**
   * The snapshot revision at the moment of confirmation.
   * MUST equal `PreparedAction.authoritative.revision` at execute() time or the
   * execution is refused with `STATE_DRIFTED`.
   */
  readonly boundRevision: string;
  /** Verbatim text spoken to the elder. Auditable: what did they agree to? */
  readonly readbackText: string;
  /** Verbatim elder response that was treated as a yes. Auditable. */
  readonly elderResponseText: string;
  /** Which channel the yes arrived on. Matters for CROSS_CHANNEL_CONTINUITY. */
  readonly confirmedVia: ChannelKind;
  readonly confirmedAt: string;
  /**
   * Short-lived by construction. HIGH-risk actions get shorter TTLs.
   * An old confirmation is not a confirmation — see INTERRUPTION_AND_RESUME.md.
   */
  readonly expiresAt: string;
  /**
   * The CAPABILITY-LEVEL token, where the capability mints one.
   * For food this is the existing `ConfirmationToken` unchanged. For rides it is
   * `RideConfirmationToken`, for dining `ReservationConfirmationToken`.
   *
   * Typed as a union with `unknown` rather than a grand union of every token so
   * this file never needs editing when a capability is added. The adapter that
   * consumes it knows its own shape and re-validates it regardless.
   */
  readonly capabilityToken?: ConfirmationToken | unknown;
  /**
   * TRUE when the elder was offered a teach-back and chose to do it, and it
   * matched. FALSE or absent means it was skipped or declined — which is ALWAYS
   * permitted and MUST NOT block the action. See TEACH_BACK_POLICY.md.
   */
  readonly teachBackCompleted?: boolean;
}

// ---------------------------------------------------------------------------
// Execution gate — rule 4
// ---------------------------------------------------------------------------

/**
 * The double gate, generalised. Every field must be TRUE for a real execution.
 * `realExecutionEnabled` alone is NEVER sufficient — a stray env flag must not
 * be able to spend an elder's money.
 *
 * Rides add a third condition (`providerIsOfficial`) because a ride carries a
 * person. That is expressed here as an optional field that the RIDES capability
 * treats as required. An adapter MUST refuse when it is undefined for RIDES.
 */
export interface ExecutionGate {
  /** Env/config flag. Necessary, never sufficient. */
  realExecutionEnabled: boolean;
  /** The elder said yes, in this moment, to this state. Necessary. */
  explicitUserIntent: boolean;
  /**
   * Required TRUE for RIDES (and any future capability that moves a person or
   * pays a bill). Read from the adapter's own capabilities, asserted at the call
   * site, so shipping an unofficial adapter cannot silently enable real writes.
   */
  providerIsOfficial?: boolean;
  /** The permission grant that authorised this. See ACTION_PERMISSION_MODEL.md. */
  permissionGrantId?: string;
}

// ---------------------------------------------------------------------------
// Outcome — rule 3
// ---------------------------------------------------------------------------

/**
 * Reuses the food adapter's three-state vocabulary verbatim rather than
 * inventing a parallel one. `PlacementStatus` = 'PLACED' | 'REJECTED' | 'UNKNOWN'.
 *
 * The alias exists only so non-commerce capabilities read naturally
 * ("the message was PLACED" is odd, but the semantics are identical and a
 * second enum would drift).
 */
export type ActionOutcomeStatus = PlacementStatus;

export interface ActionOutcome {
  status: ActionOutcomeStatus;
  /** Provider handle for the created thing: OrderId, RideId, BookingId, ... */
  externalRef?: string;
  /** Provider's own success/failure message. Speak it as given where provided. */
  providerMessage?: string;
  /** Present when REJECTED. */
  error?: AdapterError;
  /**
   * Present when and only when `status === 'UNKNOWN'`.
   * Its presence is a REQUIREMENT to reconcile before telling the elder anything.
   */
  reconciliation?: ReconciliationHandle;
  executedAt: string;
}

// ---------------------------------------------------------------------------
// The PreparedAction itself
// ---------------------------------------------------------------------------

/**
 * One object, every capability. This uniformity IS the feature.
 *
 * Read it top to bottom and it answers, in order, the questions an elder asks:
 *   what are you about to do, with whom, for how much, on my say-so, and did it
 *   actually happen?
 */
export interface PreparedAction {
  readonly id: PreparedActionId;
  readonly capability: CapabilityKind;
  readonly providerId: ProviderId;
  /** "Swiggy", "your calendar". Speakable. Never the raw providerId. */
  readonly providerDisplayName: string;

  state: PreparedActionState;
  risk: ActionRisk;

  /**
   * One-line description of the intent, in the elder's own framing.
   * "Order your usual dosa from Udupi Cafe" — not "EXECUTE ORDER_FOOD".
   */
  summary: string;

  /**
   * AUTHORITATIVE provider state. The readback is rendered from THIS.
   * Refreshed immediately before presenting, and again before executing.
   */
  authoritative: AuthoritativeSnapshot;

  /** Convenience mirror of `authoritative.revision` at the time of the last read. */
  stateRevision: string;

  findings: ValidationFinding[];

  /** Present from PRESENTED_TO_ELDER onward. Exactly what was said aloud. */
  readbackText?: string;

  /** Present from CONFIRMED onward. Absent means NOT confirmed. */
  confirmation?: ActionConfirmation;

  /** Present from EXECUTED onward. */
  outcome?: ActionOutcome;

  /** Present once an UNKNOWN outcome has been resolved. */
  reconciliation?: ReconciliationOutcome;

  /** Present in CANCELLED / FAILED. */
  cancellationReason?: CancellationReason;

  /**
   * Hard expiry for the whole prepared action, independent of the confirmation
   * TTL. A draft nobody returned to must die rather than linger and be resumed
   * hours later. See INTERRUPTION_AND_RESUME.md §5.
   */
  expiresAt: string;

  /** Conversation this was prepared in. Used for resume and continuity. */
  originSessionId?: SessionId;
  originChannel?: ChannelKind;

  createdAt: string;
  updatedAt: string;

  /**
   * Append-only audit trail. Every state transition appends one entry.
   * Mirrors the routine engine's rule: no transition without an event record.
   */
  history: PreparedActionEvent[];
}

export interface PreparedActionEvent {
  at: string;
  from: PreparedActionState;
  to: PreparedActionState;
  /** Symbolic: 'validated', 'presented', 'elder_confirmed', 'executed', ... */
  event: string;
  /** Non-PII detail for audit. */
  note?: string;
}

// ---------------------------------------------------------------------------
// The port
// ---------------------------------------------------------------------------

export interface PreparedActionStore {
  create(draft: Omit<PreparedAction, 'history' | 'createdAt' | 'updatedAt'>): Promise<PreparedAction>;
  get(id: PreparedActionId): Promise<PreparedAction | null>;
  /** Deterministic transition. Pure decision + single mutator, like lib/engine.ts. */
  transition(
    id: PreparedActionId,
    to: PreparedActionState,
    event: string,
    patch?: Partial<PreparedAction>,
  ): Promise<AdapterResult<PreparedAction>>;
  /** Everything still awaiting the elder, for resume and for the daily brief. */
  listOpen(opts?: { capability?: CapabilityKind; sessionId?: SessionId }): Promise<PreparedAction[]>;
  /** Sweep on read — expired drafts must not be resumable. */
  expireStale(now: string): Promise<PreparedActionId[]>;
}

// ---------------------------------------------------------------------------
// Notes for Codex
// ---------------------------------------------------------------------------

/**
 * 1. This is a COMPANION-layer type. It does not belong inside an adapter.
 *    Adapters keep their own tokens; the companion layer wraps them.
 *
 * 2. There is no `confirmed: boolean` and there must never be one. If you find
 *    yourself wanting one, you want `state === 'CONFIRMED' && confirmation
 *    && confirmation.boundRevision === stateRevision && now < expiresAt`.
 *    That compound condition IS the safety property; a boolean erases it.
 *
 * 3. Re-read the authoritative snapshot immediately before execute(), and
 *    compare revisions. Two reads is not wasteful — it is the whole design.
 *
 * 4. `EXECUTED` with `outcome.status === 'UNKNOWN'` is NOT a speakable state.
 *    Guidance must have no template for it other than "let me check".
 *
 * 5. `risk` is a property of the action. Never derive it from anything about the
 *    person. No adaptive difficulty, no confidence scoring of the elder.
 *
 * 6. Suggested test cases:
 *      - confirmation rejected when `stateRevision` changed between confirm and execute
 *      - execute refused when `realExecutionEnabled` true but `explicitUserIntent` false
 *      - execute refused for RIDES when `providerIsOfficial` is undefined
 *      - UNKNOWN outcome cannot transition to RECONCILED without a reconcile() call
 *      - expired PreparedAction cannot be resumed (INTERRUPTION_AND_RESUME.md)
 *      - a correction produces a NEW PreparedAction and CANCELS the old one with
 *        `ELDER_CORRECTED` — it never mutates the confirmed one in place
 */
