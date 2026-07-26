import type { FoodCommerceAdapter } from './food-commerce';
import { MockFoodCommerceAdapter } from './mock-food-commerce';
import { SwiggyFoodMcpAdapter } from './swiggy-food-mcp';
import { getSwiggyRuntime } from '../integrations/swiggy/runtime';

export type FoodAdapterSelection = 'mock' | 'swiggy';

export interface FoodAdapterConfig {
  selection: FoodAdapterSelection;
  realSwiggyOrderEnabled: boolean;
}

type FoodAdapterEnvironment = Readonly<Record<string, string | undefined>>;

export function readFoodAdapterConfig(
  env: FoodAdapterEnvironment = process.env,
): FoodAdapterConfig {
  return {
    selection: ['swiggy', 'swiggy-mcp'].includes(env.THUNA_FOOD_ADAPTER ?? '')
      ? 'swiggy'
      : 'mock',
    realSwiggyOrderEnabled:
      env.THUNA_ENABLE_REAL_SWIGGY_ORDER === 'true',
  };
}

export function createFoodCommerceAdapter(
  env: FoodAdapterEnvironment = process.env,
): FoodCommerceAdapter {
  const config = readFoodAdapterConfig(env);
  if (config.selection === 'swiggy') {
    return getSwiggyRuntime().adapter;
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
