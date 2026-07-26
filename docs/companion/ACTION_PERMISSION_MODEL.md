# Thuna — Action Permission Model

> Design document. **Changes no production code.**
>
> Governing principle: **a permission is a specific, revocable, time-bounded agreement between the
> elder and one capability on one provider.** It is never a global trust setting, and it is never
> inferred from behaviour.

---

## 1. The shape of a grant

Every permission is one row. Every field is required except `expiresAt` and `amountCeiling`, and
omitting those has a defined meaning (§4).

```
grantId
capability          FOOD | GROCERY | DINING | RIDES | BILLS | DELIVERY |
                    MAPS | MESSAGING | CALENDAR | HOUSEHOLD_SERVICES
providerId          swiggy-mcp | mock-food | local-calendar | ...
autonomyLevel       EXPLAIN_ONLY | PREPARE_DRAFT | CONFIRM_EVERY_ACTION |
                    PREAPPROVED_ROUTINE_ACTION
amountCeiling       Money, optional
expiresAt           ISO 8601, optional
grantedAt           ISO 8601
grantedVia          "spoken in-app" | "settings" | ...
grantedPhrase       the elder's own words, verbatim
revokedAt           ISO 8601, optional
revokedVia          how it ended
```

`grantedPhrase` matters more than it looks. When the elder later asks *"what have I let you do?"*,
reading back their own sentence is far more meaningful than reading back a policy row.

---

## 2. Capability-specific and provider-specific

A grant names **both**. There is no `capability: '*'` and no `providerId: '*'`.

| Granting this | Does **not** grant |
|---|---|
| FOOD on Swiggy | FOOD on any other provider |
| FOOD on Swiggy | GROCERY on Swiggy |
| GROCERY on Swiggy | DINING on Swiggy |
| MESSAGING to Sree | MESSAGING to anyone else |
| CALENDAR read | CALENDAR write |

Why so strict: providers differ in what they can undo. Swiggy food has **no cancellation tool**;
a dining booking usually can be cancelled. An elder who accepted the food risk has not accepted an
unknown provider's risk, and the system must not quietly assume they have.

---

## 3. Revocation

**Revocation is immediate, unconditional, and always available.**

| Elder says | Effect |
|---|---|
| "Stop ordering food for me" | FOOD grants revoked; in-flight `PreparedAction`s cancelled |
| "Don't tell Sree things any more" | MESSAGING grants for that recipient revoked |
| "Forget all of it" | Every grant revoked; profile-level reset |
| "Not today" | Global pause for the day; grants survive, actions do not |

Rules:

1. Revocation takes effect **before the next action**, not at the next session.
2. Revocation never asks "are you sure?" and never argues its case.
3. Revoking is available by voice. It must not require finding a screen.
4. A revoked grant is **recorded, not deleted** — the elder has a right to see that they revoked it
   and when. (Full profile deletion purges everything, including this history — `MEMORY_MODEL.md` §6.)
5. Revocation cascades: revoking FOOD revokes any FOOD preapproval underneath it.
6. An in-flight `PreparedAction` whose grant is revoked transitions to `CANCELLED` with
   `PERMISSION_REVOKED`. If it has already executed, revocation cannot undo it — Thuna says so
   plainly rather than implying it stopped something it did not.

---

## 4. Time bounds

| Grant kind | Default expiry | Why |
|---|---|---|
| `EXPLAIN_ONLY` | none | Nothing consequential; no decay needed |
| `PREPARE_DRAFT` | none | Still nothing executes |
| `CONFIRM_EVERY_ACTION` | none | Every action is separately confirmed anyway |
| `PREAPPROVED_ROUTINE_ACTION` | **90 days** | Standing permission to spend money must decay |
| Any grant made during a family-assisted setup | **30 days** | Shorter, because the elder was not alone when it was made |

An absent `expiresAt` means "until revoked", which is only acceptable where every individual action
is still confirmed. Standing *execution* permission always expires.

**Expiry is not renewed by use.** Nine weeks of Monday dosas do not extend the grant to a tenth week.
At expiry Thuna asks once, plainly: *"Shall I keep ordering your Monday dosa? It's been three months
since you set that up."* Silence means it lapses.

---

## 5. Amount ceilings

Where a capability spends money, the grant carries a ceiling **the elder chose**, not a default
Thuna picked.

