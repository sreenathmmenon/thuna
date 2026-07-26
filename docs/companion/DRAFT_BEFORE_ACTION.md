# Thuna — Draft Before Action

> Design document. **Changes no production code.**
>
> Governing principle: **nothing consequential happens without a draft the elder saw, in a state they
> agreed to.** The draft is not a UI convention. It is the safety mechanism.

---

## 1. The ceremony

Every consequential action — a dosa, a ride, a message to Sree, a calendar entry — goes through the
same six steps. The uniformity is the point: **one mental model, every capability.**

```
1. PREPARE     model proposes → deterministic code builds a PreparedAction (DRAFT)
2. VALIDATE    limits, permissions, feasibility          → VALIDATED
3. PRESENT     fresh authoritative read → readback aloud → PRESENTED_TO_ELDER
4. CONFIRM     explicit yes, bound to that exact state   → CONFIRMED
5. EXECUTE     the one write. Three-state outcome.       → EXECUTED
6. RECONCILE   only when the outcome was UNKNOWN         → RECONCILED
```

Contract: `docs/contracts/prepared-action.ts`.

---

## 2. Why a draft and not a question

"Shall I order a dosa?" is not a draft. It is a question about a category. The elder answering yes
has agreed to *the idea of a dosa* — not to eighty rupees plus twenty-five delivery from a particular
restaurant to a particular address.

A draft names all of it:

> *"One masala dosa from Udupi Cafe, to Home. A hundred and five rupees, cash on delivery.
> Shall I place it?"*

That sentence is auditable. Six weeks later, `ActionConfirmation.readbackText` says exactly what was
agreed to, and `elderResponseText` says exactly what they answered. A boolean `confirmed: true`
would say neither.

---

## 3. What must be in every readback

| Element | Food | Ride | Bill reminder | Message to family |
|---|---|---|---|---|
| What | "one masala dosa" | "an auto" | "your electricity bill" | "that you need help" |
| From / to whom | "from Udupi Cafe, to Home" | "from Home to Manipal Hospital" | — | "to Sree" |
| How much | "a hundred and five rupees" | "**about** eighty to a hundred" | "three hundred and forty due" | — |
| How paid | "cash on delivery" | — | *(Thuna never pays)* | — |
| The ask | "Shall I place it?" | "Shall I book it?" | "Shall I remind you Friday?" | "Shall I tell him?" |

Rules that hold across all of them:

1. **The figure comes from the provider**, from a read taken moments ago. Never a local sum.
   (`SWIGGY_CODEX_INTEGRATION_GUIDE.md` §6 rule 1.)
2. **Estimates are spoken as estimates.** "About eighty to a hundred" — never "eighty". A quoted
   number that later differs is a broken promise to someone on a fixed income.
3. **Never speak an id.** Not `addressId`, not `restaurantId`, not an order reference the elder did
   not ask for. Say "Home", say "Udupi Cafe".
4. **Three items maximum in a spoken list**, then "and two more". A nine-item readback is not a
   readback, it is a filibuster.
5. **Amounts as words** — "two hundred and forty-nine rupees", not "₹249".

---

## 4. What counts as a yes

The same deterministic parser that already guards order placement — `isConfirmation()` in
`lib/command-parser.ts`. **Do not write a second, looser one.**

| Elder says | Counts? |
|---|---|
| "Yes" / "Go ahead" / "Place it" / "ശരി" | Yes |
| *(silence)* | **No.** Silence is not completion |
| "Hmm" / "Okay okay" *(as filler)* | **No** |
| "Wait" / "Let me think" | **No** — pauses, does not confirm |
| "Yes, but make it plain dosa" | **No** — this is a correction (§5) |
| Model output containing `confirmed: true` | **No.** The LLM cannot confirm anything |

`ExecutionGate.explicitUserIntent` is set by that parser and by nothing else.

---

## 5. Corrections kill confirmations

Already true in `lib/engine.ts` for in-session corrections. Generalised:

> **Any correction invalidates the confirmation and produces a NEW draft.**

