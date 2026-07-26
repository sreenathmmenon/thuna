# Claude Integration Handoff — Swiggy MCP & Companion Package

> Prepared 2026-07-26 in the isolated worktree `/Users/sreenath/Code/myAIExps/Thuna-Claude-Research`
> on branch `claude/integration-research`.
>
> **Zero production files were modified.** `git diff` against tracked files is empty.
> Everything delivered is new content under `docs/` and `experiments/`.
>
> **This handoff covers two tasks.** Sections 1–13 are the Swiggy MCP integration package
> (task 1). **Section 14 covers the continuity-companion expansion (task 2)** — start there if
> you are picking up the companion work.

---

## 1. Files created (29)

### Integration research — `docs/integrations/` (5)
| File | Contents |
|---|---|
| `SWIGGY_MCP_RESEARCH.md` | Verified facts: server URLs, 35 tools, limits, idempotency, error taxonomy, staging |
| `SWIGGY_FOOD_FLOW.md` | Canonical 9-step order sequence, confirmation gate, safe-to-demo table |
| `SWIGGY_AUTH_AND_SECURITY.md` | OAuth 2.1 + PKCE, scopes, delegated auth, DPDP, token storage |
| `SWIGGY_CODEX_INTEGRATION_GUIDE.md` | Phased sequencing, the five rules, voice obligations |
| `RIDE_PROVIDER_RESEARCH.md` | Uber / Ola / Rapido / Namma Yatri / ONDC + community-MCP guidance |

### Draft contracts — `docs/contracts/` (6, all typecheck clean)
`food-commerce-adapter.ts`, `grocery-commerce-adapter.ts`, `dining-reservation-adapter.ts`,
`ride-adapter.ts`, `channel-adapter.ts`, `notification-adapter.ts`

### Companion design — `docs/companion/` (6)
`COMPANION_PRODUCT_MODEL.md`, `MEMORY_MODEL.md`, `ROUTINE_ENGINE.md`,
`CHECKIN_CONVERSATION_POLICY.md`, `FAMILY_CONSENT_POLICY.md`, `TELEPHONY_FUTURE_PLAN.md`

### Standalone experiment — `experiments/swiggy-mcp/` (11)
`package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `README.md`,
`src/{config,redact,safety,oauth-provider,client,probe,auth-cli}.ts`, `tests/safety.test.ts`

Plus this file.

---

## 2. Verified official facts

All from `mcp.swiggy.com/builders/docs/...`, fetched 2026-07-26.

### Servers
| Server | URL | Tools |
|---|---|---|
| Food | `https://mcp.swiggy.com/food` | 14 |
| Instamart | `https://mcp.swiggy.com/im` (**not** `/instamart`) | 13 |
| Dineout | `https://mcp.swiggy.com/dineout` | 8 |

**Staging: `https://mcp-staging.swiggy.com/{server}`** — "same shape as production, backed by seeded
data (**no real orders**)." The correct target for all demos and CI.

Transport: "Streamable HTTP transport - one URL per server, standard JSON-RPC."

### Auth
- OAuth 2.1 + PKCE (S256). **"There is no static API key."**
- Endpoints: `/auth/authorize`, `/auth/token`, `/auth/register` (RFC 7591), `/auth/logout`
- Verifier: 32 random bytes base64url; challenge SHA-256
- Access token **5 days**; session 30 days idle sliding; auth code **120s single-use**
- Scopes `mcp:tools` / `mcp:resources` / `mcp:prompts` — **"server-level, not read/write-split"**
- On 401: re-run OAuth; **"Never retry with the same token."**

### Canonical food sequence
`get_addresses` → `search_restaurants(addressId, query)` →
`get_restaurant_menu(addressId, restaurantId)` → `update_food_cart(restaurantId, cartItems, addressId)` →
`fetch_food_coupons` → `apply_food_coupon(code)` → `get_food_cart(addressId)` →
`place_food_order(addressId, paymentMethod?)` → `track_food_order(orderId?)`

