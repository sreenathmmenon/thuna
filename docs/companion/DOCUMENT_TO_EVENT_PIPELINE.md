# Thuna — Document to Event Pipeline

> Design document. **Changes no production code.**
>
> The image path into the universal inbox: a photographed wedding invitation, bill, appointment
> slip or event notice becomes a confirmed `LifeEvent` — with field-level provenance, and never
> without the elder's yes.
>
> This is **not a separate pipeline.** It is `UNIVERSAL_INBOX.md` with `channel: PHOTO` and
> `sarvamPath: VISION`. The stages, the candidate shape, the confirmation gate and the correction
> behaviour are all shared. What is documented here is only what is *specific to reading paper*.

---

## 1. Flow

```
  PHOTO
    │  Sarvam Vision
    ▼
  rawText + layout hints          session-scoped, never persisted
    │
    ▼
  SAFETY GATE                     pre-model, deterministic — DIGITAL_SAFETY_POLICY.md
    │                             (a photographed scam SMS is refused here)
    ▼
  CLASSIFY                        LIFE_EVENT | BILL | ROUTINE | …
    │
    ▼
  EXTRACT per class schema        each field: value + rawSpan + provenance + confidence
    │
    ▼
  InboxCandidate                  NOT memory
    │
    ▼
  READ-BACK (spoken, Bulbul, elder's language)
    │
    ├── correction ──► targeted field update ──► short re-confirm
    │
    ▼
  CONFIRM ──► candidate LifeEvent handed to the life-event engine
```

Everything after `InboxCandidate` is defined in `CONFIRM_BEFORE_MEMORY.md`. Nothing here overrides
it.

---

## 2. Supported documents

| Document | Class | Key fields |
|---|---|---|
| Wedding / function invitation | `LIFE_EVENT` | eventType, personName, date, time, venue |
| Appointment slip (clinic, OP, token) | `LIFE_EVENT` | date, time, place, token/reference |
| Event notice (temple, association, meeting) | `LIFE_EVENT` | eventName, date, time, venue |
| Utility bill | `BILL` | utility, amount, dueDate, consumerRef |
| Payment-pending / delivery-delay message | *often* refused | — see §7 |
| Prescription | `ROUTINE` (label only) | timeOfDay, elder's own label — **never drug + dose** |

New document types are added as **schema rows**, not code —
`UNIVERSAL_INBOX.md` §1. That is the point of running images through the shared pipeline.

---

## 3. Field-level provenance

Every extracted field carries where it came from. This is what makes targeted correction and
honest read-back possible.

```
ExtractedField
  name            "date" | "time" | "amount" | "venue" | …
  value           normalised
  rawSpan         the exact text on the document this came from
  provenance      OCR_TEXT | INFERRED_FROM_CONTEXT | ELDER_STATED
  confidence      0..1
  needsConfirmation
```

| Provenance | Meaning | Confirmation |
|---|---|---|
| `OCR_TEXT` | Vision read these characters on the paper | Per confidence threshold |
| `INFERRED_FROM_CONTEXT` | Thuna worked it out; it is not written there | **Always**, at any confidence |
| `ELDER_STATED` | The elder said it | Already confirmed; confidence 1.0 |

### Why `INFERRED_FROM_CONTEXT` always confirms

The card says "Saturday". Thuna computes the fourteenth. That inference is right most of the time
and wrong in exactly the cases that matter — a card printed months in advance, a reprint, a
different month than assumed. The elder cannot tell which kind of statement they are hearing
unless Thuna marks it, so **inference is always spoken as inference**:

> "The card says Saturday — I make that the fourteenth of August. Is that right?"

There is no confidence value high enough to skip confirming something Thuna invented rather than
read. See `CONFIRM_BEFORE_MEMORY.md` §3.

### `rawSpan` is provenance, not memory

`rawSpan` exists so that a correction can be scoped and a read-back can be honest. It lives with
the candidate and **dies with it** — it is not carried into the committed `MemoryRecord`, because
that would persist document text (`MEMORY_MODEL.md` §9).

---

## 4. Confidence, and what degrades it

