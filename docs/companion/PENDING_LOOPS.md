# Thuna — Pending Loops

> Design document. **Changes no production code.**
>
> This file is the **single definition** of the `PendingLoop` record. Other documents reference it
> and none redefine it.
>
> A pending loop is anything left hanging: *"remind me after dinner"*, *"we'll finish the Wi-Fi
> tomorrow"*, *"ask Sree if he's coming Sunday"*. It is the difference between a companion and a
> command line.

---

## 1. Why loops are their own thing

`MEMORY_MODEL.md` §4 already names pending promises as a distinguished episodic type, with the right
reasoning: *"it is the one thing an elder most notices being dropped."* This document gives that idea
a state machine.

Loops are **not** life events and **not** routines:

| | Routine | Life event | Pending loop |
|---|---|---|---|
| Time | Recurring schedule | Fixed calendar date | Often **relative** or **event-anchored** |
| Origin | Agreed commitment | Extracted from the world | Something said in passing |
| May have no time at all | no | no | **yes** — `OPEN` is a valid resting state |
| Typical lifetime | Months | Until the date | Days |

The distinguishing feature is the third row. *"Ask Sree if he's coming on Sunday"* has no trigger
time until one is worked out, and *"I'll pay the bill after my pension arrives"* has a trigger that
may never happen. Neither of the other two engines has a state for "I owe you this, but I don't yet
know when."

---

## 2. Where `PendingLoop` sits

A `PendingLoop` is stored as a **`MemoryRecord`** — the canonical envelope defined elsewhere in the
memory layer. This document defines only the payload.

The envelope (canonical, **do not redefine**) provides:

```
id, category, source, evidence, confidence, consentScope,
createdAt, updatedAt, expiresAt?, supersededBy?, sharingClass, deletionState
```

Mapping notes:

| Envelope field | For a `PendingLoop` |
|---|---|
| `category` | Episodic — specifically the pending-promise type of `MEMORY_MODEL.md` §4 |
| `source` | `ELDER_SPEECH` \| `THUNA_OFFER` \| `LIFE_EVENT` \| `TASK_INTERRUPTION` \| `FAMILY_ENTRY` |
| `evidence` | The redacted utterance that created it, for honest readback |
| `confidence` | Extraction confidence that this **was** a commitment (§7) |
| `expiresAt` | Loops resolve rather than expire (§9); set only on `CANCELLED`/`COMPLETED` archival |
| `sharingClass` | **`PRIVATE` by default**, always. A promise is not family news |
| `deletionState` | *"Forget that"* is immediate and total |

Per `MEMORY_MODEL.md` §6, pending promises live **until resolved** rather than on the 90-day episodic
clock — but §9 below bounds them, because an unbounded promise list becomes a debt ledger.

---

## 3. The `PendingLoop` payload

```
PendingLoop {
  loopId              string
  kind                LoopKind                 // §4
  description         string                   // the elder's own words, lightly normalised
  originalUtterance   string                   // redacted; for "you said ..."
  trigger             LoopTrigger              // §5 — the whole difficulty of this document
  state               LoopState                // §6
  suggestedBy         ELDER | THUNA | SYSTEM   // SYSTEM = inferred from an interruption
  confirmedAt         Date?                    // REQUIRED before state leaves OPEN via storage (§7)
  resumeContext       ResumeContext?           // §8 — for paused multi-step tasks
  linkedEventId       string?                  // originating LifeEvent, if any
  linkedRoutineId     string?
  linkedTaskId        string?
  involves            PersonRef[]              // people the loop concerns — consent still applies
  surfaceCount        number                   // how many times raised unresolved
  lastSurfacedAt      Date?
  snoozeCount         number
  ageingStage         FRESH | AGEING | STALE | RELEASE_OFFERED   // FOLLOW_UP_ENGINE.md §4
  completion          LoopCompletion?          // §10
  cancelledReason     ELDER_RELEASED | ELDER_REJECTED | ANCHOR_UNREACHABLE |
                      SUPERSEDED | AGED_OUT ?
  history             LoopTransition[]
}
```

Deliberately **absent**: no `importance`, no `nagLevel`, no `likelihoodOfCompletion`, no
`elderReliability` score. Scoring how often someone keeps their promises is behavioural analytics
about a person, prohibited by `MEMORY_MODEL.md` §9, and it is the exact seed of a system that starts
treating an adult as a compliance problem.