### Hard limits
- **COD only** in v1. Read `availablePaymentMethods` from the cart; do not hardcode
- **₹1000 cap** — "Order placement is NOT allowed for cart values of ₹1000 **or more**" (exactly
  1000 is rejected)
- **No cancellation tool.** Customer care 080-67466729
- Rate limits **not yet enforced**; planned 120/min per user per server, 30/min writes
- Poll `track_*` no faster than **10s**

### Idempotency
`place_food_order` / `checkout` / `book_table` are **NOT idempotent**. On 5xx: wait 2–5s, call
`get_food_orders` to check whether it placed, **then** decide. "Order-placement paths do
check-then-retry, not blind retry."

### Errors
`success: false` arrives with **HTTP 200** (domain failure — terminal). JSON-RPC `-32001` = auth,
`-32603` = internal. Backoff 500→8000ms, ≤5 retries, 30s budget.

### Cart
**Server-authoritative.** "Never cache cart state locally." "Always call `get_food_cart` before
placing orders, regardless of how confident you are."

### Voice (directly relevant to Thuna)
Wait for explicit "yes"; say back total + delivery time; speak prices as words; **never read IDs
aloud**; max 3 items per spoken list; default to saved Home address.

### DPDP
Swiggy is Data Fiduciary. All tool-call content is PII. "Avoid persisting user PII beyond the current
session." Residency ap-south-1 / Singapore.

---

## 3. What was tested successfully

| Check | Result |
|---|---|
| Experiment unit tests | ✅ **30/30 pass** (`node --test`) |
| Experiment typecheck | ✅ **0 errors** |
| `docs/contracts/*.ts` typecheck | ✅ **0 errors** (all 6) |
| Production files unmodified | ✅ `git diff` empty |
| Secret scan | ✅ Only synthetic redaction fixtures |
| No `.env` / token files staged | ✅ Confirmed |

The 30 tests verify, **without credentials**: read-only allowlist; every order tool blocked; unknown
tools fail closed; env flag alone insufficient; explicit intent alone insufficient; both required;
₹1000 boundary; token/PII/bearer/phone/email redaction; circular-safe; PKCE 43-char base64url +
uniqueness; S256 URL params; token expiry skew; error classification; `success:false` on HTTP 200;
config defaults, staging, `/im` path, redirect-URI validation.

---

## 4. What could NOT be tested — the OAuth blocker

> **No live Swiggy MCP call was made. No OAuth token was obtained.**

**Cause:** Swiggy MCP production access is **invite-based** and requires an approved application at
`https://mcp.swiggy.com/builders/access/` (integration name, HTTPS redirect URIs, target servers,
expected QPS, use case, demo video). Staging credentials are issued *during review*; production
follows ≥48 hours green on staging.

There are **no credentials for this project**, and obtaining them is a business process, not a
technical step. This is a blocker of the "needs an approval" kind, not a "needs debugging" kind.

Untested as a result: live OAuth/PKCE round-trip; dynamic client registration; real tool discovery;
`get_addresses` / `search_restaurants` / `search_menu` / `get_food_cart` against real data; actual
`data` field names; the real `cartItems` schema; live error behaviour.

**Also unverifiable:** the **delegated-auth page 404s.** `llms.txt` lists it and the authenticate page
links to it by name, but `/builders/docs/start/delegated-auth/` returned HTTP 404. Grant type,
endpoints and parameters for delegated auth are therefore unknown — **Codex must not guess them.**
Obtain from `builders@swiggy.in`.

**Not a blocker for anything in this package.** Phase 2 (adapter + mock) needs no Swiggy access.

---

## 5. Exact minimal changes for Codex

**After** the current orchestration is merged and green. All optional.

### Step 1 — adapter interface + mock (no Swiggy access needed)
```
lib/adapters/food-commerce.ts       # adapted from docs/contracts/food-commerce-adapter.ts
lib/adapters/mock-food-adapter.ts   # wraps today's exact behaviour
lib/adapters/index.ts               # env-based selection, defaults to mock
```
Then: `lib/skills/order-food.ts` gains an **optional** adapter; when absent, behaviour is unchanged.

