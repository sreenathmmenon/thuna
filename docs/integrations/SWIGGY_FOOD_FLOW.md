# Swiggy Food — Canonical Ordering Flow

> Source: [Order food end-to-end](https://mcp.swiggy.com/builders/docs/build/recipes/order-food/)
> plus the per-tool reference pages. Fetched 2026-07-26.
> Argument names below are verbatim from official docs. **Do not invent arguments.**

---

## 1. The canonical sequence

Swiggy describes this as "the canonical 7-tool Food journey - from address to placed order to
delivery." The recipe lists nine steps including the optional coupon pair:

| # | Tool | Arguments | Mutating? |
|---|---|---|---|
| 1 | `get_addresses` | *(none)* | no |
| 2 | `search_restaurants` | `addressId`*, `query`*, `offset` | no |
| 3 | `get_restaurant_menu` | `addressId`*, `restaurantId`*, `page`, `pageSize` | no |
| 4 | `update_food_cart` | `restaurantId`*, `cartItems`*, `addressId`*, `restaurantName` | **yes** |
| 5 | `fetch_food_coupons` | *(not documented per-tool)* | no |
| 6 | `apply_food_coupon` | `code` | yes (idempotent) |
| 7 | `get_food_cart` | `addressId`*, `restaurantName` | no |
| 8 | **`place_food_order`** | `addressId`*, `paymentMethod` | **yes — NOT idempotent** |
| 9 | `track_food_order` | `orderId` *(optional)* | no |

`*` = required.

Steps 5–6 are optional. Step 7 is **not** optional — see §3.

### Discovery variant

`search_menu` (args: `addressId`*, `query`*, `restaurantIdOfAddedItem`, `vegFilter`, `offset`) is the
dish-first entry point. The official guidance distinguishes the two:

- `get_restaurant_menu` — "showing MORE options - use page/pageSize to navigate categories".
  Returns "dish names, prices, and flags (`hasVariants`, `hasAddons`)".
- `search_menu` — use this "with item name and `restaurantId` to access full customization
  (variants, addons)".

**For Thuna, `search_menu` is the better fit.** An elder says "masala dosa", not "show me category 3
of the Udupi Cafe menu." Dish-first matches the utterance shape the existing `ORDER_FOOD` skill
already parses.

---

## 2. Sequencing constraints that are not obvious

### 2.1 `addressId` threads through nearly everything

`search_restaurants`, `search_menu`, `get_restaurant_menu`, `update_food_cart`, `get_food_cart` and
`place_food_order` all take `addressId`. It is not merely a delivery target — it drives serviceability,
pricing and delivery charges (`get_food_cart` describes it as "Address ID to get accurate delivery
charges based on location").

Consequence: `get_addresses` is a genuine precondition for the whole flow, not a convenience.
It is also the ideal **read-only connection probe** (see `experiments/swiggy-mcp/`).

### 2.2 `update_food_cart` renders nothing

> "This tool does NOT render any widget or cart UI" — must call `get_food_cart` immediately after
> to display results.

So step 4 must always be followed by step 7 before anything is shown or spoken.

### 2.3 Variants and addons are a two-phase add

The documented rule, verbatim:

> "Each menu item uses EITHER 'variants' OR 'variantsV2' format (check `search_menu` response) —
> use the SAME format that the item has, never both fields."

And the ordering:

1. Add the item with variants first, using the matching format.
2. Check the cart response for `valid_addons`.
3. Add addons **only** from that list.

"Addon validity depends on variant selection." Also: "Do not auto-replicate addons for quantity
changes; ask user about customization preferences."

This last point matters for Thuna. If the elder says "make it two", the agent must **not** silently
duplicate the addons — it has to ask. That is a natural fit for Thuna's existing one-question-at-a-time
step model.

### 2.4 Restaurant availability must be checked

`search_restaurants` returns an availability status — "OPEN", "CLOSED", or "UNAVAILABLE" — that
"must be checked before recommending items." Results also carry `distanceKm`; voice guidance says to
surface distance when >5km.

### 2.5 Coupons must be filtered for COD

Only COD is supported in v1, so coupons requiring online payment must be discarded before being
offered. The matching planned error code is `COUPON_REQUIRES_ONLINE_PAYMENT`.

Also, from `get_food_cart` guidance: `offers.coupon_applied` with `coupon_discount=0` means the coupon
is "auto-suggested but NOT actually applied." A naive reader would announce a discount that does not
exist — and an elder would hear a promise that the final bill contradicts.

---

## 3. The confirmation gate (mandatory)

This is the part of the flow Thuna cares about most, and Swiggy's requirements happen to match
Thuna's existing safety architecture almost exactly.

From the `place_food_order` reference page, the required pre-placement sequence:

1. Call `get_food_cart` first to display the summary.
2. Verify the cart total is below ₹1000.
3. Display available payment methods **from the cart response only**.
4. State the delivery address explicitly.
5. Request explicit user confirmation before proceeding.
6. **Never call the tool without user permission.**

From the voice-agent page:

> "Say back the cart total and delivery time before calling `place_food_order`. Wait for 'yes'."

Confirmation script: **"Total [amount] rupees, [payment method]. Confirm to place?"**

From the go-live checklist:

> "no order is placed without user-visible confirmation of items + total"

### Why the cart must be re-read at confirmation time

Cart state is server-authoritative and may have changed between turns (user edited in the Swiggy app,
item went out of stock, price moved, coupon expired). The official instruction is absolute:

> "Always call `get_food_cart` before placing orders, **regardless of how confident you are**."

**The number spoken to the elder must be the number the server just returned.** If Thuna reads back a
locally computed total and the server charges something else, the elder confirmed a price that was
never real. This is why the adapter contract mints its confirmation token from a server cart snapshot
and rejects placement if the snapshot has moved (`docs/contracts/food-commerce-adapter.ts`).

### Mapping to Thuna's existing engine

Thuna's `lib/engine.ts` already enforces the structural half of this:

- `advanceOrConfirm()` sets `awaitingConfirmation` once required fields are present.
- Only `isConfirmation(text)` completes; silence, vagueness and "wait" never do.
- A correction re-enters the flow and re-derives the readback.

What a real integration adds on top is the **freshness** requirement: the readback must be built from
a just-fetched server cart, and the confirmation must be invalidated if the cart changes underneath it.
Thuna's correction-invalidates-confirmation rule is the same idea applied to user input; this extends
it to server state.

---

## 4. Order placement and reconciliation

### 4.1 Placement is non-idempotent

`place_food_order` takes `addressId` (required) and `paymentMethod` (optional; read from
`availablePaymentMethods` in the cart response — do not hardcode).

> "`place_food_order` is **not idempotent**. If it fails with 5xx, call `get_food_orders` to check if
> the order actually placed before retrying."

### 4.2 Mandatory recovery procedure

On 5xx or network error:

1. **Wait 2–5 seconds.**
2. Call `get_food_orders` to check whether the order actually went through.
3. Only if it demonstrably did **not**, consider retrying.

```
place_food_order
   ├── HTTP 200, success:true ─────────► placed. Speak confirmation.
   ├── HTTP 200, success:false ────────► terminal domain failure. Surface message. DO NOT retry.
   ├── HTTP 400 ───────────────────────► bad args. Fix. DO NOT retry.
   ├── HTTP 401 / -32001 ──────────────► re-run OAuth. Never retry same token.
   └── 5xx / timeout / network ────────► UNKNOWN — never assume either outcome
                                          wait 2-5s → get_food_orders
                                             ├── order present ──► placed. Reconcile, do not retry.
                                             └── order absent ───► safe to retry once
```

**The `UNKNOWN` state is the important one.** It is neither success nor failure, and Thuna must never
collapse it into either. Telling an elder "your order failed" when it actually placed produces a
duplicate order; telling them it succeeded when it did not means no dinner arrives. The honest
behaviour is to say Thuna is checking, then reconcile.

This mirrors an invariant Thuna already holds: *silence is not completion*. An ambiguous network
outcome is not completion either.

### 4.3 Retry budget

"Start at 500ms, double up to 8s, cap at 5 retries" with jitter; ship-to-production gives the ladder
as "500, 1000, 2000, 4000" ms with a total cap of "30 seconds of wall-clock time."

This applies to **reads and cart mutations**. It does **not** license blind retry of placement.

### 4.4 Tracking

`track_food_order` takes an optional `orderId`; omitting it "returns all active orders." Poll no
faster than every 10 seconds.

---

## 5. Safe-to-demo classification

Which operations can be exercised without creating a real order — the basis for
`experiments/swiggy-mcp/` and for any live demo.

| Tool | Safe without an order? | Notes |
|---|---|---|
| `get_addresses` | ✅ **Yes** | Read-only. Best first probe. |
| `search_restaurants` | ✅ Yes | Read-only. |
| `search_menu` | ✅ Yes | Read-only. |
| `get_restaurant_menu` | ✅ Yes | Read-only. |
| `get_food_cart` | ✅ Yes | Read-only. |
| `fetch_food_coupons` | ✅ Yes | Read-only. |
| `get_food_orders` | ✅ Yes | Read-only. Also the reconciliation probe. |
| `get_food_order_details` | ✅ Yes | Read-only. |
| `track_food_order` | ✅ Yes | Read-only. Respect 10s floor. |
| `update_food_cart` | ⚠️ **Mutating** | Changes real server cart state. Idempotent, reversible via `flush_food_cart`, but it *is* the live account's cart. |
| `apply_food_coupon` | ⚠️ Mutating | Same caveat. |
| `flush_food_cart` | ⚠️ Mutating | Destructive to cart contents. |
| **`place_food_order`** | ❌ **NO** | Creates a real, **non-cancellable-via-MCP** COD order. |
| `report_error` | ⚠️ | Sends a report to Swiggy. Do not spam during demos. |

**Rules adopted for this package:**

1. The demo path is **read-only**: `get_addresses` → `search_restaurants` → `search_menu` →
   `get_food_cart`. This proves auth, transport, tool discovery and real data with zero side effects.
2. Cart writes are opt-in and, if used, should target **staging** (`mcp-staging.swiggy.com`), which is
   "backed by seeded data (no real orders)."
3. `place_food_order` is never called by default. It is gated behind
   `THUNA_ENABLE_REAL_SWIGGY_ORDER=true` **and** an explicit user instruction. The experiment ships
   with the flag `false` and the code path refusing.

---

## 6. Thuna mapping (for Codex)

How the existing simulated `ORDER_FOOD` steps line up with real tools. **No production change is
proposed here** — this is the future seam.

| Thuna step (`lib/skills/order-food.ts`) | Real equivalent | Note |
|---|---|---|
| `ask_item` (field `items`) | `search_menu` | Elder speaks a dish name — dish-first fits. |
| `ask_restaurant` (field `restaurant`) | `search_restaurants` | Must check OPEN/CLOSED/UNAVAILABLE. |
| `confirm_address` (field `address`) | `get_addresses` | Voice guidance: default to saved **Home**. |
| — *(implicit)* | `update_food_cart` → `get_food_cart` | New step; cart write then authoritative read. |
| `readback` (`confirmBefore: true`) | `get_food_cart` **fresh** | Total must come from the server, not `priceOf()`. |
| `place` | `place_food_order` | Gated. Non-idempotent. Needs reconciliation. |
| — *(new)* | `track_food_order` | Maps to the existing `TRACK_ORDER` skill. |

Two mismatches Codex should plan for:

1. **Delivery fee.** `order-food.ts` hardcodes `DELIVERY_FEE = 25` and the contextual-question answer
   quotes it. Real fees come from `get_food_cart` and vary by address. The contextual-question
   *behaviour* (explaining why the total rose) is a genuine product strength and should be preserved —
   but sourced from server data.
2. **Cart concept absent.** Thuna's model is fields → readback → place. Swiggy's is
   cart-mutation → authoritative-read → place. The adapter absorbs this; the engine should not learn
   about carts.

---

## 7. Open questions for Codex

1. `cartItems` element schema is not published. Must be derived from a real `search_menu` response
   before any cart write. **Do not guess it.**
2. Argument schemas for `fetch_food_coupons`, `apply_food_coupon`, `flush_food_cart`,
   `get_food_orders`, `get_food_order_details` were not read per-tool. Read the reference pages first.
3. Inner `data` field names are undocumented throughout — parse defensively with Zod.
4. Whether staging uses different OAuth endpoints is unstated.
