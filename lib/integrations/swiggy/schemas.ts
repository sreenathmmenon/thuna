import { createHash } from 'node:crypto';
import { z } from 'zod';
import type {
  FoodAddress,
  FoodCartLine,
  FoodCartSnapshot,
  FoodMenuItem,
  FoodProviderOrder,
  FoodRestaurant,
} from '../../adapters/food-commerce';

const money = z.number().finite().nonnegative();

const addressSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  addressId: z.union([z.string(), z.number()]).optional(),
  label: z.string().optional(),
  addressType: z.string().optional(),
  addressCategory: z.string().optional(),
  addressTag: z.string().optional(),
  displayText: z.string().optional(),
  address: z.string().optional(),
  addressLine: z.string().optional(),
}).passthrough();

const restaurantSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  restaurantId: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  availabilityStatus: z.string().optional(),
  available: z.boolean().optional(),
  rating: z.union([z.string(), z.number()]).optional(),
  deliveryTime: z.union([z.string(), z.number()]).optional(),
  deliveryTimeMinutes: z.number().optional(),
}).passthrough();

const menuItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  itemId: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  price: money.optional(),
  priceRupees: money.optional(),
  available: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  restaurantId: z.union([z.string(), z.number()]).optional(),
  hasVariants: z.boolean().optional(),
  hasAddons: z.boolean().optional(),
}).passthrough();

const cartItemSchema = z.object({
  name: z.string().optional(),
  itemName: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  price: money.optional(),
  unitPrice: money.optional(),
  total: money.optional(),
}).passthrough();

const cartSchema = z.object({
  total: money,
  restaurantName: z.string().optional(),
  itemTotal: money.optional(),
  deliveryFee: money.optional(),
  items: z.array(cartItemSchema).optional(),
  cartItems: z.array(cartItemSchema).optional(),
  availablePaymentMethods: z.array(z.string()).optional(),
}).passthrough();

const liveCartSchema = z.object({
  statusCode: z.number(),
  statusMessage: z.string(),
  data: z.object({
    cart_id: z.union([z.string(), z.number()]),
    restaurant: z.object({
      name: z.string(),
      deliverySubtitle: z.string().optional(),
    }).passthrough(),
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number().int().positive(),
      subtotal: money.optional(),
      total: money.optional(),
      final_price: money.optional(),
    }).passthrough()),
    pricing: z.object({
      item_total: money,
      delivery_charge: money.optional(),
      taxes_and_charges: money.optional(),
      to_pay: money,
    }).passthrough(),
    availablePaymentMethods: z.array(z.string()).optional(),
  }).passthrough(),
}).passthrough();

const orderSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  orderId: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
  total: money.optional(),
  orderTotal: money.optional(),
}).passthrough();

