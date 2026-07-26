# Swiggy live validation report

Status: **live-verified on localhost**

Validation date: 2026-07-26

## Production UI end-to-end validation

The current production repository was run with the real Swiggy adapter and real
order placement disabled. The elder-facing mobile flow completed:

1. A prerecorded spoken request passed through Thuna's real `/api/stt` route and
   Saaras returned a transcript.
2. The transcript passed through the real Sarvam interpreter, which returned
   `ORDER_FOOD` with `modelInvoked: true` and `demoFallback: false`.
3. The mobile task screen detected the authenticated Swiggy session.
4. The UI loaded real saved-address labels, searched restaurants, loaded a menu,
   and selected an available item.
5. `update_food_cart` mutated the real cart and `get_food_cart` returned the
   authoritative cart and total.
6. The UI required the elder to confirm the exact authoritative cart.
7. Changing quantity from one to two invalidated that confirmation, mutated the
   real cart again, and produced a new authoritative total.
8. A new explicit confirmation was required. The flow then stopped with:
   **Real Swiggy cart prepared. Order placement is disabled for this test.**

The latest UI run used Pisharody'S Veg Restaurant (Ad), Plain Roast, and an
authoritative total of Rs 169 after the quantity correction. Address labels and
all personal data are omitted from this report.

Browser automation could not validate Chrome's fake-microphone capture because
the synthetic `MediaRecorder` payload was rejected by the STT endpoint. The same
audio fixture succeeded when posted through the production STT route. Therefore,
the real Saaras transcription and the real browser Swiggy flow are verified, but
this report does not claim a successful automated fake-microphone run.

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
| Production deployment | Runtime deployed on Railway; Railway OAuth session not live-verified |

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
