# Thuna — Companion Feature Matrix

> Planning document. **Changes no production code.**
>
> Per-capability: production files affected, minimum interface, tests, safety gates, merge-conflict
> risk, whether the core engine must change, priority, and complexity.
>
> **Complexity:** `S` ≈ under an hour · `M` ≈ a few hours · `L` ≈ a day or more.

---

## 1. Status legend

| Mark | Meaning |
|---|---|
| ✅ **Built** | Implemented and tested in production code today |
| 📐 **Designed** | Specified in this package; not implemented |
| 🔌 **Blocked** | Designed; needs external access or approval |

---

## 2. Already built (do not rebuild)

| Capability | Where | Note |
|---|---|---|
| ✅ Skill-driven execution engine | `lib/engine.ts` | Generic; pure; no skill branches |
| ✅ Session store as sole mutator | `lib/session-store.ts` | |
| ✅ Confirmation semantics | `lib/command-parser.ts` | `isConfirmation()` — **reuse everywhere** |
| ✅ Pre-model OTP/PIN/CVV refusal | `lib/router.ts` | `quickCheck()` — the safety keystone |
| ✅ Recovery (wait/repeat/back/stop) | `lib/command-parser.ts` | |
| ✅ ORDER_FOOD with correction + contextual Q&A | `lib/skills/order-food.ts` | The hero flow |
| ✅ Simulated receipts, event history | `lib/guidance.ts`, engine | |

**15 tests green.** Every row below must preserve them.

---

## 3. Phase 1 — schemas and policy

No user-visible change; everything later depends on these.

### 3.1 LifeEvent schema & engine — 📐 **Priority 1** · **M**

| | |
|---|---|
| **Production files** | `lib/life-events/{types,engine,policy}.ts` (new), `lib/types.ts` (additive) |
| **Min interface** | `LifeEvent` record + pure `transition(event, action, now)`; declarative reminder policy table |
| **Tests** | Lifecycle transitions; candidate→confirmed gate; targeted correction preserves provenance; reminder offsets; **silence never completes** |
| **Safety gates** | Nothing stored unconfirmed; no field invented; quiet-hours honoured |
| **Conflicts** | Low — all new files |
| **Core engine change?** | **No** |

> Event types must be **data**. If adding `RENEWAL` requires an engine edit, the design is wrong.

### 3.2 PendingLoop schema & follow-up — 📐 **Priority 1** · **M**

| | |
|---|---|
| **Production files** | `lib/loops/{types,engine}.ts` (new) |
| **Min interface** | `PendingLoop` record + transitions + anchor resolution ("after dinner") |
| **Tests** | Model suggestion requires confirmation; anchor resolution; anchor never fires; ageing; abandonment |
| **Safety gates** | Confirmation before storage; no nagging; dignified abandonment |
| **Conflicts** | Low |
| **Core engine change?** | **No** |

### 3.3 Expanded memory (10 categories) — 📐 **Priority 1** · **L**

| | |
|---|---|
| **Production files** | `lib/memory/**` (new), possibly `data/` seed |
| **Min interface** | One `MemoryRecord` envelope; category-specific payloads; `store/query/correct/supersede/delete` |
| **Tests** | Envelope completeness; expiry sweep; supersession chain; provenance preserved; deletion is real; **provider PII never persisted**; "what do you remember?" readback |
| **Safety gates** | Default `PRIVATE`; prohibited categories rejected at write; model output cannot self-confirm |
| **Conflicts** | **Medium** — Workstream E owns `lib/memory/**`. Coordinate |
| **Core engine change?** | **No** |

> Existing `MEMORY_MODEL.md` remains the conceptual foundation; the 10-category schema extends it.

### 3.4 Consent & action-permission model — 📐 **Priority 1** · **M**