- The ceiling is checked against the **authoritative provider total**, never a local estimate.
- Exceeding it is not an error, it is a question:
  *"That comes to a hundred and eighty, and you asked me to check with you over a hundred and fifty.
  Is that alright?"*
- A one-time override applies to **that action only** and never raises the ceiling.
- The adapter's own `maxActionValue` (Swiggy food: ₹1,000) applies **in addition**. The lower of the
  two wins. A provider limit is not a substitute for the elder's own limit.

---

## 6. Consent history

Every grant, change and revocation appends an immutable entry:

```
at, action (GRANTED | MODIFIED | REVOKED | EXPIRED | USED),
capability, providerId, autonomyLevel, amountCeiling,
grantedPhrase (on GRANTED), preparedActionId (on USED)
```

Two requirements this exists to satisfy:

1. **The elder can ask "what can you do for me?" and get a complete, plainly-spoken answer.**
   Anything Thuna cannot comfortably read aloud should not have been granted silently.
2. **Every consequential action traces to a grant.** `ExecutionGate.permissionGrantId` on the
   `PreparedAction` links them. An execution with no grant id is a bug, and should fail closed.

The history is elder-readable and elder-deletable. It is **not** shared with family by default —
what an elder has permitted Thuna to do is not automatically the family's business.

---

## 7. Structural refusals

No grant, at any level, from anyone, unlocks these:

| Refused | Why |
|---|---|
| Paying a bill, UPI, card, or any money transfer | Thuna is a reminder, not a payment app. `BILLS` is `supportsExecute: false` |
| Collecting or repeating an OTP, PIN, CVV, or password | Refused **pre-model**, in `lib/router.ts`, before any LLM call |
| Booking a ride via an unofficial provider integration | `providerIsOfficial` gate — `RIDE_PROVIDER_RESEARCH.md` §6 |
| Sharing health, emotional or behavioural inference with family | Not a permission gap. Thuna does not produce these at all |
| Acting on a family member's instruction without elder approval | `createdBy` has no `FAMILY_IMPOSED` value by design |
| Storing a medicine dosage | `MEMORY_MODEL.md` §9 |

These are enforced in code, not policy. A grant row requesting one is invalid and rejected at write
time — so a future feature cannot enable one by adding a config value.

---

## 8. Family involvement in granting

Family may **suggest** a grant. Only the elder may make one.

- A family-suggested grant arrives as a proposal the elder is asked about, in their own time, on
  their own channel.
- The elder's approval must be an explicit yes to a specific shape, spoken by them.
- Family cannot see a grant's contents unless the elder shares it.
- Family cannot revoke an elder's grant, and cannot re-grant one the elder revoked.
- Grants made while a family member was assisting are marked and get the shorter 30-day expiry (§4),
  because "yes" said with a relative in the room is a weaker signal than "yes" said alone.

---

## 9. Implementation notes for Codex

1. Grants live in **relationship/profile memory**, purged on profile reset alongside consent grants
   (`MEMORY_MODEL.md` §12.6).
2. Resolve the grant during `validate()`, attach `permissionGrantId` to the `ExecutionGate`, and
   **fail closed** when no grant resolves. Absence of a grant is a refusal, never a default-allow.
3. Check revocation again immediately before `execute()`. A grant revoked between confirmation and
   execution must block the execution.
4. `USED` history entries should be bounded (suggest 90 days) so the log stays readable aloud.
5. Keep the ceiling check on the **authoritative** total. Checking a local estimate is the same
   class of bug as reading back a local total.
6. Suggested tests:
   - no grant → execution refused
   - grant for FOOD/swiggy does not authorise GROCERY/swiggy
   - expired preapproval → falls back to asking, does not auto-renew
   - revocation between confirm and execute blocks execution
   - ceiling checked against provider total, not local sum
   - elder ceiling below provider `maxActionValue` → elder ceiling wins
   - a grant row with `capability: BILLS, autonomyLevel: CONFIRM_EVERY_ACTION` is rejected at write

---

## Related

- `AUTONOMY_LEVELS.md` — what each level permits
- `FAMILY_CONSENT_POLICY.md` — consent to *share*, distinct from permission to *act*
- `MEMORY_MODEL.md` §5, §9 — where grants live, what may never be stored
- `docs/contracts/prepared-action.ts` — `ExecutionGate.permissionGrantId`
- `docs/contracts/service-capability-adapter.ts` — `maxActionValue`, `supportsExecute`
