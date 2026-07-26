# Thuna — Proactive Companion Policy

> Design document. **Changes no production code.**
>
> `ROUTINE_ENGINE.md` and `LIFE_EVENTS_ENGINE.md` say *when* Thuna may initiate.
> `CHECKIN_CONVERSATION_POLICY.md` says *what it says once it does*.
>
> This document says **what must be true of a proactive contact before it is allowed to exist at
> all** — the required fields on every check-in, whatever engine produced it.

---

## 1. The purposeful-contact contract

> ## Every proactive contact has exactly one reason, and the elder agreed to that kind of reason.

`COMPANION_PRODUCT_MODEL.md` §7's four tests — agreed, purposeful, timely, stoppable — remain the
gate. This document makes them a **data structure**, so a purposeless contact is unconstructable
rather than merely discouraged.

```
ProactiveContact {
  contactId          string
  reason             ContactReason        // §2 — from a closed list
  reasonSentence     string               // REQUIRED — spoken in the first two sentences
  sourceRef          { kind, id }         // §3 — the record that justifies this contact
  agreedBy           ELDER | ELDER_APPROVED_FAMILY_SUGGESTION
  agreedAt           Date
  expectedResponses  ResponseKind[]       // §4
  stopOption         StopSpec             // §5 — REQUIRED, non-nullable
  snoozeOption       SnoozeSpec           // §6
  quietHoursPolicy   DEFER_NEXT_SLOT | DEFER_TO_MORNING | SKIP   // §7 — no OVERRIDE value exists
  retryPolicy        RetrySpec            // §8
  consentRequired    ConsentRequirement?  // §9 — only when a third party is involved
  handoffOption      HandoffSpec          // §10 — always present
  completionRule     CompletionRule       // §11
  capWeight          number               // §12 — its share of the daily cap
}
```

Every field is required except `consentRequired`. A contact that cannot fill them all does not
happen. This is deliberately stricter than "check four things before initiating": the four tests are
easy to satisfy in a code review and easy to lose in a refactor, whereas a non-nullable
`reasonSentence` and a non-nullable `stopOption` survive both.

---

## 2. The nine legitimate reasons

`ContactReason` is a **closed list**. Adding a reason is a product decision requiring the whole row of
this table to be answerable — not a matter of passing a new string.

| Reason | Source | Example opening |
|---|---|---|
| `CONTINUE_UNFINISHED_TASK` | `PendingLoop` (`RESUME_TASK`) | "We didn't finish setting up the Wi-Fi yesterday." |
| `LIFE_EVENT_REMINDER` | `LifeEvent` reminder occurrence | "Ammini's wedding is tomorrow at the Town Hall." |
| `BILL_DUE` | `LifeEvent` (`BILL`) | "Your electricity bill is due today." |
| `DELIVERY_FOLLOW_UP` | `LifeEvent` (`DELIVERY`) or task | "Your parcel was due yesterday — did it come?" |
| `FAMILY_CALL_REMINDER` | Routine | "You'd asked me to remind you to call Priya on Sundays." |
| `RETURN_FAMILY_ANSWER` | `PendingLoop` (`ASK_SOMEONE`) | "Sree says he'll be there on Sunday." |
| `RESUME_DIGITAL_TASK` | `PendingLoop` + `ResumeContext` | "We got as far as choosing the network." |
| `MEDICINE_REMINDER` | Routine | "It's nine o'clock — time for your morning medicine." |
| `INVITED_SOCIAL_CONVERSATION` | Elder's standing invitation | "You'd asked me to say hello on Sunday evenings." |

### What is not on the list