Acceptance: **all 15 existing tests still pass, unmodified.**

### Step 2 — env documentation
```diff
+ # Food adapter: mock (default) | swiggy
+ THUNA_FOOD_ADAPTER=mock
+ # Master safety flag. Never true without production access AND explicit intent.
+ THUNA_ENABLE_REAL_SWIGGY_ORDER=false
```

### Step 3 — voice guidance improvements (independent of Swiggy; worth doing anyway)
In `lib/guidance.ts`: speak prices as words; never emit IDs in spoken text; cap spoken lists at 3.

### Step 4+ — only after production approval
Swiggy read-only adapter → real placement with `reconcile()`.

**Do not** modify `lib/engine.ts`, `lib/command-parser.ts`, `lib/router.ts`, `lib/session-store.ts`.

---

## 6. Suggested cherry-pick / copy order

Single commit on `claude/integration-research`. Consume in this order:

1. **`docs/` wholesale** — additive, zero conflict risk
   ```bash
   git checkout claude/integration-research -- docs/
   ```
2. **`experiments/` wholesale** — self-contained, zero conflict risk
   ```bash
   git checkout claude/integration-research -- experiments/
   ```
3. **`CLAUDE_INTEGRATION_HANDOFF.md`** — this file
4. **Contracts → production** — manual adaptation, **not** a copy. Read
   `docs/contracts/food-commerce-adapter.ts`, adapt to house style (Zod per AGENTS.md), place under
   `lib/adapters/`.

Or simply merge — nothing here conflicts with any production path.

---

## 7. Expected merge-conflict locations

**Expected conflicts: none.** Every file is new, in directories no workstream owns.

| Path | Risk | Note |
|---|---|---|
| `docs/integrations/`, `docs/contracts/`, `docs/companion/` | **None** | New |
| `experiments/swiggy-mcp/` | **None** | New, self-contained |
| `CLAUDE_INTEGRATION_HANDOFF.md` | **None** | New |
| `docs/DEMO_SCRIPT.md`, `RUNBOOK.md`, `FEATURE_MATRIX.md` | **Low** | Orchestration creates these; different filenames, same directory |
| `lib/skills/order-food.ts` | **Deferred** | Only if Step 1 is taken; conflicts with Workstream B if concurrent |
| `.env.example` | **Low** | Only if Step 2 is taken |

Recommendation: **merge `docs/` and `experiments/` immediately** (risk-free), and defer Step 1 until
Workstream B is merged.

---

## 8. Safety gates

Encoded in code and contracts, not just prose:

1. **Read-only allowlist** — Swiggy has no read-only scope, so `experiments/swiggy-mcp/src/safety.ts`
   enforces it client-side, by name, before any network call. **Unknown tools fail closed.**
2. **Double gate on placement** — `realOrderEnabled && explicitUserIntent`. Env flag alone
   insufficient; a stray shell variable cannot spend an elder's money.
3. **Triple gate on rides** — adds `providerIsOfficial`; an unofficial adapter cannot book.
4. **`THUNA_ENABLE_REAL_SWIGGY_ORDER=false`** shipped as default; the probe refuses regardless.
5. **Probe self-verifies the gate** — attempts `place_food_order`, asserts refusal, exits non-zero
   if it ever succeeds.
6. **Confirmation tokens** bound to a cart revision — a moved cart invalidates the elder's consent.
7. **`UNKNOWN` as a first-class outcome** — no boolean can hide an ambiguous placement.
8. **Consent gate inside `send()`** — a blocked family notification is a normal result, not an error.
9. **Redaction on every log path.**
10. **Preserved unchanged:** pre-model OTP/PIN/CVV refusal; silence ≠ confirmation; SIMULATED
    labelling; the engine as sole state authority.

---

## 9. Ten-minute Swiggy integration path

**Only meaningful once credentials exist.** Not recommended before the demo.

```bash
cd experiments/swiggy-mcp
npm install                                   # ~1 min
cp .env.example .env                          # ~1 min
npm test                                      # ~10s  — 30/30, no credentials needed
npm run auth                                  # ~3 min — browser; phone+OTP on Swiggy's page
npm run probe                                 # ~2 min — read-only probes
# ~3 min: copy observed response shapes into a mock adapter
```

