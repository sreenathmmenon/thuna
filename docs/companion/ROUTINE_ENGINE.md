# Thuna — Routine Engine

> Design document for Codex Workstream C. **Changes no production code.**
>
> The routine engine is the deterministic state machine behind proactive check-ins.
> It follows the same architecture as `lib/engine.ts`: **pure transitions, explicit
> confirmation, and the model never mutates state.**

---

## 1. The one rule that shapes everything

> ## Silence is not completion.

An unanswered reminder means Thuna does not know what happened. It does not mean the medicine was
taken, and it does not mean it was refused. This is the routine-layer expression of an invariant the
task engine already enforces — `isConfirmation()` treats silence and vagueness as *not* a yes.

Two failure modes it prevents:

- Marking a routine COMPLETED because it was *delivered* → a false record of care that a family
  might rely on.
- Escalating on first silence → an elder who stepped into the next room gets their family alarmed.

`MISSED` exists precisely to name "we don't know", and it is a genuine third state, not a failure.

---

## 2. States

```
SCHEDULED ──► DUE ──► ACTIVE ──┬──► COMPLETED
    ▲                  │       ├──► SNOOZED ──► DUE
    │                  │       ├──► CANCELLED
    │                  │       └──► MISSED ──┬──► DUE  (retry once)
    └──────────────────┘                     └──► ESCALATED (consent required)
```

| State | Meaning | Elder-visible |
|---|---|---|
| `SCHEDULED` | Agreed; trigger time in the future | "Next: morning medicine, 9am" |
| `DUE` | Trigger time reached; not yet started | transient |
| `ACTIVE` | Check-in in progress; Thuna is talking | "Reminder in progress" |
| `SNOOZED` | Elder asked for later; new trigger set | "Snoozed until 9:15" |
| `COMPLETED` | **Elder explicitly confirmed** | "Done at 9:02" |
| `MISSED` | No response, or response inconclusive | "No answer at 9:00" |
| `ESCALATED` | Family notified — **only with prior consent** | "Sree was told" |
| `CANCELLED` | Elder cancelled the routine or occurrence | "Cancelled" |

---

## 3. Transitions

### `SCHEDULED → DUE`
Automatic at trigger time. Must check quiet hours first — a `DUE` inside quiet hours **defers**
rather than firing (§7).

### `DUE → ACTIVE`
Channel session opens. Requires `consentVerified` and `quietHoursChecked` (see
`docs/contracts/channel-adapter.ts`).

### `ACTIVE → COMPLETED`
**Only on explicit confirmation.** Reuse `isConfirmation()` from `lib/command-parser.ts` — the same
function that guards order placement. Do not write a second, looser confirmation parser.

Never completes on: silence, "hmm", "wait", "later", a hang-up, or delivery success.

### `ACTIVE → SNOOZED`
Elder asks for later. Parse a duration if given ("ten minutes"); otherwise use a default
(10 minutes) and **state it aloud**: *"I'll remind you at quarter past nine."*

Bounded: a maximum snooze count per occurrence (suggest 3), after which Thuna offers to cancel or
reschedule instead of looping. Endless snoozing is nagging with extra steps.

### `ACTIVE → MISSED`
No response within the listen window, or the session ended without confirmation.
`humanResponded: false` from the channel is the signal. **Not a failure of the elder.**

### `MISSED → DUE` (retry)
**One** retry, after a delay (suggest 10 minutes). Per the orchestration doc: "Retry once after no
response." Two unanswered attempts is information; five is harassment.

### `MISSED → ESCALATED`
Only when **all** hold:
1. The retry was also unanswered.
2. The elder previously granted `ROUTINE_MISSED` consent for this recipient.
3. The routine is one the elder marked as escalation-worthy.

**No consent → no escalation.** The routine stays `MISSED`. Thuna does not decide unilaterally that
a family should be told.

### `→ CANCELLED`
Always available, always immediate. "Stop", "cancel this", "I don't need this reminder" — honoured
at once, without argument or a "are you sure?" gauntlet.

---

## 4. Prohibited transitions

Encode these as assertions; they are the bugs that would matter.

| Forbidden | Why |
|---|---|
| `ACTIVE → COMPLETED` on silence | Silence is not completion |
| `ACTIVE → COMPLETED` on delivery receipt | Delivery ≠ human response |
| `ACTIVE → COMPLETED` by model output | The LLM may never complete a routine |
| `MISSED → ESCALATED` without consent | Surveillance |
| `MISSED → COMPLETED` | Cannot infer success from absence |
| `DUE → ACTIVE` inside quiet hours | Waking an elder is a real harm |
| Any `→ COMPLETED` without an event record | Every transition is auditable |

---

## 5. Routine types

| Type | Confirmation asks | Escalation default | Notes |
|---|---|---|---|
| `MEDICINE_REMINDER` | "Have you taken it?" | Consent-gated | **Reminder only** — §6 |
| `WATER_REMINDER` | "Had some water?" | Never | Low stakes; easily becomes nagging |
| `BILL_REMINDER` | "Shall I remind you again tomorrow?" | Never | Never pays anything |
| `FAMILY_CALL_REMINDER` | "Did you get through?" | Never | Often the most valued |
| `DELIVERY_FOLLOW_UP` | "Did your order arrive?" | Never | Bridges task → routine |
| `GENERAL_CHECK_IN` | *(no completion semantics)* | Never | Purpose + stop option mandatory |

