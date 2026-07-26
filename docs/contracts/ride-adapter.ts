/**
 * DRAFT CONTRACT — ride adapter
 * =============================
 *
 * DOCUMENTATION ONLY. Not imported by the Thuna app.
 *
 * ---------------------------------------------------------------------------
 * READ THIS FIRST
 * ---------------------------------------------------------------------------
 *
 * Unlike the food/grocery/dining contracts, this one is NOT derived from a verified
 * first-party MCP surface, because none exists. As of 2026-07-26:
 *
 *   - Swiggy MCP is official and first-party.        → food/grocery/dining are grounded.
 *   - NO Indian ride provider publishes an official MCP server.
 *   - Uber has an official REST API with a real sandbox (sandbox-api.uber.com).
 *   - Ola has an official developer platform, but access is INVITE-ONLY since Nov 2017.
 *   - Rapido has NO discoverable official public developer API.
 *   - Namma Yatri is open-source (AGPL-3.0) and on ONDC, but its open surface is
 *     open DATA, not a third-party booking API. Booking requires becoming a
 *     registered Beckn/ONDC network participant (BAP).
 *
 * See docs/integrations/RIDE_PROVIDER_RESEARCH.md for the evidence.
 *
 * CONSEQUENCE FOR THIS FILE: it is deliberately PROVIDER-NEUTRAL and mock-first.
 * It is a shape to build against, not a description of an API anyone can call today.
 * Every field below is a Thuna design decision, NOT a documented provider fact.
 *
 * ---------------------------------------------------------------------------
 * WHY RIDES ARE THE HIGHEST-RISK VERTICAL FOR AN ELDER COMPANION
 * ---------------------------------------------------------------------------
 *
 * A wrong food order wastes money. A wrong ride puts a person in a stranger's
 * vehicle heading somewhere they did not intend, possibly without a phone they can
 * use to fix it. The asymmetry justifies stricter defaults than commerce:
 *
 *   - Destination must be read back and confirmed, always. No "usual" shortcut
 *     may skip confirmation, however confident the memory layer is.
 *   - Fare ESTIMATES must be spoken as estimates. Surge exists; a quoted number
 *     that later differs is a broken promise to someone on a fixed income.
 *   - Cancellation must be reachable at every stage, and cancellation windows/fees
 *     stated before booking.
 *   - Driver and vehicle details must be speakable — that is the elder's safety check
 *     at the kerb, and it is the one piece of data they genuinely need aloud.
 */

import type {
  Money, AdapterResult, AdapterError,
  ReconciliationHandle, ReconciliationOutcome,
} from './food-commerce-adapter.ts';

export type RideId = string & { readonly __brand: 'RideId' };
export type RideProductId = string & { readonly __brand: 'RideProductId' };

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

/**
 * Coordinates are PII. Log only at reduced precision; never persist raw traces.
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Place {
  /** Provider place handle where available. */
  id?: string;
  /** Speakable name: "Home", "Manipal Hospital". */
  label: string;
  /** Full address. PII — do not copy into long-term memory. */
  displayText?: string;
  point?: GeoPoint;
}

// ---------------------------------------------------------------------------
// Products & estimates
// ---------------------------------------------------------------------------

export interface RideProduct {
  id: RideProductId;
  /** "Auto", "Bike", "Sedan". Speak this. */
  displayName: string;
  capacity?: number;
  etaMinutes?: number;
  available: boolean;
}

/**
 * An ESTIMATE. Never present as a final price.
 *
 * `isEstimate` is non-optional and always true for a reason: it should be
 * impossible to construct a fare object that reads as a guarantee.
 */
export interface FareEstimate {
  productId: RideProductId;
  low: Money;
  high: Money;
  /** ALWAYS true. Guidance must speak this as a range or an "about". */
  readonly isEstimate: true;
  /** Surge/peak indicator. If set, say so — do not hide it. */
  surgeMultiplier?: number;
  surgeNote?: string;
  distanceKm?: number;
  durationMinutes?: number;
}

// ---------------------------------------------------------------------------
// Ride lifecycle
// ---------------------------------------------------------------------------

export type RideState =
  | 'REQUESTED' | 'ACCEPTED' | 'ARRIVING' | 'ARRIVED'
  | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  | 'NO_DRIVERS' | 'UNKNOWN';

/**
 * What the elder needs at the kerb to verify they are getting into the right vehicle.
 * This is a safety feature, not a nicety — it must be speakable in full.
 */
export interface DriverInfo {
  name?: string;
  /** Speak digit-by-digit: "K A 0 5 ..." — never as a word. */
  vehicleNumber?: string;
  vehicleModel?: string;
  vehicleColour?: string;
  rating?: number;
  /** Present so the elder can call the driver; never store beyond the ride. */
  phoneNumber?: string;
}

export interface Ride {
  id: RideId;
  state: RideState;
  pickup: Place;
  dropoff: Place;
  product?: RideProduct;
  driver?: DriverInfo;
  etaMinutes?: number;
  /** Final fare, present only once COMPLETED. */
  finalFare?: Money;
  estimate?: FareEstimate;
  requestedAt?: string;
}

// ---------------------------------------------------------------------------
// Confirmation
// ---------------------------------------------------------------------------

/**
 * What the elder agreed to: a DESTINATION, a vehicle type, and a fare RANGE.
 */
export interface RideConfirmationToken {
  readonly token: string;
  readonly pickup: Place;
  readonly dropoff: Place;
  readonly productId: RideProductId;
  readonly quotedFare: FareEstimate;
  /** Detects that the quote moved (e.g. surge appeared) before booking. */
  readonly quoteFingerprint: string;
  readonly expiresAt: string;
  /**
   * Verbatim readback. MUST include the destination and an explicit
   * estimate-not-price framing:
   * "An auto from Home to Manipal Hospital, about eighty to a hundred rupees.
   *  Shall I book it?"
   */
  readonly readbackText: string;
}