| Not a reason | Why |
|---|---|
| Engagement, re-engagement, "we haven't spoken in a while" | Optimising for engagement is optimising against the elder (`COMPANION_PRODUCT_MODEL.md` §10) |
| A wellbeing check the elder did not ask for | Surveillance framed as care |
| Anything a family member wants to know | Family may suggest; only the elder agrees |
| Feature announcements, tips, upsells | Thuna is not a channel to the elder |
| "You seem quiet lately" | Behavioural inference, prohibited |
| A pending loop, on its own | Loops ride along; they never open a contact (`FOLLOW_UP_ENGINE.md` §3) |

The last row is the subtle one and is worth restating: **a `PendingLoop` is not a `ContactReason`**,
except for `RESUME_TASK`/`ASK_SOMEONE` loops that carry their own agreed trigger — where the elder
specifically asked to be contacted. A vague "sometime" loop never justifies ringing someone.

### `INVITED_SOCIAL_CONVERSATION`

The only purely social reason, and it needs the tightest fence. It requires:

- A **standing invitation** in the elder's own words, with a stated cadence.
- A `reasonSentence` that names the invitation: *"You'd asked me to say hello on Sunday evenings."*
  Never "just checking in!" — a purposeless opening violates §1 and `CHECKIN_CONVERSATION_POLICY.md`
  §4.
- `completionRule: NONE` — a social call is not a task and never becomes `COMPLETED` in the medicine
  sense (`ROUTINE_ENGINE.md` §5).
- The easiest exit of any contact type, offered first.

---

## 3. `sourceRef` — every contact is traceable

```
sourceRef { kind: ROUTINE | LIFE_EVENT | PENDING_LOOP | TASK, id: string }
```

A contact with no source record cannot be constructed. This makes two questions answerable, both of
which matter for review and neither of which is answerable in a system that composes contacts ad hoc:

- *Why did Thuna call at four o'clock on Tuesday?* → follow the `sourceRef`.
- *What did the elder agree to that produced this?* → `agreedBy`/`agreedAt` on the source.

It is also the mechanism for the elder's own question, which must be answerable in the moment:

> **Appa:** "Why are you telling me this?"
>
> **Thuna:** "You photographed the invitation last week and asked me to remind you."

---

## 4. `expectedResponses`

```
ResponseKind = ACKNOWLEDGE | CONFIRM_DONE | ANSWER_ATTENDANCE | ANSWER_QUESTION |
               ACCEPT_OFFER | DECLINE | SNOOZE | STOP | HANDOFF | SILENCE
```

Declaring expected responses is not about constraining the elder — they may say anything. It is
about forcing the designer to answer *"what am I asking this person to do?"* before the contact
exists, and about mapping each response to a **deterministic** transition rather than a model
judgement.

`DECLINE`, `STOP`, `HANDOFF` and `SILENCE` are **always** in the set, for every contact, and are
never listed as failures. A contact that treats declining as an unexpected path will handle it badly.

| Response | Handling (per `CHECKIN_CONVERSATION_POLICY.md` §5) |
|---|---|
| `ACKNOWLEDGE` | Brief close. Do not linger |
| `CONFIRM_DONE` | Through `isConfirmation()`; only this completes anything |
| `DECLINE` | Accept immediately. One neutral offer, then stop. **No re-offer** |
| `SNOOZE` | New time, stated aloud |
| `STOP` | Deterministic path, no model interpretation (`recoveryType()`) |
| `HANDOFF` | Always available |
| `SILENCE` | Short close, then `MISSED`. **Never** completion, consent, or refusal |

---

## 5. `stopOption` — non-nullable

```
StopSpec {
  utterancePatterns   deterministic, from recoveryType()
  scope               THIS_CONTACT | THIS_SOURCE | THIS_KIND | ALL_PROACTIVE
  spokenWithinTurns   1        // the exit is offered in the opening, not at the end
  requiresConfirm     false    // always false — stop is never negotiated
}
```

Rules:

1. **Offered in the first two sentences.** An exit mentioned at the end is not an exit.
2. **Deterministic.** "Stop" is honoured without an LLM call — reuse `recoveryType()` from
   `lib/command-parser.ts`.
