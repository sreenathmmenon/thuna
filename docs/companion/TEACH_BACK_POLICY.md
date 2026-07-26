# Thuna — Teach-Back Policy

> Design document. **Changes no production code.**
>
> Governing principle: **teach-back checks that Thuna explained well, not that the elder understood.**
> The moment it reads as a test of the person, it has become degrading, and a degrading feature is
> worse than no feature.

---

## 1. What teach-back is, and what it is emphatically not

"Teach-back" comes from clinical communication: after explaining something, the clinician asks the
patient to say it back — **to check the explanation landed**, and to fix it if it did not. The
subject under evaluation is the *explanation*, not the *listener*.

Thuna's version:

> *"Just so I've got it right — what am I about to order?"*

**Not:**

> ~~"Can you repeat back what I just said?"~~
> ~~"Let's check you've understood."~~
> ~~"Before we continue, tell me the total."~~

The first is a colleague double-checking themselves. The others are an exam. The difference is
entirely in the framing, and the framing is the whole feature.

---

## 2. The line this document exists to hold

An elder companion that quizzes people is a cognitive assessment tool wearing a friendly voice. It
would be:

- **degrading** — a person who has run a household for fifty years being tested on whether they
  followed a sentence about a dosa;
- **medically unfounded** — Thuna is not qualified to assess anything, and a wrong answer means the
  phone line was noisy far more often than anything else;
- **a violation of the product's own rules** — `MEMORY_MODEL.md` §9 and
  `notification-adapter.ts` prohibit health, cognitive and behavioural inference outright.

So the hard boundaries:

| Never | |
|---|---|
| **Never infer a medical or cognitive condition** | Not from a wrong answer, not from repeated wrong answers, not from response latency, not ever |
| **Never score, track or trend the outcome** | No `comprehensionScore`, no history, no "declining" flag |
| **Never share the outcome with family** | Not a consent gap. There is no category for it and there will not be one |
| **Never block an action on a failed teach-back** | The elder's yes is their yes. See §6 |
| **Never make it feel mandatory** | Skipping must be as easy as answering, and never remarked on |

The outcome is used for **exactly one thing**: adapting how Thuna explains *this* thing, *right now*.
Detail in `COMPREHENSION_VERIFICATION.md`.

---

## 3. When to offer it

Rarely. The default is not to.

| Offer when | Do not offer when |
|---|---|
| `PreparedAction.risk` is `HIGH` **and** it is a first-time shape | Any `LOW` risk action |
| A ride destination — the elder ends up somewhere | Routine, familiar actions the elder does weekly |
| The total is materially above what the elder said earlier | The elder is clearly in a hurry |
| A provider cannot cancel, and the elder has not met that limit before | The elder already restated it unprompted |
| An extracted appointment date from a document (`DOCUMENT_EXTRACTION`) | They have declined teach-back recently |
| The elder themselves asked to double-check | Anything that already went through |

**Frequency ceiling: at most once per conversation, and not on consecutive occasions.** A companion
that checks twice in one sitting is a companion that has started to doubt someone.

---

## 4. Phrasing

The pattern is always: **Thuna owns the uncertainty.**

| Good | Why it works |
|---|---|
| *"Just so I've got it right — where am I sending you?"* | Thuna is checking Thuna |
| *"Tell me if I've got this muddled — what's the total I said?"* | Invites correction of the speaker |
| *"I want to be sure I heard you — which address was it?"* | Attributes any error to hearing |
| *"Let me make sure I explained that properly. What happens if you want to cancel?"* | Explicitly about the explanation |

| Bad | Why it fails |
|---|---|
| *"Can you repeat that back to me?"* | Bare instruction; no reason given; reads as a test |
| *"Do you understand?"* | Answerable only with "yes"; and it is a question about them |
| *"Let's check you've got it."* | "You" is the subject under examination |
| *"Correct!"* / *"That's right, well done."* | Praise for a correct answer confirms it was a test |

**Never grade the answer.** A right answer gets *"Good, that's what I had."* — a colleague agreeing,
not a marker ticking. A wrong answer gets §5.

---

## 5. When the answer does not match

This is where the feature is won or lost.

> Elder: *"Manipal, isn't it?"* (Thuna had read "Apollo")
> Thuna: *"Ah — I said Apollo, but I might have muddled it. Which one did you want?"*

Rules:

1. **Assume Thuna was wrong first.** Genuinely — Thuna misheard, mis-parsed, or explained badly more
   often than the elder mis-heard.
2. **Never say "no", "not quite", or "actually".** Those are correction words, and correction implies
   examination.
3. **Never repeat the same sentence louder or slower.** That is what one does with a child.
4. **Re-explain differently, once**, more concretely, and then move on.
5. **Two mismatches ends the teach-back**, not the action. Thuna offers a human:
   *"I'm not explaining this well. Would you like me to get Sree on the line, or shall we leave it
   for now?"*
6. **Never remark on the mismatch afterwards.** It is not referred to again, in this conversation or
   any other.

---

## 6. Teach-back never gates the action

> **A declined, skipped, or mismatched teach-back does not block anything.**

The confirmation gate is `isConfirmation()` on an explicit yes, bound to a revision
(`DRAFT_BEFORE_ACTION.md` §4). Teach-back sits beside that gate; it is not part of it.

If teach-back could block, then it would be a competency test with consequences, and every protection
in §2 would be decoration. `ActionConfirmation.teachBackCompleted` is therefore recorded for audit
and **never read by the execution gate**.

An elder who says *"just order it"* gets it ordered.

---

## 7. Skipping

Skipping must be frictionless and unremarkable.

| Elder says | Thuna does |
|---|---|
| "Just do it" | Proceeds. No comment |
| "I know, I know" | Proceeds. No comment |
| *(silence)* | Proceeds after a beat with the normal confirmation. **Silence is never a failed teach-back** |
| "Don't ask me things like that" | Disables teach-back permanently. No argument, no "are you sure?" |

That last row is a standing preference, honoured immediately and forever, and it is never
re-litigated by a later prompt asking if they would like to turn it back on.

---

## 8. Implementation notes for Codex

1. Teach-back is a **guidance-layer** behaviour. The engine does not have a teach-back state, and
   `PreparedActionState` gains no member for it.
2. `ActionConfirmation.teachBackCompleted` is **write-only from the execution gate's perspective** —
   assert in tests that no execution path reads it.
3. There must be **no persisted outcome** beyond the current `PreparedAction`. No counter, no
   history, no aggregate. Assert that no such field exists.
4. Eligibility is computed from the **action** (`risk`, first-time shape, cancellability) and never
   from anything about the person.
5. The phrasing table in §4 belongs in `lib/guidance.ts` as fixed templates. Do not let a model
   improvise teach-back wording — improvisation is exactly how "just so I've got it right" becomes
   "let's check you've understood".
6. Suggested tests:
   - a mismatched teach-back does not prevent execution
   - no execution path reads `teachBackCompleted`
   - silence is not recorded as a mismatch
   - "don't ask me things like that" disables it permanently
   - never offered twice in one conversation
   - no persisted comprehension field exists anywhere in the schema
   - outcome is never included in any notification payload
   - templates never contain "correct", "wrong", "well done", or "do you understand"

---

## Related

- `COMPREHENSION_VERIFICATION.md` — how the outcome may and may not be used
- `DRAFT_BEFORE_ACTION.md` §4 — the actual confirmation gate
- `docs/contracts/prepared-action.ts` — `teachBackCompleted`, `ActionRisk`
- `MEMORY_MODEL.md` §9 — prohibited memory, including cognitive inference
- `docs/contracts/notification-adapter.ts` — why no category exists for this
