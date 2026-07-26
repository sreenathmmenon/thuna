/**
 * DRAFT CONTRACT — service capability adapter (the umbrella)
 * ==========================================================
 *
 * DOCUMENTATION ONLY. Not imported by the Thuna app. Not compiled into the build.
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE ASSUMING THIS FILE REPLACES ANYTHING
 * ---------------------------------------------------------------------------
 *
 * It does not replace `FoodCommerceAdapter`, `GroceryCommerceAdapter`,
 * `DiningReservationAdapter` or `RideAdapter`. Those stay exactly as they are.
 *
 * The relationship is:
 *
 *     ServiceCapabilityAdapter          ← this file. Thin, uniform, capability-neutral.
 *          ▲          ▲          ▲
 *          │          │          │      each concrete adapter can be VIEWED THROUGH it
 *   FoodCommerce   Ride      Grocery    but keeps its own rich, provider-shaped surface
 *     Adapter     Adapter    Adapter
 *
 * WHY BOTH LAYERS EXIST:
 *
 *   - The rich adapters exist because food genuinely has carts, rides genuinely
 *     have surge, and dining genuinely has slots. Flattening those into one
 *     interface would lose the very details that make each safe. A `CartSnapshot`
 *     with `valid_addons` two-phase sequencing cannot be expressed as a generic
 *     "prepare()" without lying about it.
 *
 *   - The umbrella exists because the COMPANION does not want to know any of
 *     that. It wants to ask three questions:
 *         1. What can I do for this elder right now?           → discovery/routing
 *         2. Prepare it, and show me one reviewable object.    → PreparedAction
 *         3. Did it happen?                                    → outcome/reconcile
 *
 * So: the umbrella is for CAPABILITY DISCOVERY AND ROUTING plus the uniform
 * prepare/confirm/execute/reconcile ceremony. It is NOT a lowest-common-denominator
 * replacement for provider-specific work, and an implementation of it is expected
 * to DELEGATE to the concrete adapter underneath rather than reimplement it.
 *
 *     class SwiggyFoodCapability implements ServiceCapabilityAdapter {
 *       constructor(inner: FoodCommerceAdapter) { ... }   // wraps, does not replace
 *     }
 *
 * ---------------------------------------------------------------------------
 * PROVIDER IMPLEMENTATIONS STAY OUT OF COMPANION LOGIC
 * ---------------------------------------------------------------------------
 *
 * Nothing in `lib/` that reasons about the elder may import a provider SDK.
 * The routine engine, the daily brief, the autonomy gate and the resume layer
 * see `ServiceCapabilityAdapter` and `PreparedAction` only. That is what makes
 * "swap Swiggy for a mock" a one-line change, and what stops a provider outage
 * from becoming a companion-behaviour bug.
 *
 * ---------------------------------------------------------------------------
 * WHICH CAPABILITIES ARE REAL TODAY
 * ---------------------------------------------------------------------------
 *
 * | Capability | Status as of 2026-07-26 |
 * |---|---|
 * | FOOD | Swiggy MCP is official and first-party. FIRST production integration. |
 * | GROCERY | Swiggy Instamart via the same MCP surface. |
 * | DINING | Swiggy Dineout via the same MCP surface. |
 * | RIDES | **Mock or official sandbox ONLY.** No official Indian ride MCP exists — see docs/integrations/RIDE_PROVIDER_RESEARCH.md. |
 * | BILLS | Reminder-only. Thuna NEVER pays. See notes §6. |
 * | DELIVERY | Read-only tracking of things already ordered. |
 * | MAPS | Read-only place resolution. No navigation. |
 * | MESSAGING | Existing NotificationAdapter, consent-gated. |
 * | CALENDAR | Local store first — see ./calendar-adapter.ts. |
 * | HOUSEHOLD_SERVICES | No provider. Draft/reminder shape only. |
 *
 * A capability with no real provider is not a gap to be filled quickly. It is a
 * capability where the honest implementation is a mock that says so.
 */

import type {
  Money,
  AdapterResult,
  AdapterError,
  ReconciliationHandle,
  ReconciliationOutcome,
} from './food-commerce-adapter.ts';

import type {
  PreparedAction,
  PreparedActionId,
  CapabilityKind,
  ProviderId,
  ActionRisk,
  ActionOutcome,
  ExecutionGate,
  ActionTarget,
  AuthoritativeSnapshot,
  ValidationFinding,
} from './prepared-action.ts';

