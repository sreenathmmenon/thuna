# Thuna — Input Classification Policy

> Design document. **Changes no production code.**
>
> Stage 3 of the universal inbox (`UNIVERSAL_INBOX.md` §3). Defines the taxonomy, the signals that
> distinguish its members, how ambiguity and multi-classification are handled, and the confidence
> thresholds that decide between *acting* and *asking*.

---

## 1. The taxonomy

Eight classes. Chosen to be **exhaustive** (every input lands somewhere, including "nowhere") and
**shallow** (no sub-types), because a deep taxonomy multiplies the ways an input can be
misfiled.

| Class | Definition | Produces |
|---|---|---|
| `TASK` | A one-off thing to do, with or without a time | candidate `PendingLoop` |
| `LIFE_EVENT` | A dated occasion the elder will attend or must be ready for | candidate `LifeEvent` |
| `ROUTINE` | A recurring commitment | candidate `Routine` (`ROUTINE_ENGINE.md`) |
| `BILL` | A payment obligation with an amount and a due date | candidate `LifeEvent` (dated) + `PendingLoop` (the reminder) |
| `PENDING_PROMISE` | Something the elder said they would do, for someone | candidate `PendingLoop`, flagged `madeBy: ELDER` |
| `FAMILY_REQUEST` | Someone else asking the elder to do something | candidate `PendingLoop`, gated on the elder's agreement |
| `QUESTION` | A request to understand, not to remember | **nothing durable** |
| `UNSUPPORTED` | Outside what Thuna can help with | **nothing durable** |

### Why `BILL` is separate from `TASK`

A bill is the one class where the *amount* and the *due date* are both load-bearing and both
frequently misread. Separating it earns a dedicated extraction schema (amount, due date, utility,
consumer reference) and a dedicated read-back that says the amount aloud for checking. Folding it
into `TASK` would lose that.

It is emphatically **not** separate because Thuna pays bills. It never does —
`COMPANION_PRODUCT_MODEL.md` §9. `BILL` produces a *reminder*.

### Why `PENDING_PROMISE` is separate from `TASK`

`MEMORY_MODEL.md` §4 already distinguishes promises, for a good reason: a dropped promise is the
failure an elder most notices, and promises must survive session boundaries and normal episodic
expiry. The class exists so that survivability attaches at intake rather than being remembered
later.

The distinguishing signal is **a second party**. "Buy milk" is a `TASK`. "I told Priya I'd call
her back" is a `PENDING_PROMISE` — someone else is waiting.

### Why `FAMILY_REQUEST` is separate

Because it is the one class where the person who wants the record is **not the elder**. It needs a
different gate: the elder must agree that the request becomes their commitment, not merely confirm
that it was accurately heard. `FAMILY_CONSENT_POLICY.md` §9 — family may suggest; only the elder
decides.

---

## 2. Classification signals

Signals are evidence, not rules. The classifier (Sarvam-30B/105B) weighs them; this table is the
prompt's backbone and the reviewer's checklist.

| Signal | Points toward |
|---|---|
| Recurrence words — "every", "daily", "each morning", "always" | `ROUTINE` |
| A single future date or day-name | `LIFE_EVENT` or `TASK` |
| Amount + due date + a utility or institution name | `BILL` |
| A named third party the elder owes an action to | `PENDING_PROMISE` |
| Reported speech about the elder — "Sree asked if you'd…" | `FAMILY_REQUEST` |
| Invitation vocabulary — wedding, function, ceremony, RSVP | `LIFE_EVENT` |
| Appointment vocabulary — clinic, token number, OP, appointment | `LIFE_EVENT` |
| Imperative to the elder with no date — "buy", "call", "fix" | `TASK` |
| Interrogative — "what is", "what does this say", "why" | `QUESTION` |
| Ornate/formal document layout in a `VISION` capture | `LIFE_EVENT` |
| Tabular layout, account number, "amount payable" | `BILL` |
| Medicine mention with a time of day | `ROUTINE` (label only — see §8) |

**Channel is a signal too.** A `PHOTO` capture is much more likely to be `LIFE_EVENT` or `BILL`
than `PENDING_PROMISE`; people photograph paper, they speak promises. A `VOICE` capture beginning
with "remind me" is almost always `TASK` or `ROUTINE`.

---