Vision confidence on Indian documents degrades for specific, predictable reasons. Naming them lets
Thuna ask the *right* repair question rather than a generic "sorry, could you repeat that".

| Cause | Typical victim field | Repair |
|---|---|---|
| Ornate / decorative script on invitations | personName, eventType | "Whose wedding is it?" |
| Gold or foil printing, glare | any | "The shiny part is hard for me — what does it say there?" |
| Shadow or dark corner | time, venue | "The bottom is a bit dark. Do you know what time it starts?" |
| Mixed Malayalam / English on one card | date, venue | Ask for the field in either language |
| Handwritten slip | token, time | "I can't make out the handwriting — could you read it to me?" |
| Cropped edge | dueDate, amount | "I think the picture is missing the bottom — what does the last line say?" |
| Thermal receipt fading | amount | "The printing is faint. What's the amount?" |

### The repair direction is always toward voice

Every repair above asks the elder to **say** the field, not to re-photograph. Re-taking a photo of
a shiny card in bad light usually fails a second time, and it asks an elder to solve a
photography problem. Asking what time the wedding is gets an instant, reliable answer, and it
upgrades the field to `ELDER_STATED` — better provenance than any successful re-scan would give.

This is also why the project's primary category is Voice Experience: the vision path's own error
recovery runs through speech.

### If three or more fields are low-confidence

The extraction failed. Do not conduct an interview.

> "This card is hard for me to read. Could you just tell me whose wedding it is and when?"

`CONFIRM_BEFORE_MEMORY.md` §3.3.

---

## 5. Read-back

Spoken, via Bulbul, in the elder's language, **even though the input was an image**. The elder
handed over a piece of paper — frequently because reading it was the difficulty. Showing them text
would not help.

> "This looks like Ravi's wedding, at the Town Hall in Thrissur.
>  I think it's Saturday the fourteenth of August — is that right?"

Rules inherited from `CONFIRM_BEFORE_MEMORY.md` §4: at most three facts per breath, ordinary
words for dates and money, one question at the end, no ids spoken, and **never read back a field
that will not be stored**.

### Translation is part of the read-back

An English invitation read to a Malayalam speaker goes through Sarvam Translate before Bulbul.
Two constraints:

- **Translate only what is on the paper.** Do not add explanatory content that was not there.
- **Proper nouns are spoken as-is.** "Town Hall" stays "Town Hall" — a translated venue name is
  a venue the elder cannot ask a driver for.

---

## 6. Correction

Identical to `CONFIRM_BEFORE_MEMORY.md` §5. Restated only because image extraction produces its
own characteristic correction:

> *"No, that's the reception. The wedding is the day before."*

This corrects `eventType` **and** `date` together, and it is a correction Vision could never have
caught, because both were printed correctly on a card that lists two functions. Handle as a
multi-field correction: apply both, then confirm once, briefly.

Corrections upgrade the field to `ELDER_STATED` at confidence 1.0 and clear its
`needsConfirmation`. Undisputed fields are implicitly confirmed and are **not** re-read.

---

## 7. Safety in the image path

The safety gate (`DIGITAL_SAFETY_POLICY.md` §1, `RISK_SIGNAL_MODEL.md`) runs on OCR `rawText`
exactly as it does on speech, **before** classification or extraction.

Photographs are a common fraud vector: an elder photographs a threatening SMS, a "payment pending"
notice, or a QR code and asks what it means. Behaviour:

- **Refused inputs are never extracted from.** No candidate, no fields, no memory.
- **Thuna still explains what the message is** — that is the most valuable thing it can do
  (`DIGITAL_SAFETY_POLICY.md` §7). Understanding is offered; action is refused.
- **A QR code in the frame** fires `UNKNOWN_QR`. Thuna never decodes it to "check where it goes",
  and states plainly that scanning sends money rather than receiving it.
- **Credentials visible in a capture** — an OTP in a notification banner at the top of a
  screenshot — are **redacted at capture**, before anything downstream can read them.

### The prescription boundary

The most likely genuinely-medical photograph, and the sharpest constraint.

- ✅ Extract that there is a morning and an evening medicine → propose a `Routine` labelled in the
  elder's own words ("your morning medicine").
