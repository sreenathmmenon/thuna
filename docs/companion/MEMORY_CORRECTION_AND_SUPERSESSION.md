# Thuna — Memory Correction and Supersession

> Design document. **Changes no production code.**
>
> Extends `MEMORY_MODEL.md` §8 to the ten-category schema. Targeted correction, supersession chains,
> provenance preservation, and the rule that matters most: **when memory conflicts with what the
> elder just said, ask — do not overwrite, and do not silently keep the old value.**

---

## 1. What §8 established

`MEMORY_MODEL.md` §8 gives five rules, all still binding:

1. **Correction is targeted.** Correcting the item does not clear the restaurant or address.
2. **Supersession, not deletion.** The prior value is retained briefly (30 days) so *"no, go back to
   what I said before"* works.
3. **Most recent wins.** Never merge or average conflicting statements.
4. **Corrections invalidate dependent confirmations.**
5. **Explicit forgetting is immediate and total** — no retained prior value.

And the conflict rule: **ask, do not silently overwrite and do not silently keep.**

This document extends all of that to ten categories, adds chain mechanics, and adds the provenance
rules that the model-populated schema requires.

---

## 2. Why correction is a first-class operation

Elders correct things. So does everyone — but an elder correcting an assistant is doing it in a
context where getting it wrong has often been treated as evidence of something. A system that makes
correction feel like an error report, or that requires starting over, teaches the elder that
correcting is expensive, and they will stop.

Then Thuna is confidently wrong and nobody says so.

So correction must be:

- **Cheap** — one utterance, mid-flow, no restart
- **Unremarked** — no "no problem!", no apology theatre, no acknowledgement that a mistake occurred
- **Precise** — changes only what was named
- **Reversible** — "go back to what I said before" works

The engine already does this for task flows (`COMPANION_PRODUCT_MODEL.md` §6 — *"wait, plain dosa"*
corrects, it does not restart). Memory correction must match that behaviour, not introduce a
heavier one.

---

## 3. Targeted correction

**A correction changes exactly the field named, and nothing else.**

| Elder says | Changes | Does not change |
|---|---|---|
| "No, plain dosa" | The item | Restaurant, address, quantity |
| "It's Meera, not Maya" | `displayName` | Roles, grants, story scope |
| "Lakshmi comes Thursdays now" | Household schedule | Anything about Lakshmi else |
| "The reminder should be at eight" | Routine time | Days, label, consent |
| "He's my nephew, not my son" | `relation` | Roles, grants |

### The cross-field rule

**A correction never touches permissions.** Correcting a name, a relation, or a schedule leaves
`circleRoles`, `consentGrants` and `storyScope` exactly as they were
(`RELATIONSHIP_MEMORY.md` §6). Permissions change only through explicit grant or revocation.

> **Why this is a hard rule.** A correction that resets permissions would be an unannounced privacy
> change disguised as a typo fix — in either direction. Silently *widening* access is the obvious
> harm; silently *narrowing* it is also bad, because the elder believes a grant is still in place
> and Thuna quietly stops honouring it.

### Ambiguous corrections

When it is not clear what is being corrected, **ask**, naming the candidates:

> **Elder:** "No, Thursday."
> **Thuna:** "Thursday for Lakshmi, or Thursday for the medicine reminder?"

Never guess and never apply broadly. A guess that lands wrong costs a second correction and a little
confidence.

---

## 4. Supersession chains

A corrected record is superseded, not destroyed.

```
MemoryRecord A  (createdAt T0)
  └─ supersededBy → B

MemoryRecord B  (createdAt T1)  ← active
```

Rules:

1. **The active record is the one with no `supersededBy`.** Reads follow the chain forward; there is
   exactly one live head per logical item.
2. **The superseded record retains its own `source`, `evidence` and `confidence`.** It is a record of
   what was believed and why, not just a stale value.
3. **Chains are short by retention.** Superseded records expire at 30 days
   (`MEMORY_MODEL.md` §6, correction-episodic), so a chain cannot become a long history of every
   thing the elder ever said.
4. **Chains never fan out.** One record supersedes one record. If two corrections arrive, the second
   supersedes the first correction, not the original.
5. **Deleted records keep an id stub** (`MEMORY_RETENTION_AND_DELETION.md` §4) so a chain pointing at
   one does not dangle.

### "Go back to what I said before"

Within the 30-day window, the superseded value is restorable:

> **Elder:** "Go back to what I had before for the dosa."
> **Thuna:** "Masala dosa from Udupi Cafe. That one?"

