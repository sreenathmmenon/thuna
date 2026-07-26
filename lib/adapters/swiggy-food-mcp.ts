import type {
  ExecuteFoodOrderInput,
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

function unavailable<T>(): FoodAdapterResult<T> {
  return {
    ok: false,
    error: {
      code: 'SWIGGY_ACCESS_NOT_CONFIGURED',
      message: 'Swiggy MCP access is not configured in the current product release.',
      retryable: false,
    },
  };
}

/**
 * Deliberately transport-free skeleton.
 *
 * OAuth, MCP requests, cart mutation, and order placement remain isolated in
 * experiments until official access and observed response schemas exist.
 */
export class SwiggyFoodMcpAdapter implements FoodCommerceAdapter {
  readonly capabilities = {
    providerId: 'swiggy-mcp',
    displayName: 'Swiggy MCP',
    isSimulated: true,
    cartIsAuthoritative: true,
    executionIsNonIdempotent: true,
    supportsLiveOrderPlacement: false,
  } as const;

  constructor(private readonly realOrderEnabled = false) {}

  async prepareCart(
    _input: PrepareFoodCartInput,
  ): Promise<FoodAdapterResult<FoodCartSnapshot>> {
    return unavailable();
  }

  async readCart(
    _cartId: string,
  ): Promise<FoodAdapterResult<FoodCartSnapshot>> {
    return unavailable();
  }

  async mintConfirmation(
    _input: MintFoodConfirmationInput,
  ): Promise<FoodAdapterResult<FoodConfirmationToken>> {
    return unavailable();
  }

  async execute(input: ExecuteFoodOrderInput): Promise<FoodOrderExecutionResult> {
    if (!this.realOrderEnabled || !input.realOrderEnabled) {
      return {
        status: 'REJECTED',
        simulated: true,
        error: {
          code: 'REAL_ORDER_DISABLED',
          message: 'Real Swiggy order execution is disabled.',
          retryable: false,
        },
      };
    }
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
    return {
      status: 'REJECTED',
      simulated: true,
      error: {
        code: 'SWIGGY_ADAPTER_NOT_IMPLEMENTED',
        message: 'Live Swiggy placement is not implemented or enabled.',
        retryable: false,
      },
    };
  }

  async reconcile(
    _metadata: FoodReconciliationMetadata,
  ): Promise<FoodReconciliationResult> {
    return {
      resolved: false,
      reason: 'No live Swiggy execution attempt can be made by this skeleton.',
    };
  }
}
