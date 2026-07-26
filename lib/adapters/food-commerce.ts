export type FoodCurrency = 'INR';
export type FoodPaymentMethod = 'COD';

export interface FoodCartLine {
  name: string;
  quantity: number;
  unitPriceRupees: number;
  includes: string[];
  excludes: string[];
}

export interface FoodCartSnapshot {
  cartId: string;
  restaurant: string;
  addressLabel: string;
  lines: FoodCartLine[];
  itemTotalRupees: number;
  deliveryFeeRupees: number;
  grandTotalRupees: number;
  currency: FoodCurrency;
  availablePaymentMethods: readonly FoodPaymentMethod[];
  revision: string;
  fetchedAt: string;
  source: 'simulated' | 'provider';
  providerVerified?: boolean;
  placementDisabled?: boolean;
}

export interface PrepareFoodCartInput {
  restaurant: string;
  addressLabel: string;
  item: {
    name: string;
    quantity?: number;
    includes?: string[];
    excludes?: string[];
  };
  addressId?: string;
  restaurantId?: string;
  providerCartItems?: Record<string, unknown>[];
}

export interface FoodAddress {
  id: string;
  label: string;
  displayText: string;
}

export interface FoodRestaurant {
  id: string;
  name: string;
  available: boolean;
  rating?: number;
  deliveryMinutes?: number;
}

export interface FoodMenuItem {
  id: string;
  name: string;
  priceRupees: number;
  available: boolean;
  restaurantId?: string;
  hasVariants?: boolean;
  hasAddons?: boolean;
}

export interface FoodProviderOrder {
  id: string;
  status?: string;
  totalRupees?: number;
}

export type FoodAdapterErrorCode =
  | 'CART_NOT_FOUND'
  | 'CART_CHANGED'
  | 'TOTAL_NOT_PRESENTED'
  | 'EXPLICIT_CONFIRMATION_REQUIRED'
  | 'CONFIRMATION_EXPIRED'
  | 'REAL_ORDER_DISABLED'
  | 'AUTH_REQUIRED'
  | 'PROVIDER_UNAVAILABLE'
  | 'MALFORMED_PROVIDER_RESPONSE'
  | 'INVALID_PROVIDER_SELECTION'
  | 'ORDER_STATUS_UNKNOWN'
  | 'SWIGGY_ACCESS_NOT_CONFIGURED'
  | 'SWIGGY_ADAPTER_NOT_IMPLEMENTED';

export interface FoodAdapterError {
  code: FoodAdapterErrorCode;
  message: string;
  retryable: boolean;
}

export type FoodAdapterResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: FoodAdapterError };

export interface FoodConfirmationToken {
  token: string;
  cartId: string;
  cartRevision: string;
  confirmedTotalRupees: number;
  paymentMethod: FoodPaymentMethod;
  readbackText: string;
  expiresAt: string;
}

export interface FoodReconciliationMetadata {
  attemptId: string;
  attemptedAt: string;
  cartId: string;
  cartRevision: string;
  expectedTotalRupees: number;
  recommendedWaitMs: number;
}

export type FoodOrderExecutionResult =
  | {
      status: 'PLACED';
      simulated: boolean;
      label: string;
      orderId: string;
      totalRupees: number;
    }
  | {
      status: 'REJECTED';
      simulated: boolean;
      error: FoodAdapterError;
    }
  | {
      status: 'UNKNOWN';
      simulated: boolean;
      reconciliation: FoodReconciliationMetadata;
    };

export type FoodReconciliationResult =
  | { resolved: true; status: 'PLACED'; orderId: string }
  | { resolved: true; status: 'NOT_PLACED' }
  | { resolved: false; reason: string };

export interface FoodCommerceCapabilities {
  providerId: string;
  displayName: string;
  isSimulated: boolean;
  cartIsAuthoritative: true;
  executionIsNonIdempotent: true;
  supportsLiveOrderPlacement: boolean;
}

export interface MintFoodConfirmationInput {
  snapshot: FoodCartSnapshot;
  presentedTotalRupees: number;
  paymentMethod: FoodPaymentMethod;
  readbackText: string;
  explicitUserIntent: boolean;
  ttlMs?: number;
}

export interface ExecuteFoodOrderInput {
  confirmation: FoodConfirmationToken;
  explicitUserIntent: boolean;
  realOrderEnabled: boolean;
}

/**
 * Provider-neutral boundary for food commerce.
 *
 * The current deterministic ORDER_FOOD engine remains synchronous and simulated.
 * Provider-backed flows must prepare and freshly read a cart through this port
 * before presenting a total or attempting execution.
 */
export interface FoodCommerceAdapter {
  readonly capabilities: FoodCommerceCapabilities;

  prepareCart(input: PrepareFoodCartInput): Promise<FoodAdapterResult<FoodCartSnapshot>>;
  readCart(cartId: string): Promise<FoodAdapterResult<FoodCartSnapshot>>;
  mintConfirmation(
    input: MintFoodConfirmationInput,
  ): Promise<FoodAdapterResult<FoodConfirmationToken>>;
  execute(input: ExecuteFoodOrderInput): Promise<FoodOrderExecutionResult>;
  reconcile(
    metadata: FoodReconciliationMetadata,
  ): Promise<FoodReconciliationResult>;

  getAddresses?(): Promise<FoodAdapterResult<FoodAddress[]>>;
  searchRestaurants?(
    addressId: string,
    query: string,
  ): Promise<FoodAdapterResult<FoodRestaurant[]>>;
  searchMenu?(
    addressId: string,
    query: string,
    restaurantId?: string,
  ): Promise<FoodAdapterResult<FoodMenuItem[]>>;
  getRestaurantMenu?(
    addressId: string,
    restaurantId: string,
  ): Promise<FoodAdapterResult<FoodMenuItem[]>>;
  listRecentOrders?(
    addressId: string,
  ): Promise<FoodAdapterResult<FoodProviderOrder[]>>;
  trackOrder?(
    orderId: string,
  ): Promise<FoodAdapterResult<FoodProviderOrder>>;
}
