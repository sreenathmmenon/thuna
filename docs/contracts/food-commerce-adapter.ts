/**
 * DRAFT CONTRACT — food commerce adapter
 * ======================================
 *
 * DOCUMENTATION ONLY. Not imported by the Thuna app. Not compiled into the build.
 * This is a draft for Codex to adapt into the final production contracts.
 *
 * Purpose: describe the seam between Thuna's deterministic engine and ANY food-ordering
 * provider (Swiggy MCP today; Zomato/ONDC/a mock tomorrow), so that:
 *
 *   1. The engine never learns provider-specific concepts (carts, coupon codes, MCP tools).
 *   2. Provider limitations that AFFECT SAFETY are expressed in the type system, not in prose.
 *   3. Swapping to a mock for demos is a one-line change.
 *
 * Shape derived from verified Swiggy MCP behaviour — see
 * docs/integrations/SWIGGY_FOOD_FLOW.md and SWIGGY_MCP_RESEARCH.md.
 *
 * ---------------------------------------------------------------------------
 * THE THREE DESIGN DECISIONS THAT MATTER
 * ---------------------------------------------------------------------------
 *
 * (a) `readCart()` is authoritative and separate from local state.
 *     Swiggy: "Never cache cart state locally. The authoritative source is always the
 *     server." The total spoken to an elder MUST come from a fresh provider read, never
 *     from a locally computed sum. Thuna's simulated skill computes its own total, which
 *     is correct for a simulation and wrong for a real provider.
 *
 * (b) Confirmation is a TOKEN minted from a cart snapshot, not a boolean.
 *     A boolean cannot express "the user agreed to THIS total". If the cart changes
 *     between readback and placement, the token must no longer validate — the elder
 *     confirmed a price that no longer exists. This makes the existing engine rule
 *     ("a correction invalidates stale confirmation") enforceable against SERVER drift
 *     too, not just user corrections.
 *
 * (c) placeOrder() returns a three-state result, never a boolean.
 *     Swiggy: `place_food_order` "is not idempotent"; on 5xx you must call
 *     `get_food_orders` to check whether it actually placed. So the outcome space is
 *     PLACED | REJECTED | UNKNOWN. Collapsing UNKNOWN into either is the single most
 *     dangerous bug available in this integration: claim failure and you double-order;
 *     claim success and no food arrives.
 *
 *     This mirrors an invariant Thuna already holds — "silence is not completion".
 *     An ambiguous network outcome is not completion either.
 */

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/**
 * Minor units (paise). Never use floats for money.
 * Providers report rupees; adapters convert at the boundary.
 */
export type Paise = number;

export interface Money {
  amount: Paise;
  currency: 'INR';
}

/** For TTS: Swiggy voice guidance requires "₹249" → "two hundred and forty-nine rupees". */
export interface SpokenMoney extends Money {
  /** Pre-rendered spoken form, produced by the guidance layer. */
  spoken: string;
}

// ---------------------------------------------------------------------------
// Opaque provider handles
// ---------------------------------------------------------------------------

/**
 * Branded opaque identifiers. These are provider-internal handles.
 *
 * Swiggy voice rule: "Never read tool IDs aloud" (addressId, restaurantId, spinId).
 * The branding exists so a handle cannot be accidentally passed where a display
 * string is expected — the type system helps enforce the never-speak-IDs rule.
 */
export type AddressId = string & { readonly __brand: 'AddressId' };
export type RestaurantId = string & { readonly __brand: 'RestaurantId' };
export type MenuItemId = string & { readonly __brand: 'MenuItemId' };
export type OrderId = string & { readonly __brand: 'OrderId' };

// ---------------------------------------------------------------------------
// Domain values
// ---------------------------------------------------------------------------

export interface DeliveryAddress {
  id: AddressId;
  /** Human label, e.g. "Home", "Office". Safe to speak. */
  label: string;
  /**
   * Full address text. PII under DPDP.
   * MUST NOT be persisted into Thuna's own memory store — hold the id and re-fetch.
   * See SWIGGY_AUTH_AND_SECURITY.md §9.
   */
  displayText?: string;
  isDefault?: boolean;
}

/** Verified: search_restaurants returns OPEN | CLOSED | UNAVAILABLE. Must be checked. */
export type RestaurantAvailability = 'OPEN' | 'CLOSED' | 'UNAVAILABLE';

