# Thuna — Confirm Before Memory

> Design document. **Changes no production code.**
>
> The keystone rule of the universal inbox. Everything in `UNIVERSAL_INBOX.md` exists to deliver
> a candidate to this document's gate.

---

## 1. The rule

> ## Nothing extracted enters durable memory without the elder's explicit confirmation.

Not "usually". Not "unless confidence is very high". Not "except for low-stakes fields".
**Nothing.**

An `InboxCandidate` is not memory. It lives in a volatile staging store with a 24-hour TTL, and it
becomes a `MemoryRecord` — and a `LifeEvent` / `PendingLoop` / `Routine` candidate — only after an
explicit yes from the elder in the moment.

### Why this is absolute rather than confidence-gated

The obvious optimisation is to skip confirmation when extraction is confident. It is rejected for
three reasons.

1. **Confidence measures the extractor, not the world.** A crisply printed card can be read at
   0.99 confidence and still be last year's invitation. High confidence in *what the paper says*
   is not knowledge of *what the elder wants held*.
2. **A wrong memory is worse than no memory.** An elder who misses a wedding because Thuna
   silently stored the wrong date has been harmed by the feature that was meant to help. And
   because it entered silently, they had no opportunity to catch it — the error surfaces only when
   it is too late.
3. **Confirmation is the trust mechanism, not a validation step.** The elder must be able to
   believe that Thuna knows only what they told it. A system that sometimes remembers things
   without asking cannot support that belief, and once the belief is gone the elder starts
   second-guessing everything Thuna says. This is the same reasoning as
   `COMPANION_PRODUCT_MODEL.md` §3: not an autonomous agent.

This mirrors an invariant the codebase already holds: `isConfirmation()` gates order placement,
and `ROUTINE_ENGINE.md` §1 holds that silence is not completion. **Silence is not consent to
remember, either.**

---

## 2. What counts as confirmation

Reuse `isConfirmation()` from `lib/command-parser.ts`. Do not write a second, looser parser.

| Input | Confirms? |
|---|---|
| "yes", "correct", "that's right", "ശരി" | ✅ |
| Elder restates the fact correctly ("yes, the fourteenth") | ✅ |
| silence | ❌ |
| "hmm", "mm", "ok…" trailing | ❌ |
| "wait", "later", "maybe" | ❌ |
| "I don't know" | ❌ |
| A family member confirming on the elder's behalf | ❌ — `FAMILY_CONSENT_POLICY.md` §9 |

**"I don't know" is not a rejection either.** It means the elder cannot verify the field. The
correct move is to drop that field and confirm the rest, or to hold the candidate in
`AWAITING_ELDER` — never to accept Thuna's guess because nobody contradicted it.

---

## 3. Surfacing uncertainty

Uncertainty must be **audible**, not merely tracked. A field flagged `needsConfirmation` changes
how the read-back is *spoken*.

| Field confidence | Spoken as | Example |
|---|---|---|
| High (≥ 0.85) | Stated plainly | "Ravi's wedding" |
| Medium (0.6–0.85) | Hedged and checked | "I think it's Ravi's wedding — is that right?" |
| Low (< 0.6) | Named as unknown, asked directly | "I couldn't read the time. Do you know when it starts?" |
| `INFERRED_FROM_CONTEXT` | Always checked, whatever the confidence | "The card says Saturday — I make that the fourteenth. Is that right?" |

Three rules govern this:

1. **Never state a low-confidence value as fact and wait to be corrected.** Saying "eleven
   o'clock" when Thuna is 55% sure invites agreement out of politeness. Asking "what time does it
   start?" gets the truth.
2. **Never speak a confidence number.** "I'm 60% sure" is meaningless to a person and slightly
   alarming. Uncertainty is expressed in ordinary words: *I think*, *I couldn't quite read*,
   *is that right*.
3. **At most two uncertain fields are asked about per read-back.** Beyond that, the elder is being
   interviewed. If three or more fields are uncertain, the extraction failed — ask them to tell
   you the whole thing instead:

   > "This card is hard for me to read. Could you tell me whose wedding it is and when?"