3. **Never confirmed.** No "are you sure?". `requiresConfirm` exists in the type only so that a
   reviewer can see it is always false; there is no path that sets it true.
4. **Scope is asked only when genuinely ambiguous**, and in one question:
   *"Just this one, or shall I stop reminding you about the wedding altogether?"*
   If the elder does not engage, take the **narrowest** scope (this contact) — the least destructive
   reading of an ambiguous instruction.
5. `ALL_PROACTIVE` is always reachable in one utterance: *"stop calling me"* → global pause
   (`QUIET_HOURS_AND_FREQUENCY.md` §6), immediately, surviving restart.

---

## 6. `snoozeOption`

```
SnoozeSpec {
  allowed        boolean
  defaultDelay   Duration     // stated aloud when used
  maxCount       number       // suggest 3
  maxUntil       Date?        // may not push past the point of usefulness
  onCapReached   OFFER_CANCEL_OR_RESCHEDULE
}
```

Same rules as `ROUTINE_ENGINE.md` §3, with the life-event addition: a snooze may not push a reminder
past the event it is about. If it would, say so and offer to drop it
(`LIFE_EVENTS_ENGINE.md` §4).

Snoozing is capped because endless snoozing is nagging with extra steps — the elder is being asked
repeatedly and merely gets to choose when. Past the cap, offer to cancel or reschedule properly.

---

## 7. `quietHoursPolicy`

Three values: `DEFER_NEXT_SLOT`, `DEFER_TO_MORNING`, `SKIP`.

**There is no `OVERRIDE` value.** No `ContactReason` — not a bill, not a wedding, not a medicine
reminder — justifies waking an elder. `ROUTINE_ENGINE.md` §4 lists `DUE → ACTIVE` inside quiet hours
as a prohibited transition and this document creates no exception. If something is genuinely urgent
enough to need someone woken, the correct response is a human, not a companion app.

The one legitimate-looking exception is the elder's own request — *"call me after the serial"* at
22:30. That is handled at loop creation by surfacing the conflict and letting the elder decide
(`PENDING_LOOPS.md` §5.3). **The elder may override their own quiet hours; Thuna may not.** The
distinction is preserved by the override being recorded on the source record at agreement time, not
decided by the scheduler at fire time.

A deferred contact always says it is late when it lands (`REMINDER_POLICY_ENGINE.md` §6).

---

## 8. `retryPolicy`

```
RetrySpec {
  maxRetries    number      // 1 for reminders; 0 for social and for aged loops
  delay         Duration    // suggest 10 minutes
  stopIfPast    boolean     // do not retry once the reminder has lost meaning
  quietHours    respected on the retry as strictly as on the first attempt
}
```

Per `ROUTINE_ENGINE.md` §3: **one** retry. Two unanswered attempts is information; five is
harassment.

`stopIfPast` matters for life events: retrying "your bill is due today" at 23:55 has no remaining
utility and reads as pestering. `INVITED_SOCIAL_CONVERSATION` has `maxRetries: 0` — retrying a
social call is the clearest possible signal that the contact serves the system rather than the
person.

---

## 9. `consentRequired`

Only present when a contact involves a third party. `FAMILY_CONSENT_POLICY.md` governs; this field is
the check the contact composer performs.

| Situation | Requirement |
|---|---|
| Contacting family about the elder | Prior consent grant for the category, **or** an elder-initiated request in the moment |
| Relaying a family member's answer to the elder (`RETURN_FAMILY_ANSWER`) | The elder asked; no further consent needed to speak **to the elder** |
| Mentioning a family member by name to the elder | No consent needed — this is the elder's own life |
| Any escalation | Prior consent, as `ROUTINE_ENGINE.md` §3 |

No consent → **no contact with the third party**, and Thuna says so plainly rather than silently not
doing it (`PROMISE_EXTRACTION_POLICY.md` §6). Being told "I can't message Sree" is workable; believing
Sree was asked when he was not is a betrayal.