`GENERAL_CHECK_IN` has no COMPLETED state in the medicine sense — a social call is not a task. It
ends; it is not "done".

---

## 6. Medicine safety

The strictest constraints in the product. From `AGENTS.md` and the orchestration doc:

**Thuna may:**
- Remind that it is time for a medicine the elder themselves described
- Use the elder's own words ("your morning tablet")
- Record that the elder said they took it
- Offer to contact a family member **on request**

**Thuna must never:**
- State or suggest a **dosage**
- Advise taking more, less, or double after a missed dose
- Change a medicine schedule on its own
- Diagnose, interpret symptoms, or comment on side effects
- Advise on interactions
- Infer health state from response patterns

### Required refusals

> "Should I take two since I missed yesterday?"
> → *"I can't advise on doses — I'm only a reminder. Please check with your doctor or pharmacist.
> Would you like me to help you call someone?"*

> "What is this tablet for?"
> → *"I don't know what your medicines do, and I shouldn't guess. Your doctor or pharmacist can
> tell you properly."*

Route these through the same pre-model refusal path as OTP/PIN/CVV: **deterministic, before any LLM
call.** An LLM asked about dosage will produce a plausible answer, and plausible is exactly the
danger. `quickCheck()` in `lib/router.ts` is the right place and the right pattern.

**Uncertainty pauses.** If Thuna cannot tell whether the elder is confused or in difficulty, it does
not diagnose — it offers human help.

---

## 7. Frequency, quiet hours, and control

**The elder controls the schedule. Always.**

- Quiet hours are elder-set (default suggestion 21:00–07:00). A `DUE` inside them **defers to the
  next allowed slot**, or is skipped for routines that lose meaning when late.
- A daily reminder cap is elder-set.
- "Stop reminding me about this" cancels immediately.
- "Remind me less often" adjusts frequency without needing a settings screen.
- Family may **suggest** a routine; only the elder approves it (`createdBy` in `MEMORY_MODEL.md` §3).

Escape hatch: a **global pause** ("no reminders today") that survives restart and is easy to lift.

---

## 8. Demo clock

Per the orchestration doc: "Accelerated demo clock: minutes may map to seconds in demo mode."

- A demo `MEDICINE_REMINDER` fires after ~10 seconds.
- Snooze compresses similarly.
- The **acceleration is the only difference**. State machine, confirmation rules and consent checks
  are identical — never a separate demo path, or the demo stops proving anything.
- The Demo Inspector shows the real vs accelerated mapping.

---

## 9. Architecture

Mirror `lib/engine.ts` exactly:

1. **Pure transition function.** `(routine, event, now) → { nextState, events }`. No mutation, no I/O.
2. **A single mutator**, like `lib/session-store.ts`.
3. **Model proposes; engine decides.** Parsing "remind me in ten minutes" is the model's job; setting
   `SNOOZED` is the engine's. Per AGENTS.md: the LLM "must never directly mutate irreversible
   workflow state."
4. **Every transition appends an event** — `routine_scheduled`, `routine_triggered`,
   `routine_snoozed`, `routine_completed`, `routine_missed`, `routine_escalated`,
   `routine_cancelled`.
5. **Channel-agnostic.** The engine never knows whether it is speaking via browser or phone
   (`docs/contracts/channel-adapter.ts`).

---

## 10. Test cases

Minimum coverage:

1. Scheduled routine fires at trigger time → `ACTIVE`
2. Explicit "yes" → `COMPLETED`
3. **Silence → `MISSED`, never `COMPLETED`**
4. "Hmm" / vague → **not** completion
5. "Wait" → not completion; not missed
6. Snooze sets a new trigger and states it aloud
7. Snooze cap reached → offers cancel/reschedule
8. `MISSED` retries exactly once
9. Second miss **without** consent → stays `MISSED`
10. Second miss **with** consent → `ESCALATED`
11. Cancel is honoured immediately, at any state
12. `DUE` inside quiet hours defers
13. Dosage question → refused, pre-model
14. "What is this tablet for?" → refused
15. Delivery receipt alone never completes a routine
16. Model output cannot force `COMPLETED`
17. Every transition produces an event
18. Full demo flow: trigger → snooze → re-trigger → complete → history

Cases 3, 9, 15 and 16 are the ones that matter most — they are the ones a naive implementation gets
wrong.

---

## Related

- `CHECKIN_CONVERSATION_POLICY.md` — what Thuna says once `ACTIVE`
- `FAMILY_CONSENT_POLICY.md` — the consent gate on `ESCALATED`
- `MEMORY_MODEL.md` §3 — routine memory
- `docs/contracts/channel-adapter.ts` — transport
- `docs/contracts/notification-adapter.ts` — escalation delivery
