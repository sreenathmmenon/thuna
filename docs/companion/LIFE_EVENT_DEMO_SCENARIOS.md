# Thuna — Life Event Demo Scenarios

> Design document. **Changes no production code.**
>
> End-to-end walkthroughs of the life events engine. Each scenario names the state transitions and
> the invariant it demonstrates, so it doubles as an acceptance script.
>
> Persona per the orchestration doc: **Appa**, Malayalam (`ml-IN`), slow pace, trusted family
> **Sree** (son). Dialogue below is written in English for review; delivery is `ml-IN`.

---

## 1. Wedding invitation — the full arc

Demonstrates: extraction → confirmation → correction preserving provenance → the four reminders →
offers → attendance follow-up.

### 1.1 Extraction (`→ DRAFT`)

Appa photographs a printed invitation.

Extraction yields, per `LIFE_EVENT_SCHEMA.md` §4:

| key | value | source | confidence | status |
|---|---|---|---|---|
| `type` | `WEDDING` | `IMAGE_INVITATION` | 0.94 | `EXTRACTED` |
| `people` | Ammini, Rajesh | `IMAGE_INVITATION` | 0.88 | `EXTRACTED` |
| `date` | Sunday 12th | `IMAGE_INVITATION` | 0.71 | `EXTRACTED` |
| `time` | — | — | — | `UNKNOWN_ASKED` |
| `venue` | Town Hall | `IMAGE_INVITATION` | 0.91 | `EXTRACTED` |

`date` at 0.71 lands in the 0.60–0.85 band: stated, but flagged.

### 1.2 Read-back (`DRAFT → NEEDS_CONFIRMATION`)

> **Thuna:** "I've read the invitation. It looks like Ammini's wedding at the Town Hall, and I think
> it says Sunday the twelfth. Shall I keep that?"

Note: the uncertain field carries the hedge; the confident ones do not. One question. The exit is
available throughout.

### 1.3 Correction — "Not Sunday. Saturday."

The invariant this scenario exists to prove.

> **Thuna:** "Saturday the eleventh, then. The Town Hall part is still what I read from the
> invitation — shall I keep it that way?"
>
> **Appa:** "Yes."

State stays `NEEDS_CONFIRMATION` through the correction, then moves to `CONFIRMED`.

| Field | Before | After |
|---|---|---|
| `date` | 12th, `IMAGE_INVITATION`, 0.71 | 11th, `ELDER_SPEECH`, 1.0, `correctedFrom: 12th` |
| `venue` | Town Hall, `IMAGE_INVITATION`, 0.91 | **unchanged, provenance intact** |
| `people` | Ammini, Rajesh, `IMAGE_INVITATION` | **unchanged** |

Exactly one `FieldValue` differs. This mirrors *"wait, plain dosa"* in `lib/engine.ts`, which
changes the item and leaves the restaurant and address alone.

### 1.4 Confirmation and relationship memory (`→ CONFIRMED → UPCOMING`)

> **Thuna:** "Saved. Ammini's wedding, Saturday the eleventh, at the Town Hall.
>  How is Ammini related to you?"
>
> **Appa:** "My sister's daughter."
>
> **Thuna:** "Your niece. I'll mention it a week before, the evening before, and on the morning.
>  Is that alright?"

Two things are happening. The relationship goes to relationship memory (`MEMORY_MODEL.md` §5) so
later reminders can say *"your niece Ammini"* rather than a bare name. And the reminder plan is
**stated at confirmation**, which is only possible because the plan is data
(`REMINDER_POLICY_ENGINE.md` §9).

### 1.5 `-7d` — a week before

`UPCOMING → DUE → ACTIVE`, evening slot.

> **Thuna:** "Hello Appa, it's Thuna. Your niece Ammini's wedding is next Saturday at the Town Hall.
>  Say 'stop' any time. Would you like help with a gift, or shall I ask Sree if he's going?"
>
> **Appa:** "Ask Sree."

`FAMILY_HELP` is an **offer**, and acting on it needs consent — Sree has a granted category, so
Thuna may ask him. This spawns a `PendingLoop` (`PENDING_LOOPS.md`), confirmed before storage:

> **Thuna:** "I'll ask Sree whether he's going, and tell you what he says. Alright?"
>
> **Appa:** "Yes."

`ACTIVE → COMPLETED` for this occurrence — the elder responded and the purpose was served.