---

## 4. Read-back: shape and phrasing

The read-back is always **spoken** (Bulbul), in the elder's language, even when the input was a
photograph — an elder who handed over a piece of paper is frequently someone for whom reading it
was the difficulty.

### Required structure

```
[what it is]  +  [the key facts, at most three]  +  [one clear question]
```

> "Ravi's wedding, Saturday the fourteenth, eleven in the morning.
>  Shall I remember that?"

### Rules

- **At most three facts spoken in one breath.** Same cap as `CHECKIN_CONVERSATION_POLICY.md` §6.
  A five-field bill read aloud in one sentence is not verifiable by anyone.
- **Ordinary language for dates, times and money.** "Saturday the fourteenth", not "14/08/2026".
  "About twelve hundred rupees", not "₹1,247.00" — unless the exact figure is the point, in which
  case say it as words.
- **One question at the end.** Never stack "is that right, and shall I also remind you about the
  travel?"
- **Never speak ids.** No `candidateId`, no reference numbers — `CHECKIN_CONVERSATION_POLICY.md`
  §7.
- **Do not read back what will not be stored.** If Thuna is deliberately not keeping the drug name
  from a prescription (`MEMORY_MODEL.md` §2), do not recite it in the read-back either. The
  read-back is a faithful preview of the record.

### Templates by class

Data, not code — `UNIVERSAL_INBOX.md` §12.3.

| Class | Template |
|---|---|
| `LIFE_EVENT` | "{event}, {day} {date}, {time}. Shall I remember that?" |
| `BILL` | "The {utility} bill, {amount}, due {date}. Shall I remind you a few days before?" |
| `TASK` | "Ring {person} about {subject}. Shall I remind you?" |
| `PENDING_PROMISE` | "You said you'd {promise}. Shall I keep that in mind?" |
| `ROUTINE` | "Every day at {time}, {label}. Shall I set that up?" |
| `FAMILY_REQUEST` | "{person} asked whether you'd {request}. Shall I keep it as a reminder?" |

Note the `BILL` template asks about the *reminder*, not the payment. Thuna never pays anything —
`COMPANION_PRODUCT_MODEL.md` §9.

---

## 5. Partial confirmation

The most common real outcome, and the one a naive design handles worst.

> *"The date is right but it's Priya, not Priya Stores."*

### The rule

> **A correction targets one field. Every other field the elder did not dispute remains as read
> back, and the corrected field alone is re-confirmed.**

This is `MEMORY_MODEL.md` §8.1 — *correction is targeted* — and it is the same behaviour the task
engine already has when "wait, plain dosa" changes the item without clearing the restaurant.

### What happens mechanically

1. Correction is parsed to a `(fieldName, newValue)` pair.
2. That field's value is replaced; `provenance` becomes `ELDER_STATED`; confidence becomes 1.0.
3. **All other fields are implicitly confirmed** by the elder having engaged with the read-back
   and disputed only one thing. Their `needsConfirmation` flags clear.
4. **Except:** any field *dependent* on the corrected one is invalidated and must be re-asked.
   `MEMORY_MODEL.md` §8.4 — corrections invalidate dependent confirmations. Correcting the person
   from "Priya Stores" to "Priya" may change which phone number is meant, so the contact reference
   is dropped rather than silently carried over.
5. A **short** re-confirmation is spoken — the corrected field and the question only, not the
   whole record again:

   > "Priya, not Priya Stores. Ring her about the water bill, tomorrow morning. Is that right?"

### Why not re-read everything

Because it punishes the elder for correcting. If every correction costs a full re-reading, the
rational move is to let small errors through — and Thuna's memory quietly fills with things the
elder noticed were wrong and did not bother to fix. The correction path must be *cheaper* than
letting an error stand.

### Multiple corrections in one turn

> *"No, it's Priya, and it's Thursday not Wednesday."*

Apply both, then confirm once. Do not walk the elder through them one at a time.

### Correction that changes the classification

> *"That's not a reminder, that's the wedding invitation I told you about."*