| | |
|---|---|
| **Production files** | `lib/consent/**` (new), `lib/family/**` (Workstream E) |
| **Min interface** | `ConsentStore` (already drafted in `notification-adapter.ts`) + capability/provider-scoped permissions |
| **Tests** | Default deny; revocation immediate; per-recipient × per-category isolation; time-bounded expiry; family cannot self-grant |
| **Safety gates** | Absence of grant = deny; `PRIVATE` not unlockable |
| **Conflicts** | **Medium** — overlaps Workstream E `lib/family/**` |
| **Core engine change?** | **No** |

---

## 4. Phase 2 — demo-visible behaviour

### 4.1 Wedding-invitation flow — 📐 **Priority 2** · **M**

| | |
|---|---|
| **Production files** | `lib/skills/` (new skill or life-event handler), UI view |
| **Min interface** | Typed/spoken input → candidate `LifeEvent` → readback → confirm → schedule |
| **Tests** | "Not Sunday, Saturday" changes **only** the date; relationship captured; three reminders scheduled |
| **Safety gates** | Candidate until confirmed; provenance retained |
| **Conflicts** | Low |
| **Core engine change?** | **No** — a skill handler, like ORDER_FOOD |

### 4.2 Bill reminder — 📐 **Priority 2** · **S**

| | |
|---|---|
| **Production files** | Life-event policy config |
| **Min interface** | `BILL` event type + reminder policy |
| **Tests** | **Never marked paid from silence**; paid only on explicit confirmation or provider verification |
| **Safety gates** | No payment execution; reminder only |
| **Conflicts** | None |
| **Core engine change?** | **No** — pure configuration if 3.1 is right |

> If adding `BILL` needs code, revisit 3.1. This row is the test of whether the engine is general.

### 4.3 Regular check-in & proactive policy — 📐 **Priority 2** · **M**

| | |
|---|---|
| **Production files** | `lib/routines/**` (Workstream C) |
| **Min interface** | Reason + source + stop option on every proactive session |
| **Tests** | Purposeless session refused; quiet hours defer; stop honoured immediately; retry once only |
| **Safety gates** | Consent + quiet hours checked at session open, not by the caller |
| **Conflicts** | **High** — Workstream C owns `lib/routines/**`. **Merge C first** |
| **Core engine change?** | **No** |

### 4.4 Family-call request & human bridge — 📐 **Priority 2** · **M**

| | |
|---|---|
| **Production files** | `lib/family/**`, notification adapter |
| **Min interface** | Request lifecycle REQUESTED→…→ELDER_CONFIRMED; minimum-disclosure composer |
| **Tests** | Consent gate blocks; minimum disclosure; elder-initiated bypasses standing grant but not the check |
| **Safety gates** | Consent inside `send()`; blocked = normal outcome |
| **Conflicts** | **Medium** — Workstream E |
| **Core engine change?** | **No** |

### 4.5 Daily life brief — 📐 **Priority 3** · **S**

| | |
|---|---|
| **Production files** | `lib/brief/**` (new), UI |
| **Min interface** | Aggregate + prioritise + dedup across events/bills/routines/loops |
| **Tests** | Opt-in default off; dedup (one wedding surfaces once); quiet-hours aware; length cap |
| **Safety gates** | Opt-in; no health framing |
| **Conflicts** | Low |
| **Core engine change?** | **No** |

---

## 5. Phase 3 — external and advanced

### 5.1 Universal inbox & confirm-before-memory — 📐 **Priority 2** · **M**

| | |
|---|---|
| **Production files** | `lib/inbox/**` (new) |
| **Min interface** | One pipeline: input→extract→candidate→readback→correct→confirm→store |
| **Tests** | Every input type routes; low confidence asks; partial correction; rejected candidate discarded |
| **Safety gates** | **Nothing durable without confirmation** |
| **Conflicts** | Low |
| **Core engine change?** | **No** |

### 5.2 Document/image extraction (Sarvam Vision) — 📐 **Priority 3** · **L**