/**
 * Re-exported so callers can import the capability vocabulary from either file
 * without there being two definitions to drift apart. `prepared-action.ts` owns it.
 */
export type ServiceCapabilityKind = CapabilityKind;

// ---------------------------------------------------------------------------
// Discovery — "what can I do for this elder right now?"
// ---------------------------------------------------------------------------

/**
 * A discovered, offerable thing. Deliberately shallow: this is the result of
 * BROWSING, not of preparing. It carries just enough to say a sentence and to
 * hand back to `prepare()`.
 *
 * Discovery is READ-ONLY and always safe to demo. Nothing here spends money,
 * moves a person, or messages anyone.
 */
export interface CapabilityOffer {
  /** Opaque handle, meaningful only to the adapter that produced it. Never spoken. */
  ref: string;
  /** "Udupi Cafe", "Auto — about 8 minutes", "Electricity bill, due Friday". */
  displayName: string;
  /** Secondary speakable detail: "2.1 km away", "opens at 6pm", "₹340 due". */
  detail?: string;
  /** Indicative only. The authoritative figure comes from prepare(). */
  indicativeAmount?: Money;
  /** True when `indicativeAmount` is a range or subject to surge. */
  indicativeIsEstimate?: boolean;
  /** FALSE means it exists but cannot be acted on now (closed, out of area). */
  available: boolean;
  /** Elder-facing reason when `available` is false: "closed until 6pm". */
  unavailableReason?: string;
}

export interface DiscoverInput {
  /** Natural-language-ish query already extracted by the model. */
  query?: string;
  /** Where the action would land, when known. */
  target?: ActionTarget;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Capability declaration — provider limits as data
// ---------------------------------------------------------------------------

/**
 * The routing table entry. The companion asks the registry "who can do RIDES?"
 * and gets this back. It never hardcodes a provider name.
 *
 * Every limitation that AFFECTS SAFETY is here rather than in prose, because a
 * limitation in a README is a limitation nobody checks at runtime.
 */
export interface ServiceCapabilityDeclaration {
  readonly capability: ServiceCapabilityKind;
  readonly providerId: ProviderId;
  /** "Swiggy", "your calendar". Safe to speak. Never speak `providerId`. */
  readonly displayName: string;

  /**
   * TRUE for mocks AND for sandboxes. Uber's sandbox creates no real trips, so
   * it is `true` there too. Drives SIMULATED labelling in the UI, which must
   * remain until something genuinely real happens.
   */
  readonly isSimulated: boolean;

  /**
   * TRUE only where approved production access / a signed agreement exists.
   * Feeds `ExecutionGate.providerIsOfficial`. A community MCP is never official.
   */
  readonly isOfficialIntegration: boolean;

  /** Baseline risk for this capability. An individual action may be higher. */
  readonly baselineRisk: ActionRisk;

  // -- what the ceremony can do here --
  readonly supportsDiscovery: boolean;
  readonly supportsPrepare: boolean;
  /** FALSE means draft-and-hand-off only (HOUSEHOLD_SERVICES, BILLS). */
  readonly supportsExecute: boolean;
  readonly supportsTracking: boolean;
  /**
   * Swiggy food: FALSE — no cancellation tool exists.
   * When false, `cancellationInstructions` MUST be present. An elder needs a
   * route out either way; "not supported" with no next step is a dead end.
   */
  readonly supportsCancellation: boolean;
  readonly cancellationInstructions?: string;

  /**
   * TRUE where the provider owns the state (a server-side cart, a live fare).
   * When true, the companion MUST re-read before every confirmation and before
   * execution — never serve a total from cache.
   */
  readonly stateIsProviderAuthoritative: boolean;

  /**
   * TRUE when the write is non-idempotent (almost everything that matters).
   * Forces the check-then-retry discipline: on an ambiguous failure, RECONCILE,
   * never blindly retry. Blind retry is how an elder gets charged twice.
   */
  readonly executionIsNonIdempotent: boolean;

  /** Hard ceiling the adapter enforces itself. Swiggy food: ₹1000 (100000 paise). */
  readonly maxActionValue?: Money;

  readonly minTrackingPollIntervalMs?: number;

  /** Cities/regions, where the provider states them. */
  readonly serviceAreas?: readonly string[];

