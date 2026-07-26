/**
 * DRAFT CONTRACT — grocery commerce adapter
 * =========================================
 *
 * DOCUMENTATION ONLY. Not imported by the Thuna app.
 *
 * Provider-neutral port for quick-commerce grocery. Shape derived from the verified
 * Swiggy Instamart tool surface (13 tools) — see docs/integrations/SWIGGY_MCP_RESEARCH.md §3.2.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT JUST FoodCommerceAdapter WITH DIFFERENT NOUNS
 * ---------------------------------------------------------------------------
 *
 * Three verified behavioural differences make a shared interface actively unsafe:
 *
 *  1. `update_cart` on Instamart "Replaces entire cart" — whereas the Food server's
 *     `update_food_cart` adds/modifies. Sharing one method name across both would
 *     mean the same call silently discards the cart on one provider and not the
 *     other. That is a data-loss bug waiting to happen, so the method is named
 *     `replaceCart` here to make the semantics impossible to misread.
 *
 *  2. Instamart exposes address WRITE tools (`create_address`, `delete_address`).
 *     Food does not. Creating an address is a consequential act for an elder
 *     (deliveries go to real places), so it is gated separately.
 *
 *  3. Grocery has stock volatility and minimum-order thresholds that food ordering
 *     does not: ITEM_OUT_OF_STOCK, MIN_ORDER_NOT_MET, ADDRESS_NOT_SERVICEABLE.
 *     Substitution is a first-class concern.
 *
 * Shared vocabulary (Money, AddressId, ConfirmationToken, PlacementResult,
 * AdapterError, ...) SHOULD be lifted into a common module by Codex rather than
 * duplicated. It is restated here only so this draft reads standalone.
 */

import type {
  Money, AddressId, OrderId, PaymentMethod, DeliveryAddress,
  AdapterResult, AdapterError, ConfirmationToken,
  PlacementResult, ReconciliationHandle, ReconciliationOutcome,
  OrderStatus,
} from './food-commerce-adapter.ts';

export type ProductId = string & { readonly __brand: 'ProductId' };

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface ProductVariant {
  id: string;
  /** e.g. "500 g", "1 L". Speak this — an elder ordering milk needs the size. */
  label: string;
  price: Money;
  inStock: boolean;
}

export interface Product {
  id: ProductId;
  name: string;
  brand?: string;
  price: Money;
  inStock: boolean;
  isVeg?: boolean;
  variants?: ProductVariant[];
  /** Grocery UX: "2 left" changes how the agent should phrase things. */
  stockHint?: string;
}

/**
 * Verified: Instamart exposes `your_go_to_items` — "frequently or recently ordered items".
 *
 * This is a natural fit for Thuna's existing "restore my usual order" behaviour, and a
 * better one than food: groceries repeat far more reliably than restaurant meals.
 * Note the PII rule still applies — hold ids, not copied personal data.
 */
export interface GoToItem {
  product: Product;
  lastOrderedAt?: string;
  timesOrdered?: number;
}

export interface GroceryCartLine {
  productId: ProductId;
  name: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  variantId?: string;
  /** Set when the provider substituted or adjusted the line. Must be surfaced aloud. */
  substitutionNote?: string;
}

