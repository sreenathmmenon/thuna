# Swiggy provider boundary

The deterministic Thuna engine remains provider-neutral. Sarvam interprets the elder’s request; deterministic code owns selections, corrections, read-back, confirmation and execution safety.

`FoodCommerceAdapter` is the boundary. The mock adapter preserves the existing `ORDER_FOOD` flow. `SwiggyFoodMcpAdapter` adds saved addresses, restaurant/menu discovery, authoritative cart preparation, recent orders and tracking without adding Swiggy branches to the engine.

## Trust boundary

- The browser receives connection state, provider IDs, display names and mapped cart data. It never receives access tokens, refresh tokens, PKCE verifiers or dynamic-client secrets.
- OAuth state and tokens live under `THUNA_DATA_ROOT/private/swiggy-oauth.json`, with owner-only directory/file permissions. The path is ignored by Git.
- The MCP client accepts only the official Food tool allowlist, validates arguments against the live `tools/list` schema, and validates the official `{ success, data }` or `{ success: false, error }` envelope.
- Logs and validation output contain no tokens, phone numbers, full saved addresses or personal identifiers.
- A cart mutation is followed immediately by `get_food_cart`. Only that result supplies the displayed total and confirmation revision.
- Cart corrections invalidate earlier confirmations. Silence, waiting, going back and vague agreement never confirm.
- `place_food_order` is non-idempotent. It is never automatically retried. An ambiguous response triggers one recent-order read and an `UNKNOWN` result with reconciliation metadata.

Real order placement is disabled unless `THUNA_ENABLE_REAL_SWIGGY_ORDER=true`. Even then, a fresh cart-bound confirmation and a second deliberate confirmation are required.

Official references: [authentication](https://mcp.swiggy.com/builders/docs/start/authenticate/), [Food tool reference](https://mcp.swiggy.com/builders/docs/reference/food/), and [production safety guidance](https://mcp.swiggy.com/builders/docs/build/ship-to-production/).