---

## 4. `LoopKind`

Kinds are **data**, like life event types, and for the same reason: a new kind must not require an
engine change.

| Kind | Example | Completion |
|---|---|---|
| `REMIND_ME` | "Remind me after dinner" | Elder acknowledges the reminder |
| `RESUME_TASK` | "Continue the Wi-Fi setup tomorrow" | Elder says done, or the task completes |
| `ASK_SOMEONE` | "Ask Sree if he's coming on Sunday" | Answer relayed to the elder |
| `CHECK_STATUS` | "Check whether the parcel arrived" | Elder confirms the status |
| `ELDER_WILL_DO` | "I'll pay the bill after my pension arrives" | **Elder** confirms they did it |
| `CALL_AT_TIME` | "Call me after the serial" | Contact made, or elder cancels |
| `THUNA_PROMISED` | "I'll find out and tell you" | Thuna delivers, or admits it could not |

`ELDER_WILL_DO` and `THUNA_PROMISED` differ in who owes the action, and that changes the phrasing
entirely — *"Did you manage the bill?"* versus *"I said I'd find out, and I haven't yet."* A loop
Thuna owes and has not honoured must be admitted, not quietly dropped.

`ASK_SOMEONE` requires consent to contact the person before it can be scheduled at all
(`FAMILY_CONSENT_POLICY.md`). Without consent it is offered as *"I can't message Sree, but I can
remind you to ask him"* — converting an `ASK_SOMEONE` into a `REMIND_ME`.

---

## 5. `LoopTrigger` — the hard part

```
LoopTrigger =
  | { kind: NONE }                                       // no time yet; OPEN is valid
  | { kind: ABSOLUTE, at: Date }                         // "at six"
  | { kind: RELATIVE_TO_NOW, after: Duration }           // "in an hour"
  | { kind: NEXT_SLOT, slot: MORNING|MIDDAY|EVENING }    // "tomorrow"
  | { kind: ROUTINE_ANCHOR, anchor: RoutineAnchor,       // "after dinner"
      offset: Duration, fallbackAt: Time }
  | { kind: EVENT_ANCHOR, anchorDescription: string,     // "after my pension arrives"
      detection: DetectionMode, expiryPolicy: AnchorExpiry }
  | { kind: EXTERNAL_ANCHOR, anchorDescription: string,  // "after the serial"
      estimatedAt: Time, confidence: number }
```

The last three carry all the difficulty and each gets a subsection.

### 5.1 `ROUTINE_ANCHOR` — "after dinner"

Anchors to a **habitual time the elder has already told Thuna about**, held in profile memory as
plain preferences (`MEMORY_MODEL.md` §2) — not as observed behaviour.

**Thuna does not learn dinner time by watching.** Inferring habits from interaction patterns is
behavioural analytics (`MEMORY_MODEL.md` §9). If the elder has not said when they eat, Thuna asks
once:

> "About what time do you usually finish dinner?"
>
> — or, if they would rather not say: "I'll say half past eight, then. Tell me if that's wrong."

Resolution:

1. If a stated dinner time exists → `resolvedAt = dinnerTime + offset`.
2. Else use `fallbackAt`, and **say the resolved time aloud** so the elder can correct it:
   *"I'll remind you at half past eight, after your dinner."*
3. Never resolve silently. An unstated resolution is a surprise later.

### 5.2 `EVENT_ANCHOR` — "after my pension arrives"

The anchor is a **real-world occurrence Thuna cannot observe**. This is the case most likely to be
mishandled, because the tempting implementations are all wrong.

```
DetectionMode  = ELDER_TELLS_ME | ASK_PERIODICALLY | PROVIDER_VERIFIED
AnchorExpiry   = { checkAfter: Duration, maxWaits: number, onExpiry: ASK_ELDER | RELEASE }
```

Rules:

1. **Default detection is `ELDER_TELLS_ME`.** Thuna waits. The loop rests in `OPEN`.
2. `ASK_PERIODICALLY` requires the elder's agreement **at creation**, with the cadence stated:
   *"Shall I ask you at the start of each month whether it's come?"* Unagreed periodic asking is
   nagging by design.
3. **`PROVIDER_VERIFIED` is not available for financial anchors.** Thuna does not check anyone's
   bank account. A pension arriving is not observable to a companion, and building a path that
   pretends otherwise would require exactly the account access the product refuses.