Beyond the window it is simply gone, and Thuna says so honestly rather than guessing:

> "I don't have what it was before — could you tell me again?"

### Explicit forgetting breaks the chain

Per `MEMORY_MODEL.md` §8.5: *"forget that"* is immediate and total, with **no retained prior value**.
The whole chain is destroyed, not just the head. Otherwise "forget that" would leave the previous
version quietly alive, which is precisely what the elder asked not to happen.

---

## 5. Provenance is preserved through correction

Every version keeps its own `source` and `evidence` (`COMPANION_MEMORY_SCHEMA.md` §4). Correction
does not rewrite history; it adds to it.

### Why this matters

**Knowing where a wrong value came from is how the same wrong value stops recurring.**

If Thuna has "Tuesday" for the vegetable shopping and the elder corrects it to Thursday, the useful
question is *where did Tuesday come from?*

| Origin of the wrong value | What it means |
|---|---|
| `MODEL_INFERRED`, confirmed hastily | The confirmation question was badly phrased — §7 |
| `ELDER_STATED` | The elder changed their mind. Entirely normal, nothing to fix. |
| `FAMILY_SUGGESTED` | A family member supplied something wrong about the elder — worth noticing |
| `PROVIDER_RETURNED` | Provider data is stale; re-fetch rather than re-store |

Without provenance all four look identical, and the fourth would be "fixed" by storing a corrected
copy of provider data — which `MEMORY_MODEL.md` §7 forbids.

### A confirmed record keeps its origin

Per `COMPANION_MEMORY_SCHEMA.md` §5.4: confirmation does not erase provenance. A record that began
as `MODEL_INFERRED` and was confirmed by the elder keeps `source: MODEL_INFERRED` and gains evidence
of the confirmation.

**A record whose original source was `MODEL_INFERRED` and which is later corrected is a signal about
Thuna's inference quality, not about the elder.** It is used to improve the product — aggregated
across elders per `INDEPENDENCE_METRICS.md` §6, never as a per-elder record and never as anything
about the person.

---

## 6. Conflict resolution — ask, don't overwrite

`MEMORY_MODEL.md` §8's conflict rule, extended.

When new information contradicts stored memory, there are three possible responses and only one is
acceptable:

| Response | Verdict |
|---|---|
| Silently overwrite | ❌ The elder's stated preference disappears without their knowledge |
| Silently keep the old value | ❌ The elder is ignored, and will notice |
| **Ask which it is** | ✅ |

The question that does the work is **one-off or standing**:

> "I have your usual as Masala Dosa from Udupi Cafe. Should I change that from now on, or just for
>  today?"

This is the distinction a stateless system always gets wrong — and getting it wrong in the
"from now on" direction means a single unusual choice permanently rewrites a preference.

### Defaults when the elder does not answer

If the elder does not answer the one-off-or-standing question:

- **Treat it as one-off.** The stored preference is unchanged.
- **Do not re-ask** in the same session.
- **Do not record a candidate** for the standing change. A non-answer is not weak evidence; it is no
  evidence.

The conservative default is right because a one-off treated as standing is silently wrong for months,
while a standing change treated as one-off is corrected next time at trivial cost.

### Per-category conflict handling

| Category | On conflict |
|---|---|
| `profile` | Ask: one-off or standing |
| `routine` | Ask, and confirm the whole routine back — a mis-set reminder is felt every day |
| `relationship` | Ask, and never touch permissions (§3) |
| `capability` | **Elder's statement always wins**, immediately, no question (`CAPABILITY_MEMORY.md` §2) |
| `provider_service` / household | Ask; usually standing |
| `consent` | **Never resolved by inference.** Only explicit grant or revocation changes a grant. |
| `pending_loop` | Ask what the elder wants done with the open loop |
| `life_event` | Ask |
| `operational` | Re-fetch from the provider; never reconcile locally (`MEMORY_MODEL.md` §7) |

Two rows deserve emphasis:

**`consent` is never conflict-resolved.** If stored consent and apparent intent disagree, the stored
grant stands until the elder explicitly changes it. There is no path where a conversational
inference alters what may be shared — in either direction. Widening is the obvious harm; narrowing
by inference is also wrong, because the elder must be able to trust that a revocation happened
because they revoked it.

**`capability` defers to the elder without asking.** If the elder says *"I know how to do this"*, that
is the record, whatever the counts say. Asking *"are you sure? I have you needing help with this"*
would be Thuna arguing with a person about their own competence — the single most damaging sentence
in this whole product.

---

## 7. Corrections invalidate dependent confirmations