export interface Restaurant {
  id: RestaurantId;
  name: string;
  availability: RestaurantAvailability;
  /** Voice guidance: surface distance when > 5km. */
  distanceKm?: number;
  rating?: number;
  etaMinutes?: number;
}

/**
 * Swiggy: an item carries EITHER `variants` (legacy) OR `variantsV2` — "never both".
 * The adapter normalises this away; the engine must never see the distinction.
 */
export interface MenuItemOption {
  id: string;
  name: string;
  priceDelta: Money;
}

export interface MenuItem {
  id: MenuItemId;
  name: string;
  price: Money;
  isVeg?: boolean;
  /** Choose-one groups (size, base). */
  variants?: MenuItemOption[];
  /**
   * Add-ons. Validity depends on the chosen variant — Swiggy requires adding the item
   * with variants FIRST, then reading `valid_addons` from the cart before adding these.
   * The adapter owns that two-phase dance.
   */
  addons?: MenuItemOption[];
}

export interface CartLine {
  itemId: MenuItemId;
  name: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  selectedVariants?: MenuItemOption[];
  selectedAddons?: MenuItemOption[];
}

/**
 * A cart AS REPORTED BY THE PROVIDER. Read-only to Thuna.
 * Every field here is provider truth; nothing is locally derived.
 */
export interface CartSnapshot {
  restaurantId?: RestaurantId;
  restaurantName?: string;
  lines: CartLine[];
  itemTotal: Money;
  /** Provider-computed. Thuna must NOT hardcode a delivery fee for a real order. */
  deliveryFee: Money;
  taxes?: Money;
  discount?: Money;
  /** The ONLY number that may be read back before confirmation. */
  grandTotal: Money;
  /**
   * Verified: "Display whatever payment method(s) are returned to the user".
   * Swiggy v1 is COD-only, but read this rather than assuming.
   */
  availablePaymentMethods: PaymentMethod[];
  /**
   * Opaque provider fingerprint of this cart state. Used to detect drift between
   * readback and placement. Adapters may synthesise it (e.g. hash of lines + total).
   */
  revision: string;
  fetchedAt: string; // ISO 8601
}

/** Swiggy v1: "Only COD is supported". Kept open for future providers. */
export type PaymentMethod = 'COD' | 'ONLINE' | 'WALLET';

// ---------------------------------------------------------------------------
// Confirmation token — decision (b)
// ---------------------------------------------------------------------------

/**
 * Minted ONLY from a freshly-read CartSnapshot, immediately before readback.
 * Consumed by placeOrder(). An adapter MUST reject a token whose `cartRevision`
 * no longer matches the current cart.
 *
 * This is what makes "the elder confirmed THIS total" a checkable claim rather
 * than an assumption.
 */
export interface ConfirmationToken {
  readonly token: string;
  /** Cart fingerprint at mint time. Placement fails if the cart has moved. */
  readonly cartRevision: string;
  /** Exact amount read back to the user. */
  readonly confirmedTotal: Money;
  readonly confirmedPaymentMethod: PaymentMethod;
  readonly addressId: AddressId;
  /** Short-lived; an old confirmation is not a confirmation. */
  readonly expiresAt: string;
  /** Verbatim text spoken to the elder. Auditable: what did they actually agree to? */
  readonly readbackText: string;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** Mirrors the official error taxonomy. See SWIGGY_MCP_RESEARCH.md §7. */
export type AdapterErrorClass =
  | 'auth'             // 401 / -32001 → re-authorise; never retry same token
  | 'bad_input'        // 400 → fix args; do NOT retry
  | 'upstream_timeout' // 504 → backoff, max 5
  | 'upstream_error'   // 502/503 → backoff, max 5
  | 'domain_failure'   // HTTP 200 + success:false → TERMINAL, surface to user
  | 'rate_limited'     // 429 → honour Retry-After
  | 'internal'         // 500 / -32603
  | 'blocked_by_policy'// our own safety gate refused
  | 'not_supported'    // provider cannot do this at all (e.g. cancellation)
  | 'unknown';

export interface AdapterError {
  class: AdapterErrorClass;
  /** Provider message. May be shown to the user for `domain_failure`. */
  message: string;
  retryable: boolean;
  /** Present when the provider emitted a symbolic code (e.g. RESTAURANT_CLOSED). */
  code?: string;
}

export type AdapterResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AdapterError };

