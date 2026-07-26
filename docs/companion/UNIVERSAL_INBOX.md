# Thuna — Universal Inbox

> Design document. **Changes no production code.**
>
> One intake pipeline for everything an elder wants Thuna to remember, from any input channel,
> in any form. A wedding invitation photographed on a phone, a spoken "remind me to call Priya",
> a bill left on the table, a neighbour's request relayed at the door — all enter the *same*
> pipeline and leave it as the same shape of candidate record.

---

## 1. The generic-by-design principle

> **A new kind of content must not require new code.**

This is the load-bearing claim of the whole design, so it is stated first and defended
structurally rather than aspirationally.

The tempting architecture is a switchboard: a bill handler, an invitation handler, a
prescription handler, a "call my daughter" handler. It fails for three reasons that matter
specifically for elders:

1. **Elders do not sort their lives into your categories.** They hand you a piece of paper and
   say "what is this?" The category is an *output* of the pipeline, not an input to it.
2. **Every new handler is a new place to forget the confirmation rule.** Nine handlers means nine
   opportunities to skip the read-back. One pipeline means one place where the rule lives.
3. **The long tail is the whole point.** A pension letter, a temple festival notice, a plumber's
   promise to return Tuesday — these are the majority of what an elder actually needs held, and
   none of them will ever get a bespoke handler.

So the pipeline is **classification-driven, not handler-driven**. The stages below run
identically for every input. Content type affects only:

- which **extraction schema** is selected (a data table, §5),
- which **read-back template** is chosen (a phrasing table, `CONFIRM_BEFORE_MEMORY.md` §5),
- which **downstream record type** the confirmed candidate becomes.

All three are *data*. Adding "pension letter" is adding rows, not branches.

### The test

> If supporting a new content type requires editing anything other than the classification table,
> the extraction schema table, and the read-back template table — the design has regressed.

---

## 2. Scope

**In scope:** intake, extraction, classification, uncertainty handling, read-back, correction,
confirmation, and the handoff to storage/scheduling.

**Out of scope, owned elsewhere:**

| Concern | Owner |
|---|---|
| `MemoryRecord` envelope, categories, expiry, sharing | `MEMORY_MODEL.md` |
| `LifeEvent` lifecycle (`DRAFT → NEEDS_CONFIRMATION → CONFIRMED → …`) | Life-event engine |
| `PendingLoop` lifecycle (`OPEN → SCHEDULED → DUE → …`) | Pending-loop engine |
| `Routine` states and scheduling | `ROUTINE_ENGINE.md` |
| Consent to notify family | `FAMILY_CONSENT_POLICY.md` |

The inbox **produces candidates**. It does not own what happens to them after `CONFIRMED`. The
seam is deliberate: the inbox is where things are *understood*, the engines are where things are
*run*.

---

## 3. The pipeline

```
  INPUT           any channel: voice, photo, screen, forwarded message, relayed request
    │
    ▼
  [1] CAPTURE     normalise to a CapturedInput with a source and raw evidence
    │
    ▼
  [2] SAFETY      ── deterministic, PRE-MODEL ──────────────────────┐
    │             risk signals → refuse, do not extract              │
    │             (DIGITAL_SAFETY_POLICY.md, RISK_SIGNAL_MODEL.md)   │
    ▼                                                               │
  [3] CLASSIFY    one or more InboxClass labels + confidence         │
    │             (INPUT_CLASSIFICATION_POLICY.md)                   │
    ▼                                                               │
  [4] EXTRACT     fields per the class's schema, each with           │
    │             its own provenance and confidence                  │
    ▼                                                               │
  [5] CANDIDATE   an InboxCandidate — NOT memory, NOT scheduled      │
    │                                                               │
    ▼                                                               │
  [6] UNCERTAINTY surface what is unsure; ask, never guess           │
    │                                                               │
    ▼                                                               │
  [7] READ-BACK   speak it plainly in the elder's language           │
    │                                                               │
    ├──► correction ──► back to [5] with the corrected field only    │
    │                                                               │
    ▼                                                               │
  [8] CONFIRM     explicit yes required (CONFIRM_BEFORE_MEMORY.md)   │
    │                                                               │
    ▼                                                               │
  [9] COMMIT      MemoryRecord + candidate LifeEvent / PendingLoop / │
                  Routine handed to the owning engine                │
                                                                    │
  REFUSED ◄─────────────────────────────────────────────────────────┘
  minimal metadata only; no content stored
```

**Stage 2 runs before stage 3.** Safety is not a classification outcome — it is a gate in front
of classification. A message that says "share your OTP to claim your pension arrears" must never
reach the extractor, because an extractor that has read it is an extractor that can be argued
with. See `DIGITAL_SAFETY_POLICY.md` §3.

