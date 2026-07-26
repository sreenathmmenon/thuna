# Thuna — Autonomy Levels

> Design document. **Changes no production code.**
>
> Governing principle: **autonomy is something the elder grants, not something Thuna earns.**
> Confidence, accuracy, or a long run of correct actions never promote Thuna to a higher level.
> Only the elder does, and they can demote it mid-sentence.

---

## 1. The four levels

| Level | Thuna may | Thuna may not | Default for |
|---|---|---|---|
| `EXPLAIN_ONLY` | Describe, look things up, read options aloud | Prepare anything, touch a provider write path | New capabilities; anything unfamiliar |
| `PREPARE_DRAFT` | Everything above, plus build a `PreparedAction` and show it | Ask for confirmation, execute | Capabilities the elder is still deciding about |
| `CONFIRM_EVERY_ACTION` | Everything above, plus ask "shall I?" and execute on an explicit yes | Act without a fresh yes for this specific state | **The product default.** Food, groceries, dining, rides |
| `PREAPPROVED_ROUTINE_ACTION` | Execute a *narrowly specified, recurring, low-risk* action without asking each time | Act outside the exact preapproved shape | Only where the elder explicitly set it up |

The default for every capability, on first use, is `CONFIRM_EVERY_ACTION`. Nothing starts higher.

---

## 2. What each level actually means in a conversation

### `EXPLAIN_ONLY`

> *"Udupi Cafe is open, and your usual dosa is about eighty rupees there. I can't place orders yet —
> would you like me to be able to?"*

Thuna is a knowledgeable friend with no hands. `discover()` runs; `prepare()` does not.

### `PREPARE_DRAFT`

> *"I've put together the order — one masala dosa from Udupi Cafe, eighty rupees plus twenty-five
> delivery, to Home. I'm not going to place it. Have a look when you're ready."*

A `PreparedAction` reaches `VALIDATED` and stops. It is never presented as a question. This level
exists for elders who want to see the shape of a thing before deciding whether Thuna should ever do
it, and for family-suggested actions awaiting the elder's own review.

### `CONFIRM_EVERY_ACTION`

The product default and the one the whole design is built around.

> *"One masala dosa from Udupi Cafe, to Home. One hundred and five rupees, cash on delivery.
> Shall I place it?"*

`PreparedAction` reaches `PRESENTED_TO_ELDER`, waits for a real yes, and only then executes. The yes
is bound to that exact state — see `docs/contracts/prepared-action.ts`.

### `PREAPPROVED_ROUTINE_ACTION`

> *(elder, earlier)* "Every Monday just order my usual dosa, don't ask me."
> *(Monday)* "Ordering your usual dosa from Udupi Cafe now — a hundred and five rupees. Say stop if
> you'd rather not."

Thuna acts, but **announces before acting and leaves a stop window**. A preapproval is not permission
to be silent.

---

## 3. What a preapproval must specify

A `PREAPPROVED_ROUTINE_ACTION` grant is not "Thuna may order food". It is a narrow, named shape.
Every field below is required; a grant missing any of them is invalid and falls back to
`CONFIRM_EVERY_ACTION`.

| Field | Example | Why required |
|---|---|---|
| Capability | `FOOD` | Never cross-capability |
| Provider | Swiggy | A provider swap is a new decision |
| Exact action shape | "the usual: 1 masala dosa, Udupi Cafe, to Home" | "Food" is not a shape |
| Amount ceiling | ₹150 | Prices move; the elder agreed to a size, not a blank cheque |
| Schedule / trigger | Mondays, 12:30 | Unbounded preapproval is not preapproval |
| Expiry | 90 days | Consent decays. Silence is not renewal |
| Announce window | 60 seconds | The stop window is part of the grant |

If the live state exceeds the ceiling, or the item is unavailable, or the provider changed, the
preapproval **does not apply** and Thuna drops back to asking. Degrading to a question is always
safe; escalating past one never is.

---

## 4. What is never preapprovable

Regardless of what the elder says, these always require an in-the-moment confirmation:

