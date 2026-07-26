# Swiggy MCP — Verified Research

> **Status:** Research complete. Sourced **only** from official Swiggy Builders Club documentation
> (`https://mcp.swiggy.com/builders/docs/...`), fetched 2026-07-26.
> **Nothing in this document is inferred or guessed.** Where the official docs are silent,
> this document says so explicitly rather than filling the gap.
>
> **This document changes no production code.** It is input for Codex.

---

## 1. What Swiggy MCP is

> "Swiggy Builders Club exposes Swiggy's commerce platform as MCP servers - the open standard
> (Model Context Protocol) that AI agents speak to external tools."
> — [What is Swiggy MCP?](https://mcp.swiggy.com/builders/docs/start/what-is-swiggy-mcp/)

It is a **first-party, official** Swiggy product. This matters for Thuna: unlike the ride providers
(see `RIDE_PROVIDER_RESEARCH.md`), the food/grocery/dining vertical has a real, documented,
vendor-supported MCP surface. It is the *only* commerce vertical in this research package for which
that is true.

- **Transport:** "Streamable HTTP transport - one URL per server, standard JSON-RPC."
- **Total surface:** 35 tools across 3 servers.
- **Geography:** "India-only user base" with no cross-border data flow.
- **Maturity:** "Production access is invite-based today." Versioning follows SemVer with
  "6-month deprecation windows."

---

## 2. Server URLs (verified)

| Server | URL | Purpose | Tool count |
|---|---|---|---|
| **Food** | `https://mcp.swiggy.com/food` | Restaurant discovery, menus, ordering, tracking | 14 |
| **Instamart** | `https://mcp.swiggy.com/im` | Quick-commerce grocery | 13 |
| **Dineout** | `https://mcp.swiggy.com/dineout` | Table reservations | 8 |

**Staging:** `https://mcp-staging.swiggy.com/{server}`

> "Staging access at `mcp-staging.swiggy.com/{server}` - same shape as production, backed by
> seeded data (no real orders)."
> — [Access & onboarding](https://mcp.swiggy.com/builders/docs/operate/access/)

**This is the single most important operational fact in this document for Thuna.** Staging is
shape-identical to production but cannot create a real order. It is the correct target for every
demo, test, and CI run. See `SWIGGY_AUTH_AND_SECURITY.md` §7.

Note the Instamart short path is `/im`, **not** `/instamart`.

---

## 3. Tool inventory (verified names)

Tool **names** below are verified from the official reference index. Argument schemas are given only
where an official per-tool page was read; those are marked ✅. Tools marked ⚠️ have verified names
but unverified arguments — **Codex must read the per-tool page before calling them.**

### 3.1 Food server (`/food`) — 14 tools

| Stage | Tool | Args verified? |
|---|---|---|
| Discover | `get_addresses` | ✅ no arguments |
| Discover | `search_restaurants` | ✅ `addressId`*, `query`*, `offset` |
| Discover | `search_menu` | ✅ `addressId`*, `query`*, `restaurantIdOfAddedItem`, `vegFilter`, `offset` |
| Discover | `get_restaurant_menu` | ✅ `addressId`*, `restaurantId`*, `page`, `pageSize` (default 5, **max 8**) |
| Cart | `update_food_cart` | ✅ `restaurantId`*, `cartItems`* (object[]), `addressId`*, `restaurantName` |
| Cart | `get_food_cart` | ✅ `addressId`*, `restaurantName` |
| Cart | `fetch_food_coupons` | ⚠️ |
| Cart | `apply_food_coupon` | ⚠️ |
| Cart | `flush_food_cart` | ⚠️ |
| Order | `place_food_order` | ✅ `addressId`*, `paymentMethod` (optional) |
| Track | `track_food_order` | ✅ `orderId` (**optional** — omit to get all active orders) |
| Track | `get_food_orders` | ⚠️ |
| Track | `get_food_order_details` | ⚠️ |
| Support | `report_error` | ⚠️ |

`*` = required.

### 3.2 Instamart server (`/im`) — 13 tools

`create_address`, `delete_address`, `get_addresses`, `search_products`, `your_go_to_items`,
`clear_cart`, `get_cart`, `update_cart`, `checkout`, `get_order_details`, `get_orders`,
`track_order`, `report_error`.

Two behavioural notes captured from the official index:
- `update_cart` — "Update Swiggy Instamart grocery cart with items. **Replaces entire cart**."
  This differs from the Food server's `update_food_cart`, which adds/modifies. Do not assume symmetry.
- `checkout` — "Place and confirm Swiggy Instamart grocery order. Creates order and confirms payment."

### 3.3 Dineout server (`/dineout`) — 8 tools

`get_saved_locations`, `search_restaurants_dineout`, `get_restaurant_details`,
`get_available_slots`, `create_cart`, `book_table`, `get_booking_status`, `report_error`.

Notes: `book_table` "supports only free reservations." `get_available_slots` covers
"up to 7 days from request date."

---

## 4. Response envelope (verified, uniform)

Every tool documented returns the same envelope:

```json
{ "success": true,  "data": { }, "message": "optional human-readable message" }
{ "success": false, "error": { "message": "description of what went wrong" } }
```

**A `success: false` body arrives with HTTP 200.** This is the "Domain failure" class in the official
error taxonomy. A client that only checks HTTP status will silently treat a refusal as a success —
a serious hazard for Thuna, where the elder is told aloud what happened. Every Thuna adapter must
branch on the `success` field, not the HTTP code.

The official docs do **not** publish the inner `data` field names for most tools. Codex must treat
`data` as unknown-shaped and parse defensively (Zod, per AGENTS.md).

---

## 5. Hard limitations (verified)

### 5.1 COD-only

> "Only COD is supported in v1; filter coupons to those not requiring online payment."
> — [Order food end-to-end](https://mcp.swiggy.com/builders/docs/build/recipes/order-food/)

The error taxonomy carries a matching code, `COUPON_REQUIRES_ONLINE_PAYMENT`. Practical rule:
after `fetch_food_coupons`, discard any coupon requiring online payment before offering it.

Note the nuance: `place_food_order`'s `paymentMethod` argument is **optional** and the per-tool page
says to "check `availablePaymentMethods` from `get_food_cart` response" and
"display available payment methods from cart response only." So the correct implementation reads the
payment method from the authoritative cart rather than hardcoding `"COD"`.

### 5.2 ₹1000 cart cap

> "Order placement is NOT allowed for cart values of ₹1000 or more"
> — [`place_food_order` reference](https://mcp.swiggy.com/builders/docs/reference/food/place_food_order/)

Stated elsewhere as "Swiggy v1: hard ₹1000 cap on Builders Club orders." This is a **beta testing
constraint**, enforced server-side. The agent should check the total *before* calling
`place_food_order` so the elder hears a calm explanation rather than an error.

Boundary: the wording is "₹1000 or more" — so ₹1000 exactly is **rejected**. Guard with `>= 1000`.

### 5.3 Cancellation is not a tool

Cancellation is **not** exposed via MCP. The official guidance is to direct users to Swiggy customer
care (**080-67466729**). For Thuna this is a genuine product constraint: Thuna cannot cancel an order
it placed. This must be said honestly to the elder, and is a strong argument for the confirmation gate
being genuinely blocking.

### 5.4 Rate limits — not yet enforced

> "Rate limiting is **not yet enforced** at the MCP layer... you won't see `429 Too Many Requests`
> responses or `X-RateLimit-*` headers today."
> — [Rate limits](https://mcp.swiggy.com/builders/docs/operate/rate-limits/)

Planned v1.x developer tier: **120 req/min** per authenticated user per server; **30 req/min** for
write tools; burst "2× steady-state" over a 10-second window. Planned headers `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, `X-RateLimit-Reset`.

Build the 429 branch now even though it cannot fire yet — the go-live checklist requires it.

### 5.5 Polling floor

> "Don't poll `track_*` faster than 10s."

The order-food recipe gives the reason: "delivery-partner ETA updates arrive at that cadence." Faster
polling returns nothing new.

---

## 6. Idempotency (verified — the highest-stakes section)

From [Ship to production](https://mcp.swiggy.com/builders/docs/build/ship-to-production/):

| Class | Examples | Retry-safe? |
|---|---|---|
| Reads | `get_addresses`, `search_restaurants` | Always |
| Cart mutations | `update_cart`, `clear_cart` | Yes — "server is idempotent on session" |
| **Order placement** | **`place_food_order`, `checkout`, `book_table`** | **NO — check-then-retry** |
| Coupons | `apply_food_coupon` | Yes |
| Tracking | `track_order`, `get_booking_status` | Always |

The mandated recovery procedure:

> "On 5xx or network error, wait 2-5 seconds. Call `get_food_orders` / `get_orders` /
> `get_booking_status` to check if the order actually went through."

And from the recipe:

> "`place_food_order` is **not idempotent**. If it fails with 5xx, call `get_food_orders` to check if
> the order actually placed before retrying."

**Blind retry of `place_food_order` can double-charge an elder.** This is the single most dangerous
failure mode in the entire integration. The go-live checklist makes it explicit:
"order-placement paths do check-then-retry, not blind retry."

Thuna's existing engine already has the right instinct here — it refuses to treat anything but an
explicit "yes" as confirmation. The reconciliation requirement extends that principle to the
*network* layer: an ambiguous network outcome is not a completed order either. See
`docs/contracts/food-commerce-adapter.ts` for how this is encoded in the contract.

---

## 7. Error taxonomy (verified)

From [Error codes](https://mcp.swiggy.com/builders/docs/reference/errors/):

**Transport-level (JSON-RPC):** `-32001` unauthenticated/expired session; `-32603` internal failure.

| Class | Detection | Prescribed reaction |
|---|---|---|
| Auth failure | HTTP 401 or JSON-RPC `-32001` | "Re-run the OAuth flow." Never retry with the same token. |
| Bad input | HTTP 400, message starts "Invalid…"/"Missing…" | Fix arguments; **do not retry** |
| Upstream timeout | HTTP 504 or message contains "timeout" | Exponential backoff, max 5 retries |
| Upstream error | HTTP 502/503 | Exponential backoff, max 5 retries |
| Domain failure | **HTTP 200 with `success: false`** | Read message; "most terminal — surface to user" |
| Internal error | HTTP 500 or `-32603` | Backoff once; escalate via `report_error` |

**Backoff:** "Start at 500ms, double up to 8s, cap at 5 retries" with jitter. Ship-to-production
states the ladder as "500, 1000, 2000, 4000" ms and a retry budget of "30 seconds of wall-clock time."

**Planned symbolic codes** (documented as *not yet emitted* — do not depend on them):
- Core: `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `SESSION_REVOKED` (419), `INSUFFICIENT_SCOPE` (403),
  `RATE_LIMITED`, `VALIDATION_ERROR`, `NOT_FOUND`, `UPSTREAM_TIMEOUT`, `UPSTREAM_ERROR`, `INTERNAL_ERROR`
- Food: `RESTAURANT_CLOSED`, `ITEM_UNAVAILABLE`, `COUPON_INVALID`, `COUPON_NOT_APPLICABLE`,
  `COUPON_REQUIRES_ONLINE_PAYMENT`
- Instamart: `ITEM_OUT_OF_STOCK`, `CART_EXPIRED`, `ADDRESS_NOT_SERVICEABLE`, `MIN_ORDER_NOT_MET`
- Dineout: `SLOT_UNAVAILABLE`, `RESTAURANT_NOT_BOOKABLE`, `BOOKING_WINDOW_CLOSED`

Because these are not emitted yet, matching must be on the documented *class* (HTTP status +
`success` flag), not on symbolic strings.

---

## 8. Cart is server-authoritative (verified)

From [Multi-turn cart state](https://mcp.swiggy.com/builders/docs/build/agent-patterns/multi-turn-state/):

> "Your agent doesn't need to carry cart IDs or contents between turns."
> "`get_*_cart` is cheap (milliseconds). **Always read before you mutate or confirm.**"
> "Never cache cart state locally. The authoritative source is always the server."

Reasons given: the user may edit in the Swiggy app between turns; items go out of stock; prices
fluctuate; coupons expire. Stale carts can return `CART_EXPIRED` — "Re-fetch, rebuild if necessary,
confirm with the user before re-placing items."

And critically:

> "Always call `get_food_cart` before placing orders, **regardless of how confident you are** — the
> user may have edited in the Swiggy app between turns."

**Architectural consequence for Thuna.** Thuna's engine currently computes the total itself
(`priceOf(o.name) + DELIVERY_FEE` in `lib/skills/order-food.ts`). That is correct for the simulated
skill and must not change. But a real Swiggy adapter must never do this: the number read back to the
elder before confirmation has to be the number the server returned from `get_food_cart`. A locally
computed total that disagrees with the server means the elder confirmed a price they were not charged.

This is why the adapter contract has a distinct `readCart()` operation described as *authoritative*,
and why the confirmation token is minted from the server's cart snapshot rather than from local state.

---

## 9. Voice-specific requirements (verified — directly relevant to Thuna)

From [Voice vs chat](https://mcp.swiggy.com/builders/docs/build/agent-patterns/voice-vs-chat/).
Swiggy publishes voice-agent guidance, and it aligns closely with what Thuna already does:

- **Never place autonomously.** "Say back the cart total and delivery time before calling
  `place_food_order`. Wait for 'yes'."
- **Confirmation script:** "Total [amount] rupees, [payment method]. Confirm to place?"
- **Speak prices as words:** "₹249" → "two hundred and forty-nine rupees".
- **Speak ETAs naturally:** "35-40 MINS" → "about 40 minutes".
- **Never read IDs aloud** — `addressId`, `restaurantId`, `spinId`. No raw tokens or internal codes.
- **Max 3 items per spoken list.** "Summarise '+ 5 more' if there are more."
- **Default to the saved Home address** without asking, unless the user said otherwise.
- Surface distance for restaurants >5km away; respect the ₹1000 cap.

Thuna's existing readback gate already satisfies the "wait for yes" requirement structurally. The
never-read-IDs-aloud and max-3-items rules are new obligations that fall on the guidance/TTS layer,
not the engine.

---

## 10. What the official docs do NOT specify

Recorded honestly so Codex does not mistake absence for permission:

1. **Inner `data` field names** for most tools. Only the envelope is documented.
2. **`cartItems` element schema** for `update_food_cart` — the page references `variants`,
   `variantsV2` and `addons` but does not give the object shape. The one hard rule captured is:
   "Each menu item uses EITHER 'variants' OR 'variantsV2' format (check `search_menu` response) —
   use the SAME format that the item has, never both fields."
3. **Argument schemas** for the ⚠️ tools in §3.1.
4. **A delegated-auth page.** Referenced by name from the authenticate page and listed in
   `llms.txt`, but `/builders/docs/start/delegated-auth/` returned **HTTP 404** on 2026-07-26.
   Delegated auth is described on `/builders/docs/start/enterprise/` instead. See
   `SWIGGY_AUTH_AND_SECURITY.md` §5.
5. **Whether staging OAuth uses different endpoints** than production.
6. **Order cancellation** — confirmed absent by design, not an oversight (§5.3).

---

## 11. Bearing on Thuna

Thuna's safety constraints require food orders to remain faithful simulations
unless real credentials and approved APIs are available, and simulated actions
must be visibly labelled `SIMULATED`.

This research does not change that. Swiggy MCP production access is **invite-based** and requires an
application plus ≥48 hours green on staging. Until that approval exists, Thuna's `ORDER_FOOD` skill
must keep behaving exactly as it does today.

What this research *does* change is the shape of the eventual seam. The recommended posture:

1. Keep `ORDER_FOOD` simulated. Do not touch `lib/engine.ts` or `lib/skills/order-food.ts`.
2. Introduce a `FoodCommerceAdapter` behind a flag, with the mock adapter as default.
3. Prove connection out-of-tree first (see `experiments/swiggy-mcp/`).
4. Only after production approval, and only behind `THUNA_ENABLE_REAL_SWIGGY_ORDER=true`, allow a
   real `place_food_order`.

See `SWIGGY_CODEX_INTEGRATION_GUIDE.md` for the concrete sequencing.

---

## Sources

All fetched 2026-07-26:

- [What is Swiggy MCP?](https://mcp.swiggy.com/builders/docs/start/what-is-swiggy-mcp/)
- [Developer quickstart](https://mcp.swiggy.com/builders/docs/start/developer/)
- [Authenticate](https://mcp.swiggy.com/builders/docs/start/authenticate/)
- [Build an agent](https://mcp.swiggy.com/builders/docs/start/developer/build-an-agent/)
- [Power an agent platform (enterprise)](https://mcp.swiggy.com/builders/docs/start/enterprise/)
- [Order food end-to-end](https://mcp.swiggy.com/builders/docs/build/recipes/order-food/)
- [Multi-turn cart state](https://mcp.swiggy.com/builders/docs/build/agent-patterns/multi-turn-state/)
- [Voice vs chat](https://mcp.swiggy.com/builders/docs/build/agent-patterns/voice-vs-chat/)
- [Ship to production](https://mcp.swiggy.com/builders/docs/build/ship-to-production/)
- [Food reference](https://mcp.swiggy.com/builders/docs/reference/food/) + per-tool pages for
  `get_addresses`, `search_restaurants`, `search_menu`, `get_restaurant_menu`, `get_food_cart`,
  `update_food_cart`, `place_food_order`, `track_food_order`
- [Instamart reference](https://mcp.swiggy.com/builders/docs/reference/instamart/)
- [Dineout reference](https://mcp.swiggy.com/builders/docs/reference/dineout/)
- [Error codes](https://mcp.swiggy.com/builders/docs/reference/errors/)
- [Access & onboarding](https://mcp.swiggy.com/builders/docs/operate/access/)
- [Rate limits](https://mcp.swiggy.com/builders/docs/operate/rate-limits/)
- [Data & compliance](https://mcp.swiggy.com/builders/docs/operate/data-and-compliance/)