  /**
   * Human-readable note about WHY this capability is limited, surfaced in the
   * Demo Inspector. e.g. "No official Indian ride MCP exists; mock only."
   */
  readonly limitationNote?: string;
}

// ---------------------------------------------------------------------------
// The ceremony
// ---------------------------------------------------------------------------

export interface PrepareInput {
  /** From discover(), or a remembered handle. */
  offerRef?: string;
  /** What the elder asked for, already parsed by the model into structure. */
  request: {
    lines?: Array<{ ref?: string; label: string; quantity?: number }>;
    target?: ActionTarget;
    /** Capability-specific opaque parameters (slot time, bill period, ...). */
    params?: Readonly<Record<string, string | number | boolean>>;
  };
  /** Conversation this belongs to, for resume. */
  sessionId?: string;
}

export interface ValidationReport {
  /** FALSE when any finding is BLOCKING. */
  passed: boolean;
  findings: ValidationFinding[];
}

export interface ConfirmInput {
  actionId: PreparedActionId;
  /** Exactly what was spoken to the elder. Stored verbatim for audit. */
  readbackText: string;
  /** Exactly what the elder said back. Stored verbatim for audit. */
  elderResponseText: string;
  /**
   * The revision the readback was rendered from. If the adapter's fresh read
   * disagrees, minting MUST fail — the elder agreed to something that no longer
   * exists. This is the food `cartRevision` check, generalised.
   */
  expectedRevision: string;
  ttlMs?: number;
}

/**
 * The umbrella port.
 *
 * Nine methods, and every capability answers the same nine questions. The
 * uniformity is the deliverable: the companion writes ONE review-and-confirm
 * flow, and every capability inherits it.
 */
export interface ServiceCapabilityAdapter {
  readonly declaration: ServiceCapabilityDeclaration;

  /** Cheap liveness/auth probe. Must not mutate anything. */
  healthCheck(): Promise<AdapterResult<{ authenticated: boolean }>>;

  /**
   * 1. DISCOVER — read-only, always safe to demo.
   * Returns things that COULD be done. Commits to nothing.
   */
  discover(input: DiscoverInput): Promise<AdapterResult<CapabilityOffer[]>>;

  /**
   * 2. PREPARE — build a reviewable PreparedAction in state DRAFT.
   *
   * MUST populate `authoritative` from a FRESH provider read when
   * `stateIsProviderAuthoritative` is true. MUST NOT compute a total locally.
   * MUST NOT execute anything.
   */
  prepare(input: PrepareInput): Promise<AdapterResult<PreparedAction>>;

  /**
   * 3. VALIDATE — deterministic feasibility, limit and permission checks.
   * DRAFT → VALIDATED on pass. Findings are elder-facing sentences, not codes.
   */
  validate(action: PreparedAction): Promise<AdapterResult<ValidationReport>>;

  /**
   * 4. PRESENT — re-read authoritative state and return the snapshot the
   * readback will be rendered from.
   *
   * This is a SEPARATE call from prepare() on purpose. Time passes between
   * preparing and speaking; prices move. The elder must be read back the state
   * as of NOW, not as of when the draft was made.
   */
  presentAuthoritativeState(
    actionId: PreparedActionId,
  ): Promise<AdapterResult<AuthoritativeSnapshot>>;

  /**
   * 5. CONFIRM — mint an ActionConfirmation bound to `expectedRevision`.
   *
   * MUST refuse when the live revision no longer matches. That refusal is a
   * NORMAL outcome, not an error: Thuna re-reads and asks again.
   */
  confirm(input: ConfirmInput): Promise<AdapterResult<PreparedAction>>;

  /**
   * 6. EXECUTE — the one write. NON-IDEMPOTENT where the declaration says so.
   *
   * MUST refuse unless every field of `ExecutionGate` that applies is true.
   * MUST re-check the revision one final time.
   * Returns a three-state outcome. On `UNKNOWN` the caller MUST call
   * `reconcile()` before telling the elder ANYTHING definitive.
   *
   * Note the return type: `ActionOutcome`, not `AdapterResult<...>`. That is
   * deliberate — an UNKNOWN outcome is not an error to unwrap, it is a real
   * result that must be handled. `if (result.ok)` must be impossible to write here.
   */
  execute(
    actionId: PreparedActionId,
    gate: ExecutionGate,
  ): Promise<ActionOutcome>;

  /** 7. RECONCILE — answer "did that ambiguous attempt actually happen?" */
  reconcile(handle: ReconciliationHandle): Promise<ReconciliationOutcome>;

