# Thuna — Interruption and Resume

> Design document. **Changes no production code.**
>
> Governing principle: **an elder may stop mid-sentence for any reason, and picking back up should
> cost them nothing — except where picking up would mean acting on stale consent.**

---

## 1. Why this exists

Interruptions are normal, not exceptional. The doorbell rings. A grandchild calls. The elder puts the
phone down and comes back twenty minutes later. A system that loses the thread makes them start over;
a system that resumes *too* eagerly acts on a yes they gave to a different world.

Both failures are real. This document draws the line between them.

> ## HARD RULE
> **Never resume a stale payment or order confirmation without a fresh read-back.**
> A confirmation from forty minutes ago is not consent now. Prices move, carts change, restaurants
> close, surge appears. The elder confirmed a *specific state* — if that state is gone, so is the
> confirmation.

This is the same mechanism as `ConfirmationToken.cartRevision` in
`docs/contracts/food-commerce-adapter.ts`, and `ActionConfirmation.boundRevision` in
`docs/contracts/prepared-action.ts`. Resume does not get an exemption from it; resume is precisely
where it earns its keep.

---

## 2. What must be preserved across an interruption

A resume record carries exactly these. Anything not on this list is not resumed.

| Field | Example | Why |
|---|---|---|
| Active task or routine | `PreparedActionId`, or routine occurrence | The thing being done |
| Confirmed fields | "Udupi Cafe", "Home", "one masala dosa" | Never re-ask what they already told you |
| Unanswered question | "which address — Home or your daughter's?" | The one thing still needed |
| Pause reason | `ELDER_ASKED_TO_WAIT` \| `NO_RESPONSE` \| `CHANNEL_DROPPED` \| `INTERRUPTED_BY_HIGHER_PRIORITY` \| `SYSTEM` | Changes how Thuna re-opens |
| Pending provider action | `EXECUTED` with `status: 'UNKNOWN'`, awaiting reconcile | The most dangerous thing to lose |
| Next safe step | `RE_READ_AND_RECONFIRM` \| `ASK_PENDING_QUESTION` \| `RECONCILE_THEN_SPEAK` \| `ABANDON` | Decided when pausing, not when resuming |
| Expiry / invalidation condition | `expiresAt`, `boundRevision` | What makes this record dead |

**Confirmed fields are preserved; the confirmation is not.** Those are different things. Thuna
remembering *what* the elder chose is a kindness. Thuna remembering *that they said yes* and acting
on it later is a liberty.

---

## 3. Pause reasons and how Thuna re-opens

| Reason | Re-opening line |
|---|---|
| Elder said "wait" | *"You were ordering a dosa from Udupi Cafe. Shall we carry on?"* |
| No response / timed out | *"I lost you there. We were sorting out your dosa order — want to pick it up?"* |
| Channel dropped | *"Sorry, we got cut off. Nothing was ordered. Shall we start again?"* |
| Interrupted by something more urgent | *"That's dealt with. Back to your dosa order?"* |
| System error | *"Something went wrong on my side — nothing was ordered. Want to try again?"* |

Two rules for all of them:

1. **Say what state things are actually in.** "Nothing was ordered" is the single most reassuring
   sentence available, and it may only be said when it is true — i.e. never after an `UNKNOWN`
   outcome that has not been reconciled.
2. **Offer, do not resume unilaterally.** Resuming is itself a small action the elder consents to.

---

## 4. The resume decision table

This is the load-bearing part of the document.

| State at pause | Elapsed | Resume behaviour |
|---|---|---|
| `DRAFT` / `VALIDATED` | within TTL | Resume freely. Nothing was promised |
| `DRAFT` / `VALIDATED` | past TTL | Discard; rebuild from confirmed fields; re-validate |
| `PRESENTED_TO_ELDER`, no answer | within TTL | **Re-read authoritative state.** If revision unchanged, re-ask the same question. If changed, re-read the new figures aloud first |
| `PRESENTED_TO_ELDER`, no answer | past TTL | Discard the readback. Fresh read, fresh readback, fresh question |
| `CONFIRMED`, not yet executed | **any elapsed time** | **Never execute on the old confirmation.** Fresh authoritative read → compare revisions → read back → ask again. See §5 |
| `EXECUTED`, `PLACED` / `REJECTED` | any | Report the fact. It already happened; nothing to resume |
| `EXECUTED`, `UNKNOWN` | any | **`RECONCILE_THEN_SPEAK`.** Say nothing definitive until reconciled. Never re-execute |
| `CANCELLED` / `FAILED` | any | Do not resume. Offer to start fresh |