// ---------------------------------------------------------------------------
// Order placement — decision (c)
// ---------------------------------------------------------------------------

/**
 * THREE states. Never collapse to a boolean.
 *
 * PLACED   — provider confirmed. Safe to tell the elder the order is in.
 * REJECTED — provider definitively refused (closed, cap exceeded, item gone).
 *            Safe to tell the elder it did not go through.
 * UNKNOWN  — network/5xx. The order MAY OR MAY NOT exist. Say nothing definitive;
 *            run reconcile() before speaking.
 */
export type PlacementStatus = 'PLACED' | 'REJECTED' | 'UNKNOWN';

export interface PlacementResult {
  status: PlacementStatus;
  orderId?: OrderId;
  /** Provider's own success message. Swiggy requires using it as-is where given. */
  providerMessage?: string;
  /** Present when REJECTED. */
  error?: AdapterError;
  /**
   * Present when UNKNOWN — everything needed to reconcile.
   * Non-null here is a REQUIREMENT to call reconcile() before informing the user.
   */
  reconciliation?: ReconciliationHandle;
}

/**
 * Carries the state needed to answer "did it actually place?" after an ambiguous failure.
 * Swiggy procedure: wait 2-5s, then call get_food_orders.
 */
export interface ReconciliationHandle {
  /** Client-generated correlation id, logged before the attempt. */
  attemptId: string;
  attemptedAt: string;
  addressId: AddressId;
  restaurantId?: RestaurantId;
  expectedTotal: Money;
  /** Provider-recommended wait before checking. Swiggy: 2-5 seconds. */
  recommendedWaitMs: number;
}

export type ReconciliationOutcome =
  | { resolved: true; status: 'PLACED'; orderId: OrderId }
  | { resolved: true; status: 'NOT_PLACED' }
  /** Still ambiguous. Escalate to a human — do NOT retry. */
  | { resolved: false; reason: string };

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

export type OrderStage =
  | 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'DELAYED' | 'UNKNOWN';

export interface OrderStatus {
  orderId: OrderId;
  stage: OrderStage;
  /** Provider text. Thuna must NOT invent a delivery promise the provider did not make. */
  statusText?: string;
  etaMinutes?: number;
  restaurantName?: string;
  total?: Money;
  placedAt?: string;
}

// ---------------------------------------------------------------------------
// Capabilities — provider limits, expressed as data
// ---------------------------------------------------------------------------

/**
 * Lets Thuna adapt its behaviour without hardcoding "Swiggy" anywhere.
 * The engine asks the adapter what it can do; it never assumes.
 */
export interface FoodAdapterCapabilities {
  readonly providerId: string;            // 'swiggy-mcp' | 'mock' | ...
  readonly displayName: string;           // 'Swiggy'
  /** True for mock/staging. Governs whether the UI shows SIMULATED labelling. */
  readonly isSimulated: boolean;
  readonly supportedPaymentMethods: readonly PaymentMethod[];
  /** Swiggy: 100000 paise (Rs 1000). Placement rejected at >= this value. */
  readonly maxOrderValue?: Money;
  /** Swiggy: false. No cancellation tool exists; users must call customer care. */
  readonly supportsCancellation: boolean;
  /** Human-facing route when cancellation is unsupported (Swiggy: 080-67466729). */
  readonly cancellationInstructions?: string;
  readonly supportsCoupons: boolean;
  readonly supportsScheduledDelivery: boolean;
  /** Swiggy: 10000ms. Do not poll faster. */
  readonly minTrackingPollIntervalMs: number;
  /** Swiggy: cart lives server-side and must be re-read before every confirmation. */
  readonly cartIsServerAuthoritative: boolean;
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export interface SearchRestaurantsInput {
  addressId: AddressId;
  query: string;
  offset?: number;
}

export interface SearchMenuInput {
  addressId: AddressId;
  query: string;
  restaurantId?: RestaurantId;
  vegOnly?: boolean;
  offset?: number;
}

export interface GetMenuInput {
  addressId: AddressId;
  restaurantId: RestaurantId;
  page?: number;
  pageSize?: number;
}

export interface CartMutation {
  itemId: MenuItemId;
  /** 0 removes the line. */
  quantity: number;
  variantIds?: string[];
  addonIds?: string[];
}

export interface UpdateCartInput {
  addressId: AddressId;
  restaurantId: RestaurantId;
  mutations: CartMutation[];
}

export interface PlaceOrderInput {
  /** Minted from a fresh cart read. Placement without one is a contract violation. */
  confirmation: ConfirmationToken;
  /**
   * Double gate, mirroring experiments/swiggy-mcp/src/safety.ts.
   * An adapter MUST refuse placement unless BOTH are true. The env flag alone
   * must never be sufficient to spend an elder's money.
   */
  realOrderEnabled: boolean;
  explicitUserIntent: boolean;
}

/**
 * The provider-neutral food commerce port.
 *
 * Implementations: MockFoodAdapter (default, demo-safe), SwiggyMcpFoodAdapter (flag-gated).
 * The engine depends on THIS, never on a concrete adapter.
 */
export interface FoodCommerceAdapter {
  readonly capabilities: FoodAdapterCapabilities;