| | |
|---|---|
| **Production files** | `lib/vision/**`, `app/api/vision/**` |
| **Min interface** | `DocumentInputAdapter` → field-level extraction with confidence + provenance |
| **Tests** | Field provenance retained; low confidence → ask; **no field invented**; fixture-based |
| **Safety gates** | No instruction without visible evidence; images not persisted |
| **Conflicts** | **Medium** — Workstream A owns Sarvam routes |
| **Core engine change?** | **No** |

### 5.3 Digital safety & risk signals — 📐 **Priority 1** · **M**

| | |
|---|---|
| **Production files** | `lib/router.ts` (**extend `quickCheck` only, additively**), `lib/safety/**` (new) |
| **Min interface** | Deterministic pre-model risk matcher: OTP/PIN/CVV, remote access, secrecy, QR, urgent transfer |
| **Tests** | Each risk refused **before** any model call; secrecy request flagged; minimal metadata only; no shaming copy |
| **Safety gates** | Pre-model; refuse→explain→offer human; never store scam content |
| **Conflicts** | **Medium** — `lib/router.ts` is shared. Additive patterns only |
| **Core engine change?** | **No** — extends existing refusal |

> **Priority 1 despite being in Phase 3.** It protects the most vulnerable moment and is cheap.

### 5.4 Swiggy MCP adapter — 🔌 **Priority 3** · **L**

| | |
|---|---|
| **Production files** | `lib/adapters/**` (new), `lib/skills/order-food.ts` (optional adapter) |
| **Min interface** | `FoodCommerceAdapter`; mock default; Swiggy read-only next |
| **Tests** | Mock reproduces today's behaviour byte-identically; total from `readCart()`; token rejected on cart drift; `UNKNOWN`→reconcile; ≥₹1000 blocked; **OTP refusal still fires first** |
| **Safety gates** | Double gate; `THUNA_ENABLE_REAL_SWIGGY_ORDER=false`; read-only allowlist |
| **Conflicts** | **Medium** — Workstream B owns `lib/skills/**` |
| **Core engine change?** | **No** |
| **Blocker** | **Swiggy production access is invite-based.** Mock+interface need no access |

### 5.5 Outbound calling (telephony) — 🔌 **Priority 4** · **L**

| | |
|---|---|
| **Production files** | `lib/channels/**` |
| **Min interface** | `ChannelAdapter`; **mock telephony first** |
| **Tests** | DIALING/RINGING/ANSWERED/NO_ANSWER/BUSY; answering machine ≠ human; quiet hours at adapter; rate cap |
| **Safety gates** | Consent + quiet hours at `openSession()`; no credentials committed |
| **Conflicts** | Low |
| **Core engine change?** | **No** |
| **Blocker** | Provider credentials + Indian regulatory review. **Mock is unblocked** |

### 5.6 Family story loops — 📐 **Priority 4** · **M**

| | |
|---|---|
| **Production files** | `lib/family/**` |
| **Min interface** | STORY_NOTICED→…→LOOP_COMPLETED |
| **Tests** | Per-story approval (never blanket); **family cannot browse memories**; unshare works |
| **Safety gates** | Elder approval per story; no query interface for family |
| **Conflicts** | **Medium** — Workstream E |
| **Core engine change?** | **No** |

### 5.7 Adaptive guidance & independence — 📐 **Priority 4** · **M**

| | |
|---|---|
| **Production files** | `lib/guidance.ts` (additive), `lib/capability/**` |
| **Min interface** | 4 guidance levels; capability memory of task-completion facts |
| **Tests** | Level elder-overridable; **no cognitive inference stored**; facts not judgements |
| **Safety gates** | Capability memory ≠ health inference; never silently downgrade |
| **Conflicts** | **Medium** — `lib/guidance.ts` shared |
| **Core engine change?** | **No** |

### 5.8 PreparedAction & autonomy levels — 📐 **Priority 3** · **L**

