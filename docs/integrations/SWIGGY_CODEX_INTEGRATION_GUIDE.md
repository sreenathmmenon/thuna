# Swiggy MCP — Codex Integration Guide

> Practical sequencing for wiring Swiggy MCP into Thuna **after** the current orchestration finishes.
>
> **Prerequisite: do not start this until Workstreams A–E are merged and green.**
> Nothing here is urgent. Everything here is optional until Swiggy production access exists.

---

## 1. The core recommendation

**Do not integrate Swiggy into `ORDER_FOOD` for the hackathon build.**

Reasons, in order of weight:

1. **Access is invite-based.** Production requires an application, a demo video, and ≥48 hours green
   on staging. That timeline does not fit the current build.
2. **`AGENTS.md` forbids it.** "Do not implement real UPI, Swiggy, telephony…" — the locked scope
   says simulated.
3. **The demo is better simulated.** The hero flow depends on a Rs 25 delivery fee, a restored usual
   order, and a deterministic correction. Real data would make the flow *less* reliable on stage, not
   more.
4. **The risk is asymmetric.** A bug in a simulated flow is a bad demo. A bug in a real flow is an
   unwanted ₹500 COD order arriving at an elder's house, with **no MCP cancellation tool**.

**What to do instead:** land the adapter *seam* so that a real integration is a later, small,
well-understood change. That is what this package delivers.

---

## 2. What changes, and what must not

### Must NOT change

| File | Why |
|---|---|
| `lib/engine.ts` | Generic and green. Swiggy adds no engine branches |
| `lib/command-parser.ts` | Confirmation semantics are correct as-is |
| `lib/router.ts` | Pre-model OTP refusal must keep firing first |
| `lib/session-store.ts` | Sole mutator; unaffected |
| `lib/types.ts` | Only additive changes, if any |
| `tests/engine.test.ts`, `tests/m2-flow.test.ts` | All 15 must stay green |

### May change (later, behind a flag)

| File | Change |
|---|---|
| `lib/skills/order-food.ts` | **Optional** adapter on the handler. Default stays mock |
| `lib/adapters/**` *(new)* | Adapter interface + mock + Swiggy implementations |
| `.env.example` | Document `THUNA_ENABLE_REAL_SWIGGY_ORDER=false` |

**The engine never learns what a cart is.** The adapter absorbs the cart model entirely.

---

## 3. Why the seam belongs in the skill handler

`lib/engine.ts` already delegates skill specifics via `SkillHandler`:

```ts
export interface SkillHandler {
  parseCommand?(...): ParsedCommand | null;
  answerContextual?(...): string | null;
  restorePreference?(...): Record<string, unknown> | null;
  readback?(ctx): string;
  buildScreen?(ctx): ScreenState;
}
```

This is exactly the right seam. `ORDER_FOOD` gains an optional adapter; the engine is untouched.

The one genuine mismatch: **`readback()` is synchronous**, and a real adapter must `await`
`readCart()`. Options, in preference order:

1. **Pre-fetch before readback.** The engine reaches the readback step, the handler fetches the cart,
   then `readback()` renders from stored state. Keeps the interface synchronous. **Recommended.**
2. **Add an optional async `prepareReadback?()`** to `SkillHandler`. Additive, non-breaking.
3. Make `readback()` async — **avoid**; ripples through the engine and the green tests.

---

## 4. Phased sequencing

### Phase 0 — now (this package)
Docs + contracts + standalone experiment. **Zero production change.** ✅ Done.

### Phase 1 — prove the connection (30–60 min, whenever access exists)
Run `experiments/swiggy-mcp/`. Read-only. Outcome: real response shapes, so the adapter is written
against fact rather than guesswork. **Blocked on credentials, not code.**

### Phase 2 — adapter interface + mock (1–2 hrs)
```
lib/adapters/food-commerce.ts        # interface (adapted from docs/contracts/)
lib/adapters/mock-food-adapter.ts    # default; wraps today's behaviour
lib/adapters/index.ts                # selection by env
```
`ORDER_FOOD` uses the mock. **Behaviour is byte-identical to today.** All 15 tests still pass. This
is the highest-value step and needs no Swiggy access at all.

### Phase 3 — Swiggy read-only adapter (2–3 hrs)
Implements discovery + `readCart()` only. `placeOrder()` throws `not_supported`. Behind
`THUNA_FOOD_ADAPTER=swiggy`. Lets Thuna show *real* restaurants while still simulating the order.

### Phase 4 — real placement (only after production approval)
Implement `placeOrder()` + `reconcile()`. Double-gated. Ramp 1% → 10% → 50% → 100% over ≥24 hours per
Swiggy's checklist.

---

## 5. Ten-minute path (if access already existed)

Not recommended for the hackathon, recorded for completeness:

```bash
cd experiments/swiggy-mcp && npm install
cp .env.example .env
npm run auth          # ~3 min, browser + OTP on Swiggy's page
npm run probe         # ~2 min, read-only
```
Then copy the observed response shapes into a Phase-2 mock adapter (~5 min). **No production file is
touched, and no order is placed.**

---

## 6. The five rules that must survive integration

Any implementation violating these is wrong regardless of whether tests pass.

