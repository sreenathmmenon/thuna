# Swiggy Integration Status

## Current product release

Thuna continues to use its existing simulated `ORDER_FOOD` flow. Restoring the previous dosa order, removing chutney, explaining the Rs 25 delivery fee, correcting the item, requiring explicit confirmation, and returning `SIMULATED ORDER SUCCESS` are unchanged.

The production runtime now has an additive provider-neutral `FoodCommerceAdapter` boundary:

- `MockFoodCommerceAdapter` is the default and shares the current simulated catalog and fee calculation.
- `SwiggyFoodMcpAdapter` is a transport-free, fail-closed skeleton.
- `THUNA_FOOD_ADAPTER=mock` is the default.
- `THUNA_ENABLE_REAL_SWIGGY_ORDER=false` is the default.

## Safety properties

- A fresh cart snapshot is the authoritative source for the amount presented through the adapter.
- A confirmation token is bound to the cart revision and exact presented total.
- Both confirmation minting and execution require explicit user intent.
- Execution has `PLACED`, `REJECTED`, and `UNKNOWN` outcomes.
- An `UNKNOWN` outcome must carry reconciliation metadata so callers cannot blindly retry a non-idempotent write.
- The mock returns only a clearly labelled simulated result.
- The Swiggy skeleton contains no network transport, OAuth credential, cart mutation, or live placement implementation.
- Selecting the Swiggy skeleton does not make live placement available.

## Direct MCP and hardcoding boundary

The isolated experiment can use the official MCP SDK directly for read-only discovery after approved OAuth access exists. Production does not guess undocumented Swiggy response fields.

The mock intentionally retains the locked product-demo values, including the Rs 25 fee and local dosa prices. A future real adapter must obtain restaurants, items, fees, totals, payment methods, identifiers, and order status directly from fresh MCP responses. It must not reuse the mock catalog or compute a provider total locally.

## Research and experiment

- Official-provider research is under `docs/integrations/`.
- Draft contracts remain documentation-only under `docs/contracts/`.
- Companion design research is under `docs/companion/`.
- The Swiggy MCP proof is isolated under `experiments/swiggy-mcp/` with its own package, TypeScript configuration, safety tests, environment template, and secret exclusions.

Experiment code is excluded from the production TypeScript program and production test command. It is validated from its own directory.

## Blockers to live Swiggy access

No live Swiggy MCP call or order placement is currently possible because:

1. Swiggy MCP access is invite-based and this project has no approved application credentials.
2. Staging credentials are issued during provider review.
3. Live response payload fields and the `cartItems` schema have not been observed.
4. Delegated-auth details remain undocumented.
5. Production authorization and a staged reconciliation test are required before any live non-idempotent write can be implemented.

These are credential, provider-approval, and verified-schema blockers. They are not reasons to weaken the feature flags or copy experimental transport into the production runtime.
