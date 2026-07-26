# Thuna — Family Request Lifecycle

> Design document. **Changes no production code.**
>
> The six states a request for human help passes through, and the rules that keep it a request
> rather than a task assignment.

---

## 1. The lifecycle

```
REQUESTED → OFFERED → ACCEPTED → SCHEDULED → COMPLETED → ELDER_CONFIRMED
```

Plus two terminal exits available from most states:

```
DECLINED       the helper said no, or did not respond and the elder let it go
WITHDRAWN      the elder changed their mind
```

| State | Who moves it | Meaning |
|---|---|---|
| `REQUESTED` | Elder | The elder has said yes to asking someone. Nothing has been sent. |
| `OFFERED` | Thuna | The message has been delivered to the helper. |
| `ACCEPTED` | Helper | The helper has said they will help. |
| `SCHEDULED` | Helper or elder | A time or arrangement exists. |
| `COMPLETED` | Helper | The helper says they have done it. **Not closed.** |
| `ELDER_CONFIRMED` | **Elder** | The elder says it is actually sorted. **Closed.** |

### The two properties that carry the ethics

**1. `COMPLETED` is a claim; `ELDER_CONFIRMED` is the truth.**

A helper marking something done is a report about the helper, not about the elder's situation. The
plumber may have "come" and not fixed it. Sree may have "sorted the payment" and it may have failed
again. Only the elder can say whether the thing they needed is done.

This is the same discipline as `docs/contracts/notification-adapter.ts` note 4: *a delivery receipt
says a transport accepted a message; it says nothing about whether anyone was helped.* Here:
`COMPLETED` says a helper reported an action; it says nothing about whether the elder's problem
went away.

**2. Only the elder may reach `ELDER_CONFIRMED`.** Not the helper. Not a timeout. Not Thuna
inferring from an absence of further complaint. There is no auto-close.

> **Why no auto-close.** A loop that closes itself is a loop that can close *wrongly*, and the failure
> mode is the elder's actual problem silently disappearing from Thuna's attention. Better an open
> loop Thuna mentions once (§5) than a clean-looking record and an unfixed geyser.

---

## 2. `REQUESTED` — the elder says yes

Entered only from an elder's explicit yes, in the moment. Never from a threshold, a schedule, or a
model's judgement that help would be good.

Preconditions, all required:

1. The elder said yes to a specific offer (`HUMAN_ATTENTION_BRIDGE.md` §4).
2. A named person, in scope for the needed role (`CIRCLE_OF_TRUST.md` §7).
3. Thuna has stated exactly what it will say, and the elder has heard it
   (`MINIMUM_DISCLOSURE_POLICY.md` §3).

```
FamilyRequest {
  requestId
  role              CIRCLE_OF_TRUST.md §2
  recipientId       RecipientId — the one person asked
  disclosure        the exact text that will be sent — §3
  state             REQUESTED | OFFERED | ...
  requestedAt
  history[]         { state, at, movedBy }
  elderVisible      always true — §6
}
```

Stored as a `pending_loop` record (`COMPANION_MEMORY_SCHEMA.md` §3.4). The `pending_loop` lifecycle
and state machine are defined in `PENDING_LOOPS.md`; this document defines the *request* lifecycle
that occupies it.

### Withdrawal is available from here on

At any state before `ELDER_CONFIRMED`, the elder may say *"never mind"*, and the loop moves to
`WITHDRAWN` immediately. Thuna tells the helper only if a message already went out, and says the
minimum:

> "Appa says it's sorted, no need — thank you."

No explanation is given, because no explanation is owed and because an explanation would disclose
more than the original request did.

---

## 3. `OFFERED` — the message goes

The request becomes a `NotificationPayload` and passes through `send()` in
`docs/contracts/notification-adapter.ts`. **No new send path.**

| Field | Value |
|---|---|
| `category` | `HANDOFF_REQUESTED` or `ELDER_REQUESTED_HELP` |
| `summary` | The minimal disclosure — `MINIMUM_DISCLOSURE_POLICY.md` |
| `detail` | Usually absent. Present only when the elder supplied it. |
| `elderInitiated` | `true` |
| `referenceId` | `requestId` |

The consent gate still applies. `elderInitiated: true` may relax frequency limits; it never relaxes
the consent check itself (contract, `NotificationPayload` docstring).

