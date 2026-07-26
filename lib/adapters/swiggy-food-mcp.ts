import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type {
  ExecuteFoodOrderInput,
  FoodAdapterError,
  FoodAdapterErrorCode,
  FoodAdapterResult,
  FoodAddress,
  FoodCartSnapshot,
  FoodCommerceAdapter,
  FoodConfirmationToken,
  FoodMenuItem,
  FoodOrderExecutionResult,
  FoodProviderOrder,
  FoodReconciliationMetadata,
  FoodReconciliationResult,
  FoodRestaurant,
  MintFoodConfirmationInput,
  PrepareFoodCartInput,
} from './food-commerce';
import { SwiggyMcpClient, SwiggyMcpError } from '../integrations/swiggy/client';
import {
  mapAddresses,
  mapCart,
  mapMenuItems,
  mapOrders,
  mapRestaurants,
} from '../integrations/swiggy/schemas';

interface CartContext {
  cartId: string;
  addressId: string;
  restaurantId: string;
  restaurant: string;
  addressLabel: string;
  snapshot: FoodCartSnapshot;
}

interface ConfirmationContext {
  confirmation: FoodConfirmationToken;
  used: boolean;
}

export interface SwiggyFoodMcpAdapterOptions {
  client: SwiggyMcpClient;
  realOrderEnabled?: boolean;
  now?: () => Date;
  id?: () => string;
}

const placedOrderSchema = z.object({
  orderId: z.union([z.string(), z.number()]).optional(),
  id: z.union([z.string(), z.number()]).optional(),
  total: z.number().nonnegative().optional(),
  orderTotal: z.number().nonnegative().optional(),
}).passthrough();

function errorResult<T>(
  code: FoodAdapterErrorCode,
  message: string,
  retryable = false,
): FoodAdapterResult<T> {
  return { ok: false, error: { code, message, retryable } };
}

function mappedError(error: unknown): FoodAdapterError {
  if (error instanceof SwiggyMcpError) {
    if (error.kind === 'AUTH') {
      return { code: 'AUTH_REQUIRED', message: 'Please reconnect Swiggy.', retryable: false };
    }
    if (error.kind === 'MALFORMED_RESPONSE' || error.kind === 'INVALID_ARGUMENTS') {
      return {
        code: 'MALFORMED_PROVIDER_RESPONSE',
        message: 'Swiggy returned information Thuna could not safely verify.',
        retryable: false,
      };
    }
  }
  return {
    code: 'PROVIDER_UNAVAILABLE',
    message: 'Swiggy could not be reached safely. Nothing was placed.',
    retryable: false,
  };
}

/**
 * The real Swiggy implementation of the provider-neutral food boundary.
 *
 * Every cart mutation is followed by get_food_cart. Confirmation tokens bind
 * to that authoritative revision and become unusable after any later change.
 */
export class SwiggyFoodMcpAdapter implements FoodCommerceAdapter {
  readonly capabilities;
  private readonly client: SwiggyMcpClient;
  private readonly realOrderEnabled: boolean;
  private readonly now: () => Date;
  private readonly id: () => string;
  private readonly carts = new Map<string, CartContext>();
  private readonly confirmations = new Map<string, ConfirmationContext>();
  private readonly attempts = new Map<string, { addressId: string }>();

  constructor(options: SwiggyFoodMcpAdapterOptions) {
    this.client = options.client;
    this.realOrderEnabled = options.realOrderEnabled ?? false;
    this.now = options.now ?? (() => new Date());
    this.id = options.id ?? randomUUID;
    this.capabilities = {
      providerId: 'swiggy',
      displayName: 'Swiggy',
      isSimulated: false,
      cartIsAuthoritative: true,
      executionIsNonIdempotent: true,
      supportsLiveOrderPlacement: this.realOrderEnabled,
    } as const;
  }

  async getAddresses(): Promise<FoodAdapterResult<FoodAddress[]>> {
    return this.mapCall(() => this.client.call('get_addresses', {}), mapAddresses);
  }

  async searchRestaurants(
    addressId: string,
    query: string,
  ): Promise<FoodAdapterResult<FoodRestaurant[]>> {
    return this.mapCall(
      () => this.client.call('search_restaurants', { addressId, query }),
      mapRestaurants,
    );
  }

  async searchMenu(
    addressId: string,
    query: string,
    restaurantId?: string,
  ): Promise<FoodAdapterResult<FoodMenuItem[]>> {
    return this.mapCall(
      () => this.client.call('search_menu', {
        addressId,
        query,
        ...(restaurantId ? { restaurantIdOfAddedItem: restaurantId } : {}),
      }),
      mapMenuItems,
    );
  }

