import type { FoodCommerceAdapter } from './food-commerce';
import { MockFoodCommerceAdapter } from './mock-food-commerce';
import { SwiggyFoodMcpAdapter } from './swiggy-food-mcp';

export type FoodAdapterSelection = 'mock' | 'swiggy-mcp';

export interface FoodAdapterConfig {
  selection: FoodAdapterSelection;
  realSwiggyOrderEnabled: boolean;
}

type FoodAdapterEnvironment = Readonly<Record<string, string | undefined>>;

export function readFoodAdapterConfig(
  env: FoodAdapterEnvironment = process.env,
): FoodAdapterConfig {
  return {
    selection: env.THUNA_FOOD_ADAPTER === 'swiggy-mcp'
      ? 'swiggy-mcp'
      : 'mock',
    realSwiggyOrderEnabled:
      env.THUNA_ENABLE_REAL_SWIGGY_ORDER === 'true',
  };
}

export function createFoodCommerceAdapter(
  env: FoodAdapterEnvironment = process.env,
): FoodCommerceAdapter {
  const config = readFoodAdapterConfig(env);
  if (config.selection === 'swiggy-mcp') {
    return new SwiggyFoodMcpAdapter(config.realSwiggyOrderEnabled);
  }
  return new MockFoodCommerceAdapter();
}

export type {
  FoodCommerceAdapter,
  FoodCartSnapshot,
  FoodOrderExecutionResult,
  FoodReconciliationMetadata,
} from './food-commerce';
export { MockFoodCommerceAdapter } from './mock-food-commerce';
export { SwiggyFoodMcpAdapter } from './swiggy-food-mcp';
