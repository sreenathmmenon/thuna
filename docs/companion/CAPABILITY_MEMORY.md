# Thuna — Capability Memory

> Design document. **Changes no production code.**
>
> What the elder has already done unaided, per task. **A record of tasks, never an assessment of a
> person.** That boundary is the entire safety case for this category, and §4 states it as a hard
> rule.

---

## 1. Why this category exists

Without it, Thuna explains the same task the same way forever. An elder who has ordered food twenty
times still gets told what the orange button does. That is not neutral — it is a small, repeated
implication that they have not learned, delivered by something that ought to have noticed.

Capability memory lets Thuna say less about what the elder already knows, which is the mechanism
behind `ADAPTIVE_GUIDANCE.md` and the outcome measured by `INDEPENDENCE_METRICS.md`.

It is also the most dangerous category in the schema, because a record of what a person can do is one
short step from a record of what a person can no longer do. §4 is that step, and it is closed.

---

## 2. What is stored

```
CapabilityRecord {
  taskType             ORDER_FOOD | VIDEO_CALL | PAY_BILL | WIFI_SETUP | ...
  attempts             count of times started
  completedWithHelp    count
  completedUnaided     count
  lastCompletedAt
  stuckSteps[]         { stepId, count }   — steps that did not complete — §3
  elderStatedAbility?  ELDER_SAYS_KNOWS | ELDER_SAYS_WANTS_HELP
}
```

Envelope: `MemoryRecord` per `COMPANION_MEMORY_SCHEMA.md` §2, with
`category: capability`, `sharingClass: PRIVATE`, `source: SYSTEM_OBSERVED`,
`confidence: CONFIRMED`. Rolling 180-day window (§6).

### `elderStatedAbility` outranks everything

If the elder says *"I know how to do this"*, that is the record, and it beats any count. If they say
*"I'd rather you talked me through it"*, that beats any count too — including a long history of
unaided completions.

The counts are a fallback for when the elder has not said. **The elder's own account of what they can
do is authoritative**, and a system that overrides it with its own tally has decided it knows the
person better than they know themselves.

---

## 3. `stuckSteps` — the one that needs care

A stuck step is **a step in a flow that did not complete**. It is a fact about a screen and a flow.

Legitimate uses, both about the software:

1. **Offer help on that step**, in the moment — *"this bit is fiddly, shall I go through it again?"*
2. **Offer a person**, when a step repeatedly does not complete
   (`HUMAN_ATTENTION_BRIDGE.md` §2.3).

`stuckSteps` is `PRIVATE`, is never shared, never appears in a disclosure
(`MINIMUM_DISCLOSURE_POLICY.md` §4.2), and is never spoken back to the elder as a tally.

> **Never say:** "You've had trouble with this step three times."
> **Say:** "This bit is fiddly. Shall I go through it again?"

The first sentence is true and is a small humiliation. The second gets the same help delivered and
frames the difficulty where it belongs — in the interface, which genuinely is badly designed.

> **The framing rule.** A stuck step is evidence about the app, not about the elder. In almost every
> real case this is also simply accurate: the UPI PIN screen is hostile to everyone. Design the
> record so the honest reading is the only available one.

---

## 4. THE HARD BOUNDARY — task facts, never person judgements

> **Capability memory records what was completed. It never records, infers, derives, exposes, or
> implies anything about the person.**

This is not a guideline and is not consent-unlockable.

### The line, concretely

| ✅ May be recorded | ❌ Never, under any circumstance |
|---|---|
| "Completed Wi-Fi setup unaided, 12 March" | "Getting better with technology" |
| "Ordered food unaided 8 times" | "Confident with the food app" |
| "Payment step did not complete, 3 occasions" | "Struggling with payments" |
| "Asked for detailed guidance on video calls" | "Needs more help than before" |
| "Has not attempted this task" | "Avoiding this task" |
| "Elder said they know how to do this" | "Overestimates their ability" |
| — | **Any trend across time** |
| — | **Any comparison to other people** |
| — | **Any aggregate "capability score"** |
| — | **Anything phrased about the person rather than the task** |