---

## 10. `handoffOption`

Always present, for every contact, including social ones.

```
HandoffSpec {
  available      true            // always
  triggers       DISTRESS | CONFUSION_PERSISTS | OUT_OF_SCOPE | ELDER_REQUEST
  action         offer to help call a trusted contact — never contacts unilaterally
}
```

Handoff is not a failure path. Per `COMPANION_PRODUCT_MODEL.md` §3, Thuna's best outcome is often
connecting the elder to a human rather than handling it alone.

Rules on the trigger paths:

- **Distress:** do not assess, do not counsel, do not record an inference. Offer help calling
  someone, then stop (`CHECKIN_CONVERSATION_POLICY.md` §5).
- **Persistent confusion:** do not push, do not diagnose. Offer human help and end.
- **Medical or dosage questions:** refused **pre-model**, deterministically, before any LLM call —
  the same path as OTP/PIN/CVV in `quickCheck()`. Then offer handoff.
- **Offering** handoff never contacts anyone. Contacting requires the elder's yes in the moment.

---

## 11. `completionRule`

```
CompletionRule = ACKNOWLEDGED | EXPLICIT_CONFIRMATION | EXTERNAL_VERIFICATION | NONE
```

| Reason | Rule |
|---|---|
| `MEDICINE_REMINDER` | `EXPLICIT_CONFIRMATION` |
| `BILL_DUE` | `EXPLICIT_CONFIRMATION` or `EXTERNAL_VERIFICATION` — **never** silence, never date passing |
| `DELIVERY_FOLLOW_UP` | `EXPLICIT_CONFIRMATION` — carrier status alone never completes |
| `LIFE_EVENT_REMINDER` | `ACKNOWLEDGED` for the occurrence; the event completes per its own rule |
| `FAMILY_CALL_REMINDER` | `EXPLICIT_CONFIRMATION` ("did you get through?") |
| `CONTINUE_UNFINISHED_TASK` / `RESUME_DIGITAL_TASK` | `EXPLICIT_CONFIRMATION` or the task genuinely completing |
| `RETURN_FAMILY_ANSWER` | `ACKNOWLEDGED` — the elder heard the answer |
| `INVITED_SOCIAL_CONVERSATION` | `NONE` — it ends; it is not "done" |

**Silence is never completion**, for any reason, in any engine. Stated in `ROUTINE_ENGINE.md` §1,
`LIFE_EVENTS_ENGINE.md` §5, `REMINDER_POLICY_ENGINE.md` §11, `PENDING_LOOPS.md` §10 and here —
repeated deliberately, because it is the invariant a well-meaning implementation erodes one special
case at a time.

---

## 12. `capWeight` and arbitration

Every contact consumes from the elder's single global daily cap
(`QUIET_HOURS_AND_FREQUENCY.md`). There is no per-engine budget: routines, life events, loops and
social contacts compete in one pool, because the elder experiences one pool.

When contacts collide:

1. **Merge same-slot contacts** into one, up to three spoken items.
2. Then drop by `capWeight`, preferring to drop advance notices over day-of contacts.
3. `INVITED_SOCIAL_CONVERSATION` is dropped before any task-bearing contact — a social call
   displaced by a bill reminder is a reasonable trade; the reverse is not.
4. If the cap still binds, **say so** rather than dropping silently:
   *"There's more than I'd normally mention. Shall I go on?"*

---

## 13. Worked example

`RETURN_FAMILY_ANSWER`, from the wedding scenario in `LIFE_EVENT_DEMO_SCENARIOS.md` §1.5:

