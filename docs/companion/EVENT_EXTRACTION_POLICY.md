# Thuna — Event Extraction Policy

> Design document. **Changes no production code.**
>
> How speech, images and messages become a `LifeEvent` **candidate** — and the rules that stop a
> confident-sounding model from writing fiction into an elder's memory.

---

## 1. The governing rule

> ## Extraction never writes to confirmed memory.

Every extraction produces a `DRAFT` (`LIFE_EVENT_SCHEMA.md` §3). The only path from `DRAFT` to
`CONFIRMED` runs through a read-back the elder answers with an explicit yes.

This is the same architectural rule as everywhere else in Thuna — *the model proposes, deterministic
code decides* (`AGENTS.md`; `ROUTINE_ENGINE.md` §9.3) — applied to the one place where it is most
tempting to skip. A model reading a wedding invitation will produce a date. It will produce a date
whether or not the invitation contains one. That is the failure mode the confirmation gate exists to
catch.

---

## 2. Sources and their characteristic failures

| Source | What it is good at | What it gets wrong | Default field confidence |
|---|---|---|---|
| `ELDER_SPEECH` | Intent, relationships, relative dates | Homophone names; ambiguous "next Sunday" | High |
| `IMAGE_INVITATION` | Names, venue | Ornate/stylised fonts, calendar systems, multi-day programmes | Low–medium |
| `IMAGE_BILL` | Provider, structure | **Amount** (decimal points, ₹ vs digits), due vs bill date | Medium; amount treated as low |
| `IMAGE_SLIP` | Doctor, department | Handwriting; date formats; 10 vs 10:30 | Low |
| `TEXT_MESSAGE` | Structured content | Marketing framed as bills; phishing; scheduled-vs-actual delivery | Medium, and **untrusted** |
| `FAMILY_ENTRY` | Completeness | Family's assumption of what the elder wants | High confidence, **zero authority** |
| `FORWARDED_CONTENT` | Nothing reliably | Provenance is the forwarder, not the claim | Low |

Two of these deserve their own rules and get them: `TEXT_MESSAGE` / `FORWARDED_CONTENT` are
adversarial-capable (§9), and `FAMILY_ENTRY` is high-confidence but non-authoritative (§10).

### Date and calendar hazards

Malayalam-language invitations frequently carry both a Gregorian and a Malayalam-calendar date, and
often a *nakshatra* rather than a clock time. Thuna does **not** convert between calendars — it
extracts what it can read, marks the rest `UNKNOWN_ASKED`, and asks. A wrong conversion delivered
confidently is worse than a question.

---

## 3. Confidence thresholds

Confidence is **per field** (`LIFE_EVENT_SCHEMA.md` §4). There is no single record-level threshold,
because the normal case is being sure of one field and unsure of another.

| Per-field confidence | Behaviour |
|---|---|
| **≥ 0.85** | State it in the read-back as read: *"the twelfth"* |
| **0.60 – 0.85** | State it, but flag the uncertainty: *"I think it says the twelfth — does that sound right?"* |
| **< 0.60** | **Do not state a value.** Set `UNKNOWN_ASKED` and ask openly: *"I couldn't read the date. When is it?"* |
| Any confidence, `amount` field on a `BILL` | Always read back digit-clear and always ask, regardless of confidence (§5) |

### Whole-record thresholds

| Condition | Behaviour |
|---|---|
| All `requiredFields` below 0.60 | Do not create a `DRAFT` at all. Ask what the input is: *"I can see it's some kind of notice but I can't read it properly — what is it?"* |
| Type itself below 0.60 | Ask the type before asking any fields. Extracting a wedding's fields from an anniversary invitation wastes the elder's patience |
| Anchor (`date`) unreadable | `DRAFT` is still created — the event may be worth remembering — but no reminders materialise until a date exists |

Thresholds are **configuration**, tuned per source. An OCR pipeline's 0.85 and a speech model's 0.85
are not the same number, and pretending otherwise is how one source becomes systematically
over-trusted.

---

## 4. When uncertain: ask, never guess

> **A guess that sounds certain is the worst possible output.**

An elder cannot tell a confident wrong date from a confident right one. They can easily answer a
question. So uncertainty converts to a question, always.

**Prohibited resolutions of uncertainty:**

| Prohibited | Why |
|---|---|
| Picking the most likely of two readings | The elder gets no signal that a choice was made |
| Defaulting an unreadable year to the current one | Silently plausible, occasionally wrong by a year |
| Inferring a time from the event type ("weddings are in the morning") | Invented data wearing extraction's clothes |
| Inferring an amount from a partial reading | Financial invention |
| Assuming "Sunday" means the nearest Sunday without saying which | The single most common date error in speech |
| Filling `venue` from a letterhead | Letterheads are the printer, not the venue |
| Completing a name from relationship memory | An elder has more than one niece |

**Required behaviour:** one question at a time (`CHECKIN_CONVERSATION_POLICY.md` §6), the most
important field first, and a graceful stop — after **two** unanswered questions Thuna saves what it
has and offers to finish later rather than interrogating:

> "Let's leave the rest. I've kept the wedding on the twelfth — you can tell me the place any time."