- ❌ Never extract, store, speak back, or schedule a **drug name paired with a dose**.
  `MEMORY_MODEL.md` §2 and §9.
- ❌ Never answer "how many should I take?" — deterministic refusal, pre-model, then offer a
  person. `CHECKIN_CONVERSATION_POLICY.md` §9.

> "I can remind you about your morning medicine, but I shouldn't say how much to take —
>  I could get that wrong. Shall I help you ring Dr. Nair's clinic?"

The drug name is excluded from the **read-back** as well as from storage, per
`CONFIRM_BEFORE_MEMORY.md` §4: the read-back is a faithful preview of the record, so anything not
stored is not recited.

---

## 8. Privacy

- **The image is never persisted.** `mediaRef` is a session-scoped transient handle; discarded at
  session end regardless of outcome.
- **OCR `rawText` is never persisted.** `MEMORY_MODEL.md` §9.
- **Only confirmed fields survive.** A photographed bill leaves an amount and a due date the elder
  confirmed — not the consumer number, not the address printed on it, not the image.
- **Other people's data on the document** — the names of everyone on a wedding invitation, a
  doctor's details — is not stored beyond the confirmed fields.
- **Never shared with family** except through the ordinary consent gate. Document content has no
  `NotificationCategory`, so there is no path to send it.
- **Rejected candidates take the image with them.** `CONFIRM_BEFORE_MEMORY.md` §6.

---

## 9. Sarvam roles

Primary category remains **Voice Experience**. Vision is a supporting input path — an elder who
never photographs anything still gets the full inbox by speaking.

| Model | Role |
|---|---|
| **Sarvam Vision** | Invitation, bill, slip, notice → `rawText` + layout hints |
| **Sarvam-30B / 105B** | Classification, field extraction, clarifying questions |
| **Translate** | English document → the elder's language for read-back |
| **Saaras** | Spoken corrections and spoken repair of low-confidence fields |
| **Bulbul** | Speaking the read-back, the confirmation, and later reminders |

The path begins in vision and **ends in voice** — every confirmation, correction and subsequent
reminder is spoken. The image is one input; the relationship is spoken throughout.

---

## 10. Implementation notes for Codex

1. **No separate module.** This is `inbox.ingest()` with `channel: PHOTO`. Resist a
   `documentPipeline.ts` — that is the switchboard regrowing (`UNIVERSAL_INBOX.md` §1).
2. **Document schemas are data rows** in the same `CLASS_SCHEMAS` table the voice path uses.
3. **Vision output must carry per-field confidence**, not one score for the page. If the provider
   returns only a page-level score, derive per-field confidence from span-level scores and mark
   the derivation — do not fabricate high confidence for individual fields.
4. **`INFERRED_FROM_CONTEXT` forces `needsConfirmation: true`.** Enforce in the constructor, not
   at call sites.
5. **The safety gate runs on OCR text before extraction.** Ordering, not a flag.
6. **`mediaRef` never reaches persistent storage.** Keep image handles in a session-scoped map
   with an explicit teardown.
7. **Redact credential patterns from OCR text at capture**, shared with
   `DIGITAL_SAFETY_POLICY.md` §8.4.
8. **Prescription guard is deterministic**: a drug-name-plus-dosage pattern is stripped from
   extraction candidates before the model sees them, so it cannot be persuaded to include it.
9. Log `candidateId`, class and field *names*. Never log `rawSpan`, field values, or OCR text.

---

## Related

- `UNIVERSAL_INBOX.md` — the pipeline this is an instance of
- `CONFIRM_BEFORE_MEMORY.md` — read-back, correction, partial confirmation, rejection
- `INPUT_CLASSIFICATION_POLICY.md` — classes, thresholds, multi-classification
- `SCREEN_CONTEXT_ASSISTANCE.md` — screens rather than paper; the evidence rule
- `DIGITAL_SAFETY_POLICY.md`, `RISK_SIGNAL_MODEL.md` — the gate in front of extraction
- `MEMORY_MODEL.md` §2, §9 — no drug/dose; no persisted images or OCR text
- `ROUTINE_ENGINE.md` — what a confirmed `ROUTINE` candidate becomes
