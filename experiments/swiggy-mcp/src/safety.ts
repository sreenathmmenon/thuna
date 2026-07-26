/**
 * Client-side tool gating.
 *
 * WHY THIS EXISTS
 * ---------------
 * Swiggy's OAuth scopes are "server-level, not read/write-split"
 * (https://mcp.swiggy.com/builders/docs/start/authenticate/).
 * There is NO read-only scope. A token that can call `get_addresses` can also call
 * `place_food_order`. The protocol will not protect us.
 *
 * So the read-only guarantee is enforced HERE, in our own client, by name.
 * This is the same defence-in-depth posture as Thuna's pre-AI OTP refusal: the
 * check runs before the call, not after.
 *
 * Tool names are verified from the official reference index:
 *   https://mcp.swiggy.com/builders/docs/reference/{food,instamart,dineout}/
 */

export type ToolClass = 'read' | 'mutate' | 'order';

/**
 * Classification of every documented tool across all three servers.
 * `order` = creates a real, externally-visible commitment. Never called by default.
 */
export const TOOL_CLASS: Readonly<Record<string, ToolClass>> = Object.freeze({
  // ---- Food (14) ----
  get_addresses: 'read',
  search_restaurants: 'read',
  search_menu: 'read',
  get_restaurant_menu: 'read',
  get_food_cart: 'read',
  fetch_food_coupons: 'read',
  get_food_orders: 'read',
  get_food_order_details: 'read',
  track_food_order: 'read',
  update_food_cart: 'mutate',
  apply_food_coupon: 'mutate',
  flush_food_cart: 'mutate',
  place_food_order: 'order',
  report_error: 'mutate',

  // ---- Instamart (13) ----
  search_products: 'read',
  your_go_to_items: 'read',
  get_cart: 'read',
  get_orders: 'read',
  get_order_details: 'read',
  track_order: 'read',
  create_address: 'mutate',
  delete_address: 'mutate',
  update_cart: 'mutate',
  clear_cart: 'mutate',
  checkout: 'order',

  // ---- Dineout (8) ----
  get_saved_locations: 'read',
  search_restaurants_dineout: 'read',
  get_restaurant_details: 'read',
  get_available_slots: 'read',
  get_booking_status: 'read',
  create_cart: 'mutate',
  book_table: 'order',
});

/** Tools that create a real commitment. Non-idempotent. Require check-then-retry. */
export const ORDER_TOOLS: readonly string[] = Object.freeze(
  Object.entries(TOOL_CLASS)
    .filter(([, c]) => c === 'order')
    .map(([n]) => n),
);

export interface GatePolicy {
  /** Allow tools that mutate cart/address state. Default false. */
  allowMutations: boolean;
  /** Allow order-placing tools. Default false. Requires enableRealOrder AND explicit intent. */
  allowOrders: boolean;
}

export const READ_ONLY_POLICY: GatePolicy = Object.freeze({
  allowMutations: false,
  allowOrders: false,
});

export class ToolBlockedError extends Error {
  readonly toolName: string;
  readonly toolClass: ToolClass | 'unknown';

  constructor(toolName: string, toolClass: ToolClass | 'unknown', reason: string) {
    super(reason);
    this.name = 'ToolBlockedError';
    this.toolName = toolName;
    this.toolClass = toolClass;
  }
}

/**
 * Decide whether a tool call may proceed.
 * Throws ToolBlockedError when it may not. Fails CLOSED on unknown tool names —
 * an undocumented tool might mutate, and we cannot know.
 */
export function assertToolAllowed(toolName: string, policy: GatePolicy): void {
  const cls = TOOL_CLASS[toolName];

  if (cls === undefined) {
    throw new ToolBlockedError(
      toolName,
      'unknown',
      `Tool "${toolName}" is not in the verified allowlist. Blocked (fail-closed): an ` +
        `undocumented tool may mutate state. Add it to TOOL_CLASS after reading its official ` +
        `reference page.`,
    );
  }

  if (cls === 'read') return;

  if (cls === 'mutate') {
    if (policy.allowMutations) return;
    throw new ToolBlockedError(
      toolName,
      cls,
      `Tool "${toolName}" mutates server state and mutations are disabled. ` +
        `This probe is read-only by default. If you genuinely need this, point at ` +
        `staging (SWIGGY_USE_STAGING=true) and enable mutations explicitly.`,
    );
  }

  // cls === 'order'
  if (policy.allowOrders) return;
  throw new ToolBlockedError(
    toolName,
    cls,
    `REFUSED: "${toolName}" places a REAL order. Swiggy MCP exposes no cancellation tool ` +
      `(cancellation is via customer care 080-67466729), and order placement is NOT idempotent. ` +
      `This is blocked unless THUNA_ENABLE_REAL_SWIGGY_ORDER=true AND the operator explicitly ` +
      `opts in for this run.`,
  );
}

/**
 * Build the effective policy.
 *
 * Note the deliberate double gate on orders: the environment flag alone is NOT enough.
 * A stray `THUNA_ENABLE_REAL_SWIGGY_ORDER=true` left in a shell must not be sufficient
 * to spend an elder's money.
 */
export function resolvePolicy(opts: {
  enableRealOrder: boolean;
  allowMutations?: boolean;
  explicitOrderIntent?: boolean;
}): GatePolicy {
  return {
    allowMutations: opts.allowMutations === true,
    allowOrders: opts.enableRealOrder === true && opts.explicitOrderIntent === true,
  };
}

/** The ₹1000 beta cap, verified from the place_food_order reference page. */
export const CART_VALUE_CAP_INR = 1000;

/**
 * "Order placement is NOT allowed for cart values of ₹1000 or more."
 * Note the boundary: ₹1000 exactly is REJECTED.
 */
export function exceedsCartCap(totalInr: number): boolean {
  return totalInr >= CART_VALUE_CAP_INR;
}
