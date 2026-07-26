import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readFoodAdapterConfig } from '../../../../lib/adapters';
import type {
  FoodCartSnapshot,
  FoodConfirmationToken,
} from '../../../../lib/adapters/food-commerce';
import { getSwiggyRuntime } from '../../../../lib/integrations/swiggy/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('CONNECT') }),
  z.object({ action: z.literal('DISCONNECT') }),
  z.object({ action: z.literal('GET_ADDRESSES') }),
  z.object({
    action: z.literal('SEARCH_RESTAURANTS'),
    addressId: z.string().min(1),
    query: z.string().min(1).max(120),
  }),
  z.object({
    action: z.literal('SEARCH_MENU'),
    addressId: z.string().min(1),
    restaurantId: z.string().min(1).optional(),
    query: z.string().min(1).max(120),
  }),
  z.object({
    action: z.literal('GET_MENU'),
    addressId: z.string().min(1),
    restaurantId: z.string().min(1),
  }),
  z.object({
    action: z.literal('PREPARE_CART'),
    addressId: z.string().min(1),
    addressLabel: z.string().min(1).max(100),
    restaurantId: z.string().min(1),
    restaurant: z.string().min(1).max(150),
    itemId: z.string().min(1),
    itemName: z.string().min(1).max(150),
    quantity: z.number().int().min(1).max(10),
  }),
  z.object({
    action: z.literal('CONFIRM_CART'),
    snapshot: z.custom<FoodCartSnapshot>(),
  }),
  z.object({
    action: z.literal('EXECUTE'),
    confirmation: z.custom<FoodConfirmationToken>(),
    deliberateConfirmation: z.boolean(),
  }),
]);

function enabled(): boolean {
  return readFoodAdapterConfig().selection === 'swiggy';
}

export async function GET() {
  if (!enabled()) {
    return NextResponse.json({
      mode: 'mock',
      state: 'DISCONNECTED',
      connected: false,
      message: 'The simulated food provider is active.',
      realOrderEnabled: false,
    });
  }
  const runtime = getSwiggyRuntime();
  const status = await runtime.connection.status();
  return NextResponse.json({
    mode: 'swiggy',
    ...status,
    authorizationUrl: undefined,
    realOrderEnabled: runtime.adapter.capabilities.supportsLiveOrderPlacement,
  });
}

export async function POST(request: Request) {
  if (!enabled()) {
    return NextResponse.json(
      { ok: false, error: 'Swiggy is not enabled on this Thuna server.' },
      { status: 409 },
    );
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid food request.' }, { status: 400 });
  }
  const runtime = getSwiggyRuntime();
  const adapter = runtime.adapter;
  try {
    switch (parsed.data.action) {
      case 'CONNECT': {
        const status = await runtime.connection.connect();
        return NextResponse.json({
          ok: true,
          status: { ...status, authorizationUrl: undefined },
          connectUrl: status.authorizationUrl,
        });
      }
      case 'DISCONNECT':
        await runtime.client.close();
        return NextResponse.json({ ok: true, status: await runtime.connection.disconnect() });
      case 'GET_ADDRESSES':
        return NextResponse.json(await adapter.getAddresses());
      case 'SEARCH_RESTAURANTS':
        return NextResponse.json(await adapter.searchRestaurants(
          parsed.data.addressId,
          parsed.data.query,
        ));
      case 'SEARCH_MENU':
        return NextResponse.json(await adapter.searchMenu(
          parsed.data.addressId,
          parsed.data.query,
          parsed.data.restaurantId,
        ));
      case 'GET_MENU':
        return NextResponse.json(await adapter.getRestaurantMenu(
          parsed.data.addressId,
          parsed.data.restaurantId,
        ));
      case 'PREPARE_CART':
        return NextResponse.json(await adapter.prepareCart({
          addressId: parsed.data.addressId,
          addressLabel: parsed.data.addressLabel,
          restaurantId: parsed.data.restaurantId,
          restaurant: parsed.data.restaurant,
          item: { name: parsed.data.itemName, quantity: parsed.data.quantity },
          providerCartItems: [{
            itemId: parsed.data.itemId,
            quantity: parsed.data.quantity,
          }],
        }));
      case 'CONFIRM_CART':
        return NextResponse.json(await adapter.mintConfirmation({
          snapshot: parsed.data.snapshot,
          presentedTotalRupees: parsed.data.snapshot.grandTotalRupees,
          paymentMethod: 'COD',
          readbackText: `The authoritative Swiggy total is Rs ${parsed.data.snapshot.grandTotalRupees}.`,
          explicitUserIntent: true,
        }));
      case 'EXECUTE':
        return NextResponse.json(await adapter.execute({
          confirmation: parsed.data.confirmation,
          explicitUserIntent: parsed.data.deliberateConfirmation,
          realOrderEnabled: adapter.capabilities.supportsLiveOrderPlacement,
        }));
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Swiggy could not be reached safely.' },
      { status: 503 },
    );
  }
}