4. **The anchor may never occur.** This must be handled explicitly — see §5.4. A loop that waits
   forever for a pension that was cancelled is a quiet failure the elder never learns about.
5. **Never infer the anchor from an adjacent signal.** "He mentioned shopping, so the pension must
   have arrived" is inference dressed as helpfulness, and it produces a reminder that reads as
   surveillance.

### 5.3 `EXTERNAL_ANCHOR` — "after the serial"

An anchor with a **socially known but system-unknown** time. Thuna does not know when the serial
ends, and should not go and find out — that would mean modelling the elder's viewing.

Resolution: **ask, then store what the elder says**, as a preference, not an observation.

> "What time does it finish?"
>
> **Appa:** "Half past nine."
>
> **Thuna:** "I'll call you at half past nine, then."

Stored as an `ABSOLUTE`/`NEXT_SLOT` trigger with `anchorDescription: "after the serial"` retained for
phrasing, so the reminder can say *"you asked me to call after the serial"* — which is what makes it
feel remembered rather than scheduled.

If the elder does not know or does not answer, fall back to a stated time and say so. Never guess a
television schedule.

**Quiet hours still apply.** *"Call me after the serial"* at 22:30 with quiet hours from 21:00 is a
conflict, and Thuna surfaces it rather than resolving it silently:

> "That's inside the hours you asked me not to disturb you. Shall I call anyway, just this once, or
>  wait until the morning?"

The elder may override their own quiet hours for their own request. Thuna may not.

### 5.4 When the anchor never occurs

Every anchored trigger carries an `expiryPolicy`. Without one, loops accumulate silently — the
failure mode being avoided is a companion holding twenty invisible unfulfilled promises.

| Setting | Meaning |
|---|---|
| `checkAfter` | How long to wait before raising the anchor's absence at all |
| `maxWaits` | How many times the anchor may be asked about |
| `onExpiry` | `ASK_ELDER` (default) or `RELEASE` |

`ASK_ELDER` phrasing — about the **loop**, never about the elder's finances or circumstances:

> "You mentioned the electricity bill, for after your pension. Would you like me to keep it on the
>  list, or leave it?"

Note what is not asked: *"has your pension arrived?"* is a question about someone's money that Thuna
has no business pressing. The loop is the subject; the anchor is not.

On `RELEASE` → `CANCELLED`, `cancelledReason: ANCHOR_UNREACHABLE`, and the elder is **told**:

> "I've taken the bill off the list — you can put it back any time."

Silent release is the same failure as silent retention. Both leave the elder with a wrong picture of
what Thuna is holding.

---

## 6. `LoopState`

```
OPEN ──► SCHEDULED ──► DUE ──► ACTIVE ──┬──► COMPLETED
 │           ▲                  │       ├──► SNOOZED ──► DUE
 │           │                  │       ├──► CANCELLED
 │           └──────────────────┘       └──► ESCALATED*
 └──► CANCELLED
```

\* `ESCALATED` exists for parity with `ROUTINE_ENGINE.md` and is consent-gated. In practice no loop
kind enables it: an unfulfilled personal promise is not a welfare signal, and reporting one to family
is precisely the surveillance the product refuses.

| State | Meaning | Elder-visible |
|---|---|---|
| `OPEN` | Committed to, but no resolvable trigger yet | "On the list" |
| `SCHEDULED` | Trigger resolved to a concrete time | "I'll bring it up after dinner" |
| `DUE` | Trigger time reached | transient |
| `ACTIVE` | Thuna is raising it now | "In progress" |
| `SNOOZED` | Elder asked for later; new time set and stated | "Later this evening" |
| `COMPLETED` | Resolved per §10 — **never inferred** | "Done" |
| `CANCELLED` | Released, rejected, aged out, or anchor unreachable | "Taken off the list" |
| `ESCALATED` | Consent-gated; effectively unused | — |

**`OPEN` is a healthy resting state, not a backlog item.** This is the design decision that keeps
loops from becoming a to-do list that nags. A loop with no trigger sits quietly and surfaces only
when there is a natural moment (`FOLLOW_UP_ENGINE.md` §3) or the elder asks *"what was I supposed to
do?"*

