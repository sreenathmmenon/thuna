/**
 * DRAFT CONTRACT — dining reservation adapter
 * ===========================================
 *
 * DOCUMENTATION ONLY. Not imported by the Thuna app.
 *
 * Provider-neutral port for table reservations. Shape derived from the verified
 * Swiggy Dineout tool surface (8 tools) — see docs/integrations/SWIGGY_MCP_RESEARCH.md §3.3.
 *
 * ---------------------------------------------------------------------------
 * WHAT MAKES RESERVATIONS DIFFERENT
 * ---------------------------------------------------------------------------
 *
 * A reservation commits a PERSON TO A PLACE AT A TIME, not goods to an address.
 * That changes the safety profile in ways worth encoding:
 *
 *  1. Slots expire between listing and booking. A slot shown 90 seconds ago may be
 *     gone. `SLOT_UNAVAILABLE` is a normal outcome, not an exception, so the
 *     contract carries slot freshness explicitly.
 *
 *  2. Time and date are the elder-facing payload. Getting "7pm today" vs "7pm
 *     tomorrow" wrong is the characteristic failure here, and it is easy to make
 *     over voice. The readback MUST include the weekday, the date and the time —
 *     never a bare "7 pm".
 *
 *  3. Verified: Swiggy `book_table` "supports only free reservations". No money
 *     moves. That LOWERS the financial stakes but not the social ones — an elder
 *     may travel to a restaurant on the strength of this.
 *
 *  4. Verified: `get_available_slots` covers "up to 7 days from request date".
 *     A request for "next month" cannot be served and must be declined honestly.
 */

import type {
  Money, AdapterResult, AdapterError,
  ReconciliationHandle, ReconciliationOutcome,
} from './food-commerce-adapter.ts';

export type DineoutRestaurantId = string & { readonly __brand: 'DineoutRestaurantId' };
export type BookingId = string & { readonly __brand: 'BookingId' };
export type SlotId = string & { readonly __brand: 'SlotId' };
export type LocationId = string & { readonly __brand: 'LocationId' };

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

export interface SavedLocation {
  id: LocationId;
  label: string;
  displayText?: string;
}

export interface DineoutRestaurant {
  id: DineoutRestaurantId;
  name: string;
  cuisine?: string[];
  rating?: number;
  distanceKm?: number;
  /** Verified: get_restaurant_details returns "ratings, deals, timings, address". */
  timings?: string;
  address?: string;
  bookable: boolean;
}

export interface TimeSlot {
  id: SlotId;
  /** ISO 8601 WITH timezone. Never a bare local time — ambiguity here is the bug. */
  startsAt: string;
  /** Rendered for speech, e.g. "Friday the 31st of July, at 7 in the evening". */
  spokenLabel: string;
  available: boolean;
  maxPartySize?: number;
}

export interface SlotAvailability {
  restaurantId: DineoutRestaurantId;
  slots: TimeSlot[];
  /** Slot lists go stale fast. Used to decide whether a re-read is required. */
  fetchedAt: string;
  /** Verified for Swiggy: 7. A request beyond this window must be declined. */
  windowDays: number;
}

export type BookingState =
  | 'PENDING' | 'CONFIRMED' | 'SEATED'
  | 'CANCELLED' | 'NO_SHOW' | 'EXPIRED' | 'UNKNOWN';

export interface Booking {
  id: BookingId;
  restaurantId: DineoutRestaurantId;
  restaurantName: string;
  startsAt: string;
  partySize: number;
  state: BookingState;
  /** Verified: Swiggy supports only free reservations. Present for future providers. */
  amountPaid?: Money;
  confirmationCode?: string;
}

// ---------------------------------------------------------------------------
// Confirmation — reservation-specific
// ---------------------------------------------------------------------------

/**
 * Distinct from the food ConfirmationToken: what the elder is agreeing to is a
 * TIME and a PARTY SIZE, not a total.
 *
 * `slotFingerprint` lets the adapter detect that the slot moved or vanished between
 * readback and booking, exactly as `cartRevision` does for carts.
 */
export interface ReservationConfirmationToken {
  readonly token: string;
  readonly restaurantId: DineoutRestaurantId;
  readonly slotId: SlotId;
  readonly slotFingerprint: string;
  readonly startsAt: string;
  readonly partySize: number;
  readonly expiresAt: string;
  /**
   * Verbatim readback. MUST include weekday + date + time + party size + restaurant.
   * "Table for two at Udupi Cafe, this Friday the 31st of July, at 7 in the evening."
   */
  readonly readbackText: string;
}