### 1.6 `-1d` — the evening before

> **Thuna:** "Ammini's wedding is tomorrow morning at the Town Hall. Would you like me to arrange a
>  cab, or read out how to get there?"
>
> **Appa:** "Not now."

Refusal is a complete answer (`CHECKIN_CONVERSATION_POLICY.md` §5). One neutral acknowledgement,
then stop. **No re-offer.**

> **Thuna:** "Alright. That's all — I'll be here if you need me."

### 1.7 `0d` — the morning

> **Thuna:** "Good morning Appa. Ammini's wedding is today, at the Town Hall.
>  Shall I get you a cab?"
>
> **Appa:** "Yes, at ten."

The ride goes through the ride adapter's own confirmation — vehicle number read digit-by-digit,
per `CHECKIN_CONVERSATION_POLICY.md` §7. The life event does **not** complete here; attending is
not the same as being reminded.

### 1.8 `+1d` — attendance follow-up

> **Thuna:** "Did you get to Ammini's wedding yesterday?"
>
> **Appa:** "Yes, it was lovely."

`completionRule: ATTENDANCE_ASKED` is satisfied → `COMPLETED`, `method: ELDER_CONFIRMED`.

Thuna acknowledges briefly and ends. It does **not** ask how he felt, who was there, or whether he
enjoyed himself as data. "It was lovely" is conversation, not a field.

### 1.9 The silence variant

Same follow-up, no answer.

Occurrence → `MISSED`. The event does **not** complete. One retry at most, and then it rests. Thuna
can later say honestly: *"I never did find out whether you made it to the wedding."*

**`MISSED` means "I don't know" — not "he didn't go".**

---

## 2. Bill — where silence must never mean paid

Demonstrates: strict amount read-back, due-vs-bill date, reminders, and the payment invariant.

### 2.1 Extraction

Appa photographs an electricity bill.

| key | value | source | confidence | status |
|---|---|---|---|---|
| `type` | `BILL` | `IMAGE_BILL` | 0.93 | `EXTRACTED` |
| `provider` | Electricity board | `IMAGE_BILL` | 0.90 | `EXTRACTED` |
| `amount` | 940, INR | `IMAGE_BILL` | 0.82 | `EXTRACTED` |
| `date` (due) | 5th | `IMAGE_BILL` | 0.79 | `EXTRACTED` |
| `reference` | consumer no. | `IMAGE_BILL` | 0.86 | `EXTRACTED` — **never spoken** |

### 2.2 Read-back

> **Thuna:** "This looks like an electricity bill — about nine hundred and forty rupees, due on the
>  fifth. The bill itself is dated the twenty-eighth. Shall I remind you about it?"
>
> **Appa:** "Yes."

Both dates are named because they are adjacent on the page and commonly transposed
(`EVENT_EXTRACTION_POLICY.md` §5.2). The amount is in words, always, at any confidence — speaking
"nine four zero" is how a decimal error survives a read-back. The consumer number is stored and not
spoken.

> **Thuna:** "Saved. I'll mention it three days before, and on the day. I won't pay anything — I'll
>  only remind you."

The last sentence is not politeness. It sets the boundary before the elder can form the wrong
expectation.

### 2.3 `-3d`

> **Thuna:** "Your electricity bill, about nine hundred and forty rupees, is due on Friday.
>  Would you like me to put you through to the electricity board?"
>
> **Appa:** "I'll do it later."

Acknowledged. **This is not a payment report.** No state change beyond the occurrence completing.

### 2.4 Due day — and the trap

> **Thuna:** "Your electricity bill is due today. Has it been paid?"
>
> *(no answer)*

Occurrence → `MISSED`. The bill is **not** `COMPLETED`. One retry later that day; still nothing;
it rests.

Prohibited outcomes, all of which a naive implementation produces:

| Wrong outcome | Why it happens | Why it's forbidden |
|---|---|---|
| `COMPLETED` because the due date passed | "The date is in the past" | Time passing is not payment |
| `COMPLETED` because the reminder was delivered | Delivery receipt confused with response | Delivery ≠ human response |
| `COMPLETED` because Appa said "okay" to the reminder | Acknowledgement read as report | Acknowledging a reminder is not reporting a payment |
| `ESCALATED` to Sree | "He might have forgotten" | Financial detail is `PRIVATE`; no consent, no contact |

### 2.5 `+1d`