**Result:** verified connection, real response shapes, **zero production files touched, zero orders
placed.**

Without credentials, `npm test` still runs and passes — that is the useful ten-minute action today.

---

## 10. Thirty-minute companion integration path

Highest product value per minute, and needs **no external access at all**.

- **0–10 min — routine states.** Implement the eight states from `ROUTINE_ENGINE.md` §2 as a pure
  transition function mirroring `lib/engine.ts`. Write the transition table first.
- **10–20 min — the silence rule.** `ACTIVE → MISSED` on no response; **never** `COMPLETED`. Reuse
  `isConfirmation()` from `lib/command-parser.ts` — do not write a second, looser parser. Add tests
  3, 9, 15, 16 from `ROUTINE_ENGINE.md` §10 first; they are the ones a naive implementation fails.
- **20–30 min — consent gate.** `ConsentStore` with **default-deny**, and the check inside `send()`
  (`docs/contracts/notification-adapter.ts`). Console adapter only. Test the negative cases hardest.

**Result:** medicine reminder with snooze/complete/missed, silence handled correctly, and family
notification that cannot fire without consent — the demo's second pillar.

---

## 11. Longer-term production roadmap

**Phase A — foundation (now).** Merge orchestration. Adapter interface + mock. Voice guidance
improvements. Companion routines + consent. *No external dependency.*

**Phase B — prove the connection.** Apply for Swiggy access (needs a demo video — the hackathon build
supplies it). Run the probe on staging. Capture real response shapes. *Weeks, gated on approval.*

**Phase C — read-only real data.** Swiggy adapter implementing discovery + `readCart()` only;
`placeOrder()` throws `not_supported`. Real restaurants, still-simulated orders. **Genuinely valuable
and low-risk** — worth treating as a destination, not a waypoint.

**Phase D — real orders.** Only after ≥48h green staging + production approval. Implement
`placeOrder()` + `reconcile()`. Ramp 1% → 10% → 50% → 100% over ≥24 hours. Monitor per Swiggy's
observability guidance.

**Phase E — scale.** Delegated auth for multi-tenant (4+ weeks commercial; endpoints currently
undocumented — see §4). Telephony Stage 1 mock (`TELEPHONY_FUTURE_PLAN.md` §7). Instamart via
`grocery-commerce-adapter.ts`.

**Phase F — deliberate decisions.** Dineout. Rides — requires an explicit product decision that
Thuna should book rides for elders at all (`RIDE_PROVIDER_RESEARCH.md` §8.4), plus provider approval
or ONDC BAP registration.

**Not on the roadmap:** community MCP servers in any real booking path; real UPI/payments; health
inference; family notification without consent.

---

## 12. Honest limitations

1. **No live Swiggy call was made.** Everything is documentation-verified, not runtime-verified.
2. **Inner `data` field names are undocumented.** The probe parses defensively; real shapes are
   unknown until Phase B.
3. **`cartItems` schema is not published.** Must be derived from a real `search_menu` response.
   **Do not guess it.**
4. **Delegated auth is unverifiable** (404). Do not guess the grant type.
5. **Five Food tools** (`fetch_food_coupons`, `apply_food_coupon`, `flush_food_cart`,
   `get_food_orders`, `get_food_order_details`) have verified *names* but unread argument schemas.
6. **Ola's portal returned 503**; those details are secondary-source and unverified.
7. **The experiment's live path is untested** — only its pure logic is covered by the 30 tests.
8. **AGENTS.md is gitignored** and absent from this worktree; it was read from the main worktree.

---

## 13. Recommended next commit

**Merge `docs/` and `experiments/` as-is.** Zero risk, zero conflicts, no behaviour change.

Then, once orchestration is green, the single highest-value follow-up:

> **`Add food commerce adapter interface with mock implementation`**
>
> Introduces `lib/adapters/` with the interface and a mock reproducing today's exact `ORDER_FOOD`
> behaviour. All 15 existing tests pass unmodified. No Swiggy access required. Turns a future
> integration from a rewrite into a swap.