Re-run classification with the elder's statement as a `ELDER_STATED` signal that outweighs all
model signals, rebuild the candidate, and read back once more. The elder's own account of what
something is always wins over the classifier — `INPUT_CLASSIFICATION_POLICY.md` §4.

### Correction after commit

The elder may correct a stored item later ("that wedding is the twenty-first, not the
fourteenth"). This leaves the inbox and becomes a memory supersession —
`MEMORY_MODEL.md` §8.2: the prior value is retained briefly so "no, go back to what I said before"
works.

---

## 6. Rejection

> *"No, don't bother."* / *"That's not right at all."* / *"Forget it."*

What happens:

1. **The candidate is deleted.** Not archived, not flagged, not kept "in case they change their
   mind". Real deletion, matching `MEMORY_MODEL.md` §6.
2. **No `MemoryRecord` is created** — including no record that a rejection occurred. Storing "the
   elder declined to remember a wedding invitation" is a behavioural trace of exactly the kind
   `MEMORY_MODEL.md` §9 forbids.
3. **`rawText` and any `mediaRef` are discarded** with the candidate. A photograph the elder chose
   not to act on is not kept.
4. **No re-asking.** Not later in the session, not at the next contact.
   `CHECKIN_CONVERSATION_POLICY.md` §4 — refusal is a complete answer.
5. **Acknowledged briefly and neutrally**, then the conversation moves on:

   > "Alright, I'll leave it."

   Never "are you sure?", never "I'll ask again later", never an explanation of what will be lost.
   Friction on rejection is a dark pattern.

### Expiry is not rejection

A candidate that reaches its 24-hour TTL without confirmation expires **silently**. Thuna does not
resurface it, does not mention it, and does not ask again. An elder who did not answer was not
asked twice for a reason.

---

## 7. The read-back-aloud test

`MEMORY_MODEL.md` §6 gives the practical test for what may be stored: *anything Thuna cannot
comfortably read back aloud should not have been stored.* This document makes that test
mechanical.

> **If the read-back would be uncomfortable to speak, the candidate should not be committed —
> regardless of confirmation.**

Because the read-back is mandatory, anything the pipeline could extract must be sayable to the
elder's face. That structurally excludes: emotional inference, health inference, drug names with
doses, anything about the elder's capability, and anything derived from a refused input. There is
no path by which such a field can be committed silently, because there is no silent path at all.

---

## 8. Implementation notes for Codex

1. **The staging store and the memory store are different stores.** Not a `confirmed: boolean`
   column. If an unconfirmed candidate physically cannot be in the memory store, the invariant is
   structural rather than a rule someone must remember — same reasoning as the provider/elder
   split in `MEMORY_MODEL.md` §12.4.
2. **`commit(candidate)` must reject any candidate not in state `CONFIRMED`**, and that check
   belongs inside the commit function, not at call sites.
3. **Reuse `isConfirmation()`.** One confirmation parser for the whole product.
4. **Reuse the engine's targeted-correction path.** Field correction here and item correction in
   the order flow are the same operation.
5. **Read-back templates live beside `lib/guidance.ts`**, keyed by class and locale. Structure is
   fixed; wording is translated.
6. **TTL sweep on read**, per `MEMORY_MODEL.md` §12.2.
7. **Rejection deletes.** Verify there is no soft-delete or tombstone path.
8. Log `candidateId` and outcome (`CONFIRMED` / `REJECTED` / `EXPIRED`). Never log field values.

---

## Related

- `UNIVERSAL_INBOX.md` — the pipeline this gates; stages 6, 7, 8
- `INPUT_CLASSIFICATION_POLICY.md` — confidence thresholds feeding §3
- `DOCUMENT_TO_EVENT_PIPELINE.md` — field-level provenance from images
- `MEMORY_MODEL.md` §6, §8, §9 — the read-back test, correction, prohibited memory
- `CHECKIN_CONVERSATION_POLICY.md` §4, §6, §7 — refusal is complete; three-item cap; no ids
- `COMPANION_PRODUCT_MODEL.md` §3, §6 — not an autonomous agent; explicit confirmation
- `lib/command-parser.ts` — `isConfirmation()` (read-only)