- **Rides.** A person gets into a vehicle. See `docs/contracts/ride-adapter.ts`.
- **Bills and any payment.** Thuna does not pay bills at all — see `ACTION_PERMISSION_MODEL.md` §7.
- **Messages to family that share anything about the elder.** Consent is per-message-category and
  checked at send time — see `FAMILY_CONSENT_POLICY.md`.
- **Anything above the elder's own amount ceiling.**
- **Anything a provider cannot cancel**, where the elder has not separately acknowledged that.
- **Anything classified `HIGH` risk** in `PreparedAction.risk`.

This list is short on purpose. If it grows, the growth is a product decision, not a config change.

---

## 5. Level is per capability *and* per provider

There is no global autonomy dial.

```
FOOD    / swiggy   → PREAPPROVED_ROUTINE_ACTION  (the Monday dosa, ceiling ₹150)
FOOD    / mock     → CONFIRM_EVERY_ACTION
GROCERY / swiggy   → CONFIRM_EVERY_ACTION
RIDES   / mock     → PREPARE_DRAFT
BILLS   / any      → EXPLAIN_ONLY                 (structurally capped — §4)
```

Granting food autonomy says nothing about groceries. An elder comfortable with a ₹105 dosa is not
thereby comfortable with a ₹2,000 grocery run, and inferring that they are is exactly the kind of
helpful overreach this document exists to prevent.

---

## 6. Demotion is instant and always available

| Elder says | Effect |
|---|---|
| "Stop" | Current action cancelled immediately, mid-execution where possible |
| "Ask me first from now on" | That capability drops to `CONFIRM_EVERY_ACTION` |
| "Don't do that any more" | The specific preapproval is revoked |
| "Just tell me things, don't do anything" | Everything drops to `EXPLAIN_ONLY` |

Demotion never requires a settings screen, never asks "are you sure?", and never argues. It takes
effect before the next action, not at the next session boundary.

**Promotion is different.** Raising a level requires an explicit, unambiguous statement of the
narrow shape (§3) — never a shrug, never "sure whatever", never inferred from repeated yeses.
An elder saying yes ten times in a row is an elder who is being asked appropriately, not an elder
requesting to stop being asked.

---

## 7. Interaction with the model

The model **proposes** an autonomy-relevant reading ("they seem to want this every Monday").
Deterministic code **decides** whether a grant exists. The LLM cannot create, widen, or invoke a
preapproval. This is the same split the task engine already enforces — the model parses, the engine
transitions.

Concretely: `ExecutionGate.explicitUserIntent` is set by the deterministic confirmation parser
(`isConfirmation()`), never by model output. A model that emits `{"confirmed": true}` changes nothing.

---

## 8. Implementation notes for Codex

1. Store the level on the permission grant, not on the elder. There is no `elder.autonomyLevel`.
   See `ACTION_PERMISSION_MODEL.md`.
2. Resolve the level at `validate()` time and record it in `PreparedAction.findings` when it
   constrains the action, so the reason is auditable after the fact.
3. `PREAPPROVED_ROUTINE_ACTION` must still produce a full `PreparedAction` and still run the
   revision check. Preapproval skips the *question*, never the *state binding*.
4. The announce-and-stop window is a real timer, not a courtesy string. Execution must be abortable
   during it.
5. Default every new capability to `CONFIRM_EVERY_ACTION` in code, not in config, so a missing
   config row cannot mean "no restrictions".
6. Suggested tests:
   - a preapproval does not apply when the live total exceeds the ceiling
   - a preapproval does not apply after `expiresAt`
   - "stop" during the announce window aborts execution
   - model output cannot set `explicitUserIntent`
   - RIDES cannot be set to `PREAPPROVED_ROUTINE_ACTION` at all
   - demotion takes effect on the very next action

---

## Related

- `ACTION_PERMISSION_MODEL.md` — where grants live and how they are revoked
- `DRAFT_BEFORE_ACTION.md` — the draft/review ceremony every level shares
- `docs/contracts/prepared-action.ts` — `ExecutionGate`, `PreparedActionState`
- `docs/contracts/service-capability-adapter.ts` — the umbrella the levels gate
- `ROUTINE_ENGINE.md` — the same propose/decide split, for reminders