export type RideRequestStatus = 'BOOKED' | 'REJECTED' | 'NO_DRIVERS' | 'UNKNOWN';

export interface RideRequestResult {
  status: RideRequestStatus;
  ride?: Ride;
  error?: AdapterError;
  /** Present when UNKNOWN. Booking is non-idempotent — reconcile before speaking. */
  reconciliation?: ReconciliationHandle;
}

export interface CancellationPolicy {
  /** Free-cancellation window from booking. */
  freeWindowSeconds?: number;
  /** Fee after the free window. */
  lateFee?: Money;
  /** Speak this BEFORE booking, not after. */
  spokenSummary: string;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface RideAdapterCapabilities {
  readonly providerId: string;      // 'mock' | 'uber-sandbox' | 'uber' | 'ola' | 'beckn' | ...
  readonly displayName: string;
  /**
   * TRUE for mock and for any sandbox. Drives SIMULATED labelling in the UI.
   * Uber's sandbox does not create real trips, so it is `true` there too.
   */
  readonly isSimulated: boolean;
  /**
   * TRUE only where a signed agreement / approved production access exists.
   * Thuna MUST refuse to book with a non-official provider integration.
   */
  readonly isOfficialIntegration: boolean;
  readonly supportsFareEstimate: boolean;
  readonly supportsCancellation: boolean;
  readonly cancellationPolicy?: CancellationPolicy;
  readonly supportsScheduledRides: boolean;
  readonly supportsDriverContact: boolean;
  readonly minTrackingPollIntervalMs: number;
  /** Cities/regions served, where the provider states them. */
  readonly serviceAreas?: readonly string[];
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface EstimateInput {
  pickup: Place;
  dropoff: Place;
}

export interface RequestRideInput {
  confirmation: RideConfirmationToken;
  /**
   * TRIPLE gate — stricter than commerce, deliberately.
   * A ride carries a person, so provider legitimacy is checked too.
   */
  realRideEnabled: boolean;
  explicitUserIntent: boolean;
  /** MUST be false-blocking: refuse to book via an unofficial integration. */
  providerIsOfficial: boolean;
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export interface RideAdapter {
  readonly capabilities: RideAdapterCapabilities;

  healthCheck(): Promise<AdapterResult<{ authenticated: boolean }>>;

  // -- discovery (read-only, safe to demo) --
  getSavedPlaces(): Promise<AdapterResult<Place[]>>;
  resolvePlace(query: string, near?: GeoPoint): Promise<AdapterResult<Place[]>>;
  getAvailableProducts(pickup: Place): Promise<AdapterResult<RideProduct[]>>;

  /** Read-only. Always an estimate — see FareEstimate.isEstimate. */
  estimateFare(input: EstimateInput): Promise<AdapterResult<FareEstimate[]>>;

  // -- confirmation --
  /**
   * MUST re-check the quote and reject a stale/moved one (e.g. surge appeared).
   * MUST refuse to mint when `capabilities.isOfficialIntegration` is false and
   * the caller intends a real booking.
   */
  mintConfirmation(input: {
    pickup: Place;
    dropoff: Place;
    estimate: FareEstimate;
    readbackText: string;
    ttlMs?: number;
  }): Promise<AdapterResult<RideConfirmationToken>>;

  // -- booking --
  /**
   * NON-IDEMPOTENT. On UNKNOWN, reconcile via ride history before saying anything —
   * a phantom "your auto is coming" leaves an elder waiting at a kerb.
   */
  requestRide(input: RequestRideInput): Promise<RideRequestResult>;

  reconcile(handle: ReconciliationHandle): Promise<ReconciliationOutcome>;

  // -- manage --
  getRide(id: RideId): Promise<AdapterResult<Ride>>;
  listActiveRides(): Promise<AdapterResult<Ride[]>>;

  /**
   * Cancellation must ALWAYS be reachable. Where a provider cannot cancel
   * programmatically, return `not_supported` WITH human instructions rather than
   * silently failing — the elder needs a route out either way.
   */
  cancelRide(
    id: RideId,
    opts: { explicitUserIntent: boolean },
  ): Promise<AdapterResult<{ cancelled: boolean; feeCharged?: Money }>>;
}

// ---------------------------------------------------------------------------
// Notes for Codex
// ---------------------------------------------------------------------------

/**
 * 1. SHIP THE MOCK ONLY. `MockRideAdapter` with `isSimulated: true` and
 *    `isOfficialIntegration: false`. That is the entire near-term deliverable.
 *
 * 2. Rides are NOT in Thuna's locked demo scope. Do not build a RIDE skill unless
 *    scope is explicitly widened.
 *
 * 3. If a sandbox is ever wired, Uber's is the only one verified to exist for
 *    India-relevant use and it does not create real trips. Still `isSimulated: true`.
 *
 * 4. DO NOT wire a community/third-party MCP into a real booking path. Community
 *    servers are useful as reference implementations and for mock data; they are not
 *    an authorisation to put an elder in a car. See RIDE_PROVIDER_RESEARCH.md §6.
 *
 * 5. The triple gate on `requestRide` is intentional. `providerIsOfficial` should be
 *    read from `capabilities.isOfficialIntegration` and asserted at the call site, so
 *    that shipping an unofficial adapter cannot silently enable real bookings.
 *
 * 6. Speak vehicle numbers digit-by-digit. "KA05AB1234" read as a word is useless
 *    at a kerb.
 */