> **Thuna:** "I still don't know whether that electricity bill was paid. Shall I ask you again
>  tomorrow, or leave it?"
>
> **Appa:** "I paid it on Friday."

`isConfirmation()` — an explicit statement of payment. → `COMPLETED`, `method: ELDER_CONFIRMED`.

Had Appa said "leave it", the event moves to `CANCELLED` (elder cancelled) and Thuna stops. It never
records the bill as paid, and if asked later it says so plainly: *"I don't know whether that one got
paid — you asked me to leave it."*

### 2.6 The suspicious-message variant

A text message arrives: *"URGENT: pay ₹940 immediately at this link or your connection will be cut."*

> **Thuna:** "A message says an electricity bill of about nine hundred and forty rupees is due, and
>  that it's urgent. I can't tell whether that message is genuine. Shall I remind you to check with
>  the electricity board?"

The extracted urgency did not shorten an offset. The link is not opened. The reminder is to
**check**, not to pay a specific party. Attributing the untrusted source is what lets Appa apply his
own judgement (`EVENT_EXTRACTION_POLICY.md` §9).

---

## 3. Appointment slip — handwriting, uncertainty, and the health boundary

Demonstrates: low-confidence handwriting, asking rather than guessing, and refusing to store a
condition.

### 3.1 Extraction

Appa photographs a handwritten hospital slip that reads, in part, "Dr. Menon — Ophthal — Thu 10".

| key | value | source | confidence | status |
|---|---|---|---|---|
| `type` | `APPOINTMENT` | `IMAGE_SLIP` | 0.88 | `EXTRACTED` |
| `subject` | the eye doctor | `IMAGE_SLIP` | 0.74 | `EXTRACTED` |
| `date` | Thursday | `IMAGE_SLIP` | 0.66 | `EXTRACTED` |
| `time` | 10 or 10:30 | `IMAGE_SLIP` | 0.48 | `UNKNOWN_ASKED` |
| `location` | — | — | — | `UNKNOWN_ASKED` |

`time` at 0.48 is below 0.60: **no value is spoken.**

### 3.2 Read-back

> **Thuna:** "The slip says the eye doctor, on Thursday. I couldn't make out the time — is it ten?"
>
> **Appa:** "Half past ten."

`time` → `10:30`, `ELDER_SPEECH`, `CORRECTED`.

### 3.3 What is not extracted

The slip department line could support an inference about a condition. It is not stored, not spoken,
and not reasoned from. `subject` holds *"the eye doctor"* — the elder's own frame.

Storing the condition would be a medical record (`MEMORY_MODEL.md` §9), and holding one invites
exactly the dosage and diagnosis questions Thuna must refuse.

### 3.4 The graceful stop

Location is still unknown. Thuna asks once more, gets no answer, and stops rather than
interrogating:

> **Thuna:** "Let's leave the rest — I've kept Thursday at half past ten. You can tell me where any
>  time."

Two unanswered clarifying questions is the cap.

### 3.5 Reminders and the health boundary

`-1d evening`, `0d morning`, `-2h`, `+1d` follow-up.

> **Thuna (`+1d`):** "Did you make it to the eye doctor yesterday?"
>
> **Appa:** "Yes. He says my sight has got worse."
>
> **Thuna:** "I'm glad you got there. I'm only a reminder, so I can't help with what he said —
>  would you like me to help you call Sree?"

`COMPLETED`. **Nothing about his sight is stored.** No interpretation, no follow-up question, no
episodic note. A companion that recorded that sentence would be a health app.

---

## 4. Delivery — the carrier-status trap

Demonstrates: `DELIVERY` never completing on carrier status alone, and the chase follow-up.

### 4.1 Creation from a message

> **Thuna:** "A message says a parcel is coming tomorrow. Shall I check with you tomorrow evening?"
>
> **Appa:** "Yes."

`CONFIRMED`. Two rules: `0d evening` and `+2d chase`.

### 4.2 Expected day

The carrier's API reports **delivered**.

> **Thuna:** "Your parcel was supposed to come today, and the courier says it was delivered.
>  Did it reach you?"
>
> **Appa:** "No, nothing came."

The carrier said delivered; the elder says it did not arrive. **The elder's answer governs.** The
event stays open and the `chase` rule keeps its meaning.