| | |
|---|---|
| **Production files** | `lib/actions/**` (new) |
| **Min interface** | `PreparedAction` DRAFT→…→RECONCILED; 4 autonomy levels; capability×provider permissions |
| **Tests** | Expired action re-confirmed; **stale confirmation never resumed without fresh readback**; `PREAPPROVED_ROUTINE_ACTION` scoped + revocable; UNKNOWN→reconcile |
| **Safety gates** | Double gate; snapshot-bound confirmation; revocable permissions |
| **Conflicts** | Low |
| **Core engine change?** | **No** |

### 5.9 Interruption & cross-channel continuity — 📐 **Priority 3** · **M**

| | |
|---|---|
| **Production files** | `lib/session-store.ts` (**additive**), `lib/continuity/**` |
| **Min interface** | Preserve active task, confirmed fields, unanswered question, pause reason, pending action, next safe step, expiry |
| **Tests** | Resume mid-task; **stale payment/order confirmation forces fresh readback**; expiry invalidates |
| **Safety gates** | Never resume a stale confirmation |
| **Conflicts** | **Medium** — `lib/session-store.ts` is the sole mutator; additive only |
| **Core engine change?** | **No** |

### 5.10 Teach-back & comprehension — 📐 **Priority 5** · **S**

| | |
|---|---|
| **Production files** | `lib/guidance.ts` (additive) |
| **Min interface** | Optional readback request on high-risk choices |
| **Tests** | Always skippable; **no medical/cognitive inference**; outcome only adjusts guidance level |
| **Safety gates** | Never exam-like; never stored as a judgement |
| **Conflicts** | Low |
| **Core engine change?** | **No** |

> **Lowest priority deliberately.** Highest risk of feeling degrading; ship only when the tone is right.

---

## 6. Does the core engine change?

**No — for every row above.**

`lib/engine.ts` stays generic. Companion features live in: new modules (`lib/life-events/`,
`lib/loops/`, `lib/memory/`, `lib/inbox/`, `lib/actions/`), skill/routine handlers, or additive
extensions to `guidance.ts` / `router.ts` / `session-store.ts`.

**If a change appears to require editing `lib/engine.ts`, that is the signal the logic is in the
wrong layer.**

---

## 7. Merge-conflict summary

| Path | Risk | Owner | Mitigation |
|---|---|---|---|
| `lib/engine.ts`, `command-parser.ts` | **None** | — | Not modified |
| `lib/life-events/**`, `loops/**`, `inbox/**`, `actions/**` | **None** | New | — |
| `lib/routines/**` | **High** | Workstream C | Merge C first |
| `lib/memory/**`, `lib/family/**` | **Medium** | Workstream E | Merge E first |
| `lib/skills/**` | **Medium** | Workstream B | Merge B first |
| `lib/router.ts` | **Medium** | Shared | Additive patterns only |
| `lib/guidance.ts` | **Medium** | Shared | Additive functions only |
| `lib/session-store.ts` | **Medium** | Shared | Additive fields only |

**Merge order: C → E → B → companion layer.**

---

## 8. Recommended first three commits

1. **`Add LifeEvent and PendingLoop schemas with declarative reminder policy`** — 3.1 + 3.2. No
   external dependency. Turns hardcoded scenarios into a general engine. **Start here.**
2. **`Extend memory to ten categories with provenance and confirmation gate`** — 3.3 + 5.1.
3. **`Add deterministic digital-safety risk signals`** — 5.3. Cheap, additive, protects the most
   vulnerable moment.

Phases 1–2 need **no credentials at all**.

---

## Related

- `CODEX_COMPANION_INTEGRATION_PROMPT.md` — the prompt to hand Codex
- `COMPANION_DEMO_SCRIPT.md` — what this enables on stage
- `CLAUDE_INTEGRATION_HANDOFF.md` — package-level handoff