## 3. Confidence thresholds

Per-class confidence in `[0,1]`. Overall candidate confidence is the **primary class's**
confidence, not an average — averaging lets a confident secondary mask an unsure primary.

| Band | Behaviour |
|---|---|
| **≥ 0.85** | Proceed to extraction with the class's schema. Still read back and confirm — always (`CONFIRM_BEFORE_MEMORY.md` §1). |
| **0.60 – 0.85** | Proceed, but the read-back is hedged and names the class explicitly: *"This looks like a bill — is that right?"* |
| **< 0.60** | **Do not guess. Ask.** §4. |
| Top two within **0.15** of each other | Treat as ambiguous regardless of absolute values. §4. |

### The rule

> ## Low confidence means ASK. It never means GUESS.

A guessed classification is not a small error. It selects the wrong extraction schema, which
produces wrong fields, which produces a read-back about the wrong kind of thing — and the elder
now has to unpick a misunderstanding rather than answer a question. The cost of one clarifying
question is a few seconds; the cost of a wrong guess is the elder concluding Thuna does not
understand them.

This is the classification-layer expression of the invariant the engine already holds: silence and
vagueness never proceed.

---

## 4. Ambiguity

When confidence is low or the top two classes are close, Thuna asks — but asks *well*.

### Ask with the candidates named, never open-ended

❌ "I'm not sure what this is. What is it?"
✅ "Is this a bill to pay, or an invitation to something?"

An open question forces the elder to do the classification work in the abstract. A closed question
between two named options is answerable in one word, which is the whole design target for voice.

### At most two options, plus an escape

> "Is that something to do once, or every day?"
> *(if neither: "Tell me in your own words and I'll follow.")*

Three options in a spoken list is at the limit (`CHECKIN_CONVERSATION_POLICY.md` §6); two is
comfortable.

### One clarifying question, then hand over

If a single clarification does not resolve it, **stop classifying and ask the elder to state it
plainly**. Do not interrogate.

> "I'm not following this one — could you tell me what you'd like me to remember?"

The elder's plain statement is then treated as `ELDER_STATED` evidence that **overrides every
model signal**. The elder's account of what something is always wins. There is no confidence
value at which the classifier outranks the person holding the paper.

### Ambiguity is not `UNSUPPORTED`

`UNSUPPORTED` means Thuna cannot help. Ambiguity means Thuna has not yet understood. Collapsing
the first into the second produces a Thuna that gives up when it should ask.

---

## 5. Multi-classification

An input may legitimately carry several classes at once. The canonical case: **a wedding
invitation for an out-of-town venue is a `LIFE_EVENT` and implies a travel `TASK`.**

### Rules

1. **A candidate carries `classes[]`, ordered by confidence, with one `primaryClass`.**
2. **Only the primary is read back and confirmed.** The elder created one thing, and hearing two
   read-backs makes it feel as though Thuna has invented an extra commitment.
3. **A secondary becomes a separate, refusable offer — after the primary is confirmed, once.**

   > "Ravi's wedding, Saturday the fourteenth, eleven in the morning, at the Town Hall in
   >  Thrissur. Shall I remember that?" — *yes* —
   > "Thrissur is a fair distance. Would you like a reminder the day before, to arrange travel?"

4. **Never more than one secondary offer per input.** If several are plausible, take the
   highest-value one and drop the others silently.
5. **A declined secondary is not re-offered**, in this session or any later one.
   `CHECKIN_CONVERSATION_POLICY.md` §4.
6. **Primary selection:** highest confidence; ties break toward the class carrying a **date**,
   because a dated thing is the one that can be missed.

### Common combinations

| Input | Primary | Secondary offer |
|---|---|---|
| Out-of-town wedding invitation | `LIFE_EVENT` | travel `TASK` |
| Electricity bill, due in 5 days | `BILL` | reminder `TASK` two days before |
| Clinic appointment slip | `LIFE_EVENT` | `TASK` to arrange a ride |
| "Every morning, my medicine" | `ROUTINE` | — |
| "Sree asked if you'd call Sunday" | `FAMILY_REQUEST` | `PENDING_PROMISE` if the elder agrees |

Note the last row: a `FAMILY_REQUEST` the elder agrees to *becomes* the elder's own promise. That
transition happens on the elder's yes, and never before.

---