---

## Appendix — Commands for Codex

```bash
# Consume the package
git checkout claude/integration-research -- docs/ experiments/ CLAUDE_INTEGRATION_HANDOFF.md

# Verify nothing production changed
git diff --stat HEAD -- lib/ app/ tests/     # must be empty

# Run the experiment's safety tests (no credentials needed)
cd experiments/swiggy-mcp && npm install && npm test        # 30/30

# Typecheck the draft contracts
npx tsc --noEmit --target ES2022 --module esnext --moduleResolution bundler \
  --strict --skipLibCheck --allowImportingTsExtensions docs/contracts/*.ts

# Re-verify the main build after merging
npx tsc --noEmit && npm test && npm run build
```

**Read first:** `docs/integrations/SWIGGY_CODEX_INTEGRATION_GUIDE.md` §6 (the five rules) and
`docs/companion/ROUTINE_ENGINE.md` §1 (silence is not completion).

---
---

# 14. Task 2 — Continuity Companion Expansion

> Added 2026-07-26, same worktree and branch. **Zero production files modified.**
> Expands the companion architecture from a reminder system into a **general continuity companion**
> that remembers life events, commitments, relationships and unfinished tasks — without hardcoding
> each scenario.

## 14.1 The central design claim

The first package described a routine engine. This one describes a **generic continuity engine**.

The test: **adding a new event type must not require an engine change.** `WEDDING`, `BILL`,
`RENEWAL` and `SERVICE_VISIT` differ only in their *declarative reminder policy*, not in code.
`COMPANION_FEATURE_MATRIX.md` §4.2 makes this checkable — if adding `BILL` needs code, the
`LifeEvent` design is wrong.

## 14.2 Files created (44 new, 3 updated)

**Part 1 — Life events (5):** `LIFE_EVENTS_ENGINE.md`, `LIFE_EVENT_SCHEMA.md`,
`REMINDER_POLICY_ENGINE.md`, `EVENT_EXTRACTION_POLICY.md`, `LIFE_EVENT_DEMO_SCENARIOS.md`

**Part 2 — Pending loops (3):** `PENDING_LOOPS.md`, `PROMISE_EXTRACTION_POLICY.md`,
`FOLLOW_UP_ENGINE.md`

**Part 3 — Proactive companion (4):** `PROACTIVE_COMPANION_POLICY.md`, `REGULAR_CHECKIN_ENGINE.md`,
`QUIET_HOURS_AND_FREQUENCY.md`, `CONVERSATION_CONTINUITY.md`

**Part 4 — Human bridge (4):** `HUMAN_ATTENTION_BRIDGE.md`, `CIRCLE_OF_TRUST.md`,
`FAMILY_REQUEST_LIFECYCLE.md`, `MINIMUM_DISCLOSURE_POLICY.md`

**Part 5 — Story loops (2):** `FAMILY_STORY_LOOPS.md`, `STORY_CONSENT_AND_PROVENANCE.md`

**Part 6 — Adaptive guidance (3):** `ADAPTIVE_GUIDANCE.md`, `CAPABILITY_MEMORY.md`,
`INDEPENDENCE_METRICS.md`

**Part 7 — Extended memory (5):** `COMPANION_MEMORY_SCHEMA.md`, `HOUSEHOLD_MEMORY.md`,
`RELATIONSHIP_MEMORY.md`, `MEMORY_RETENTION_AND_DELETION.md`,
`MEMORY_CORRECTION_AND_SUPERSESSION.md`

**Part 8 — Universal inbox (3):** `UNIVERSAL_INBOX.md`, `INPUT_CLASSIFICATION_POLICY.md`,
`CONFIRM_BEFORE_MEMORY.md`

**Part 9 — Screen/document/safety (5):** `SCREEN_CONTEXT_ASSISTANCE.md`,
`DOCUMENT_TO_EVENT_PIPELINE.md`, `DIGITAL_SAFETY_POLICY.md`, `RISK_SIGNAL_MODEL.md`,
`TRUSTED_PERSON_HANDOFF.md`

