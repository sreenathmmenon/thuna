import { randomUUID } from 'node:crypto';
import type {
  ExecuteFoodOrderInput,
  FoodAdapterError,
  FoodAdapterResult,
  FoodCartSnapshot,
  FoodCommerceAdapter,
  FoodConfirmationToken,
  FoodOrderExecutionResult,
  FoodReconciliationMetadata,
  FoodReconciliationResult,
  MintFoodConfirmationInput,
  PrepareFoodCartInput,
} from './food-commerce';
import {
  SIMULATED_DELIVERY_FEE_RUPEES,
  simulatedFoodItemPriceRupees,
} from './simulated-food-catalog';

function failure<T>(
  code: FoodAdapterError['code'],
  message: string,
  retryable = false,
): FoodAdapterResult<T> {
  return { ok: false, error: { code, message, retryable } };
}

function copySnapshot(snapshot: FoodCartSnapshot): FoodCartSnapshot {
  return {
    ...snapshot,
    lines: snapshot.lines.map((line) => ({
      ...line,
      includes: [...line.includes],
      excludes: [...line.excludes],
    })),
    availablePaymentMethods: [...snapshot.availablePaymentMethods],
  };
}

export class MockFoodCommerceAdapter implements FoodCommerceAdapter {
  readonly capabilities = {
    providerId: 'mock-food',
    displayName: 'Thuna simulated food provider',
    isSimulated: true,
    cartIsAuthoritative: true,
    executionIsNonIdempotent: true,
    supportsLiveOrderPlacement: false,
  } as const;

  private readonly carts = new Map<string, FoodCartSnapshot>();

  async prepareCart(
    input: PrepareFoodCartInput,
  ): Promise<FoodAdapterResult<FoodCartSnapshot>> {
    const quantity = input.item.quantity ?? 1;
    const unitPriceRupees = simulatedFoodItemPriceRupees(input.item.name);
    const itemTotalRupees = unitPriceRupees * quantity;
    const cartId = `simulated-cart-${randomUUID()}`;
    const snapshot: FoodCartSnapshot = {
      cartId,
      restaurant: input.restaurant,
      addressLabel: input.addressLabel,
      lines: [{
        name: input.item.name,
        quantity,
        unitPriceRupees,
        includes: [...(input.item.includes ?? [])],
        excludes: [...(input.item.excludes ?? [])],
      }],
      itemTotalRupees,
      deliveryFeeRupees: SIMULATED_DELIVERY_FEE_RUPEES,
      grandTotalRupees: itemTotalRupees + SIMULATED_DELIVERY_FEE_RUPEES,
      currency: 'INR',
      availablePaymentMethods: ['COD'],
      revision: randomUUID(),
      fetchedAt: new Date().toISOString(),
      source: 'simulated',
    };
    this.carts.set(cartId, snapshot);
    return { ok: true, value: copySnapshot(snapshot) };
  }

  async readCart(cartId: string): Promise<FoodAdapterResult<FoodCartSnapshot>> {
    const snapshot = this.carts.get(cartId);
    if (!snapshot) {
      return failure('CART_NOT_FOUND', 'The simulated cart could not be found.');
    }
    return { ok: true, value: copySnapshot(snapshot) };
  }

  async mintConfirmation(
    input: MintFoodConfirmationInput,
  ): Promise<FoodAdapterResult<FoodConfirmationToken>> {
    if (!input.explicitUserIntent) {
      return failure(
        'EXPLICIT_CONFIRMATION_REQUIRED',
        'A clear confirmation is required before preparing execution.',
      );
    }

    const current = this.carts.get(input.snapshot.cartId);
    if (!current || current.revision !== input.snapshot.revision) {
      return failure('CART_CHANGED', 'The cart changed and must be presented again.');
    }
    if (
      input.presentedTotalRupees !== current.grandTotalRupees
      || !input.readbackText.trim()
    ) {
      return failure(
        'TOTAL_NOT_PRESENTED',
        'The authoritative cart total must be presented before execution.',
      );
    }

    return {
      ok: true,
      value: {
        token: randomUUID(),
        cartId: current.cartId,
        cartRevision: current.revision,
        confirmedTotalRupees: current.grandTotalRupees,
        paymentMethod: input.paymentMethod,
        readbackText: input.readbackText,
        expiresAt: new Date(Date.now() + (input.ttlMs ?? 120_000)).toISOString(),
      },
    };
  }

  async execute(input: ExecuteFoodOrderInput): Promise<FoodOrderExecutionResult> {
    if (!input.explicitUserIntent) {
      return {
        status: 'REJECTED',
        simulated: true,
        error: {
          code: 'EXPLICIT_CONFIRMATION_REQUIRED',
          message: 'A clear confirmation is required before execution.',
          retryable: false,
        },
      };
    }

    if (Date.parse(input.confirmation.expiresAt) <= Date.now()) {
      return {
        status: 'REJECTED',
        simulated: true,
        error: {
          code: 'CONFIRMATION_EXPIRED',
          message: 'The confirmation expired and the cart must be presented again.',
          retryable: false,
        },
      };
    }

    const current = this.carts.get(input.confirmation.cartId);
    if (
      !current
      || current.revision !== input.confirmation.cartRevision
      || current.grandTotalRupees !== input.confirmation.confirmedTotalRupees
    ) {
      return {
        status: 'REJECTED',
        simulated: true,
        error: {
          code: 'CART_CHANGED',
          message: 'The cart changed and must be presented and confirmed again.',
          retryable: false,
        },
      };
    }

    return {
      status: 'PLACED',
      simulated: true,
      label: 'SIMULATED ORDER SUCCESS',
      orderId: `SIMULATED-${randomUUID()}`,
      totalRupees: current.grandTotalRupees,
    };
  }

  async reconcile(
    _metadata: FoodReconciliationMetadata,
  ): Promise<FoodReconciliationResult> {
    return {
      resolved: false,
      reason: 'The simulated provider never creates an ambiguous external order.',
    };
  }
}