---

## 4. `CapturedInput` — the single entry shape

Every channel normalises to this before anything else happens. This is what makes one pipeline
possible.

```
CapturedInput
  captureId          opaque
  channel            VOICE | PHOTO | SCREEN | FORWARDED_MESSAGE | RELAYED | TYPED
  sarvamPath         SAARAS | VISION | TEXT     (which model produced the text)
  rawText            transcript or OCR text — SESSION-SCOPED, never persisted
  mediaRef?          transient handle to the image, session-scoped
  capturedAt
  elderPresent       boolean — was the elder in the conversation when this arrived
  locale             ml-IN | en-IN | …
```

Notes that matter:

- **`rawText` is session-scoped.** A transcript is not memory (`MEMORY_MODEL.md` §9: no
  transcripts beyond the session). What survives is the *confirmed candidate*, plus a short
  evidence quote per field where one is needed for provenance.
- **`elderPresent: false`** — e.g. a family member forwards an invitation — means the candidate
  cannot be confirmed yet. It waits in `AWAITING_ELDER` until the elder is actually there. A
  family member cannot confirm on the elder's behalf, for exactly the reason
  `FAMILY_CONSENT_POLICY.md` §9 gives.
- `sarvamPath` is recorded because provenance differs by path: a Saaras mishearing and a Vision
  misread need different repair phrasing (§8).

---

## 5. `InboxCandidate` — the universal intermediate

The one shape every classification produces. **A candidate is not memory.** It lives in a
volatile staging area, has a short TTL, and disappears on rejection or timeout.

```
InboxCandidate
  candidateId
  captureId              → CapturedInput
  classes[]              one or more InboxClass, each with confidence  (§ classification policy)
  primaryClass           the one the read-back is phrased around
  fields[]               ExtractedField[]
  overallConfidence      derived, see INPUT_CLASSIFICATION_POLICY.md §6
  openQuestions[]        what Thuna must ask before it can proceed
  state                  DRAFT | AWAITING_ELDER | READ_BACK | CORRECTING |
                         CONFIRMED | REJECTED | EXPIRED
  ttl                    default 24h; unconfirmed candidates expire silently
```

```
ExtractedField
  name                   "date" | "time" | "personName" | "amount" | "venue" | …
  value                  normalised
  rawSpan                the exact source text this came from  (provenance)
  provenance             SPOKEN | OCR_TEXT | INFERRED_FROM_CONTEXT | ELDER_STATED
  confidence             0..1
  needsConfirmation      true when confidence < threshold, or provenance is INFERRED
```

### Why field-level confidence, not record-level

Because corrections are field-level. An elder saying *"the date is right but it's Priya, not
Priya Stores"* is correcting one field and implicitly confirming the others. A record-level
confidence score cannot represent that, so the whole candidate would have to be re-read aloud —
which is exactly the "make the elder listen to everything again" failure that makes voice
interfaces exhausting.

This mirrors `MEMORY_MODEL.md` §8.1: *correction is targeted*.

### `INFERRED_FROM_CONTEXT` is the dangerous provenance

A field with this provenance was not stated or seen — Thuna worked it out. "The invitation says
Saturday; the next Saturday is the 14th." That inference is usually right and occasionally
catastrophically wrong. **`INFERRED_FROM_CONTEXT` always sets `needsConfirmation: true`,
regardless of confidence.** There is no confidence value high enough to skip confirming something
Thuna invented.

---

## 6. Classification output

Full policy in `INPUT_CLASSIFICATION_POLICY.md`. The taxonomy, for reference:

| `InboxClass` | Becomes | Example |
|---|---|---|
| `TASK` | `PendingLoop` | "remind me to call the electrician" |
| `LIFE_EVENT` | `LifeEvent` | wedding invitation, appointment slip |
| `ROUTINE` | `Routine` | "every morning at nine, my medicine" |
| `BILL` | `LifeEvent` (due-dated) + `PendingLoop` | electricity bill with a due date |
| `PENDING_PROMISE` | `PendingLoop` | "I told Priya I'd call her back" |
| `FAMILY_REQUEST` | `PendingLoop`, gated on consent | "Sree asked if you'd call Sunday" |
| `QUESTION` | no record; answered or handed off | "what is this letter about?" |
| `UNSUPPORTED` | no record; stated plainly | anything Thuna cannot help with |

Two structural points:

- **`QUESTION` produces nothing durable.** Answering a question is not a reason to remember it.
  An elder asking "what does this say?" has not asked to be tracked.
- **`UNSUPPORTED` is a first-class outcome, not an error.** It is said plainly and without
  apology-spiral: *"I'm not able to help with that one. Would you like me to ask Sree?"*

