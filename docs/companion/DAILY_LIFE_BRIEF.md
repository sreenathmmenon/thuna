# Thuna — Daily Life Brief

> Design document. **Changes no production code.**
>
> Governing principle: **the brief is a favour, not a report.** It exists because an elder said they
> would like one. It is short, it is opt-in, and the day it starts feeling like a status meeting
> about their life, it has failed.

---

## 1. What it is

Once a day, at a time the elder chose, Thuna says a handful of sentences about what is coming up.

> *"Morning. Two things today — Sree's coming at four, and your electricity bill is due Friday.
> That's all."*

Twenty seconds. Three items at most. Ends with a clear full stop so the elder knows it is over.

**What it is not:** a summary of their week, a compliance dashboard, a list of what they did not do,
or anything a family member receives.

---

## 2. Opt-in, always

| Rule | Detail |
|---|---|
| **Off by default** | A new elder gets no brief until they ask for one |
| **Elder-set time** | They choose when. Default suggestion 08:00, never imposed |
| **Quiet hours win** | A brief due inside quiet hours defers to the next allowed slot, or is skipped |
| **"Not today"** | Skips today, keeps the arrangement |
| **"Stop these"** | Off immediately, no argument, no "are you sure?" |
| **Skipping is silent** | Nothing to say → say nothing. No "you have no events today" |

That last row matters. A brief that fires every morning regardless of content trains the elder to
stop listening, and then it is noise on the day it matters.

---

## 3. What may be in it

| Source | Example | Contract |
|---|---|---|
| Upcoming life events | "Sree's coming at four" | `LifeEvent` (`APPOINTMENT`, `FAMILY_COMMITMENT`, `CELEBRATION`) |
| Bills due | "electricity bill Friday" | `LifeEvent` (`BILL_DUE`) — **reminder only** |
| Deliveries expected | "your order should come by seven" | `LifeEvent` (`DELIVERY_EXPECTED`) + capability tracking |
| Today's routines | "your morning tablet at nine" | `ROUTINE_ENGINE.md` occurrences |
| Family commitments | "Priya's birthday tomorrow" | `LifeEvent` (`CELEBRATION`) |
| Unfinished promises | "you mentioned calling Priya" | `MEMORY_MODEL.md` §4 pending promises |
| An action awaiting them | "there's a dosa order half-done from yesterday" | `PreparedAction` still open |

All of it comes through `LifeEventAdapter.query()` and the routine store — one read surface, so the
brief cannot miss a source by forgetting it exists.

---

## 4. What may never be in it

- **Anything the elder did not do.** No "you missed your tablet twice this week."
- **Any pattern, trend or count over time.** No "you've been ordering in more lately."
- **Any inference about health, mood, or capability.** Thuna does not produce these at all
  (`MEMORY_MODEL.md` §9).
- **Anything a family member said about them**, unless the elder already accepted it as their own
  event.
- **Anything from a `SHARED_EXTERNAL` calendar the elder did not include** (`calendar-adapter.ts`).
- **Unconfirmed extractions.** A `NEEDS_CONFIRMATION` life event is not a fact yet; it may be raised
  as a *question* elsewhere, but never stated in the brief as though it were settled.

The distinction throughout: the brief tells the elder **what is coming**, never **how they have been
doing.**

---

## 5. Shape of the utterance

```
[greeting]  [count]  [item] [item] [item]  [close]
```

> *"Morning. Three things — the tablet at nine, Sree at four, and the bill Friday. That's all."*

Rules:

1. **Say the count first.** "Three things" lets the elder relax; an open-ended list makes them brace.
2. **Three items maximum.** Anything beyond becomes "and a couple of other bits — want to hear them?"
3. **Short clauses.** Times as words ("at four"), amounts as words ("three hundred and forty rupees"),
   no ids ever.
4. **A definite ending.** "That's all." An elder should never be left waiting for more.
5. **Interruptible.** They can stop it mid-sentence, and it does not resume unless asked.
6. **No follow-up questions inside it.** The brief informs. If something needs deciding, offer *after*
   the close: *"Want me to sort the bill reminder now, or later?"*

---

## 6. Prioritisation and deduplication

Fully specified in `PRIORITY_AND_DEDUP_POLICY.md`. Summary:

- Ordered by **time-criticality first**, then by whether the elder can still do something about it.
- Deduplicated across sources — a delivery is one item whether it came from a life event, an order
  tracker, or a routine follow-up.
- Truncated to three, with the dropped items available on request, never silently discarded.

---

## 7. Language and pace

- The elder's language (`ml-IN` by default in the seed profile) and their chosen pace.
- Their own words for things: "your morning tablet", not "MEDICINE_REMINDER".
- Names as they use them: "Sree", "Priya".
- The brief is a **single utterance** where the channel allows, so barge-in works naturally.

---

## 8. On-demand brief

The elder can ask at any time — *"what's on today?"* — and get the same thing. Same content, same
priority rules, no quiet-hours check (they asked, so they are awake).

An on-demand brief is always available even when the scheduled one is off. Turning off the morning
brief means "stop volunteering it", not "refuse to tell me".

---

## 9. Implementation notes for Codex

1. Build it from `LifeEventAdapter.query()` plus routine occurrences. **One read path**, so a new
   source cannot be forgotten.
2. Quiet hours are checked in `dueNow()` / `openSession()`, not in the brief builder — the same
   chokepoint argument as everywhere else.
3. The brief is **read-only**. It never transitions a life event, never marks anything surfaced other
   than the lead times it actually spoke.
4. An empty brief must produce **no utterance and no session**, not a spoken "nothing today".
5. Render from stored, elder-owned data. Never re-fetch provider PII to build it.
6. The brief is not a notification to family and shares no channel with `NotificationAdapter`.
7. Suggested tests:
   - brief off by default for a new profile
   - empty brief produces no utterance
   - brief defers inside quiet hours
   - never more than three spoken items
   - a missed routine never appears
   - an unconfirmed `DOCUMENT_EXTRACTION` event never appears
   - "stop these" takes effect the next morning, without confirmation ceremony
   - on-demand brief works with the scheduled brief disabled

---

## Related

- `PRIORITY_AND_DEDUP_POLICY.md` — ordering and merging, in full
- `docs/contracts/life-event-adapter.ts` — the query surface
- `ROUTINE_ENGINE.md` §7 — quiet hours, daily caps, global pause
- `MEMORY_MODEL.md` §4 — pending promises
- `CHECKIN_CONVERSATION_POLICY.md` — how proactive contact is opened