export type BookingStatus = 'BOOKED' | 'REJECTED' | 'UNKNOWN';

export interface BookingResult {
  status: BookingStatus;
  booking?: Booking;
  providerMessage?: string;
  error?: AdapterError;
  /** Present when UNKNOWN. book_table is non-idempotent — reconcile before speaking. */
  reconciliation?: ReconciliationHandle;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface DiningAdapterCapabilities {
  readonly providerId: string;
  readonly displayName: string;
  readonly isSimulated: boolean;
  /** Swiggy: 7. */
  readonly maxAdvanceDays: number;
  /** Swiggy: true — free reservations only. */
  readonly freeReservationsOnly: boolean;
  readonly supportsCancellation: boolean;
  readonly cancellationInstructions?: string;
  readonly supportsBillPayment: boolean;
  readonly maxPartySize?: number;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface SearchDineoutInput {
  locationId: LocationId;
  query: string;
  offset?: number;
}

export interface GetSlotsInput {
  restaurantId: DineoutRestaurantId;
  /** ISO date (YYYY-MM-DD). Must fall within maxAdvanceDays. */
  date: string;
  partySize: number;
}

export interface BookTableInput {
  confirmation: ReservationConfirmationToken;
  /** Double gate, consistent with the food adapter. */
  realBookingEnabled: boolean;
  explicitUserIntent: boolean;
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export interface DiningReservationAdapter {
  readonly capabilities: DiningAdapterCapabilities;

  healthCheck(): Promise<AdapterResult<{ authenticated: boolean }>>;

  // -- discovery (read-only, safe to demo) --
  getSavedLocations(): Promise<AdapterResult<SavedLocation[]>>;
  searchRestaurants(input: SearchDineoutInput): Promise<AdapterResult<DineoutRestaurant[]>>;
  getRestaurantDetails(id: DineoutRestaurantId): Promise<AdapterResult<DineoutRestaurant>>;

  /**
   * AUTHORITATIVE slot read. Must be re-read immediately before minting a
   * confirmation — slot lists go stale within minutes.
   * MUST reject dates beyond `capabilities.maxAdvanceDays` with a clear message
   * rather than silently returning nothing.
   */
  getAvailableSlots(input: GetSlotsInput): Promise<AdapterResult<SlotAvailability>>;

  // -- confirmation --
  /** MUST reject a slot whose fingerprint no longer matches a currently-available slot. */
  mintConfirmation(input: {
    availability: SlotAvailability;
    slotId: SlotId;
    partySize: number;
    readbackText: string;
    ttlMs?: number;
  }): Promise<AdapterResult<ReservationConfirmationToken>>;

  // -- booking --
  /**
   * NON-IDEMPOTENT (classified alongside place_food_order and checkout).
   * On UNKNOWN, call reconcile() — via get_booking_status — before telling the
   * elder anything. A phantom "your table is booked" sends someone out for nothing.
   */
  bookTable(input: BookTableInput): Promise<BookingResult>;

  reconcile(handle: ReconciliationHandle): Promise<ReconciliationOutcome>;

  // -- manage --
  getBookingStatus(id: BookingId): Promise<AdapterResult<Booking>>;
  listBookings(): Promise<AdapterResult<Booking[]>>;
}

// ---------------------------------------------------------------------------
// Notes for Codex
// ---------------------------------------------------------------------------

/**
 * 1. Dineout is NOT in Thuna's locked demo scope. Contract only.
 *
 * 2. Timezone discipline is the whole game. Store and pass ISO 8601 WITH offset.
 *    Render `spokenLabel` once, in the guidance layer, and read back THAT string —
 *    do not re-derive a time for speech at the last moment.
 *
 * 3. Always include the weekday in a spoken reservation readback. "Friday the 31st"
 *    is checkable by an elder; "the 31st" is not.
 *
 * 4. If the elder asks for a date beyond the provider window, say so plainly:
 *    "I can only book up to a week ahead." Do not silently book the wrong week.
 *
 * 5. A reservation is a promise about someone's evening. Treat UNKNOWN with the
 *    same seriousness as an unresolved payment.
 */