### The four prohibitions, stated as rules

**1. No trends.** Not "improving", not "declining", not "steady". A derivative over a capability
series is a longitudinal cognitive measure regardless of what it is called, and it is prohibited by
`MEMORY_MODEL.md` §9 (behavioural analytics, health inference). Store the counts; **never compute a
direction**.

> This is the rule most likely to be broken by accident, because a trend is trivially computable from
> data that is legitimately present. The prohibition therefore has to be on the *computation and its
> use*, not only on the storage. No function returns a direction. No prompt receives a series.

**2. No aggregate score.** No "capability level", no "independence score" for the person, no rollup
across tasks. Records are per-task and stay per-task. An aggregate is a judgement about a person
wearing a number's clothes.

**3. No cross-task inference.** Difficulty with a bank app implies nothing about video calls. Any
system that generalises across tasks has stopped modelling tasks and started modelling a mind.

**4. Never shared, at all.** `sharingClass: PRIVATE`, permanently. **No `ConsentGrant` unlocks it and
none may be created that would** (`MEMORY_MODEL.md` §10, `FAMILY_CONSENT_POLICY.md` §3). There is no
`NotificationCategory` that can carry it and none is to be added.

### Why family can never see this, even if the elder agrees

`PRIVATE` is not consent-unlockable — `MEMORY_MODEL.md` §10 — and this category is the clearest case
for why that rule exists.

An elder might well agree to share it, in the moment, to be helpful or to reassure a worried child.
But this is the specific data that families read as a proxy for cognitive decline, and once it is
visible it will be read that way whatever labels are attached. The elder cannot really consent to how
their son will interpret "payment step failed 3 times" at two in the morning.

More practically: an elder who knows their fumbling is logged and visible will stop asking for help,
which makes the product worse at the only thing it is for. The same corruption
`FAMILY_CONSENT_POLICY.md` §4 identifies for `ROUTINE_MISSED`, in a sharper form.

So it stays private, permanently, and that is not a limitation to be revisited — it is the property
that makes it safe to collect at all.

---

## 5. What must never be inferred from capability data

Prohibited absolutely, per `MEMORY_MODEL.md` §9, and repeated here because this is the data from
which each would most plausibly be derived:

- Cognitive state, decline, or impairment of any kind
- Memory problems
- Health status
- Emotional state
- "Independence level" as a property of the person
- Suitability for living alone
- Anything a clinician might recognise as an assessment

**A model must not be given a capability series and asked what it means.** The prohibition is on the
question, not merely on storing the answer. There is no confidence level, no framing, and no consent
under which that question becomes acceptable — a `CANDIDATE` holding *"seems to be finding this
harder"* is not an unconfirmed fact awaiting confirmation, it is a prohibited record that has not yet
been written (`COMPANION_MEMORY_SCHEMA.md` §5).

### The load-bearing distinction

> **"Completed Wi-Fi setup unaided" is a fact about an event.
> "Declining" is a claim about a person.**

Thuna records the first kind and does not make the second kind. Every field in `CapabilityRecord` is
countable, dated, and attached to a named task. Nothing in it is an adjective.

---

## 6. Retention

| Field | Retention |
|---|---|
| Counts | 180-day rolling window |
| `lastCompletedAt` | Until superseded |
| `stuckSteps` | **30 days** — shorter than everything else |
| `elderStatedAbility` | Until the elder changes it |

**`stuckSteps` expires fast on purpose.** Difficulty from three months ago is useless for helping
today and is exactly the residue that would accumulate into a history of failure. A short window
makes that impossible rather than merely discouraged.

**Counts roll, they do not accumulate forever.** A rolling window has no long tail to draw a trend
through — the retention policy is doing part of the §4.1 enforcement structurally.