- The correction is **targeted**: "actually, plain dosa" changes the item and leaves the restaurant
  and the address alone (`MEMORY_MODEL.md` §8).
- The old `PreparedAction` is `CANCELLED` with `ELDER_CORRECTED`. It is never patched in place.
- The new draft goes through steps 3–4 again, with a fresh read. Prices may have moved.
- The re-readback is **short** — repeat the whole thing only if more than one field changed:
  *"Plain dosa instead, then — still a hundred and five. Shall I place it?"*

---

## 6. Server drift kills confirmations too

The elder need not do anything wrong for a confirmation to die. The provider can move underneath it:
a delivery fee changes, an item goes out of stock, surge appears, a slot is taken.

```
confirm()  → boundRevision = "r7"
execute()  → fresh read says revision "r9"  → REFUSED (STATE_DRIFTED)
```

This is the `cartRevision` mechanism from `docs/contracts/food-commerce-adapter.ts`, applied at the
companion layer as `ActionConfirmation.boundRevision`. Both layers check. Neither assumes the other did.

Elder-facing:

> *"Just before I place it — the total's gone up to a hundred and twenty; the delivery fee changed.
> Still alright?"*

---

## 7. After execution: the three states

Never a boolean. `PLACED` | `REJECTED` | `UNKNOWN`.

| Outcome | What Thuna says |
|---|---|
| `PLACED` | *"That's ordered. About forty minutes."* |
| `REJECTED` | *"That didn't go through — the restaurant's just closed. Shall we try somewhere else?"* |
| `UNKNOWN` | *"Let me check whether that went through."* → reconcile → **then** speak |

`UNKNOWN` has **no speakable success or failure template**. Guidance must not have one to reach for.
Claim failure and Thuna double-orders; claim success and no food arrives.

---

## 8. Actions that draft but never execute

Some capabilities stop at step 4 by design. The draft is still built, still read back — the elder
just gets a next step involving a human rather than an execution.

| Capability | Why it stops |
|---|---|
| `BILLS` | Thuna does not pay. Ever. `ACTION_PERMISSION_MODEL.md` §7 |
| `HOUSEHOLD_SERVICES` | No provider integration exists |
| Anything with no configured provider | `registry.select()` returned null |

> *"Your electricity bill is three hundred and forty, due Friday. I can't pay it — but I can remind
> you Thursday evening, or tell Sree if you'd like."*

Stopping honestly is a feature. Half-doing it would be worse than not offering.

---

## 9. Implementation notes for Codex

1. The draft is built by **deterministic code** from a model-parsed request. The model never
   constructs a `PreparedAction` directly, and never sets `state`.
2. Step 3 is a **separate provider read** from step 1. Do not reuse the prepare-time snapshot for the
   readback; time has passed.
3. Step 5 re-checks the revision **again**. Three reads across the ceremony is correct.
4. Render the readback from `AuthoritativeSnapshot`, never from the request. If the code that builds
   the sentence can see the elder's original ask, it will eventually read that back instead of the
   truth.
5. The `SIMULATED` label stays on everything until a genuinely real, official, non-sandbox provider
   executes. `declaration.isSimulated` drives it.
6. Suggested tests:
   - readback total equals the provider total, not a local sum
   - a correction cancels the old action and creates a new one
   - execution refused when the revision moved between confirm and execute
   - `UNKNOWN` never produces a success or failure utterance
   - model output cannot set `explicitUserIntent` or `state`
   - a BILLS action cannot reach `EXECUTED`
   - spoken output contains no provider id, ever

---

## Related

- `AUTONOMY_LEVELS.md` — who may skip the *question* (never the state binding)
- `ACTION_PERMISSION_MODEL.md` — the grant that authorises step 5
- `INTERRUPTION_AND_RESUME.md` — what happens when the ceremony is interrupted
- `TEACH_BACK_POLICY.md` — the optional extra step for high-risk drafts
- `docs/contracts/prepared-action.ts` — the object itself
- `docs/integrations/SWIGGY_CODEX_INTEGRATION_GUIDE.md` §6 — the five rules this generalises