  /** Cheap liveness/auth check. Should not mutate anything. */
  healthCheck(): Promise<AdapterResult<{ authenticated: boolean }>>;

  // -- discovery (read-only, safe to demo) --
  getAddresses(): Promise<AdapterResult<DeliveryAddress[]>>;
  searchRestaurants(input: SearchRestaurantsInput): Promise<AdapterResult<Restaurant[]>>;
  getMenu(input: GetMenuInput): Promise<AdapterResult<MenuItem[]>>;
  searchMenu(input: SearchMenuInput): Promise<AdapterResult<MenuItem[]>>;

  // -- cart --
  updateCart(input: UpdateCartInput): Promise<AdapterResult<CartSnapshot>>;

  /**
   * AUTHORITATIVE cart read. Must hit the provider — never serve from cache.
   * MUST be called immediately before minting a confirmation token.
   */
  readCart(addressId: AddressId): Promise<AdapterResult<CartSnapshot>>;

  clearCart(addressId: AddressId): Promise<AdapterResult<void>>;

  // -- confirmation --
  /**
   * Mint a confirmation token from a snapshot the user has just been read back.
   * Implementations MUST reject a stale snapshot (one whose revision no longer
   * matches the live cart) and MUST enforce `maxOrderValue`.
   */
  mintConfirmation(input: {
    snapshot: CartSnapshot;
    addressId: AddressId;
    paymentMethod: PaymentMethod;
    readbackText: string;
    ttlMs?: number;
  }): Promise<AdapterResult<ConfirmationToken>>;

  // -- placement --
  /**
   * NON-IDEMPOTENT. Never call twice for one user intent.
   * On `status: 'UNKNOWN'`, the caller MUST call reconcile() before telling the user
   * anything definitive.
   */
  placeOrder(input: PlaceOrderInput): Promise<PlacementResult>;

  /** Answers "did that ambiguous attempt actually place?" via order history. */
  reconcile(handle: ReconciliationHandle): Promise<ReconciliationOutcome>;

  // -- tracking --
  trackOrder(orderId: OrderId): Promise<AdapterResult<OrderStatus>>;
  listActiveOrders(): Promise<AdapterResult<OrderStatus[]>>;
}

// ---------------------------------------------------------------------------
// Notes for Codex
// ---------------------------------------------------------------------------

/**
 * INTEGRATION NOTES
 *
 * 1. Do NOT import this file into the app. Copy the parts you need into the real
 *    contract location and adapt to house style (Zod schemas per AGENTS.md, etc.).
 *
 * 2. Keep the engine ignorant of carts. Suggested placement: the ORDER_FOOD skill
 *    handler gains an optional adapter; `lib/engine.ts` does not change at all.
 *    The engine already delegates skill specifics to the handler — that seam is
 *    exactly where this belongs.
 *
 * 3. Default to MockFoodAdapter. `isSimulated: true` drives the existing
 *    "SIMULATED ORDER SUCCESS" labelling, which must remain until a real order is
 *    genuinely placed.
 *
 * 4. The readback must be built from `readCart()` output. If you find yourself
 *    computing a total in Thuna for a real provider, something has gone wrong.
 *
 * 5. UNKNOWN is not an error to swallow. Wire it to a real user-facing behaviour:
 *    "Let me check whether that went through" → reconcile() → then speak.
 *
 * 6. Swiggy-derived addresses are PII. Store `AddressId`, re-fetch the text.
 *    Do not copy `displayText` into Thuna's memory store.
 */