---

## 7. Multi-classification

A single input often is genuinely more than one thing. A wedding invitation is a `LIFE_EVENT`,
and if the venue is in another town it also implies a travel `TASK`.

Rules:

1. **Classify multiply; confirm once, then offer.** Do not read back two candidates as if the
   elder created two things. Confirm the primary, then *offer* the secondary as a separate,
   refusable question.

   > "Ravi's wedding, Saturday the fourteenth, at eleven in the morning, at the Town Hall in
   >  Thrissur. Shall I remember that?"
   > — *yes* —
   > "Thrissur is a fair distance. Would you like me to remind you a day before, to arrange
   >  the travel?"

2. **The secondary is always refusable and never pre-created.** An elder who wanted only the date
   remembered must be able to get exactly that. Silently creating a travel reminder they did not
   ask for is the system deciding for them (`COMPANION_PRODUCT_MODEL.md` §3).

3. **Never more than one secondary offer per input.** Three follow-up questions after a photo is
   an interrogation. If more are plausible, take the highest-value one and drop the rest.

4. **Primary selection** goes to the class with the highest confidence; ties break toward the
   class with a *date*, because a dated thing is the one that can be missed.

---

## 8. Repair by path

Because `sarvamPath` is recorded, Thuna can ask the *right* repair question rather than a generic
"sorry, could you repeat that".

| Path | Typical failure | Repair phrasing |
|---|---|---|
| `SAARAS` (voice) | mishearing a name or number | "I may have heard that wrong — was it Priya, or Priya Nair?" |
| `VISION` (photo) | blur, glare, cropped edge, ornate script | "The bottom of the card is a little dark. Could you tell me the time?" |
| `TEXT` | ambiguity, not error | "Does 'next Friday' mean this coming Friday, or the one after?" |

Note that the Vision repair asks the elder to **speak** the missing field rather than to
re-photograph. Re-taking a photo of a card in bad light is a task that fails twice as often as it
succeeds; asking a person what time the wedding is, is a question they can answer instantly. The
fallback direction is always toward voice, which is also the project's primary category.

---

## 9. Sarvam model roles

The project's hackathon category is **Voice Experience**. Vision is a supporting input path, not
the centre of the product. An elder who never photographs anything still gets the entire inbox
through speech.

| Model | Role in the inbox |
|---|---|
| **Saaras** | Spoken input at capture; spoken corrections at stage 7 |
| **Sarvam Vision** | Reading invitations, bills, slips, notices into `rawText` |
| **Translate** | Rendering English documents into the elder's language for read-back |
| **Sarvam-30B / 105B** | Classification, field extraction, clarifying-question generation |
| **Bulbul** | Speaking the read-back, the confirmation, and later reminders |

The read-back is always **spoken** (Bulbul), even when the input was a photograph. An elder who
handed over a piece of paper should hear what Thuna understood, not read it back off a screen —
reading small text is frequently the reason they asked for help in the first place.

---

## 10. What the inbox must never do

| Never | Because |
|---|---|
| Commit an unconfirmed candidate | `CONFIRM_BEFORE_MEMORY.md` — the keystone rule |
| Guess a low-confidence field | `INPUT_CLASSIFICATION_POLICY.md` §7 — low confidence means ask |
| Extract from an input the safety gate refused | The extractor must not read scam text at all |
| Store `rawText` beyond the session | `MEMORY_MODEL.md` §9 |
| Store a medicine name paired with a dosage | `MEMORY_MODEL.md` §2 — a prescription photo yields "your morning medicine", never "Metformin 500mg" |
| Infer health, mood, or capability from an input | `MEMORY_MODEL.md` §9 |
| Create a family-requested item without the elder | `FAMILY_CONSENT_POLICY.md` §9 |
| Re-ask after the elder declined a candidate | `CHECKIN_CONVERSATION_POLICY.md` §4 — refusal is complete |

### The prescription case, spelled out

Photographing a prescription is one of the most likely real uses of Vision, and it collides
directly with `MEMORY_MODEL.md`. The pipeline's behaviour:

- ✅ Extract that there is a morning and an evening medicine → propose a `Routine` labelled in the
  elder's own words.
- ❌ Do not extract, store, speak back, or schedule the **drug name with a dose**.
- If the elder asks "how many should I take?" → deterministic refusal, pre-model, and an offer to
  ask a person. This is the same class of refusal as OTP: `CHECKIN_CONVERSATION_POLICY.md` §9.

> "I can remind you about your morning medicine, but I shouldn't say how much to take —
>  I could get that wrong. Would you like me to help you ring Dr. Nair's clinic?"

---