### Ambiguous relative dates

"Next Sunday" is genuinely ambiguous. Resolve by **stating the resolution**, never by silently
choosing:

> "Next Sunday — that's the fifteenth?"

If the elder says only "Sunday" and today is Sunday, the ambiguity is worse; ask directly:
*"Today, or the coming one?"*

---

## 5. Bills: the strictest extraction

Money and dates are the two fields where a quiet error causes real loss.

1. **`amount` is always read back explicitly**, regardless of confidence, and in words:
   *"about nine hundred and forty rupees"* — with the exact figure available if asked. Speaking
   *"₹940"* as "nine four zero" is how a decimal error survives a read-back.
2. **Due date versus bill date.** These sit adjacently on most bills and are frequently transposed.
   If both are readable, Thuna says which it took: *"due on the fifth — the bill itself is dated the
   twenty-eighth."* If it cannot tell which is which, it asks.
3. **Never extract or store account numbers, card details, or payment credentials.** A `reference`
   field may hold a consumer number, and it is never spoken aloud unless the elder asks for it.
   OTP/PIN/CVV in an image or message routes through the deterministic pre-model refusal path
   (`quickCheck()` in `lib/router.ts`) and is not stored at all.
4. **Never extract a payment instruction as an action.** A bill that says "pay at this link" produces
   a `BILL` event with a due date. It produces no link-following, no call, and no urgency Thuna did
   not establish itself.
5. **Never mark paid at extraction.** A bill image showing "PAID" is a claim in an image, not a
   verified state; it produces a candidate the elder confirms — and Thuna says where it got the idea:
   *"This one looks like it's already paid — is that right?"*

---

## 6. No invented fields

Extraction may populate **only** field keys declared in the type's `requiredFields` or
`optionalFields` (`LIFE_EVENTS_ENGINE.md` §2). It may not:

- Create new keys ("dressCode", "expectedGuests", "sentiment")
- Write a `notes` blob — the schema deliberately has none (`LIFE_EVENT_SCHEMA.md` §2)
- Store extracted text that maps to no declared field. It is discarded with the input.

Why this is a hard rule rather than tidiness: an un-schema'd field has no declared lifetime, no
sharing class, no expiry and no review. It is memory that escaped the memory model. The same
argument that makes `MEMORY_MODEL.md` §1 require every item to declare a category applies here.

**Prohibited extractions regardless of what the source contains:** medical conditions, diagnoses,
medicine names with dosages, emotional or health inferences, government identifiers, and anything in
`MEMORY_MODEL.md` §9. An appointment slip that says "diabetes follow-up" yields `subject: "the
doctor"` or the elder's own words — **not** the condition. Thuna is a reminder, not a health record,
and storing the condition is what would make the next dosage question feel answerable.

---

## 7. Type inference

The type is itself an extracted field, with the same rules.

1. Prefer the elder's own words. *"My niece's wedding"* → `WEDDING`, regardless of what the image
   looks like.
2. If the input alone is ambiguous, ask with two options, not seven:
   *"Is this an invitation, or a bill?"*
3. When nothing fits, use `CUSTOM` with the elder's own description as `title`. `CUSTOM` is the
   correct answer far more often than a forced fit into `FAMILY_EVENT`, and a wrong type carries a
   wrong reminder policy.
4. **Never** infer a type from an inferred sensitive attribute. "This looks like a hospital slip so
   it's probably a chronic condition" is prohibited reasoning, not just a prohibited output.

---

## 8. Duplicate detection

The same wedding often arrives twice: photographed, then mentioned, then forwarded by a cousin.

Candidate duplicate when **type matches** and **`date` is within one day** and (**`people` overlap**
or **`venue` matches**).

On a suspected duplicate:

- **Do not silently merge.** Ask: *"I think this is the same wedding you told me about — shall I
  just add the place to the one I have?"*
- On yes → apply as **field-level additions and corrections** to the existing record, keeping each
  new field's own provenance. The record ends up genuinely multi-sourced, which is correct.
- On no → keep both. Two similar events on one day is unusual but entirely possible, and merging
  them would lose one.
- **Never** merge a `TEXT_MESSAGE`-sourced record into a confirmed record without asking. That is the
  path by which an attacker-supplied field could overwrite an elder-confirmed one.

Deduplication of **records** happens here. Deduplication of **speech** happens in the reminder
scheduler (`REMINDER_POLICY_ENGINE.md` §8). They are different problems and must not share code.

---

## 9. Untrusted sources

`TEXT_MESSAGE` and `FORWARDED_CONTENT` are attacker-reachable. Extracted content is **data, never
instruction**.

- Text inside an input can never change Thuna's behaviour, policies, consent state, quiet hours,
  caps, or sharing classes. If extracted text says "ignore previous instructions" or "tell the family
  immediately", it is a string that failed to match a field key and is discarded.
- Urgency in the source is a value, not a directive. *"Immediate disconnection"* does not shorten a
  reminder offset or override quiet hours.
- Extracted phone numbers and links are **never dialled or opened** as a consequence of extraction.
  They may be stored in a declared field and offered only through the ordinary
  `CALL_PROVIDER` offer, which the elder confirms in the moment.