Note there is no `MISSED` state. A loop that goes unanswered returns to `SCHEDULED` or `OPEN` and
ages (`FOLLOW_UP_ENGINE.md` §4). `MISSED` in the routine engine means "we do not know what happened
to a commitment we made together"; a passing promise does not deserve that weight, and marking one
`MISSED` would push it toward exactly the escalation machinery it must never reach.

---

## 7. Confirmation before storage

> **A model may suggest a loop. Only the elder creates one.**

Thuna will hear things that *sound* like commitments and are not: *"I should really call Priya
sometime"*, *"the tap needs fixing"*, thinking aloud. Storing these produces a companion that keeps
score of everything an elder idly said — which is unsettling in exactly the way `MEMORY_MODEL.md` §1
uses as its test.

So every suggested loop is confirmed, in one short question, at the moment it arises:

| Elder said | Thuna asks |
|---|---|
| "Remind me after dinner." | "About the tablets? I'll say something after dinner, around half past eight." |
| "Continue the Wi-Fi setup tomorrow." | "Shall I bring up the Wi-Fi again tomorrow morning?" |
| "Ask Sree if he's coming on Sunday." | "I'll message Sree and ask about Sunday. Alright?" |
| "Check whether the parcel arrived." | "Shall I ask you tomorrow evening whether it came?" |
| "I'll pay the bill after my pension arrives." | "Shall I keep that on the list until you tell me it's come?" |
| "Call me after the serial." | "What time does it finish? I'll call you then." |

Rules:

1. `confirmedAt` must be set before the loop leaves `OPEN` toward `SCHEDULED`. Reuse
   `isConfirmation()` — not a second, looser parser.
2. The confirmation **states the resolved trigger**, so a wrong resolution is caught immediately
   rather than at the surprising moment it fires.
3. `suggestedBy: SYSTEM` loops — inferred from an interrupted task — need the same yes, phrased as
   an offer: *"We didn't finish the Wi-Fi. Shall I bring it up tomorrow?"*
4. **Declining is free and final.** No re-offer, no "are you sure", and the declined loop is not
   retained as a near-miss.
5. Where a loop touches another person (`ASK_SOMEONE`), confirmation covers **both** the loop and
   the contact. Agreeing to remember is not agreeing to message someone.

---

## 8. `ResumeContext`

For `RESUME_TASK` loops — the Wi-Fi setup, a half-finished order — so resuming does not mean
restarting.

```
ResumeContext {
  taskType         string          // the governed skill involved
  stepReached      string          // named step, not an index
  stepLabel        string          // elder-facing: "choosing the network"
  decisionsMade    KeyValue[]      // what the elder already chose; never re-asked
  blockedOn        string?         // "needs the password from the router"
  expiresAt        Date            // §9 — context is more perishable than the loop
  providerRefs     string[]        // opaque handles only — MEMORY_MODEL.md §7
}
```

Rules:

- **Never persist provider PII** in resume context: no address text, no cart contents, no
  coordinates. Handles only, re-fetched on resume. The DPDP boundary does not soften because a task
  was interrupted.
- **Never persist credentials.** A Wi-Fi password is not stored, ever. `blockedOn` records that the
  password is needed, not what it is.
- Resume context **expires before the loop does** (suggest 48 hours). A stale step reference is worse
  than none: it produces confident resumption into a screen state that no longer exists. On expiry
  the loop survives and restarts cleanly: *"We were setting up the Wi-Fi — shall we start that
  again?"*
- On resume, Thuna **states where things stood** before asking anything:
  *"We got as far as choosing the network. Shall we carry on from there?"*

---

## 9. Bounds

`MEMORY_MODEL.md` §6 says pending promises live until resolved. That must be bounded in practice, or
the loop list becomes a ledger of things an elder has not done — which no one should be handed.

| Bound | Value | Why |
|---|---|---|
| Max active loops surfaced per contact | **1** | Loops are secondary to whatever prompted contact |
| Max loops mentioned in a "what's outstanding" answer | **3**, then "and a few others" | `CHECKIN_CONVERSATION_POLICY.md` §6 |
| `surfaceCount` before release is offered | **3** | `FOLLOW_UP_ENGINE.md` §4 |
| Ageing to `STALE` | **14 days** unresolved | |
| `RELEASE_OFFERED` → auto-release | **30 days** further, with notice | |
| Resume context | **48 hours** | Stale steps mislead |
| Archived (`COMPLETED`/`CANCELLED`) | **90 days**, matching episodic outcomes | |