export interface GroceryCartSnapshot {
  lines: GroceryCartLine[];
  itemTotal: Money;
  deliveryFee: Money;
  handlingFee?: Money;
  taxes?: Money;
  discount?: Money;
  grandTotal: Money;
  availablePaymentMethods: PaymentMethod[];
  /** Grocery-specific: order below this cannot be placed. */
  minimumOrderValue?: Money;
  minimumOrderMet: boolean;
  revision: string;
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface GroceryAdapterCapabilities {
  readonly providerId: string;
  readonly displayName: string;
  readonly isSimulated: boolean;
  readonly supportedPaymentMethods: readonly PaymentMethod[];
  readonly maxOrderValue?: Money;
  readonly minimumOrderValue?: Money;
  readonly supportsCancellation: boolean;
  readonly cancellationInstructions?: string;
  /** Instamart: TRUE. update_cart "Replaces entire cart". */
  readonly cartUpdateReplacesEntireCart: boolean;
  /** Instamart: TRUE (create_address / delete_address). Food: false. */
  readonly supportsAddressWrite: boolean;
  readonly supportsGoToItems: boolean;
  readonly minTrackingPollIntervalMs: number;
  readonly cartIsServerAuthoritative: boolean;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface SearchProductsInput {
  addressId: AddressId;
  query: string;
  vegOnly?: boolean;
  offset?: number;
}

export interface GroceryCartItem {
  productId: ProductId;
  quantity: number;
  variantId?: string;
}

/**
 * NOTE THE NAME. This REPLACES the entire cart on providers where
 * `cartUpdateReplacesEntireCart` is true. Callers must send the full desired
 * cart contents, not a delta.
 */
export interface ReplaceCartInput {
  addressId: AddressId;
  /** The COMPLETE desired cart. Anything omitted is removed. */
  items: GroceryCartItem[];
}

export interface CreateAddressInput {
  label: string;
  addressLine: string;
  landmark?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface GroceryPlaceOrderInput {
  confirmation: ConfirmationToken;
  realOrderEnabled: boolean;
  explicitUserIntent: boolean;
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export interface GroceryCommerceAdapter {
  readonly capabilities: GroceryAdapterCapabilities;

  healthCheck(): Promise<AdapterResult<{ authenticated: boolean }>>;

  // -- discovery (read-only, safe to demo) --
  getAddresses(): Promise<AdapterResult<DeliveryAddress[]>>;
  searchProducts(input: SearchProductsInput): Promise<AdapterResult<Product[]>>;
  /** Maps to `your_go_to_items`. Powers "the usual" for groceries. */
  getGoToItems(addressId: AddressId): Promise<AdapterResult<GoToItem[]>>;

  // -- address write (gated; only where supportsAddressWrite) --
  /**
   * Consequential: a wrong address sends real goods to a real wrong place.
   * Implementations MUST require explicit user confirmation, and SHOULD refuse
   * when `capabilities.supportsAddressWrite` is false.
   */
  createAddress(
    input: CreateAddressInput & { explicitUserIntent: boolean },
  ): Promise<AdapterResult<DeliveryAddress>>;

  /** Destructive. Requires explicit intent and a readback of what is being deleted. */
  deleteAddress(
    addressId: AddressId,
    opts: { explicitUserIntent: boolean },
  ): Promise<AdapterResult<void>>;

  // -- cart --
  /** Replaces the whole cart where the provider says so. See ReplaceCartInput. */
  replaceCart(input: ReplaceCartInput): Promise<AdapterResult<GroceryCartSnapshot>>;

  /** AUTHORITATIVE read. Never cached. Required before minting confirmation. */
  readCart(addressId: AddressId): Promise<AdapterResult<GroceryCartSnapshot>>;

  clearCart(addressId: AddressId): Promise<AdapterResult<void>>;

  // -- confirmation & checkout --
  /** MUST enforce minimumOrderMet and maxOrderValue before minting. */
  mintConfirmation(input: {
    snapshot: GroceryCartSnapshot;
    addressId: AddressId;
    paymentMethod: PaymentMethod;
    readbackText: string;
    ttlMs?: number;
  }): Promise<AdapterResult<ConfirmationToken>>;

  /**
   * Maps to Instamart `checkout` — "Creates order and confirms payment".
   * NON-IDEMPOTENT, exactly like place_food_order. UNKNOWN requires reconcile().
   */
  checkout(input: GroceryPlaceOrderInput): Promise<PlacementResult>;

  reconcile(handle: ReconciliationHandle): Promise<ReconciliationOutcome>;

  // -- tracking --
  trackOrder(orderId: OrderId): Promise<AdapterResult<OrderStatus>>;
  listActiveOrders(): Promise<AdapterResult<OrderStatus[]>>;
}

// ---------------------------------------------------------------------------
// Notes for Codex
// ---------------------------------------------------------------------------

/**
 * 1. Grocery is NOT in Thuna's locked demo scope. This contract exists so the
 *    adapter layer is shaped correctly from the start; do not build a GROCERY skill
 *    unless scope is explicitly widened.
 *
 * 2. `replaceCart` is the sharpest edge here. Whenever
 *    `cartUpdateReplacesEntireCart` is true, a caller that sends only the changed
 *    line silently deletes everything else. Consider asserting in the mock adapter
 *    that callers always pass a full cart, so the bug surfaces in tests rather than
 *    in front of an elder.
 *
 * 3. Out-of-stock and substitution must be SPOKEN, never silently accepted.
 *    An elder who asked for one brand and receives another has been misled by
 *    omission — `substitutionNote` exists to make that impossible to skip.
 *
 * 4. MIN_ORDER_NOT_MET should be caught BEFORE readback, so the elder is not
 *    walked through a confirmation that cannot succeed.
 */
