# Swiggy live validation report

Status: **live-verified on localhost**

Validation date: 2026-07-26

## Evidence categories

| Category | Current result |
| --- | --- |
| Real Swiggy OAuth | Passed on localhost with PKCE/DCR |
| Real `get_addresses` | Passed; 10 records returned, values omitted |
| Real restaurant/menu search | Passed |
| Real cart mutation | Passed through `update_food_cart` |
| Authoritative real cart read-back | Passed through two `get_food_cart` reads |
| Locally mocked provider tests | Passed |
| Order placement | Disabled; not attempted |
| Production deployment | Not in scope; localhost only |

## Redacted live evidence

- Official endpoint: `https://mcp.swiggy.com/food`
- Successful tools: `get_addresses`, `search_restaurants`, `get_restaurant_menu`, `update_food_cart`, `get_food_cart`
- Restaurant: Pisharody'S Veg Restaurant (Ad)
- Item: Puliyodharai, quantity 1
- Authoritative total: Rs 125
- Address, phone, OAuth state, PKCE values and tokens: omitted
- `place_food_order`: never called

The live server returned tool data directly in MCP `structuredContent`, rather than wrapping that block again in `{ success, data }`. Thuna handles both the documented envelope and this observed MCP representation. The live cart also generates a different provider `cart_id` on read; confirmation revisions therefore bind only to stable cart semantics—restaurant, items, quantities, customizations, pricing and payment methods—not that volatile identifier.

## UI verification

The localhost Thuna UI showed:

1. **Swiggy is connected**
2. real saved-address labels
3. real open restaurants and delivery times
4. real menu items and prices
5. **Your real Swiggy cart is ready**
6. the exact Rs 125 authoritative total
7. **Yes, confirm this exact cart**
8. after confirmation, **Real Swiggy cart prepared. Order placement is disabled for this test.**

Automated tests validate OAuth state handling, PKCE construction, expiry, token/PII redaction, response mapping, authoritative cart read-back, correction invalidation, the placement feature flag, and no automatic placement retry.