`MEMORY_MODEL.md` §8.4, already true in the engine, extended to memory-derived readbacks.

If a correction changes anything already confirmed in the current flow, the confirmation is void and
must be re-obtained:

> **Thuna:** "Masala dosa from Udupi Cafe, ninety rupees, to home. Shall I place it?"
> **Elder:** "Wait — plain dosa."
> **Thuna:** "Plain dosa from Udupi Cafe, eighty rupees, to home. Shall I place it?"

The elder's earlier "yes" does not carry over. This applies to any confirmation, including help
requests: if the elder edits a disclosure after approving it, the approval is re-taken
(`MINIMUM_DISCLOSURE_POLICY.md` §3).

---

## 8. Correcting a model-generated assumption

A specific and important case. A `CANDIDATE` was proposed, the elder corrected it rather than
confirming it.

1. **The candidate is deleted** — not superseded, not retained as a wrong guess. There is no value in
   keeping an inference the elder has denied.
2. **The correction is stored as `ELDER_STATED`**, `confidence: CONFIRMED`, at full standing.
3. **Nothing is recorded about the correction having occurred** in the elder's memory. No "Thuna was
   wrong about this before" note, no counter.
4. **Thuna does not apologise or comment.** Per §2 — correction is unremarked. It also avoids drawing
   attention to Thuna having been guessing, which is unsettling in retrospect.

> **Elder:** "No, it's Thursdays."
> **Thuna:** "Thursdays. Right."

Not *"Sorry, I had that wrong!"* — which makes a small correction into an event and, worse, reveals
that Thuna had formed a belief the elder never gave it.

---

## 9. Elder-facing phrasing

**Targeted correction, unremarked:**

> **Elder:** "No, plain dosa."
> **Thuna:** "Plain dosa from Udupi Cafe, eighty rupees. Shall I place it?"

**Ambiguity:**

> "Thursday for Lakshmi, or for the medicine reminder?"

**One-off or standing:**

> "Just for today, or from now on?"

**Restoring a prior value:**

> "Masala dosa from Udupi Cafe — that one?"

**Prior value gone:**

> "I don't have what it was before. Tell me again?"

**Correcting a name, permissions untouched:**

> **Elder:** "It's Meera, not Maya."
> **Thuna:** "Meera. Everything else stays as it was."

**Elder overrides capability:**

> **Elder:** "I know how to do this one."
> **Thuna:** "Right, I'll leave you to it."

**Consent conflict, refusing to infer:**

> "You told me not to tell Sree about your reminders, so I haven't. Do you want to change that?"

---

## 10. Implementation notes for Codex

1. **Correction targets a field, not a record.** The API takes a field path. A correction that
   replaces a whole record will clear things the elder never mentioned.
2. **Permission fields are excluded from every correction path.** `circleRoles`, `consentGrants`,
   `storyScope` are unreachable from `correct()`. Structural, not conventional. §3.
3. **`supersededBy` is set on the old record; the new record is the head.** Reads resolve forward;
   never assume the newest `createdAt` is live.
4. **Chains do not fan out.** Assert one inbound `supersededBy` per record. §4.4.
5. **"Forget that" destroys the whole chain**, not just the head. §4.
6. **The one-off-vs-standing question is a required step** in the conflict path, not an optional
   nicety. A conflict resolved without it is a bug.
7. **No answer → one-off, no candidate written.** §6.
8. **Consent conflicts are never auto-resolved.** The conflict handler must have no branch that
   modifies a `ConsentGrant`. §6.
9. **Corrected `MODEL_INFERRED` records feed cross-elder product metrics only**, never a per-elder
   record (`INDEPENDENCE_METRICS.md` §6). §5.
10. Test: correction touches only the named field; permissions never change via correction; forget
    destroys the chain; conflict always asks; consent never auto-resolves; corrected candidate leaves
    no trace.

---

## Related

- `MEMORY_MODEL.md` §8 — the foundation this extends
- `COMPANION_MEMORY_SCHEMA.md` §2, §4, §5 — `supersededBy`, source and evidence, candidates
- `MEMORY_RETENTION_AND_DELETION.md` §4 — deleted-record stubs; forgetting
- `CAPABILITY_MEMORY.md` §2 — why the elder's statement always wins
- `RELATIONSHIP_MEMORY.md` §6 — correcting a person without touching permissions
- `FAMILY_CONSENT_POLICY.md` §5, §6 — grants and revocation as the only consent changes
- `COMPANION_PRODUCT_MODEL.md` §6 — corrections at any point; confirmation discipline