  /** 8. TRACK — read-only status of something already executed. */
  track(externalRef: string): Promise<AdapterResult<CapabilityTrackingStatus>>;

  /**
   * 9. CANCEL — where supported. Where not, implementations MUST return a
   * `not_supported` AdapterError carrying `declaration.cancellationInstructions`
   * rather than failing silently.
   */
  cancel(
    externalRef: string,
    opts: { explicitUserIntent: boolean },
  ): Promise<AdapterResult<{ cancelled: boolean; feeCharged?: Money }>>;
}

/**
 * Uniform tracking shape. Capability-specific stages (PREPARING, ARRIVING) are
 * mapped into this small set, with the provider's own words preserved in
 * `statusText` so Thuna never invents a promise the provider did not make.
 */
export interface CapabilityTrackingStatus {
  externalRef: string;
  stage:
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'ARRIVING'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'DELAYED'
    | 'UNKNOWN';
  /** Provider text, verbatim. Do not paraphrase into a stronger claim. */
  statusText?: string;
  etaMinutes?: number;
  amount?: Money;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Registry — routing
// ---------------------------------------------------------------------------

/**
 * How the companion finds an adapter without knowing a provider exists.
 *
 * Selection is deliberately explicit rather than "best available": an elder
 * being silently moved between providers is a surprise, and surprises are the
 * thing this product is built to avoid.
 */
export interface ServiceCapabilityRegistry {
  /** Every declared capability, for the Demo Inspector and for "what can you do?". */
  list(): ServiceCapabilityDeclaration[];

  /** All providers offering a capability. May be empty — that is a valid answer. */
  forCapability(capability: ServiceCapabilityKind): ServiceCapabilityAdapter[];

  /**
   * The one the companion should use. Returns null when none is configured,
   * which the guidance layer must be able to say plainly:
   * "I can't book rides yet — I can help you call someone though."
   */
  select(
    capability: ServiceCapabilityKind,
    opts?: { providerId?: ProviderId; requireOfficial?: boolean },
  ): ServiceCapabilityAdapter | null;

  /**
   * TRUE only when a real, official, non-simulated provider is wired AND the
   * env gate is on. Anything else must render SIMULATED labelling.
   */
  isRealExecutionAvailable(capability: ServiceCapabilityKind): boolean;
}

// ---------------------------------------------------------------------------
// Notes for Codex
// ---------------------------------------------------------------------------

/**
 * 1. IMPLEMENT BY WRAPPING. `SwiggyFoodCapability` should hold a
 *    `FoodCommerceAdapter` and translate. Do not fork the food logic into this
 *    shape — the cart two-phase addon dance lives in the food adapter and stays
 *    there.
 *
 * 2. The companion layer imports `ServiceCapabilityAdapter` and
 *    `PreparedAction`. It must not import `CartSnapshot`, `FareEstimate`, or any
 *    provider SDK. If a companion file needs a cart type, the seam has leaked.
 *
 * 3. FOOD FIRST. Swiggy MCP is the only verified first-party surface. Ship
 *    FOOD (and GROCERY/DINING via the same MCP) behind flags; everything else
 *    mock.
 *
 * 4. RIDES: `isOfficialIntegration: false`, `isSimulated: true`, and
 *    `supportsExecute` may be true only against a sandbox. Real bookings stay
 *    blocked by the triple gate. See RIDE_PROVIDER_RESEARCH.md §6.
 *
 * 5. `execute()` returning `ActionOutcome` rather than `AdapterResult` is not an
 *    oversight. It removes the possibility of writing `if (result.ok)` and
 *    thereby collapsing UNKNOWN into failure.
 *
 * 6. BILLS IS REMINDER-ONLY. `supportsExecute: false`. Thuna does not pay bills,
 *    does not handle UPI, and refuses OTP/PIN/CVV before any model call. A BILLS
 *    PreparedAction ends at PRESENTED_TO_ELDER and hands off to a human.
 *    Do not "temporarily" set `supportsExecute: true` to test a flow.
 *
 * 7. Suggested tests:
 *      - registry.select() returns null for an unconfigured capability
 *      - isRealExecutionAvailable() false when the adapter is simulated
 *      - execute() refused when the gate is incomplete
 *      - execute() refused when the revision moved since confirm()
 *      - cancel() on a non-cancelling provider returns instructions, not silence
 *      - a companion-layer file importing a provider SDK fails lint
 */
