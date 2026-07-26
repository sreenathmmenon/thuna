# Codex Companion Integration Prompt

> **This file is the prompt to hand to Codex.** Copy §2 onward verbatim into a Codex session once the
> current orchestration is merged and green.
>
> Everything it references is documentation and draft contracts. **No production file has been
> modified by this research package.**

---

## 1. Before you paste this

Preconditions — do not start otherwise:

- [ ] Current orchestration (Workstreams A–E) merged into `main`
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm test` passes (15/15 baseline, plus whatever the orchestration added)
- [ ] `npm run build` exits 0
- [ ] No unrelated uncommitted user changes

If any fails, **stop and fix that first.** Integrating a companion layer onto a red build produces
two problems that look like one.

---

## 2. — PROMPT FOR CODEX BEGINS —

You are integrating a **continuity companion** layer into Thuna, an existing, working, tested
Next.js + TypeScript elder-assistance product.

### 2.1 Your prime directive

**Adapt the documentation contracts to the production code. Never replace working production
interfaces with the drafts.**

The drafts in `docs/contracts/*.ts` were written without seeing your final production contracts.
Where they disagree with working code, **the working code wins** and you adapt the draft. The drafts
encode *safety reasoning*, not preferred syntax. Preserve the reasoning; discard the syntax freely.

### 2.2 Read before writing any code

Foundations (from the first research package):
- `docs/companion/COMPANION_PRODUCT_MODEL.md` — what Thuna is and is not
- `docs/companion/MEMORY_MODEL.md` — the memory foundation
- `docs/companion/ROUTINE_ENGINE.md` — **§1 "silence is not completion"**
- `docs/companion/FAMILY_CONSENT_POLICY.md` — consent model
- `docs/integrations/SWIGGY_CODEX_INTEGRATION_GUIDE.md` — **§6 the five rules**

Companion expansion:
- `docs/companion/COMPANION_MEMORY_SCHEMA.md` — canonical `MemoryRecord` envelope, 10 categories
- `docs/companion/LIFE_EVENT_SCHEMA.md` — canonical `LifeEvent` lifecycle
- `docs/companion/PENDING_LOOPS.md` — canonical `PendingLoop` lifecycle
- `docs/contracts/prepared-action.ts` — canonical `PreparedAction` lifecycle
- `docs/companion/COMPANION_FEATURE_MATRIX.md` — per-capability files/tests/estimates

### 2.3 Non-negotiable invariants

These already hold in production. Integration must not weaken any of them:

1. **OTP/PIN/CVV refusal runs before any model call** (`quickCheck()` in `lib/router.ts`).
2. **Silence is never completion.** Not for routines, orders, bills, or life events.
3. **Explicit confirmation before anything consequential**, in the moment, for the specific state.
4. **A correction invalidates any dependent confirmation.**
5. **The model proposes; deterministic code decides and mutates.** The LLM may never set a terminal
   state.
6. **Family notification requires explicit, specific, revocable consent.** Default deny.
7. **No medical, health, emotional, or cognitive inference.** Ever, regardless of consent.
8. **External actions are labelled `SIMULATED`** until real provider access is approved.
9. **Every state transition appends an event.**
10. **Nothing extracted enters durable memory without elder confirmation.**

### 2.4 Do not modify

| File | Reason |
|---|---|
| `lib/engine.ts` | Generic and green. The companion adds no engine branches |
| `lib/command-parser.ts` | Confirmation semantics are correct; **reuse `isConfirmation()`** |
| `lib/router.ts` | Pre-model refusal must keep firing first |
| `lib/session-store.ts` | Sole mutator |
| `tests/engine.test.ts`, `tests/m2-flow.test.ts` | **All must stay green, unmodified** |

`lib/types.ts` — **additive changes only.**

If integration seems to require editing `lib/engine.ts`, stop. That is the signal you are putting
companion logic in the wrong layer. It belongs in a new module or a skill/routine handler.

### 2.5 Integration order

#### Phase 1 — schemas and policy (no user-visible change)
1. `LifeEvent` schema + lifecycle
2. `PendingLoop` schema + lifecycle
3. Reminder policy engine (**declarative data, not per-type code branches**)
4. Expanded memory (10 categories on one `MemoryRecord` envelope)
5. Consent + action-permission models

**Gate:** typecheck, tests, build all green. Existing 15 tests untouched and passing.

#### Phase 2 — demo-visible behaviour
6. Wedding-invitation flow (typed input first, image later)
7. Bill reminder
8. Regular check-in
9. Family-call request
10. Correction flow across life events
11. Daily life brief

**Gate:** the demo script in `COMPANION_DEMO_SCRIPT.md` runs end to end.

#### Phase 3 — external and advanced
12. Document/image extraction (Sarvam Vision)
13. Swiggy MCP adapter (**read-only first**; see the Swiggy guide)
14. Outbound calling (mock channel first — never real telephony first)
15. Family story loops
16. Adaptive guidance
17. Real provider integrations

**Gate each step separately.** Do not batch Phase 3.

### 2.6 Rules of engagement

1. **Compare before writing.** For each draft contract, diff it against the production contract that
   already exists. Write down the differences before changing anything.
2. **Adapt, don't replace.** Keep production names, error shapes, and house style (Zod validation per
   `AGENTS.md`).
3. **Preserve every passing test.** If an existing test needs changing to accommodate you, you have
   almost certainly broken an invariant — stop and reconsider.
4. **Integrate incrementally.** One capability, gated, committed. Never a big-bang merge.
5. **Stop on contract mismatch.** If a draft contradicts production in a way you cannot resolve
   safely, stop and report — do not guess.
6. **Stop on repeated test failure.** One focused repair attempt. If it still fails, stop and report
   the blocker. Never weaken a test to make it pass.
7. **Never invent provider APIs.** If a Swiggy tool argument is not in
   `docs/integrations/SWIGGY_MCP_RESEARCH.md`, read the official reference page. Do not guess.
8. **Commit after each green gate**, with a concise message.

### 2.7 The four patterns to carry across every capability

Learned from the Swiggy research; they generalise to bills, rides, messages and family requests:

**(a) Authoritative state, not local state.** The number read back to the elder must come from the
provider, freshly. Never a locally computed total.

**(b) Confirmation bound to a snapshot.** A `ConfirmationToken`/`PreparedAction` carries the revision
of the state it was minted from. If the state moves, the token fails. The elder confirmed *that*
total, not any total.

**(c) Three-state execution, never a boolean.** `PLACED | REJECTED | UNKNOWN`. `UNKNOWN` means the
action may or may not have happened — reconcile via the provider's history *before* telling the elder
anything. Blind retry can double-charge.

**(d) Double gate on real execution.** An environment flag alone is never sufficient; explicit
in-the-moment user intent is also required.

### 2.8 When you finish

Report: phases completed; typecheck/test/build results; files created and modified; any contract
mismatch you resolved and how; anything you stopped on; test count before and after.

## — PROMPT FOR CODEX ENDS —

---

## 3. Notes for the human running this

- **Phase 1 needs no credentials.** It is pure schema and policy work and is the highest-value
  starting point.
- **Phase 3 step 13 is blocked** on Swiggy production access (invite-based; see
  `CLAUDE_INTEGRATION_HANDOFF.md` §4). Everything else in Phase 3 is unblocked.
- If time is short, **Phase 1 + Phase 2 alone** produce a demonstrably better product and carry no
  external dependency.
- The single highest-value first commit is the `LifeEvent` + `PendingLoop` schemas with the reminder
  policy as data — that is what turns hardcoded scenarios into a general engine.