The `CONFIRMED` row is the hard rule from §1. Note it has no "within TTL" escape — even a
five-second-old confirmation is re-checked against the live revision, because the check is cheap and
the failure mode is an elder's money.

---

## 5. Resuming a CONFIRMED action, precisely

```
1. Load the PreparedAction. If now > expiresAt → CANCELLED (EXPIRED). Stop.
2. Re-check the permission grant. If revoked → CANCELLED (PERMISSION_REVOKED). Stop.
3. presentAuthoritativeState() — a real provider read, not cache.
4. Compare fresh revision with confirmation.boundRevision.
     same  → still re-read the total aloud, briefly, and ask again.
     moved → CANCELLED (STATE_DRIFTED). Explain what changed. Build a new draft.
5. Only a NEW ActionConfirmation, bound to the NEW revision, may reach execute().
```

Step 4's "same → still ask again" is deliberate. Even when nothing moved, time passed, and the elder
may simply have changed their mind while answering the door. Re-asking costs one sentence.

**Elder-facing phrasing when the state moved:**

> *"Before we carry on — the total's gone up to a hundred and twenty, from a hundred and five.
> The delivery fee changed. Still want it?"*

Never: *"Your order has been placed as confirmed earlier."*

---

## 6. Interruption by something more urgent

Thuna may interrupt itself — a medicine reminder falls due mid-order. Rules:

1. **Only a routine may interrupt a task.** A task never interrupts another task; it queues.
2. The current `PreparedAction` is paused, not cancelled, and its TTL keeps running.
3. Thuna says what it is doing: *"One second — it's time for your morning tablet."*
4. After the interruption, it offers to resume (§3), never silently continues.
5. An interruption **never** happens between `CONFIRMED` and `execute()`. That window is atomic;
   if the routine falls due there, it waits the few hundred milliseconds.

---

## 7. Expiry and invalidation

Every resumable thing carries a death condition. Nothing is resumable indefinitely.

| Thing | Dies when |
|---|---|
| `ActionConfirmation` | `expiresAt` passes, **or** the bound revision moves, **or** the elder corrects anything |
| `PreparedAction` | its own `expiresAt` passes (suggest 30 min `LOW`/`MEDIUM`, 10 min `HIGH`) |
| Resume record | its `PreparedAction` dies, or 24 hours pass |
| Unanswered question | the resume record dies |
| Pending `UNKNOWN` outcome | **never expires.** It must be reconciled or escalated to a human |

That last row is the exception that proves the rule. Everything else may be quietly forgotten; an
unresolved provider write may not. An elder must never be left not knowing whether food is coming.

**A correction invalidates confirmation.** This is already true in `lib/engine.ts` for in-session
corrections; resume extends it across the interruption. "Actually, plain dosa" kills the old
confirmation and produces a new draft — it does not patch a confirmed action in place.

---

## 8. Implementation notes for Codex

1. The resume record is **derived**, not a second source of truth. Rebuild it from the
   `PreparedAction` plus the session; do not let the two drift.
2. Decide `nextSafeStep` **at pause time**, while the context is known. Deciding at resume time
   invites optimistic reconstruction.
3. Sweep expiry on read (same discipline as `MEMORY_MODEL.md` §12.2). An expired record must be
   unresumable even if a background job never ran.
4. Reconciliation of an `UNKNOWN` outcome should be attempted eagerly on the next interaction of any
   kind, not only when the elder returns to that topic.
5. Never store the full readback text in a resume record beyond the `PreparedAction` — one copy,
   in `ActionConfirmation.readbackText`.
6. Suggested tests:
   - `CONFIRMED` + unchanged revision → still re-asks before executing
   - `CONFIRMED` + moved revision → `STATE_DRIFTED`, new draft, never executes
   - `EXECUTED`/`UNKNOWN` → resume reconciles, never re-executes
   - expired `PreparedAction` cannot be resumed
   - correction during resume invalidates the old confirmation
   - routine interruption cannot land between `CONFIRMED` and `execute()`
   - confirmed *fields* survive an interruption; the *confirmation* does not

---

## Related

- `CROSS_CHANNEL_CONTINUITY.md` — the same problem, across a channel change
- `docs/contracts/prepared-action.ts` — `ActionConfirmation.boundRevision`, `CancellationReason`
- `docs/contracts/channel-adapter.ts` — `hold()` / `resume()`, `SessionState`
- `ROUTINE_ENGINE.md` — silence is not completion; the interrupting side
- `MEMORY_MODEL.md` §8 — correction and supersession
