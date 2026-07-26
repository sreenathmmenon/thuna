# Swiggy Integration Status

## Current product release

The provider-neutral `FoodCommerceAdapter` preserves the governed deterministic
food skill:

- `MockFoodCommerceAdapter` remains the safe default and preserves the simulated
  `ORDER_FOOD` behavior.
- `SwiggyFoodMcpAdapter` is implemented with the official Model Context Protocol
  TypeScript SDK and Streamable HTTP transport.
- `THUNA_FOOD_ADAPTER=mock` is the default.
- `THUNA_FOOD_ADAPTER=swiggy` enables real OAuth, saved addresses, restaurant
  and menu discovery, cart mutation, and authoritative cart read-back.
- `THUNA_ENABLE_REAL_SWIGGY_ORDER=false` remains the default.

## Safety properties

- A fresh cart snapshot is the authoritative source for the amount presented through the adapter.
- A confirmation token is bound to the cart revision and exact presented total.
- Both confirmation minting and execution require explicit user intent.
- Execution has `PLACED`, `REJECTED`, and `UNKNOWN` outcomes.
- An `UNKNOWN` outcome must carry reconciliation metadata so callers cannot blindly retry a non-idempotent write.
- The mock returns only a clearly labelled simulated result.
- OAuth uses PKCE, state validation, server-only token storage, refresh where
  supported, redacted logs, and fail-closed session handling.
- Real cart mutation is followed by authoritative `get_food_cart` read-back.
- Selecting Swiggy mode does not enable live placement.

## Direct MCP and hardcoding boundary

The isolated experiment can use the official MCP SDK directly for read-only discovery after approved OAuth access exists. Production does not guess undocumented Swiggy response fields.

The mock intentionally retains the locked product-demo values, including the Rs 25 fee and local dosa prices. A future real adapter must obtain restaurants, items, fees, totals, payment methods, identifiers, and order status directly from fresh MCP responses. It must not reuse the mock catalog or compute a provider total locally.

## Research and experiment

- Official-provider research is under `docs/integrations/`.
- Draft contracts remain documentation-only under `docs/contracts/`.
- Companion design research is under `docs/companion/`.
- The Swiggy MCP proof is isolated under `experiments/swiggy-mcp/` with its own package, TypeScript configuration, safety tests, environment template, and secret exclusions.

Experiment code is excluded from the production TypeScript program and production test command. It is validated from its own directory.

## Verified access and remaining blockers

Localhost OAuth completed and real Swiggy responses were received for:

- `get_addresses`
- `search_restaurants`
- `get_restaurant_menu`
- `update_food_cart`
- `get_food_cart`

Railway contains the same runtime but requires a separate OAuth session using
its exact public HTTPS callback. Local tokens are never copied to Railway.

Real order placement remains deliberately unverified and disabled. Production
use additionally requires provider authorization, per-user encrypted credential
storage, payment-mode review, reconciliation testing for ambiguous writes, and
operational approval. These are not reasons to weaken the safety flag.