### 1. Readback total comes from the server
```ts
const cart = await adapter.readCart(addressId);   // authoritative, fresh
const total = cart.grandTotal;                    // NEVER priceOf(x) + DELIVERY_FEE
```
Swiggy: "Always call `get_food_cart` before placing orders, regardless of how confident you are."

### 2. Confirmation is a token, not a boolean
Minted from a cart snapshot. If the cart moved between readback and placement, the token must fail.
Extends the engine's existing "a correction invalidates stale confirmation" rule to server drift.

### 3. `UNKNOWN` is a real outcome
```ts
const result = await adapter.placeOrder({ confirmation, realOrderEnabled, explicitUserIntent });
switch (result.status) {
  case 'PLACED':   /* speak success */ break;
  case 'REJECTED': /* speak failure */ break;
  case 'UNKNOWN':
    // Say nothing definitive. Wait 2-5s, reconcile via order history, THEN speak.
    const outcome = await adapter.reconcile(result.reconciliation!);
    break;
}
```
Never `if (result.ok)`. Blind retry can double-charge an elder.

### 4. Double gate on placement
Env flag alone is insufficient; explicit in-the-moment user intent is also required. A stray
`THUNA_ENABLE_REAL_SWIGGY_ORDER=true` must never be enough to spend money.

### 5. Never persist Swiggy PII
Store `addressId`; re-fetch the address text. The simulated `usualOrder` is Thuna's own data and is
unaffected.

---

## 7. Voice obligations (new work for the guidance layer)

Swiggy publishes voice-agent rules that Thuna does not yet satisfy:

| Rule | Status |
|---|---|
| Wait for explicit "yes" before placing | ✅ Already structural |
| Read back total + payment method | ⚠️ Format differs — "Total [amount] rupees, [method]. Confirm to place?" |
| Speak prices as words ("two hundred and forty-nine rupees") | ❌ **New** |
| Speak ETAs naturally ("about 40 minutes") | ❌ **New** |
| **Never read IDs aloud** (`addressId`, `restaurantId`) | ❌ **New** — enforce in guidance |
| Max 3 items per spoken list, then "+ N more" | ❌ **New** |
| Default to saved Home address | ⚠️ Partially — via `restorePreference` |
| Surface distance for restaurants >5km | ❌ **New** |

These belong in `lib/guidance.ts`, not the engine. Several are good for the simulated flow too and
could be adopted independently of any Swiggy work.

---

## 8. Error handling map

| Swiggy condition | Adapter class | Thuna behaviour |
|---|---|---|
| HTTP 401 / `-32001` | `auth` | Re-authorise. Family-handoff candidate |
| HTTP 400 | `bad_input` | Bug. Do not retry. Fail safe |
| HTTP 200 + `success:false` | `domain_failure` | **Terminal.** Speak the message plainly |
| HTTP 502/503/504 | `upstream_*` | Backoff (500→8000ms, ≤5, 30s budget) |
| 5xx **on placement** | `UNKNOWN` | **Reconcile. Never blind retry** |
| Cart ≥ ₹1000 | pre-checked | Explain calmly *before* readback |
| `RESTAURANT_CLOSED` | `domain_failure` | Offer alternatives |
| `CART_EXPIRED` | `domain_failure` | Re-fetch, rebuild, **re-confirm** |

Note `success: false` arrives with **HTTP 200**. A client checking only status codes will read a
refusal as a success — and tell an elder their order was placed when it was not.

---

## 9. Testing

Must keep passing unchanged: all 15 existing tests.

New tests for Phase 2+:

1. Mock adapter reproduces today's `ORDER_FOOD` behaviour exactly
2. Readback total comes from `readCart()`, not local computation
3. Confirmation token rejected when cart revision changes
4. `placeOrder` refused when `realOrderEnabled` is false
5. `placeOrder` refused when `explicitUserIntent` is false
6. `UNKNOWN` triggers `reconcile()`, never a blind retry
7. Cart ≥ ₹1000 blocked before readback (boundary: exactly 1000 rejected)
8. `success:false` on HTTP 200 handled as terminal
9. 401 clears tokens and does not retry
10. Swiggy address text never written to memory
11. Guidance never emits an ID in spoken text
12. OTP/PIN/CVV refusal still fires **before** any adapter call

Test 12 is the one to write first — it protects the invariant that matters most.

---

## 10. When NOT to do this

Stop and reconsider if any of these hold:

- The current orchestration is not fully merged and green
- Swiggy production access has not been granted
- The demo is within 24 hours
- There is no staging environment to test against
- You cannot explain, from memory, what happens on `UNKNOWN`

**The simulated flow is a good demo.** A half-integrated real flow is a worse one, and a working
integration that places a wrong real order is the worst outcome available.

---

## Related

- `SWIGGY_MCP_RESEARCH.md` — verified facts
- `SWIGGY_FOOD_FLOW.md` — canonical sequence, safe-to-demo table
- `SWIGGY_AUTH_AND_SECURITY.md` — OAuth, PKCE, DPDP
- `docs/contracts/food-commerce-adapter.ts` — draft contract
- `experiments/swiggy-mcp/` — proof of connection