**Part 10 — Service capability (5 TS):** `service-capability-adapter.ts`, `life-event-adapter.ts`,
`calendar-adapter.ts`, `document-input-adapter.ts`, `prepared-action.ts`

**Part 11 — Platform controls (9):** `AUTONOMY_LEVELS.md`, `ACTION_PERMISSION_MODEL.md`,
`DRAFT_BEFORE_ACTION.md`, `TEACH_BACK_POLICY.md`, `COMPREHENSION_VERIFICATION.md`,
`DAILY_LIFE_BRIEF.md`, `PRIORITY_AND_DEDUP_POLICY.md`, `INTERRUPTION_AND_RESUME.md`,
`CROSS_CHANNEL_CONTINUITY.md`

**Part 12 — Integration package (3):** `COMPANION_FEATURE_MATRIX.md`, `COMPANION_DEMO_SCRIPT.md`,
`CODEX_COMPANION_INTEGRATION_PROMPT.md`

## 14.3 Canonical schemas — defined exactly once

Deliberately assigned to a single owner each, to prevent competing definitions:

| Schema | Defined in | Lifecycle |
|---|---|---|
| **MemoryRecord** | `COMPANION_MEMORY_SCHEMA.md` §2 | envelope + 10 categories |
| **LifeEvent** | `LIFE_EVENT_SCHEMA.md` | DRAFT → NEEDS_CONFIRMATION → CONFIRMED → UPCOMING → DUE → ACTIVE → COMPLETED/SNOOZED/MISSED/CANCELLED/ESCALATED |
| **PendingLoop** | `PENDING_LOOPS.md` | OPEN → SCHEDULED → DUE → ACTIVE → COMPLETED/SNOOZED/CANCELLED/ESCALATED |
| **PreparedAction** | `prepared-action.ts` | DRAFT → VALIDATED → PRESENTED_TO_ELDER → CONFIRMED → EXECUTED → RECONCILED, or CANCELLED/FAILED |
| **Routine** | `ROUTINE_ENGINE.md` (task 1) | unchanged — reused, not redefined |
| **Consent** | `notification-adapter.ts` (task 1) | unchanged — reused, not redefined |
| **ServiceCapability** | `service-capability-adapter.ts` | umbrella over existing food/grocery/dining/ride adapters |

The 10 memory categories: `profile`, `operational`, `routine`, `episodic`, `relationship`,
`capability`, `consent`, `pending_loop`, `life_event`, `provider_service`.

## 14.4 Reuse from task 1 (no duplication)

`MEMORY_MODEL.md` stays the conceptual foundation — `COMPANION_MEMORY_SCHEMA.md` extends its four
categories to ten without contradicting it. `ROUTINE_ENGINE.md`, `FAMILY_CONSENT_POLICY.md`,
`CHECKIN_CONVERSATION_POLICY.md`, `COMPANION_PRODUCT_MODEL.md` and all six original contracts are
referenced, never rewritten. `PreparedAction` **generalises** the food `ConfirmationToken` pattern
rather than competing with it; `ActionOutcomeStatus` is a type alias of `PlacementStatus`, so the
three-state `PLACED | REJECTED | UNKNOWN` vocabulary cannot drift.

## 14.5 Conflicts found and resolved

| Conflict | Resolution |
|---|---|
| `PendingLoop` terminal state: `ABANDONED` (assumed) vs `CANCELLED` (canonical) | Fixed 2 files to `CANCELLED`. Abandonment is a *process* ending in `CANCELLED`, not a state |
| `LifeEventState` mirror invented `EXPIRED`, omitted `SNOOZED`/`ESCALATED` | Corrected the mirror in `life-event-adapter.ts` to match `LIFE_EVENT_SCHEMA.md` |
| Possible `RISK_DETECTED` notification category | Verified absent — deliberately not added. Risk handoff reuses `ELDER_REQUESTED_HELP` |

## 14.6 Open items for the product owner