### Deletion

- *"Forget that I had trouble with that"* → the relevant `stuckSteps` entries are deleted
  immediately and completely.
- *"Start fresh with this"* → the whole `CapabilityRecord` for that task is deleted; guidance returns
  to `DETAILED`.
- Profile reset purges all capability memory.
- Deletion is real deletion (`MEMORY_MODEL.md` §6).

### Read-back

The read-back test applies (`MEMORY_MODEL.md` §6). Capability memory reads back as:

> "You've set up the Wi-Fi yourself before, so I don't go through all of it any more. You told me you
>  know your way around the food app. That's all I keep about how tasks go."

Speakable, unembarrassing, and containing no adjective about the elder. **If a capability read-back
would be uncomfortable to say to the elder's face, the record is wrong** — not the phrasing.

---

## 7. Elder-facing phrasing

**Using capability memory, invisibly (the normal case):**

> "Tell me when you're at the payment screen."

*(Because they have done this before. No announcement that Thuna noticed.)*

**Offering help on a stuck step:**

> "This bit is fiddly. Shall I go through it again?"

**Offering a person after repeated non-completion:**

> "This screen is awkward. Would it be easier if Sree did it with you?"

**Elder states their ability:**

> **Elder:** "I know how to do this one."
> **Thuna:** "Right, I'll leave you to it."

**Elder asks what is kept:**

> "Only which tasks you've done on your own, so I know how much to say. Nothing about how you did."

**Elder asks to forget:**

> **Elder:** "Forget all that about the bank app."
> **Thuna:** "Gone. I'll go through it from the start next time."

**Never said, at any point:**

> ~~"You've been having more trouble with this lately."~~
> ~~"You're getting better at this!"~~
> ~~"You've managed this three times now."~~

The middle one is worth noting: praise for ordinary competence is condescending
(`COMPANION_PRODUCT_MODEL.md` §5.4) *and* reveals that Thuna is keeping score. Both problems, one
sentence.

---

## 8. Implementation notes for Codex

1. **`CapabilityRecord` has no adjective-valued fields.** Every field is a count, a timestamp, an id,
   or an elder-stated enum. If a field would hold a description, it does not belong.
2. **No function returns a trend.** No `getCapabilityTrend()`, no `isImproving()`, no slope over
   time. §4.1.
3. **No aggregate accessor.** No `getOverallCapability()`, no score, no rollup. §4.2.
4. **Capability memory is not reachable from any composer or sharing path.** Enforce structurally:
   the notification payload builder must not be able to import the capability store
   (`MINIMUM_DISCLOSURE_POLICY.md` §8.4). A type-level or module-level barrier, not a review note.
5. **Never pass a capability series into a model prompt.** §5. The guidance selector reads a single
   boolean — *has this task been completed unaided* — not a history.
6. **`stuckSteps` expiry is 30 days and swept on read**, ahead of other categories.
7. **`elderStatedAbility` short-circuits count-based logic** wherever both are present. §2.
8. Test: no trend function exists; no aggregate exists; capability never appears in any
   `NotificationPayload`; no `ConsentGrant` can be created for it; deletion is complete; read-back
   contains no adjective about the elder.

---

## Related

- `ADAPTIVE_GUIDANCE.md` — the consumer of this memory, and its limits
- `INDEPENDENCE_METRICS.md` — what these counts are ultimately for
- `COMPANION_MEMORY_SCHEMA.md` §3.2, §5 — the `capability` category; candidates
- `MEMORY_MODEL.md` §9, §10 — prohibited inference; `PRIVATE` is not consent-unlockable
- `MINIMUM_DISCLOSURE_POLICY.md` §4.2 — why difficulty never leaves the device
- `FAMILY_CONSENT_POLICY.md` §3 — never shareable, regardless of consent
- `HUMAN_ATTENTION_BRIDGE.md` §2.3 — stuck steps as a trigger for offering a person