## 11. Worked example — the wedding invitation

**Input.** Elder photographs a card. `channel: PHOTO`, `sarvamPath: VISION`, `locale: ml-IN`.
Card is in English.

**Stage 2 — safety.** No risk signals. Proceed.

**Stage 3 — classify.**
`LIFE_EVENT` 0.94 (primary), `TASK` 0.61 (travel implied by out-of-town venue).

**Stage 4 — extract.**

| field | value | provenance | conf | needsConfirmation |
|---|---|---|---|---|
| `eventType` | wedding | OCR_TEXT | 0.96 | no |
| `personName` | Ravi | OCR_TEXT | 0.91 | no |
| `date` | 2026-08-14 | INFERRED_FROM_CONTEXT | 0.88 | **yes** (inferred) |
| `time` | 11:00 | OCR_TEXT | 0.55 | **yes** (low) |
| `venue` | Town Hall, Thrissur | OCR_TEXT | 0.89 | no |

**Stage 6 — uncertainty.** Two fields flagged. `time` is low-confidence from a dark corner of the
card; `date` was inferred from "Saturday" plus the printed month.

**Stage 7 — read-back**, in Malayalam, via Bulbul, uncertainty made audible:

> "This looks like Ravi's wedding, at the Town Hall in Thrissur.
>  I think it is Saturday the fourteenth of August — is that right?"

Elder: *"Yes, fourteenth."* → `date` confirmed, provenance upgraded to `ELDER_STATED`.

> "The time was hard to read. Do you know what time it starts?"

Elder: *"Eleven in the morning."* → `time` set, `ELDER_STATED`, confidence 1.0.

**Stage 8 — confirm.**

> "Ravi's wedding, Saturday the fourteenth of August, eleven in the morning, Town Hall in
>  Thrissur. Shall I remember that?"

Elder: *"Yes."*

**Stage 9 — commit.** `MemoryRecord` (category `Episodic`/`Profile` per the memory model,
`sharingClass: PRIVATE`) plus a candidate `LifeEvent` handed to the life-event engine in
`CONFIRMED`.

**Then, once, the secondary offer:**

> "Thrissur is a fair way. Would you like a reminder the day before, to sort out the travel?"

Elder: *"No, Sree will drive me."* → No `PendingLoop`. Nothing recorded about Sree.
The offer is not repeated at the next contact.

---

## 12. Implementation notes for Codex

1. **One module, one entry point.** `inbox.ingest(CapturedInput) → InboxCandidate`. Every channel
   calls it. Resist per-channel intake functions; that is how the switchboard grows back.
2. **The safety gate is a separate, deterministic, pre-model function** in the same style as
   `quickCheck()` in `lib/router.ts`. It takes `rawText` and returns a refusal or `null`. It must
   be callable and testable with no model available at all.
3. **Classification and extraction schemas are data files**, not code. A `CLASS_SCHEMAS` map from
   `InboxClass` to a field list; a `READBACK_TEMPLATES` map from `InboxClass` to phrasing. Adding
   a content type edits data.
4. **Candidates live in a staging store separate from memory**, so "unconfirmed things cannot be
   remembered" is structural rather than a convention someone has to remember — the same reasoning
   as the provider/elder store split in `MEMORY_MODEL.md` §12.4.
5. **Reuse `isConfirmation()`** from `lib/command-parser.ts` at stage 8. Do not write a second,
   looser confirmation parser. Silence, "hmm", and "wait" are not yes — here as everywhere.
6. **Corrections reuse the engine's existing targeted-correction behaviour.** "Wait, plain dosa"
   and "no, it's Priya not Priya Stores" are the same operation on different fields.
7. **TTL sweep on read**, per `MEMORY_MODEL.md` §12.2. Do not rely on a background job.
8. Log candidate *ids and classes* for debugging. Never log `rawText` or field values in the
   clear.

---

## Related

- `INPUT_CLASSIFICATION_POLICY.md` — the taxonomy, signals, thresholds and ambiguity rules
- `CONFIRM_BEFORE_MEMORY.md` — the confirmation keystone; read-back and correction phrasing
- `DOCUMENT_TO_EVENT_PIPELINE.md` — the image-specific path into this inbox
- `DIGITAL_SAFETY_POLICY.md` — stage 2, the pre-model safety gate
- `MEMORY_MODEL.md` — the `MemoryRecord` envelope, categories, expiry, correction, prohibited memory
- `ROUTINE_ENGINE.md` — what a confirmed `Routine` candidate becomes
- `COMPANION_PRODUCT_MODEL.md` §3, §4 — not an autonomous agent; the elder is the principal
- `FAMILY_CONSENT_POLICY.md` — family-relayed inputs and consent