1. **Story-sharing notification category.** `FAMILY_STORY_LOOPS.md` §8.3 declines to extend
   `NotificationCategory` unilaterally, since the contract states that adding a category is a
   product-level ethics decision. **This is the one genuine open decision.**
2. **`Evidence.quote`** permits a short verbatim elder phrase, bounded and expiring. It brushes
   against the no-transcripts rule; worth a second look.
3. **Channel-bound confirmations** — a channel change invalidates a confirmation even within TTL.
   Stricter than required; confirm the product wants this.

## 14.7 Validation

| Check | Result |
|---|---|
| Production files unchanged | ✅ `git diff -- lib/ app/ tests/` empty |
| All 11 draft contracts typecheck | ✅ 0 errors |
| Task 1 experiment tests | ✅ 30/30 still pass |
| Competing schema definitions | ✅ none — each defined once |
| Credentials / tokens / personal data | ✅ none committed |
| Correction, consent, provenance preserved | ✅ enforced across all files |

## 14.8 Minimal Codex integration order

**Phase 1 (no credentials needed):** LifeEvent schema → PendingLoop schema → declarative reminder
policy → 10-category memory → consent & permission models.

**Phase 2 (no credentials needed):** wedding invitation → bill reminder → regular check-in →
family-call request → correction flow → daily brief.

**Phase 3 (partly blocked):** document extraction → Swiggy adapter (🔌 access) → outbound calling
(🔌 credentials) → story loops → adaptive guidance.

**Start with:** `Add LifeEvent and PendingLoop schemas with declarative reminder policy`.

**The Codex prompt is at `docs/companion/CODEX_COMPANION_INTEGRATION_PROMPT.md` §2** — copy from
"PROMPT FOR CODEX BEGINS" onward.

## 14.9 Blockers

Unchanged from task 1, and **none block the companion work**:

- **Swiggy MCP production access** — invite-based (§4). Blocks only Phase 3 step 13.
- **Telephony credentials + Indian regulatory review** — blocks only real calling; the mock is not blocked.
- **Delegated-auth documentation 404s** — do not guess; obtain from `builders@swiggy.in`.

Phases 1 and 2 require **no external access whatsoever**.

---
---

# 15. Task 3 — Elder-First Mobile Experience

> Added 2026-07-26, same worktree and branch. **Zero production files modified.**
> A complete, implementation-ready mobile UX package for GLM to build immediately after Codex
> finishes the continuity-companion runtime.

## 15.1 Package location

**`docs/mobile-ui/`** — 20 specification documents.

**The GLM prompt is at `docs/mobile-ui/GLM_MOBILE_IMPLEMENTATION_PROMPT.md` §2** — copy from
"PROMPT FOR GLM BEGINS" onward.

| Group | Files |
|---|---|
| Foundations | `MOBILE_PRODUCT_PRINCIPLES`, `INFORMATION_ARCHITECTURE`, `VISUAL_DESIGN_SYSTEM`, `COMPONENT_SPECIFICATION`, `MOBILE_STATE_MAP` |
| Screens | `ELDER_HOME_SCREEN`, `VOICE_INTERACTION_STATES`, `TASK_SCREEN_SYSTEM`, `ROUTINE_AND_CHECKIN_SCREENS`, `LIFE_EVENTS_AND_REMEMBER_THIS`, `DAILY_BRIEF_SCREEN`, `FAMILY_HANDOFF_SCREEN`, `MEMORY_AND_PRIVACY_SCREEN`, `SAFETY_AND_CONFIRMATION_SCREENS`, `ERROR_AND_RECOVERY_STATES` |
| Quality | `ACCESSIBILITY_SPECIFICATION`, `MALAYALAM_CONTENT_GUIDE`, `MOBILE_UI_ACCEPTANCE_CHECKLIST`, `DEMO_SCREEN_SEQUENCE` |
| Handoff | `GLM_MOBILE_IMPLEMENTATION_PROMPT` |

## 15.2 The product goal

> **Thuna must feel easier than calling one's child for help.**