  async getRestaurantMenu(
    addressId: string,
    restaurantId: string,
  ): Promise<FoodAdapterResult<FoodMenuItem[]>> {
    return this.mapCall(
      () => this.client.call('get_restaurant_menu', { addressId, restaurantId }),
      mapMenuItems,
    );
  }

  async prepareCart(input: PrepareFoodCartInput): Promise<FoodAdapterResult<FoodCartSnapshot>> {
    if (!input.addressId || !input.restaurantId || !input.providerCartItems?.length) {
      return errorResult(
        'INVALID_PROVIDER_SELECTION',
        'Choose a saved address, restaurant and available item first.',
      );
    }
    try {
      const args = await this.client.argumentsForCartMutation({
        restaurantId: input.restaurantId,
        restaurantName: input.restaurant,
        addressId: input.addressId,
        items: input.providerCartItems,
      });
      await this.client.call('update_food_cart', args);
      const cartId = this.id();
      const rawCart = await this.client.call('get_food_cart', {
        addressId: input.addressId,
        restaurantName: input.restaurant,
      });
      const snapshot = mapCart(rawCart, {
        cartId,
        restaurant: input.restaurant,
        addressLabel: input.addressLabel,
        now: this.now(),
        placementDisabled: !this.realOrderEnabled,
      });
      this.carts.set(cartId, {
        cartId,
        addressId: input.addressId,
        restaurantId: input.restaurantId,
        restaurant: input.restaurant,
        addressLabel: input.addressLabel,
        snapshot,
      });
      this.invalidateCartConfirmations(cartId);
      return { ok: true, value: snapshot };
    } catch (error) {
      return { ok: false, error: mappedError(error) };
    }
  }

  async readCart(cartId: string): Promise<FoodAdapterResult<FoodCartSnapshot>> {
    const context = this.carts.get(cartId);
    if (!context) return errorResult('CART_NOT_FOUND', 'The Swiggy cart is no longer available.');
    try {
      const rawCart = await this.client.call('get_food_cart', {
        addressId: context.addressId,
        restaurantName: context.restaurant,
      });
      const snapshot = mapCart(rawCart, {
        cartId,
        restaurant: context.restaurant,
        addressLabel: context.addressLabel,
        now: this.now(),
        placementDisabled: !this.realOrderEnabled,
      });
      if (snapshot.revision !== context.snapshot.revision) {
        this.invalidateCartConfirmations(cartId);
      }
      context.snapshot = snapshot;
      return { ok: true, value: snapshot };
    } catch (error) {
      return { ok: false, error: mappedError(error) };
    }
  }

  async mintConfirmation(
    input: MintFoodConfirmationInput,
  ): Promise<FoodAdapterResult<FoodConfirmationToken>> {
    if (!input.explicitUserIntent) {
      return errorResult(
        'EXPLICIT_CONFIRMATION_REQUIRED',
        'Please clearly confirm after hearing the final Swiggy cart.',
      );
    }
    const fresh = await this.readCart(input.snapshot.cartId);
    if (!fresh.ok) return fresh;
    if (fresh.value.revision !== input.snapshot.revision) {
      return errorResult('CART_CHANGED', 'The Swiggy cart changed. Please review it again.');
    }
    if (fresh.value.grandTotalRupees !== input.presentedTotalRupees) {
      return errorResult(
        'TOTAL_NOT_PRESENTED',
        'The exact authoritative Swiggy total must be presented before confirmation.',
      );
    }
    const confirmation: FoodConfirmationToken = {
      token: this.id(),
      cartId: fresh.value.cartId,
      cartRevision: fresh.value.revision,
      confirmedTotalRupees: fresh.value.grandTotalRupees,
      paymentMethod: input.paymentMethod,
      readbackText: input.readbackText,
      expiresAt: new Date(
        this.now().getTime() + Math.min(input.ttlMs ?? 5 * 60_000, 10 * 60_000),
      ).toISOString(),
    };
    this.confirmations.set(confirmation.token, { confirmation, used: false });
    return { ok: true, value: confirmation };
  }