Auto-release is always **announced**, never silent. The elder must be able to trust that the list
they think Thuna holds is the list Thuna holds.

---

## 10. `LoopCompletion`

```
LoopCompletion {
  completedAt   Date
  method        ELDER_CONFIRMED | ELDER_RELEASED | THUNA_DELIVERED | TASK_COMPLETED
  utterance     string?     // redacted
}
```

| Method | Valid for |
|---|---|
| `ELDER_CONFIRMED` | Elder says it is done |
| `ELDER_RELEASED` | Elder says to drop it — closed, **not** claimed done |
| `THUNA_DELIVERED` | `THUNA_PROMISED` / `ASK_SOMEONE` where Thuna did the thing and told the elder |
| `TASK_COMPLETED` | `RESUME_TASK` where the underlying governed task genuinely completed |

There is no `INFERRED`, no `TIMED_OUT`, and no `ASSUMED`. **Silence never completes a loop** — the
same invariant as `ROUTINE_ENGINE.md` §1 and `LIFE_EVENTS_ENGINE.md` §5, applied here because a loop
is the easiest place to quietly let it slide.

`THUNA_DELIVERED` requires that the elder was actually **told**. Asking Sree and receiving an answer
does not complete the loop; relaying the answer does.

---

## 11. Implementation notes for Codex

1. `LoopKind` and the trigger resolvers belong in a registry, like life event types. Adding
   `CHECK_STATUS` should not touch the reducer.
2. Trigger resolution is a pure function `resolve(trigger, profile, now) → { at, stated }`, where
   `stated` is the sentence to speak. If a resolver cannot produce a sentence, it must not resolve —
   that is how §5's "never resolve silently" gets enforced structurally.
3. `EVENT_ANCHOR` loops need a sweep that checks `expiryPolicy` on read; do not rely on a background
   job in a demo.
4. Never write dinner time, serial time, or pension timing from **observation**. Only from an
   explicit statement. A code review should be able to find the one write path and confirm it is
   fed by speech.
5. Store `originalUtterance` redacted. It exists so Thuna can say *"you said you'd pay it after your
   pension"* — which is far more trustworthy than a paraphrase.
6. Keep loops in elder-owned memory, never the provider store.
7. `sharingClass` defaults to `PRIVATE` and there is no code path that raises it automatically. An
   `ASK_SOMEONE` loop shares *the question*, under consent — never the loop record.

---

## 12. Test cases

1. A suggested loop is not stored without confirmation
2. Thinking aloud ("I should call Priya sometime") does not create a loop unprompted
3. "Remind me after dinner" resolves and **states** the resolved time
4. No stated dinner time → asks once, then uses a stated fallback aloud
5. Dinner time is never written from observed interaction timing
6. "After my pension arrives" rests in `OPEN`; no periodic asking without agreement
7. Anchor expiry asks about the **loop**, never about the elder's finances
8. Auto-release is announced, never silent
9. "Call me after the serial" inside quiet hours surfaces the conflict, does not resolve it silently
10. Silence never completes a loop
11. `ELDER_RELEASED` closes without claiming the thing was done
12. `THUNA_DELIVERED` requires the elder to have been told
13. `ASK_SOMEONE` without consent converts to `REMIND_ME`, and says so
14. Resume context expires before the loop; the loop survives and restarts cleanly
15. Wi-Fi password is never stored in resume context
16. At most one loop is surfaced per contact
17. `surfaceCount` of 3 triggers a release offer, not a fourth ask
18. Every transition appends a record

Cases 2, 5, 6, 8 and 10 are the ones a naive implementation gets wrong.

---

## Related

- `PROMISE_EXTRACTION_POLICY.md` — how utterances become loop candidates
- `FOLLOW_UP_ENGINE.md` — surfacing, ageing, and abandonment with dignity
- `CONVERSATION_CONTINUITY.md` — resume context across sessions
- `MEMORY_MODEL.md` §4, §6 — pending promises, lifetimes
- `ROUTINE_ENGINE.md` — the state vocabulary this reuses
- `LIFE_EVENT_SCHEMA.md` — `linkedLoopIds`
- `QUIET_HOURS_AND_FREQUENCY.md` — caps that loops share with everything else