Three primary destinations only — **Home, Talk, Reminders** — with Talk dominant. Family help appears
contextually, never as a dashboard. The Demo Inspector is a separate hidden route, never elder-facing.

Viewports: **390×844** primary, **360×800** and **430×932** supported, with safe-area insets,
Android chrome, iPhone standalone PWA, Malayalam two-line wrapping, and one-handed reach.

## 15.3 Integration order for GLM

1. Design tokens (`app/globals.css`)
2. ElderShell + BottomNavigation
3. TalkButton + VoiceStatePanel (16 voice states)
4. Home
5. Task screen system (one schema, all task types)
6. Confirmation + Safety (full-screen, visually distinct)
7. Completion + Errors
8. Reminders / CheckInScreen (one data-driven component, 8 states)
9. Life events / Remember this (candidate → confirm)
10. Daily brief · Family handoff · Memory & privacy
11. Accessibility pass
12. Malayalam pass

Commit after each green step. Steps 1–7 alone produce a complete demonstrable experience.

**Build against typed mocks in `lib/client-api.ts` first**, then switch that one file to live calls —
so every engine dependency stays in a single place.

## 15.4 Expected contract verification

The mobile specs were written **before** Codex finished. GLM must verify contract names against the
latest release and record results in `MOBILE_STATE_MAP.md` §9.

**Verified as existing today** (read from `lib/types.ts`): `EngineAction` (9 values),
`ScreenState.status` (6 values), `EngineResponse.speak/screen/skillId/clearMic`,
`ScreenState.fields/deliveryFee/total/step`, `SessionCtx.pace/awaitingConfirmation`,
`SimulatedReceipt.simulated`, and the `ORDER_FOOD` / `PHONE_HELP` / `SEND_PAYMENT` skills.

**⚠️ Proposed — does not exist yet, names may differ:** `Routine`/`RoutineState`,
`LifeEvent`/`LifeEventState`, `PendingLoop`, `PreparedAction`, `MemoryRecord` projection,
`ConsentGrant`, `DailyBrief`/`BriefItem`, `RiskSignal`, and the voice route shapes.

**Rule: where a documented name differs from the real one, the real one wins.** Adapt
`lib/client-api.ts` — never the engine.

## 15.5 Expected merge-conflict files

| Path | Risk | Note |
|---|---|---|
| `app/page.tsx` | **High** | GLM rebuilds it; conflicts with any concurrent UI work |
| `app/globals.css` | **High** | Design tokens replace existing styles |
| `lib/client-api.ts` | **Medium** | The single engine↔UI adapter |
| `components/**` | **Low** | Mostly new files |
| `public/**` | **Low** | Assets and screenshots |
| `lib/engine.ts`, `lib/router.ts`, `lib/skills/**`, `tests/**` | **None** | Not modified — off-limits to GLM |

Recommended: GLM works in its own worktree (`glm/mobile-ui`) off the post-Codex release, so backend
and UI never race.

## 15.6 Safety properties carried into the UI

The mobile layer preserves, rather than reimplements, the engine's guarantees:

- Only an explicit affirmative confirms — silence, timeout and backgrounding never do
- A correction **voids** a pending confirmation and forces a fresh read-back
- Safety pre-empts everything, including a pending confirmation
- Ambiguous provider results say "let me check" and claim nothing definitive
- Simulated external actions are visibly labelled `SIMULATED`
- No engine state, event log, correction history, or identifier is ever shown to an elder

## 15.7 Validation

| Check | Result |
|---|---|
| Production files unchanged | ✅ `git diff -- app/ components/ lib/ tests/ package.json` empty |
| Diff scope | ✅ `docs/mobile-ui/` + handoff only |
| Prior contracts still typecheck | ✅ 11 files, 0 errors |
| Prior experiment tests | ✅ 30/30 |
| No early-stage or placeholder product language | ✅ reviewed |
| Copy reviewed for dignity | ✅ §13 of the acceptance checklist |

## 15.8 Blockers

**None.** The mobile package is UI-only and requires no credentials or external access. Its one
dependency is Codex finishing, so GLM starts from a green release.