```
reason             RETURN_FAMILY_ANSWER
reasonSentence     "You asked me to find out whether Sree is coming to the wedding."
sourceRef          { kind: PENDING_LOOP, id: loop_...}
agreedBy           ELDER
expectedResponses  [ACKNOWLEDGE, ACCEPT_OFFER, DECLINE, STOP, HANDOFF, SILENCE]
stopOption         { scope: THIS_CONTACT, spokenWithinTurns: 1, requiresConfirm: false }
snoozeOption       { allowed: true, defaultDelay: 1h, maxCount: 2 }
quietHoursPolicy   DEFER_TO_MORNING
retryPolicy        { maxRetries: 1, delay: 10m, stopIfPast: false }
consentRequired    none — speaking to the elder about their own question
handoffOption      always
completionRule     ACKNOWLEDGED
capWeight          1
```

Spoken:

> "Hello Appa, it's Thuna. You asked me to find out whether Sree is coming to the wedding — he says
>  he'll be there on Saturday. Say 'stop' any time. Would you like me to tell him anything back?"

Who, why, the answer, the exit, one question. Under thirty seconds.

---

## 14. Implementation notes for Codex

1. `ProactiveContact` should be **non-nullable in the type system** for `reasonSentence`,
   `stopOption` and `sourceRef`. A purposeless or inescapable contact should fail to compile, not
   fail review.
2. `ContactReason` is a closed union. Adding a member should be a visible diff that forces the whole
   §2 table row to be filled in.
3. One composer builds every proactive contact, whatever engine produced it. Quiet hours, caps,
   dedup and consent checks happen there, once. Two composers means two sets of rules and one of them
   will be wrong.
4. `OpenSessionInput.purpose` in `docs/contracts/channel-adapter.ts` is fed from `reasonSentence`.
   Make a purposeless session unconstructable, per `CHECKIN_CONVERSATION_POLICY.md` §10.4.
5. Stop and refusal handling is pre-model. Reuse `recoveryType()` and `isConfirmation()`.
6. Log the composed contact (redacted) with its `sourceRef`. "Why did it call?" must be answerable
   from logs alone.
7. There is no `OVERRIDE` quiet-hours value to implement. If a code path needs one, the design is
   being violated, not extended.

---

## 15. Test cases

1. A contact without `reasonSentence` cannot be constructed
2. A contact without `stopOption` cannot be constructed
3. A contact without `sourceRef` cannot be constructed
4. "Why are you telling me this?" is answerable from `sourceRef`
5. A `PendingLoop` alone never opens a contact
6. `INVITED_SOCIAL_CONVERSATION` requires a standing invitation and never says "just checking in"
7. Stop is honoured pre-model, without confirmation
8. Ambiguous stop scope defaults to the narrowest
9. "Stop calling me" produces a global pause surviving restart
10. No contact fires inside quiet hours, for any reason
11. Elder's own quiet-hours override is recorded at agreement time, not decided at fire time
12. Exactly one retry; social contacts retry zero times
13. Silence never completes, for any `ContactReason`
14. Third-party contact without consent does not happen and is stated
15. Handoff is available on every contact including social
16. Dosage question is refused pre-model, then handoff offered
17. Cap arbitration drops social before task-bearing contacts
18. Cap-bound suppression is announced, not silent

Cases 1–3, 5, 10 and 13 are the ones a naive implementation gets wrong.

---

## Related

- `CHECKIN_CONVERSATION_POLICY.md` — what is said once the contact opens
- `COMPANION_PRODUCT_MODEL.md` §7 — the four tests this operationalises
- `ROUTINE_ENGINE.md` — routine-sourced contacts
- `LIFE_EVENTS_ENGINE.md` / `REMINDER_POLICY_ENGINE.md` — event-sourced contacts
- `PENDING_LOOPS.md` / `FOLLOW_UP_ENGINE.md` — loop-sourced contacts and ride-alongs
- `QUIET_HOURS_AND_FREQUENCY.md` — the cap, pause and quiet-hours settings
- `FAMILY_CONSENT_POLICY.md` — `consentRequired`
- `docs/contracts/channel-adapter.ts` — `purpose`, `consentVerified`, `quietHoursChecked`