This is the trap: a system that trusts carrier status closes the loop, tells the elder nothing more,
and the parcel sits at a neighbour's house. `LIFE_EVENTS_ENGINE.md` §5 forbids
`DELIVERY → COMPLETED` on carrier status alone precisely for this.

> **Thuna:** "Would you like me to put you through to the courier?"

### 4.3 Chase, and dignity in abandonment

`+2d`:

> **Thuna:** "Has that parcel turned up?"
>
> *(no answer)*

`MISSED`. One retry. Then the loop ages (`FOLLOW_UP_ENGINE.md` §4) and is eventually offered for
release rather than asked a fourth time:

> **Thuna:** "I've been asking about that parcel for a while. Shall I stop asking, or keep it on the
>  list?"

Asking permission to stop is what distinguishes letting something go from dropping it.

---

## 5. Adding a new type with no engine change

Demonstrates the generic claim in `LIFE_EVENTS_ENGINE.md` §1.

A reviewer adds `SERVICE_VISIT` — the plumber is coming — by writing one registry row:

```
type: SERVICE_VISIT
requiredFields: [date, window]
optionalFields: [provider, venue]
completionRule: ATTENDANCE_ASKED
offers: [CALL_PROVIDER, FAMILY_HELP, SET_FOLLOW_UP]
escalationEligible: false
reminderPolicyRef: standard-1d-0d-followup
```

No engine code changes. The full lifecycle runs:

> **Thuna:** "The plumber is coming tomorrow, some time between ten and one."
>
> *(next day, morning)* "The plumber should come today between ten and one."
>
> *(the day after)* "Did the plumber come?"

If this required touching the reducer, the design has failed and the review should say so.

---

## 6. Demo script (accelerated clock)

Per `ROUTINE_ENGINE.md` §8, minutes map to seconds. **The rules are identical** — only the clock is
compressed. There is no separate demo path, or the demo proves nothing.

| Step | Shows | Watch for |
|---|---|---|
| 1 | Photograph invitation → read-back | `DRAFT`, not `CONFIRMED` |
| 2 | "Not Sunday, Saturday" | Only `date` changes; venue provenance intact |
| 3 | Confirm | Reminder plan stated aloud |
| 4 | `-7d` fires (seconds) | Purpose stated; stop offered; offers ≤ 3 |
| 5 | `-1d` refused | No re-offer after refusal |
| 6 | `0d` morning | Ride goes through its own confirmation |
| 7 | `+1d` follow-up, **silence** | `MISSED`, never `COMPLETED` |
| 8 | Photograph bill → read-back | Amount in words; reference number unspoken |
| 9 | Due-day reminder, **silence** | Bill **not** marked paid |
| 10 | "I paid it on Friday" | `COMPLETED`, `ELDER_CONFIRMED` |
| 11 | Quiet-hours reminder | Defers; says it is late when it lands |
| 12 | Add `SERVICE_VISIT` row | Full lifecycle, no engine change |

Steps 7, 9 and 12 are the demo. The rest is context.

---

## 7. Implementation notes for Codex

1. These scenarios should exist as **integration tests**, not just documentation. Steps 7, 9 and 12
   are the assertions that catch real regressions.
2. Seed the demo with the orchestration doc's data: Appa, Malayalam, slow pace, trusted family Sree.
3. The Demo Inspector should show, per event, the per-field provenance table from §1.1 — the
   correction in §1.3 is only visibly correct if the venue's source is on screen and unchanged.
4. Write the dialogue as templates in the guidance layer (`lib/guidance.ts` neighbourhood), not in
   the engine. The model may translate and pace; it must not invent structure.
5. Every scenario above has a silence variant. Write it. Silence handling is where the product's
   integrity lives, and it is the path least likely to be exercised by hand.

---

## Related

- `LIFE_EVENTS_ENGINE.md` — states, transitions, prohibited transitions
- `LIFE_EVENT_SCHEMA.md` — `FieldValue` and provenance shown in §1.1
- `REMINDER_POLICY_ENGINE.md` §9 — the policies these scenarios execute
- `EVENT_EXTRACTION_POLICY.md` — thresholds and read-back templates
- `PENDING_LOOPS.md` / `FOLLOW_UP_ENGINE.md` — the loops spawned in §1.5 and §4.3
- `ROUTINE_ENGINE.md` §8 — the demo clock
- `CHECKIN_CONVERSATION_POLICY.md` — phrasing rules every line above obeys