  async execute(input: ExecuteFoodOrderInput): Promise<FoodOrderExecutionResult> {
    const saved = this.confirmations.get(input.confirmation.token);
    const cart = this.carts.get(input.confirmation.cartId);
    if (!saved || saved.used || !cart) {
      return this.rejected('CONFIRMATION_EXPIRED', 'Please review and confirm the cart again.');
    }
    if (
      saved.confirmation.cartRevision !== cart.snapshot.revision
      || this.now() >= new Date(saved.confirmation.expiresAt)
    ) {
      return this.rejected('CONFIRMATION_EXPIRED', 'The confirmation is stale. Please review again.');
    }
    const fresh = await this.readCart(cart.cartId);
    if (!fresh.ok || fresh.value.revision !== saved.confirmation.cartRevision) {
      return this.rejected('CART_CHANGED', 'The Swiggy cart changed. Please review and confirm it again.');
    }
    if (!this.realOrderEnabled || !input.realOrderEnabled) {
      return this.rejected(
        'REAL_ORDER_DISABLED',
        'Real Swiggy cart prepared. Order placement is disabled for this test.',
      );
    }
    if (!input.explicitUserIntent) {
      return this.rejected(
        'EXPLICIT_CONFIRMATION_REQUIRED',
        'A second clear confirmation is required immediately before placing a real order.',
      );
    }
    if (!cart.snapshot.availablePaymentMethods.includes(input.confirmation.paymentMethod)) {
      return this.rejected(
        'INVALID_PROVIDER_SELECTION',
        'Swiggy did not return the selected payment mode in the authoritative cart.',
      );
    }
    if (cart.snapshot.grandTotalRupees >= 1_000) {
      return this.rejected(
        'INVALID_PROVIDER_SELECTION',
        'This cart must be completed in the Swiggy app because its total is Rs 1000 or more.',
      );
    }

    saved.used = true;
    const attemptId = this.id();
    this.attempts.set(attemptId, { addressId: cart.addressId });
    try {
      const raw = await this.client.call('place_food_order', {
        addressId: cart.addressId,
        paymentMethod: input.confirmation.paymentMethod,
      });
      const placed = placedOrderSchema.parse(raw);
      const orderId = placed.orderId ?? placed.id;
      if (orderId === undefined) {
        return this.unknown(attemptId, cart.snapshot);
      }
      return {
        status: 'PLACED',
        simulated: false,
        label: 'REAL_SWIGGY_ORDER_PLACED',
        orderId: String(orderId),
        totalRupees: placed.total ?? placed.orderTotal ?? cart.snapshot.grandTotalRupees,
      };
    } catch {
      // Placement is non-idempotent. Never call place_food_order again here.
      // Query recent orders once, then return UNKNOWN unless identity is certain.
      await this.client.call('get_food_orders', {
        addressId: cart.addressId,
        orderCount: 5,
      }).catch(() => undefined);
      return this.unknown(attemptId, cart.snapshot);
    }
  }

  async listRecentOrders(addressId: string): Promise<FoodAdapterResult<FoodProviderOrder[]>> {
    return this.mapCall(
      () => this.client.call('get_food_orders', { addressId, orderCount: 5 }),
      mapOrders,
    );
  }

  async trackOrder(orderId: string): Promise<FoodAdapterResult<FoodProviderOrder>> {
    const mapped = await this.mapCall(
      () => this.client.call('track_food_order', { orderId }),
      (data) => mapOrders({ orders: [data] }),
    );
    if (!mapped.ok) return mapped;
    const first = mapped.value[0];
    return first
      ? { ok: true, value: first }
      : errorResult('MALFORMED_PROVIDER_RESPONSE', 'Swiggy returned no tracking record.');
  }

  async reconcile(metadata: FoodReconciliationMetadata): Promise<FoodReconciliationResult> {
    const attempt = this.attempts.get(metadata.attemptId);
    if (!attempt) return { resolved: false, reason: 'Unknown Swiggy placement attempt.' };
    const recent = await this.listRecentOrders(attempt.addressId);
    if (!recent.ok) return { resolved: false, reason: 'Recent Swiggy orders could not be verified.' };
    const exact = recent.value.filter((order) => order.totalRupees === metadata.expectedTotalRupees);
    return exact.length === 1
      ? { resolved: true, status: 'PLACED', orderId: exact[0].id }
      : { resolved: false, reason: 'No unique matching Swiggy order could be established.' };
  }

  private async mapCall<T>(
    call: () => Promise<unknown>,
    mapper: (data: unknown) => T,
  ): Promise<FoodAdapterResult<T>> {
    try {
      return { ok: true, value: mapper(await call()) };
    } catch (error) {
      return { ok: false, error: mappedError(error) };
    }
  }

  private invalidateCartConfirmations(cartId: string): void {
    for (const saved of this.confirmations.values()) {
      if (saved.confirmation.cartId === cartId) saved.used = true;
    }
  }

  private rejected(code: FoodAdapterErrorCode, message: string): FoodOrderExecutionResult {
    return {
      status: 'REJECTED',
      simulated: false,
      error: { code, message, retryable: false },
    };
  }

  private unknown(attemptId: string, cart: FoodCartSnapshot): FoodOrderExecutionResult {
    return {
      status: 'UNKNOWN',
      simulated: false,
      reconciliation: {
        attemptId,
        attemptedAt: this.now().toISOString(),
        cartId: cart.cartId,
        cartRevision: cart.revision,
        expectedTotalRupees: cart.grandTotalRupees,
        recommendedWaitMs: 5_000,
      },
    };
  }
}
