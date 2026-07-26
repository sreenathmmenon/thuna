# Thuna — Comprehension Verification

> Design document. **Changes no production code.**
>
> Companion to `TEACH_BACK_POLICY.md`. That document covers *how to ask*. This one covers **what may
> be done with the answer** — which is far less than an engineer's instincts will suggest.
>
> Governing principle: **the outcome adapts the next sentence, and nothing else.** It is not data
> about a person. It is feedback about an explanation.

---

## 1. The single permitted use

> **Use the outcome ONLY to adapt guidance, in this moment, for this thing.**

That is the whole permission. Concretely:

| Signal | Permitted adaptation |
|---|---|
| The elder restated the destination differently | Re-say the destination more concretely, once |
| The elder did not mention the total | Lead with the total in the next sentence |
| The elder asked "which one?" | Offer fewer options — two, not five |
| The teach-back was skipped | Nothing at all. Carry on |

Every one of those adaptations is **scoped to the current `PreparedAction`** and evaporates with it.

---

## 2. What may never be derived

This section is the reason the document exists. Each row is a thing a well-meaning engineer might
build, and each is prohibited.

| Never build | Why |
|---|---|
| A comprehension score, per session or lifetime | It is a cognitive assessment. Thuna is not qualified and never will be |
| A trend over time ("more mismatches lately") | Behavioural analytics, prohibited outright — `MEMORY_MODEL.md` §9 |
| An inferred condition, however hedged | Not a consent gap. Thuna does not produce this at any confidence |
| Adaptive difficulty or "simplified mode" triggered by outcomes | Silently deciding someone needs simpler treatment, without asking them |
| A family-facing signal of any kind | There is no `NotificationCategory` for it and adding one would be a safety change, not a feature |
| Routing to a different model or voice based on outcomes | Same objection as adaptive difficulty, in a different wrapper |
| Using latency, hesitation, or filler words as a signal | These measure noise, hearing, and distraction — not comprehension |
| Storing the elder's teach-back answer verbatim beyond the action | A transcript by another name — `MEMORY_MODEL.md` §9 |

**The test for any new idea in this area:** would the elder be content to hear Thuna read it back
aloud, in their own words, as something it keeps about them? *"I have noticed you understand me less
often lately"* fails that test decisively. So does every softened version of it.

---

## 3. Pace and simplicity are elder-set, not inferred

An obvious-seeming feature is "notice they are struggling and slow down". Thuna does not do this.

| Legitimate | Not legitimate |
|---|---|
| The elder set `preferredPace: slow` in their profile | Thuna slowing down because it judged they needed it |
| The elder said "say that again slowly" | Thuna inferring from a mismatch |
| The elder said "keep it short" | Thuna shortening because they hesitated |
| Thuna offering: *"Would you rather I go a bit slower?"* — and honouring the answer | Deciding on their behalf |

The difference is **agency**. Asking is respectful and takes one sentence. Deciding silently that
someone needs simpler treatment is a judgement about them that they never consented to and cannot
see. `MEMORY_MODEL.md` §2 puts pace in *profile* memory — elder-controlled — for exactly this reason.

Offering is always allowed. Offering repeatedly is not: if declined, do not ask again this session.

---

## 4. Lifetime of the outcome

| Where it lives | How long |
|---|---|
| In-memory, on the current `PreparedAction` | Until that action reaches a terminal state |
| `ActionConfirmation.teachBackCompleted` | With the action's audit record — a boolean, for auditability of what happened, never read by any decision path |
| Anywhere else | **Nowhere else.** There is no other store |

No aggregate. No counter. No episodic memory entry. The verbatim answer is **never** persisted — it
is used to choose the next sentence and discarded, like any other turn of conversation
(`MEMORY_MODEL.md` §4: no transcripts beyond the session).

---

## 5. What a mismatch actually means

Ranked by real-world frequency, a teach-back mismatch means:

1. The line was noisy, or Thuna's audio was unclear.
2. Thuna's sentence was too long, too fast, or badly ordered.
3. The elder was doing something else — the door, the kettle, the television.
4. Thuna used a word they do not use, or an English word inside a Malayalam sentence.
5. The elder heard perfectly and answered a slightly different question.
6. ...somewhere far down this list, anything about the person.

Six plausible explanations for a mismatch, five of which are about Thuna or the room. Building
inference on a signal this noisy would be poor engineering even if it were ethically permissible.
It is not permissible, and it is also unsound.

**So the correct response to a mismatch is to fix the explanation** — shorter, more concrete, the
elder's own words — and carry on.

---

## 6. Auditability without profiling

The audit record answers *"what did Thuna do?"* It never answers *"how is this person doing?"*

Permitted in the audit trail:

```
preparedActionId, at, teachBackOffered: true, teachBackCompleted: false,
outcome: SKIPPED | MATCHED | MISMATCHED, adaptationApplied: "led with total"
```

Prohibited:

```
elderId + outcome history          ← a profile
mismatchCount, mismatchRate        ← a score
verbatim answer text               ← a transcript
```

The distinction is the join key. Records keyed to an **action** are audit. Records keyed to a
**person** are a profile. Thuna keeps the first and never the second.

Audit records are bounded (suggest 90 days, matching episodic memory) and are purged on profile
reset.

---

## 7. If someone asks for this feature later

Expect the request. It will arrive as *"could Thuna flag when Appa seems to be having trouble?"*, and
it will come from a family member who loves the elder and is worried.

The answer is no, and the reason is worth saying plainly:

> Thuna would be guessing, it would often be wrong, and the elder would never know a judgement was
> being made about them. A companion that reports on someone's mind to their children is not a
> companion.

What Thuna offers instead is real and often better: *"Would you like me to get Sree on the line?"* —
elder-initiated, consented, and a route to an actual human who can actually help.

Any future change here needs a product-level ethics decision and explicit, informed, revocable elder
consent — **not** a new field, a new enum member, or a config flag.

---

## 8. Implementation notes for Codex

1. Assert the absence of the prohibited shape. A test that greps the schema for `comprehension`,
   `score`, `mismatchCount`, `cognitive`, `declin*` and fails on a hit is cheap and worth having.
2. Outcome type is a plain enum on the in-flight action: `SKIPPED | MATCHED | MISMATCHED`. It has no
   store, no repository, and no query method.
3. Adaptation is a **template selection** in `lib/guidance.ts` for the next utterance only. It must
   not set any flag that survives the action.
4. Pace and verbosity read from **profile** memory only. Assert no code path writes them from a
   teach-back outcome.
5. `NotificationPayload` construction must be unable to reference a teach-back outcome — no category
   accepts it, and the type should make that structural rather than conventional.
6. Suggested tests:
   - no persisted field anywhere contains a comprehension outcome keyed to the elder
   - a mismatch does not change `preferredPace`
   - a mismatch does not change model or voice selection
   - the verbatim answer is not stored after the action terminates
   - no notification path can carry the outcome
   - audit records are keyed to `preparedActionId`, never to `elderId` alone
   - repeated mismatches across sessions produce no cumulative effect of any kind

---

## Related

- `TEACH_BACK_POLICY.md` — how to ask, and how never to ask
- `MEMORY_MODEL.md` §9, §10 — prohibited memory; private vs shareable
- `docs/contracts/notification-adapter.ts` — the deliberately absent categories
- `docs/contracts/prepared-action.ts` — `teachBackCompleted`
- `FAMILY_CONSENT_POLICY.md` — what family may and may not be told
