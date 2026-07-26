# Thuna — Priority and Deduplication Policy

> Design document. **Changes no production code.**
>
> Governing principle: **an elder's attention is the scarcest resource in the system.** Every item
> Thuna raises spends some. This document decides what is worth spending it on, and makes sure the
> same thing is never charged for twice.

---

## 1. Why this needs a policy at all

Six sources can produce something to say — life events, routines, deliveries, bills, promises, open
prepared actions — and they overlap constantly. Without a policy:

- A grocery order generates a *delivery event*, a *routine follow-up*, and a *tracking update*, and
  the elder hears about one order three times.
- A bill produces a reminder three days out, another the day before, and a life-event mention in the
  brief, on the same morning.
- Whichever source happens to be queried first wins, so ordering becomes an accident of code.

Repetition is how a helpful companion becomes nagging. Nagging is the failure mode that makes people
turn the thing off.

---

## 2. Priority tiers

Items sort by tier first, then by time within tier.

| Tier | Contains | Example |
|---|---|---|
| **P0 — Unresolved provider outcome** | Any `PreparedAction` in `EXECUTED` with `status: 'UNKNOWN'` | "let me check whether that order went through" |
| **P1 — Happening now or very soon** | Life events `DUE`/`ACTIVE`; routines due within the hour | "your tablet, in ten minutes" |
| **P2 — Today, still actionable** | Today's events; a delivery arriving today; a bill due today | "Sree at four" |
| **P3 — Soon, still actionable** | Due in 1–7 days where the elder can still act | "bill due Friday" |
| **P4 — Open loops** | Unfinished promises; half-finished prepared actions | "you mentioned calling Priya" |
| **P5 — Nice to know** | Celebrations, notes, non-actionable events | "Priya's birthday tomorrow" |

**P0 outranks everything, including a medicine reminder.** An elder who does not know whether food is
coming is in a worse position than one whose tablet slips ten minutes, and unlike everything else on
this list, P0 never expires — it must be resolved or escalated to a human
(`INTERRUPTION_AND_RESUME.md` §7).

### Within a tier

1. Earlier time first.
2. Then: **can the elder still do something about it?** Actionable beats informational.
3. Then: **did the elder create it?** `ELDER_SPOKEN` beats `FAMILY_SUGGESTED` beats `SYSTEM_DERIVED`.
4. Never by amount. A ₹2,000 grocery order is not more important than a ₹40 one; that is the
   system's view of importance, not the elder's.

---

## 3. Deduplication

### The rule

> **One real-world thing produces exactly one spoken item, however many sources describe it.**

### Merge keys

Items merge when they share any of:

| Key | Merges |
|---|---|
| `preparedActionId` | An order, its delivery event, and its follow-up routine |
| `externalRef` (order/ride/booking id) | Tracking updates with the event that created them |
| `pendingLoopId` | Every step of one loop |
| `lifeEventId` | Multiple lead times of the same event |
| Same kind + same day + same place label | A calendar-synced appointment and the elder's own spoken one |

That last key is fuzzy, and fuzzy merges are **only allowed to combine, never to drop**. When two
items merge and disagree — different times for the same appointment — Thuna **asks** rather than
picking one:

> *"I've got the appointment at eleven, and your calendar says half past. Which is right?"*

Silently choosing is the failure mode from `MEMORY_MODEL.md` §8, and the same rule applies: most
recent wins for *storage*, but a live contradiction gets a question, not a guess.

### Merged phrasing

The merged item takes the **most actionable** source's phrasing and the **most authoritative**
source's figures.

> Not: *"Your grocery order was placed. Your grocery order is out for delivery. Did your grocery
> order arrive?"*
> But: *"Your groceries are out for delivery — should be by seven."*

---

## 4. Suppression

An item is dropped entirely, not merged, when:

| Condition | Reason |
|---|---|
| Already surfaced for this lead time | `markSurfaced()` — `life-event-adapter.ts` |
| Elder addressed it in this session | They just dealt with it |
| Elder said "stop reminding me about this" | Immediate and permanent for that item |
| Daily cap reached | `ROUTINE_ENGINE.md` §7 — elder-set |
| Quiet hours, and it is deferrable | Defers to the next allowed slot |
| It is a completed thing with no action left | Nothing to say |
| It is `NEEDS_CONFIRMATION` | Not a fact yet — it gets a *question* elsewhere, not a statement |

**P0 is exempt from the daily cap and from quiet hours deferral only if the elder is already
talking to Thuna.** It never wakes them. An unresolved order at 2am waits until morning — but it is
first in line when morning comes, and it is never dropped.

---

## 5. Truncation

The brief speaks **three items**. Beyond that:

> *"...and a couple of other bits — want to hear them?"*

Rules:

1. Truncation is **spoken**, never silent. The elder always knows something was held back.
2. Dropped items are **not** re-prioritised into tomorrow's brief as though new — they keep their
   original timing.
3. **P0 is never truncated.** If there are three P0 items, the brief is three P0 items and the rest
   waits.
4. Truncation applies to the brief, not to proactive check-ins. A routine reminder is not competing
   for a slot.

---

## 6. Anti-nagging budget

Across a whole day, per item:

| Item kind | Maximum mentions |
|---|---|
| A single bill | 2 (one lead-time mention, one on the day) |
| A single appointment | 2 |
| A promise | 1 per **week**, and Thuna offers to drop it after three |
| An unfinished prepared action | 1, then it expires quietly |
| A routine | governed by `ROUTINE_ENGINE.md` — one retry, then stop |
| A P0 unresolved outcome | as many as needed, but each must carry new information |

The promise rule matters. *"You mentioned calling Priya"* is a kindness the first time and a reproach
the fourth. After three, Thuna asks whether to let it go:

> *"You mentioned calling Priya a while back — shall I keep reminding you, or leave it?"*

---

## 7. What priority is never based on

- **Anything about the person.** No engagement scoring, no responsiveness history, no "they usually
  ignore this so rank it lower".
- **Any inferred state.** No mood, no health, no cognitive signal.
- **Family preference.** A family member cannot promote an item.
- **Commercial value.** No provider, item or capability is ranked up because it is monetisable.

Ranking derived from behaviour is behavioural analytics wearing a helpful hat, and
`MEMORY_MODEL.md` §9 prohibits it outright.

---

## 8. Implementation notes for Codex

1. Make it a **pure function**: `(items, now, elderPrefs) → orderedItems`. No I/O, easily tested,
   same discipline as `lib/engine.ts`.
2. Deduplicate **before** truncating. Truncating first drops an item that would have merged away.
3. Merge keys are checked in the order listed in §3 — exact ids before the fuzzy key.
4. A fuzzy merge that finds a contradiction must emit a `NEEDS_CLARIFICATION` item, not resolve it.
5. Record which items were suppressed and why, for the Demo Inspector. Silent suppression is
   impossible to debug and impossible to trust.
6. Suggested tests:
   - an order, its delivery and its follow-up produce one item
   - P0 outranks a due medicine reminder
   - P0 is never truncated
   - conflicting times produce a question, not a pick
   - an item surfaced this morning is suppressed this evening
   - a promise is offered for dropping after three mentions
   - the daily cap suppresses P3–P5 but not P0
   - ordering never reads any behavioural field (assert none exists)

---

## Related

- `DAILY_LIFE_BRIEF.md` — the main consumer
- `ROUTINE_ENGINE.md` §7 — daily caps, quiet hours, global pause
- `INTERRUPTION_AND_RESUME.md` §7 — why P0 never expires
- `docs/contracts/life-event-adapter.ts` — `markSurfaced()`, `LeadTime`
- `MEMORY_MODEL.md` §8, §9 — correction semantics, prohibited inference
