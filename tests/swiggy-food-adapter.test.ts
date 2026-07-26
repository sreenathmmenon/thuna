import { describe, expect, it } from 'vitest';
import { SwiggyFoodMcpAdapter } from '../lib/adapters/swiggy-food-mcp';
import type { SwiggyMcpClient, SwiggyFoodToolName } from '../lib/integrations/swiggy/client';

function fakeClient(options: { ambiguousPlacement?: boolean } = {}) {
  const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];
  let quantity = 1;
  const client = {
    argumentsForCartMutation: async (input: {
      restaurantId: string;
      restaurantName?: string;
      addressId: string;
      items: Record<string, unknown>[];
    }) => ({
      restaurantId: input.restaurantId,
      addressId: input.addressId,
      cartItems: input.items,
    }),
    call: async (tool: SwiggyFoodToolName, args: Record<string, unknown>) => {
      calls.push({ tool, args });
      if (tool === 'get_addresses') {
        return { addresses: [{ addressId: 'address-1', label: 'Home', address: 'private' }] };
      }
      if (tool === 'search_restaurants') {
        return { restaurants: [{ restaurantId: 'restaurant-1', name: 'Real Cafe', availabilityStatus: 'OPEN' }] };
      }
      if (tool === 'get_restaurant_menu' || tool === 'search_menu') {
        return { items: [{ itemId: 'item-1', name: 'Plain Dosa', price: 100, isAvailable: true }] };
      }
      if (tool === 'update_food_cart') {
        const cartItems = (args.cartItems as Array<{ quantity: number }>);
        quantity = cartItems[0]?.quantity ?? quantity;
        return { updated: true };
      }
      if (tool === 'get_food_cart') {
        return {
          restaurantName: 'Real Cafe',
          items: [{ itemName: 'Plain Dosa', quantity, unitPrice: 100 }],
          itemTotal: quantity * 100,
          deliveryFee: 25,
          total: quantity * 100 + 25,
          availablePaymentMethods: ['COD'],
        };
      }
      if (tool === 'place_food_order') {
        if (options.ambiguousPlacement) throw new Error('timeout');
        return { orderId: 'real-order-1', total: 125 };
      }
      if (tool === 'get_food_orders') return { orders: [] };
      return {};
    },
  };
  return { client: client as unknown as SwiggyMcpClient, calls };
}

async function prepare(adapter: SwiggyFoodMcpAdapter, quantity = 1) {
  const result = await adapter.prepareCart({
    addressId: 'address-1',
    addressLabel: 'Home',
    restaurantId: 'restaurant-1',
    restaurant: 'Real Cafe',
    item: { name: 'Plain Dosa', quantity },
    providerCartItems: [{ itemId: 'item-1', quantity }],
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe('SwiggyFoodMcpAdapter', () => {
  it('maps addresses, restaurants, menu and authoritative cart responses', async () => {
    const fake = fakeClient();
    const adapter = new SwiggyFoodMcpAdapter({ client: fake.client });
    expect(await adapter.getAddresses()).toMatchObject({ ok: true, value: [{ id: 'address-1', label: 'Home' }] });
    expect(await adapter.searchRestaurants('address-1', 'dosa')).toMatchObject({
      ok: true,
      value: [{ id: 'restaurant-1', name: 'Real Cafe', available: true }],
    });
    expect(await adapter.getRestaurantMenu('address-1', 'restaurant-1')).toMatchObject({
      ok: true,
      value: [{ id: 'item-1', name: 'Plain Dosa', priceRupees: 100 }],
    });
    const cart = await prepare(adapter);
    expect(cart).toMatchObject({
      source: 'provider',
      providerVerified: true,
      grandTotalRupees: 125,
      placementDisabled: true,
    });
    expect(fake.calls.map((call) => call.tool).slice(-2)).toEqual([
      'update_food_cart',
      'get_food_cart',
    ]);
  });

  it('invalidates confirmation when a correction changes the authoritative cart', async () => {
    const fake = fakeClient();
    let id = 0;
    const adapter = new SwiggyFoodMcpAdapter({
      client: fake.client,
      realOrderEnabled: true,
      id: () => `id-${++id}`,
    });
    const first = await prepare(adapter, 1);
    const confirmation = await adapter.mintConfirmation({
      snapshot: first,
      presentedTotalRupees: 125,
      paymentMethod: 'COD',
      readbackText: 'Total Rs 125',
      explicitUserIntent: true,
    });
    if (!confirmation.ok) throw new Error(confirmation.error.message);
    await prepare(adapter, 2);
    const result = await adapter.execute({
      confirmation: confirmation.value,
      explicitUserIntent: true,
      realOrderEnabled: true,
    });
    expect(result).toMatchObject({ status: 'REJECTED', error: { code: 'CART_CHANGED' } });
  });

  it('stops at a real cart when placement is disabled', async () => {
    const fake = fakeClient();
    const adapter = new SwiggyFoodMcpAdapter({ client: fake.client });
    const cart = await prepare(adapter);
    const confirmation = await adapter.mintConfirmation({
      snapshot: cart,
      presentedTotalRupees: 125,
      paymentMethod: 'COD',
      readbackText: 'Total Rs 125',
      explicitUserIntent: true,
    });
    if (!confirmation.ok) throw new Error(confirmation.error.message);
    expect(await adapter.execute({
      confirmation: confirmation.value,
      explicitUserIntent: true,
      realOrderEnabled: true,
    })).toMatchObject({
      status: 'REJECTED',
      simulated: false,
      error: { code: 'REAL_ORDER_DISABLED' },
    });
    expect(fake.calls.some((call) => call.tool === 'place_food_order')).toBe(false);
  });

  it('does not retry an ambiguous non-idempotent placement', async () => {
    const fake = fakeClient({ ambiguousPlacement: true });
    const adapter = new SwiggyFoodMcpAdapter({
      client: fake.client,
      realOrderEnabled: true,
    });
    const cart = await prepare(adapter);
    const confirmation = await adapter.mintConfirmation({
      snapshot: cart,
      presentedTotalRupees: 125,
      paymentMethod: 'COD',
      readbackText: 'Total Rs 125',
      explicitUserIntent: true,
    });
    if (!confirmation.ok) throw new Error(confirmation.error.message);
    const result = await adapter.execute({
      confirmation: confirmation.value,
      explicitUserIntent: true,
      realOrderEnabled: true,
    });
    expect(result.status).toBe('UNKNOWN');
    expect(fake.calls.filter((call) => call.tool === 'place_food_order')).toHaveLength(1);
    expect(fake.calls.some((call) => call.tool === 'get_food_orders')).toBe(true);
  });
});
