import { describe, expect, it } from 'vitest';
import {
  createFoodCommerceAdapter,
  MockFoodCommerceAdapter,
  readFoodAdapterConfig,
  SwiggyFoodMcpAdapter,
} from '../lib/adapters';

async function preparedPlainDosa(adapter: MockFoodCommerceAdapter) {
  const prepared = await adapter.prepareCart({
    restaurant: 'Udupi Cafe',
    addressLabel: 'Home',
    item: {
      name: 'Plain Dosa',
      excludes: ['chutney'],
    },
  });
  if (!prepared.ok) throw new Error(prepared.error.message);
  return prepared.value;
}

describe('food commerce adapter selection', () => {
  it('defaults to the simulated provider integration with real Swiggy disabled', () => {
    expect(readFoodAdapterConfig({})).toEqual({
      selection: 'mock',
      realSwiggyOrderEnabled: false,
    });
    expect(createFoodCommerceAdapter({})).toBeInstanceOf(MockFoodCommerceAdapter);
  });

  it('selects Swiggy only through its explicit provider setting', () => {
    const adapter = createFoodCommerceAdapter({
      THUNA_FOOD_ADAPTER: 'swiggy-mcp',
      THUNA_ENABLE_REAL_SWIGGY_ORDER: 'false',
    });
    expect(adapter).toBeInstanceOf(SwiggyFoodMcpAdapter);
    expect(adapter.capabilities.supportsLiveOrderPlacement).toBe(false);
  });
});

describe('MockFoodCommerceAdapter', () => {
  it('matches the existing plain-dosa order, removal, and Rs 25 fee', async () => {
    const adapter = new MockFoodCommerceAdapter();
    const cart = await preparedPlainDosa(adapter);

    expect(cart.lines[0]).toMatchObject({
      name: 'Plain Dosa',
      quantity: 1,
      unitPriceRupees: 100,
      excludes: ['chutney'],
    });
    expect(cart.deliveryFeeRupees).toBe(25);
    expect(cart.grandTotalRupees).toBe(125);
    expect(cart.source).toBe('simulated');
  });

  it('requires explicit intent before minting a confirmation', async () => {
    const adapter = new MockFoodCommerceAdapter();
    const cart = await preparedPlainDosa(adapter);
    const confirmation = await adapter.mintConfirmation({
      snapshot: cart,
      presentedTotalRupees: 125,
      paymentMethod: 'COD',
      readbackText: 'Plain Dosa, no chutney. Total: Rs 125.',
      explicitUserIntent: false,
    });

    expect(confirmation).toMatchObject({
      ok: false,
      error: { code: 'EXPLICIT_CONFIRMATION_REQUIRED' },
    });
  });

  it('requires the authoritative total to be presented', async () => {
    const adapter = new MockFoodCommerceAdapter();
    const cart = await preparedPlainDosa(adapter);
    const confirmation = await adapter.mintConfirmation({
      snapshot: cart,
      presentedTotalRupees: 100,
      paymentMethod: 'COD',
      readbackText: 'Plain Dosa.',
      explicitUserIntent: true,
    });

    expect(confirmation).toMatchObject({
      ok: false,
      error: { code: 'TOTAL_NOT_PRESENTED' },
    });
  });

  it('creates only a labelled simulated result after confirmation', async () => {
    const adapter = new MockFoodCommerceAdapter();
    const cart = await preparedPlainDosa(adapter);
    const confirmation = await adapter.mintConfirmation({
      snapshot: cart,
      presentedTotalRupees: 125,
      paymentMethod: 'COD',
      readbackText: 'Plain Dosa, no chutney. Total: Rs 125.',
      explicitUserIntent: true,
    });
    if (!confirmation.ok) throw new Error(confirmation.error.message);

    const result = await adapter.execute({
      confirmation: confirmation.value,
      explicitUserIntent: true,
      realOrderEnabled: false,
    });

    expect(result).toMatchObject({
      status: 'PLACED',
      simulated: true,
      label: 'SIMULATED ORDER SUCCESS',
      totalRupees: 125,
    });
  });

  it('refuses execution without a fresh explicit confirmation', async () => {
    const adapter = new MockFoodCommerceAdapter();
    const cart = await preparedPlainDosa(adapter);
    const confirmation = await adapter.mintConfirmation({
      snapshot: cart,
      presentedTotalRupees: 125,
      paymentMethod: 'COD',
      readbackText: 'Plain Dosa, no chutney. Total: Rs 125.',
      explicitUserIntent: true,
    });
    if (!confirmation.ok) throw new Error(confirmation.error.message);

    const result = await adapter.execute({
      confirmation: confirmation.value,
      explicitUserIntent: false,
      realOrderEnabled: false,
    });
    expect(result).toMatchObject({
      status: 'REJECTED',
      error: { code: 'EXPLICIT_CONFIRMATION_REQUIRED' },
    });
  });
});

describe('SwiggyFoodMcpAdapter', () => {
  it('is a non-simulated adapter with placement disabled by default', () => {
    const adapter = createFoodCommerceAdapter({
      THUNA_FOOD_ADAPTER: 'swiggy',
      THUNA_ENABLE_REAL_SWIGGY_ORDER: 'false',
    });
    expect(adapter).toBeInstanceOf(SwiggyFoodMcpAdapter);
    expect(adapter.capabilities).toMatchObject({
      providerId: 'swiggy',
      isSimulated: false,
      supportsLiveOrderPlacement: false,
    });
  });
});