## 6. `QUESTION` — produces nothing

An elder asking "what does this letter say?" has asked for understanding, not for a record.

- Answer it (`SCREEN_CONTEXT_ASSISTANCE.md` for on-screen and document content).
- **Create no `MemoryRecord`**, not even a log that the question was asked.
- **Then offer once**, if the content plausibly implies something durable:

  > "It's the water bill, about six hundred rupees, due on the twelfth.
  >  Shall I remind you a few days before?"

  A *yes* re-enters the pipeline as a fresh `BILL` candidate with `ELDER_STATED` provenance. A
  *no* ends it.

This ordering matters: **understand first, offer second, never store first.** A system that
records everything it explains has turned a helpful reading into surveillance of what the elder
receives in the post.

---

## 7. `UNSUPPORTED` — a first-class outcome

Stated plainly, once, without an apology spiral, and with a route to a person.

> "I'm not able to help with that one. Would you like me to ask Sree?"

Rules:

- **Never invent a partial attempt.** A half-answer to something Thuna cannot do is worse than no
  answer, because the elder may act on it.
- **Never blame the elder or their phrasing.** `COMPANION_PRODUCT_MODEL.md` §5.3 — failure is
  Thuna's.
- **Do not record it.** A log of things the elder asked for and did not get is a capability trace.
- `UNSUPPORTED` is where anything requiring an instruction without visible evidence lands —
  `SCREEN_CONTEXT_ASSISTANCE.md` §2.

---

## 8. Classification constraints from the memory model

Classification must not become a back door into prohibited memory.

| Constraint | Effect on classification |
|---|---|
| No health inference | A prescription classifies as `ROUTINE` with the elder's own label ("your morning medicine"). Never a drug name with a dose — `MEMORY_MODEL.md` §2. |
| No emotional inference | Tone, hesitation, and distress in a `VOICE` capture are **not classification signals**. Nothing classifies as "the elder seems worried". |
| No cognitive inference | Repeated corrections, misclassifications, or re-asks are not signals about the elder and are not counted. |
| No behavioural analytics | Class frequencies over time are not stored — `MEMORY_MODEL.md` §9. |
| Safety precedes classification | Anything the stage-2 gate refuses is never classified at all. `DIGITAL_SAFETY_POLICY.md` §1. |

That last row is structural. There is no `SCAM` class, deliberately: adding one would imply the
classifier is what catches fraud, and the classifier is a model. Fraud is caught before
classification runs, by a deterministic check.

---

## 9. Implementation notes for Codex

1. **Classes are a data table**, not a switch: `CLASS_SCHEMAS: Record<InboxClass, FieldSpec[]>`.
   Adding a content type adds a row. `UNIVERSAL_INBOX.md` §1.
2. **The classifier returns a scored list**, not a single label — multi-classification and the
   0.15 tie rule both need the full distribution. Note this differs from the existing
   `routeIntent()` in `lib/router.ts`, which returns one label; the inbox needs richer output.
3. **Thresholds are constants in one place**, named (`CLASSIFY_ACT`, `CLASSIFY_HEDGE`,
   `CLASSIFY_TIE_WINDOW`), so they can be tuned and tested. Not inline magic numbers.
4. **`ELDER_STATED` outranks everything.** Implement as a hard override, not a large weight.
5. **Clarifying questions are templates**, keyed by the ambiguous pair, so the two named options
   are always the actual top two.
6. **Do not run classification on refused inputs.** Enforce by ordering in the pipeline, not by a
   flag the classifier is expected to check.
7. Log `candidateId`, class ids and confidences. Never log `rawText`.

---

## Related

- `UNIVERSAL_INBOX.md` — the pipeline, `CapturedInput`, `InboxCandidate`, generic-by-design
- `CONFIRM_BEFORE_MEMORY.md` — thresholds drive how uncertainty is spoken
- `DOCUMENT_TO_EVENT_PIPELINE.md` — classification of image-sourced input
- `DIGITAL_SAFETY_POLICY.md` — why there is no `SCAM` class
- `MEMORY_MODEL.md` §4, §9 — pending promises; prohibited inference
- `ROUTINE_ENGINE.md` — what a confirmed `ROUTINE` becomes
- `FAMILY_CONSENT_POLICY.md` §9 — family may suggest; the elder decides