Transition to `OFFERED` on `{ ok: true }`. On `{ ok: false, blocked: true }`, the request does **not**
advance and Thuna tells the elder plainly why:

> "I can't message Rajan — I don't have your permission to contact him. Would you like to allow it?"

A blocked send is a normal outcome, not an error to route around (`FAMILY_CONSENT_POLICY.md` §11.2).

### Delivery is not acceptance

`delivered: true` moves nothing beyond `OFFERED`. Thuna reports it honestly:

> "The message has gone to Sree. I don't know yet whether he's seen it."

---

## 4. `ACCEPTED` and `SCHEDULED`

`ACCEPTED` — the helper has indicated they will help. In the console/demo adapter this is simulated;
in any real channel it is an explicit reply, never inferred from a read receipt.

`SCHEDULED` — an arrangement exists: a time, a visit, a callback. May be entered by either side.
Thuna's only job is to tell the elder and, if the elder wants, set a reminder.

> "Sree says he'll call around seven. Would you like me to remind you a bit before?"

A reminder created here is a normal `routine` record and follows `ROUTINE_ENGINE.md`. It is
elder-approved like any other; the request does not get to create routines by itself.

### What Thuna does not do in these states

- Chase the helper for a time
- Ask the helper to confirm
- Track whether the helper is late
- Report the helper's responsiveness to anyone, ever, including the elder
- Store anything about the helper's behaviour across requests

That last one is a hard rule. **Thuna does not build a reliability profile of family members.**
Counting how often Sree replies produces a number that would eventually get used, and the use would
be a judgement about a person who never consented to being measured. It also, quietly, sorts the
elder's family into good and bad children — which is not Thuna's to do.

---

## 5. `COMPLETED` — the claim, and the one follow-up

A helper reporting completion moves the request to `COMPLETED` and triggers exactly one thing: Thuna
tells the elder, and asks.

> "Sree says the payment's gone through. Is it sorted from your side?"

- **Yes** → `ELDER_CONFIRMED`. Loop closes.
- **No / not really** → the loop stays open. Thuna offers the next step, which is usually asking the
  same person again:
  > "Shall I let Sree know it's still not working?"
- **No answer** → the loop stays open, silently. Silence is a valid choice
  (`COMPANION_PRODUCT_MODEL.md` §5.5) and is never escalated.

### Following up on an open loop

If a loop has been open with no movement for longer than expected, Thuna mentions it **once**:

> "You asked Sree about the tap on Tuesday — has that been sorted?"

Then:

- If the elder says leave it → the loop stays open and Thuna does not raise it again.
- If the elder says forget it → `WITHDRAWN`, and the loop is deleted.
- If the elder wants to chase → back to `REQUESTED`, with a fresh offer and a fresh yes.

**One follow-up per loop, not per period.** A second unprompted mention makes the non-reply into a
grievance Thuna manufactured by naming it twice (`HUMAN_ATTENTION_BRIDGE.md` §5).

### Never widen the circle

If the helper does not come through, Thuna does **not** propose someone else unprompted. The elder
chose that person; choosing a different one is a social decision belonging to the elder. If the elder
asks *"can you ask Meera instead?"*, that is a new request with its own yes.

---

## 6. Visibility — all one way

**Every state change is visible to the elder. No state advances silently.**

The elder may ask at any time:

> "What have you asked people for?"

and receive a complete, plainly-spoken answer:

> "You asked Sree about the payment on Monday — he said he'd call, and he hasn't yet. And Rajan came
>  about the tap on Wednesday; you said that was sorted."

### Helpers see almost nothing

A helper sees:

- The single disclosure message sent to them
- Anything the elder subsequently says to them directly (which is not Thuna's business)

A helper does **not** see:

- The request history
- Other requests, to them or to anyone
- Whether anyone else was asked
- The elder's memory, routines, capability records, or anything else
- Whether the elder confirmed completion

There is **no helper-facing read API**. Not permissioned — absent. This mirrors the story-loop
boundary in `FAMILY_STORY_LOOPS.md` §6: family can respond to what was shared with them; they
cannot browse.

> **Why helpers are not told the loop closed.** It seems harmless and even courteous. But "Appa
> confirmed it's sorted" is a status report about the elder generated without a grant, and it
> establishes a channel that carries elder-state information back to family as a matter of course.
> If the elder wants to say thank you, the elder says thank you.

---

## 7. State table

| From | To | Trigger | Notes |
|---|---|---|---|
| — | `REQUESTED` | Elder says yes to an offer | Only path in |
| `REQUESTED` | `OFFERED` | `send()` returns `ok: true` | Blocked send does not advance |
| `REQUESTED` | `WITHDRAWN` | Elder changes mind | Nothing was sent |
| `OFFERED` | `ACCEPTED` | Helper replies affirmatively | Never inferred from delivery |
| `OFFERED` | `DECLINED` | Helper declines, or elder lets it go | |
| `OFFERED` | `WITHDRAWN` | Elder changes mind | Helper told minimally |
| `ACCEPTED` | `SCHEDULED` | A time or arrangement exists | Optional state |
| `ACCEPTED` | `COMPLETED` | Helper reports done | `SCHEDULED` may be skipped |
| `SCHEDULED` | `COMPLETED` | Helper reports done | |
| `SCHEDULED` | `WITHDRAWN` | Elder changes mind | |
| `COMPLETED` | `ELDER_CONFIRMED` | **Elder confirms** | Only path to close |
| `COMPLETED` | `REQUESTED` | Elder says not sorted, chase again | New yes required |
| Any open | `WITHDRAWN` | Elder says forget it | Immediate; record deleted |

**No timeout transition appears in this table.** Nothing advances or closes because time passed.

---

## 8. Elder-facing phrasing

**Asking for the yes:**

> "Shall I ask Sree? I'd say you'd like a hand with a payment — nothing more."

**Confirming it went:**

> "That's gone to Sree. I'll tell you when he replies."

**Reporting acceptance:**

> "Sree says he'll help. He'll call this evening."

**Reporting a schedule:**

> "Rajan says he'll come tomorrow morning. Shall I remind you?"

**The completion check:**

> "Sree says it's done. Is it sorted from where you're sitting?"

**Elder says no:**

> "Alright, it's still open then. Shall I tell Sree it's not working yet?"

**The one follow-up:**

> "You asked Rajan about the tap on Wednesday. Has that been done?"

**Elder says leave it:**

> "Fine. I'll leave it be."

**Withdrawal:**

> "I'll tell him no need. Nothing else."

**Reading back open loops:**

> "Two things are still open: the payment with Sree, and the tap with Rajan."

---

## 9. Implementation notes for Codex

1. **The request is a `pending_loop` record.** Envelope per `COMPANION_MEMORY_SCHEMA.md` §2; loop
   lifecycle per `PENDING_LOOPS.md`. This document supplies the request-specific state machine that
   rides inside it.
2. **No timeout transitions.** Implement the follow-up as a *prompt to the elder*, not a state
   change. The scheduler may surface a loop; only an elder utterance may move it.
3. **`ELDER_CONFIRMED` requires an elder utterance.** No API path, no admin path, no helper path
   reaches this state. Assert it in the transition function.
4. **Reuse `send()`.** No new outbound path for help requests. Category is
   `HANDOFF_REQUESTED` / `ELDER_REQUESTED_HELP`, `elderInitiated: true`.
5. **Store `disclosure` verbatim** — the exact text sent — so the elder's read-back can quote it
   rather than reconstruct it. Reconstruction drifts; drift here is a broken promise.
6. **Do not aggregate across requests.** No per-helper counters, no response-rate fields, no
   "usually replies quickly". §4.
7. **`WITHDRAWN` deletes the record**, per `MEMORY_MODEL.md` §6 — explicit forgetting is immediate
   and total.
8. Test: helper cannot reach `ELDER_CONFIRMED`; blocked send does not advance state; no state
   transition fires on a timer; withdrawal deletes; no helper-facing read exists.

---

## Related

- `HUMAN_ATTENTION_BRIDGE.md` — when to reach for a person; escalation as success
- `CIRCLE_OF_TRUST.md` — who may be asked, for what
- `MINIMUM_DISCLOSURE_POLICY.md` — the content of the request
- `PENDING_LOOPS.md` — the underlying loop lifecycle (not defined here)
- `COMPANION_MEMORY_SCHEMA.md` §3.4 — how loops sit in the memory envelope
- `FAMILY_CONSENT_POLICY.md` §8, §11 — elder-initiated sharing; the gate in `send()`
- `docs/contracts/notification-adapter.ts` — `send()`, `NotificationPayload`, `DeliveryReceipt`