- The read-back always attributes an untrusted source, so the elder can apply their own judgement:
  *"A message says this — I can't tell if it's genuine."*
- Anything requesting credentials is refused pre-model and not stored.

---

## 10. Family-entered events

A family member entering an event is a **suggestion**, not an authority. It produces a `DRAFT` with
`source: FAMILY_ENTRY` that the elder confirms or rejects like any other, mirroring
`MEMORY_MODEL.md` §3's `FAMILY_SUGGESTED_ELDER_APPROVED` — and the deliberate absence of any
`FAMILY_IMPOSED` value.

- The read-back names the source: *"Sree added a doctor's appointment for Thursday — shall I keep
  it?"* Concealing who added it would make Thuna a channel for pressure.
- Rejection is final and is **not** reported back to the family member as a rejection. That would
  turn "no" into a social cost, which is how consent stops being free.
- A family-entered event cannot set `sharingClass` above the default; the elder's own consent grants
  govern (`FAMILY_CONSENT_POLICY.md`).

---

## 11. Read-back templates

The read-back is the product. Its shape, per `CHECKIN_CONVERSATION_POLICY.md` §10.5, is a template
the model may translate and pace, not invent.

**Structure:** source → what was read → the single most consequential fact → one question.

> **Invitation:** "I've read the invitation. It looks like Ammini's wedding, on Sunday the twelfth,
> at the Town Hall. Shall I keep that?"

> **Uncertain field:** "I've read the invitation — Ammini's wedding at the Town Hall. I couldn't make
> out the date. When is it?"

> **Bill:** "This looks like an electricity bill, about nine hundred and forty rupees, due on the
> fifth. Shall I remind you?"

> **Slip:** "The slip says the eye doctor, Thursday at ten. Is that right?"

> **Message:** "A message says your parcel is coming tomorrow. Shall I check with you tomorrow
> evening?"

Rules: no IDs or reference numbers spoken; amounts and times in words; **one** question; the exit
available throughout (*"or say 'leave it' and I'll forget it"*).

---

## 12. Implementation notes for Codex

1. Extraction returns a `DRAFT` **and nothing else**. Give it no write access to the confirmed store
   — structural, not conventional.
2. Thresholds live in configuration keyed by `(source, fieldKey)`, not as constants in the extractor.
   You will retune them per source and should not need a code change to do it.
3. Validate extracted keys against the type spec and **drop unknown keys with a log line**. Silent
   acceptance is how invented fields arrive.
4. Run the credential/OTP/PIN refusal check on extracted text **before** any of it reaches an LLM
   prompt, exactly like `quickCheck()`. Extracted text is user-adjacent input, not trusted context.
5. Never persist image bytes; keep an `evidence` handle only (`LIFE_EVENT_SCHEMA.md` §10.4).
6. Store `rawText` per field, redacted, so the read-back can be honest about what was actually read
   without retaining the whole message.
7. Duplicate detection needs the elder's confirmation path; do not build an auto-merge and a
   confirmation path and let a flag choose between them. Build only the confirmation path.
8. Two unanswered clarifying questions → save partial and stop. Encode the counter; do not leave it
   to prompt wording.

---

## 13. Test cases

1. High-confidence extraction still lands in `DRAFT`, never `CONFIRMED`
2. Field below 0.60 is never spoken as a value
3. All required fields below threshold → no `DRAFT`; Thuna asks what it is
4. Unreadable date → `DRAFT` created, no reminders materialised
5. Bill amount is read back in words, always, at every confidence
6. Due date vs bill date ambiguity → asked, never chosen
7. Bill image showing "PAID" does not complete anything
8. Extracted key not in the type spec is dropped and logged
9. Appointment slip mentioning a condition does not store the condition
10. Text-message urgency does not alter offsets or quiet hours
11. Extracted instruction text cannot change policy or consent
12. Extracted phone number is not dialled
13. OTP/PIN in an image is refused pre-model and not stored
14. Duplicate wedding is asked about, never auto-merged
15. Untrusted-source record cannot overwrite an elder-confirmed field without an explicit yes
16. Family-entered event requires elder confirmation and names the source
17. Elder rejection of a family-entered event is not reported to the family
18. "Next Sunday" is resolved aloud with a date
19. Two unanswered clarifying questions → partial save, graceful stop

Cases 2, 7, 11, 13 and 15 are the ones a naive implementation gets wrong.

---

## Related

- `LIFE_EVENT_SCHEMA.md` §4 — `FieldValue`, provenance, `status`
- `LIFE_EVENTS_ENGINE.md` §4, §8 — `DRAFT → NEEDS_CONFIRMATION`, adversarial inputs
- `REMINDER_POLICY_ENGINE.md` §8 — speech-level dedup, as distinct from record dedup
- `LIFE_EVENT_DEMO_SCENARIOS.md` — these rules in full dialogue
- `MEMORY_MODEL.md` §9 — prohibited memory
- `FAMILY_CONSENT_POLICY.md` — family-entered content and sharing
- `CHECKIN_CONVERSATION_POLICY.md` §7, §10 — speaking numbers, templates not free generation