function arrayFrom(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of keys) {
    const candidate = (value as Record<string, unknown>)[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function requiredId(value: { id?: string | number; addressId?: string | number; restaurantId?: string | number; itemId?: string | number }, kind: string): string {
  const id = value.id ?? value.addressId ?? value.restaurantId ?? value.itemId;
  if (id === undefined) throw new Error(`Swiggy ${kind} did not include an identifier.`);
  return String(id);
}

export function mapAddresses(data: unknown): FoodAddress[] {
  return arrayFrom(data, ['addresses']).map((entry) => {
    const parsed = addressSchema.parse(entry);
    return {
      id: requiredId(parsed, 'address'),
      label: parsed.label
        ?? parsed.addressTag
        ?? parsed.addressCategory
        ?? parsed.addressType
        ?? 'Saved address',
      displayText: parsed.displayText
        ?? parsed.addressLine
        ?? parsed.address
        ?? parsed.label
        ?? 'Saved address',
    };
  });
}

export function mapRestaurants(data: unknown): FoodRestaurant[] {
  return arrayFrom(data, ['restaurants']).map((entry) => {
    const parsed = restaurantSchema.parse(entry);
    const deliveryText = parsed.deliveryTime ?? parsed.deliveryTimeMinutes;
    const delivery = typeof deliveryText === 'number'
      ? deliveryText
      : typeof deliveryText === 'string'
        ? Number(deliveryText.match(/\d+/)?.[0])
        : undefined;
    const rating = parsed.rating === undefined ? undefined : Number(parsed.rating);
    return {
      id: requiredId(parsed, 'restaurant'),
      name: parsed.name,
      available: parsed.available
        ?? !['CLOSED', 'UNAVAILABLE'].includes(parsed.availabilityStatus?.toUpperCase() ?? ''),
      rating: Number.isFinite(rating) ? rating : undefined,
      deliveryMinutes: Number.isFinite(delivery) ? delivery : undefined,
    };
  });
}

export function mapMenuItems(data: unknown): FoodMenuItem[] {
  let entries = arrayFrom(data, ['items', 'menuItems', 'results']);
  if (
    entries.length === 0
    && data
    && typeof data === 'object'
    && Array.isArray((data as Record<string, unknown>).categories)
  ) {
    entries = ((data as Record<string, unknown>).categories as unknown[])
      .flatMap((category) => arrayFrom(category, ['items', 'menuItems']));
  }
  return entries.map((entry) => {
    const parsed = menuItemSchema.parse(entry);
    return {
      id: requiredId(parsed, 'menu item'),
      name: parsed.name,
      priceRupees: parsed.priceRupees ?? parsed.price ?? 0,
      available: parsed.available ?? parsed.isAvailable ?? true,
      restaurantId: parsed.restaurantId === undefined ? undefined : String(parsed.restaurantId),
      hasVariants: parsed.hasVariants,
      hasAddons: parsed.hasAddons,
    };
  });
}

export function mapCart(data: unknown, context: {
  cartId: string;
  restaurant: string;
  addressLabel: string;
  now?: Date;
  placementDisabled: boolean;
}): FoodCartSnapshot {
  const live = liveCartSchema.safeParse(data);
  if (live.success) {
    const providerCart = live.data.data;
    const lines: FoodCartLine[] = providerCart.items.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      unitPriceRupees: (line.final_price ?? line.total ?? line.subtotal ?? 0) / line.quantity,
      includes: [],
      excludes: [],
    }));
    const revision = createHash('sha256')
      .update(JSON.stringify({
        restaurant: providerCart.restaurant,
        items: providerCart.items,
        pricing: providerCart.pricing,
        availablePaymentMethods: providerCart.availablePaymentMethods,
      }))
      .digest('hex')
      .slice(0, 24);
    return {
      cartId: context.cartId,
      restaurant: providerCart.restaurant.name,
      addressLabel: context.addressLabel,
      lines,
      itemTotalRupees: providerCart.pricing.item_total,
      deliveryFeeRupees: Math.max(
        0,
        providerCart.pricing.to_pay - providerCart.pricing.item_total,
      ),
      grandTotalRupees: providerCart.pricing.to_pay,
      currency: 'INR',
      availablePaymentMethods: providerCart.availablePaymentMethods?.includes('COD')
        ? ['COD']
        : [],
      revision,
      fetchedAt: (context.now ?? new Date()).toISOString(),
      source: 'provider',
      providerVerified: true,
      placementDisabled: context.placementDisabled,
    };
  }
  const parsed = cartSchema.parse(data);
  const rawLines = parsed.cartItems ?? parsed.items ?? [];
  const lines: FoodCartLine[] = rawLines.map((line) => {
    const quantity = line.quantity ?? 1;
    const unitPrice = line.unitPrice ?? line.price
      ?? (line.total === undefined ? 0 : line.total / quantity);
    return {
      name: line.name ?? line.itemName ?? 'Food item',
      quantity,
      unitPriceRupees: unitPrice,
      includes: [],
      excludes: [],
    };
  });
  const revision = createHash('sha256')
    .update(JSON.stringify(parsed))
    .digest('hex')
    .slice(0, 24);
  const itemTotal = parsed.itemTotal
    ?? lines.reduce((sum, line) => sum + line.quantity * line.unitPriceRupees, 0);
  return {
    cartId: context.cartId,
    restaurant: parsed.restaurantName ?? context.restaurant,
    addressLabel: context.addressLabel,
    lines,
    itemTotalRupees: itemTotal,
    deliveryFeeRupees: parsed.deliveryFee ?? Math.max(0, parsed.total - itemTotal),
    grandTotalRupees: parsed.total,
    currency: 'INR',
    availablePaymentMethods: parsed.availablePaymentMethods?.includes('COD') ? ['COD'] : [],
    revision,
    fetchedAt: (context.now ?? new Date()).toISOString(),
    source: 'provider',
    providerVerified: true,
    placementDisabled: context.placementDisabled,
  };
}

export function mapOrders(data: unknown): FoodProviderOrder[] {
  return arrayFrom(data, ['orders']).map((entry) => {
    const parsed = orderSchema.parse(entry);
    const id = parsed.id ?? parsed.orderId;
    if (id === undefined) throw new Error('Swiggy order did not include an identifier.');
    return {
      id: String(id),
      status: parsed.status,
      totalRupees: parsed.total ?? parsed.orderTotal,
    };
  });
}
