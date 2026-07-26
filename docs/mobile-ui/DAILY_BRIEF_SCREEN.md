# Thuna — Daily Brief Screen

> Design specification. **Changes no production code.**
>
> Route `/brief`. Depth 1. The visual form of the brief defined in
> `docs/companion/DAILY_LIFE_BRIEF.md` — *a favour, not a report.*

---

## 1. What this screen is

Once a day, at a time the elder chose, Thuna says a handful of sentences about what is coming up.
This screen is what the elder sees while that is spoken, and what they can open later to read it
again.

The policy is defined elsewhere and **is not restated here**:

| Question | Answered in |
|---|---|
| What may and may not be in the brief | `DAILY_LIFE_BRIEF.md` §3, §4 |
| Opt-in rules, quiet hours, "stop these" | `DAILY_LIFE_BRIEF.md` §2 |
| The shape of the spoken utterance | `DAILY_LIFE_BRIEF.md` §5 |
| Ordering, tiers, merge keys, suppression, truncation | `PRIORITY_AND_DEDUP_POLICY.md` §2–§6 |

This document specifies only the screen: how it is offered, how it looks, what each row does, and how
it is turned off.

### 1.1 Six kinds of item

The brief may contain, at most, one item of each of these kinds — and never more than five rows in
total:

| Kind | Example row | Source |
|---|---|---|
| **Due now** | Evening reminder · 7:30 PM | Routine occurrence, P1 |
| **Upcoming event** | Ravi's daughter's wedding · Saturday · Guruvayur | `LifeEvent`, P2/P3/P5 |
| **Bill** | Electricity bill · Friday · Rs 840 | `LifeEvent` `BILL_DUE`, P3 — **reminder only** |
| **Delivery** | Groceries · by 7 PM today | `LifeEvent` `DELIVERY_EXPECTED`, P2 |
| **Routine** | Morning tablet · 9:00 AM | Routine occurrence, P1/P2 |
| **Pending promise** | You mentioned calling Priya | `PendingLoop`, P4 |

### 1.2 The three hard limits

1. **Opt-in, default OFF.** A new elder never sees this screen until they ask for it.
2. **Three to five rows maximum.** The screen shows up to five; the *spoken* brief says three
   (`DAILY_LIFE_BRIEF.md` §5.2). §5.3 explains why those differ.
3. **Every row has one clear action.** A row with nothing to do is not a row.

---

## 2. Opt-in flow

The brief is offered exactly once, at a moment when it is obviously relevant, and never again unless
the elder raises it.

### 2.1 When the offer is made

All three must hold:

1. The elder has completed **at least three** tasks with Thuna — reactive competence precedes
   proactive contact (`COMPANION_PRODUCT_MODEL.md` §1).
2. The elder has, on at least two separate days, asked something the brief would have answered —
   "what's on today?", "when is the wedding?", "when's the bill due?".
3. It is not inside quiet hours.

Absent all three, the offer is never made. Thuna does not sell features.

### 2.2 How it is offered — spoken

The offer is made in conversation, after a task has completed, and it is a single sentence with an
easy no:

> **"You've asked a few times what's on for the day. Would you like me to tell you each morning?
> It's a few lines and you can stop it any time."**

If the elder says no, or says nothing, Thuna does not ask again. There is no second offer, no
reminder to reconsider, and no badge left on Home. `CHECKIN_CONVERSATION_POLICY.md` §5 — refusal is a
complete answer.

### 2.3 How it is offered — on screen

If the elder is on Home when the conditions are met, and is not in a conversation, a single card
appears **below** the context items — never above them, and never in place of one.

```
┌───────────────────────────────────────────────────────────┐
│ Each morning, shall I tell you what's on?    20px / 600   │  --teal-100
│ A few lines. You can stop it any time.       18px / 400   │  radius 16px
│                                                           │  padding 16px
│ ┌───────────────────┐   ┌───────────────────┐             │  height 148px
│ │  Yes, please      │   │  No thanks        │             │  buttons 56px
│ └───────────────────┘   └───────────────────┘             │
└───────────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Appears | Once. If dismissed by either answer, never again. |
| Position | Below the last context item on Home, above the family help line |
| No dismiss-by-ignoring | If the elder navigates away without answering, the card is gone and counts as "no" |
| No third option | No "Remind me later", no "Tell me more" |
| Buttons | 170 × 56px at 390px; side by side; **"No thanks" is not smaller or greyer than "Yes, please"** |

The two buttons are equal in size and weight. A visually diminished "No" is a dark pattern, and this
product's whole claim rests on the elder being in charge.

### 2.4 After "Yes, please"

One question, then done:

> **"What time suits you? I'd suggest eight in the morning."**

The time picker is a modal sheet at `/brief/settings` with six large options at 20px — **7:00, 7:30,
8:00, 8:30, 9:00, and "A different time"** — each a 358 × 60px row. 8:00 is pre-selected as a
suggestion, never imposed (`DAILY_LIFE_BRIEF.md` §2). Choosing closes the sheet with a single spoken
confirmation:

> **"Right — eight each morning. That's set."**

No confirmation screen, no summary, no "you're all set!" celebration.

### 2.5 The on-demand brief is always available

Turning the morning brief off means "stop volunteering it", not "refuse to tell me"
(`DAILY_LIFE_BRIEF.md` §8). Asking *"what's on today?"* opens `/brief` at any time, with the scheduled
brief off, inside quiet hours, or never opted in at all. The **only** difference is that an on-demand
brief performs no quiet-hours check, because asking establishes the elder is awake.

---

## 3. Screen layout — 390 × 844

Content shown for a four-item brief. `env(safe-area-inset-top) = 47px`.

```
 x=0                        390
┌─────────────────────────────────────────────────────────────┐ y=0
│              safe-area-inset-top — 47px                     │
├─────────────────────────────────────────────────────────────┤ y=47
│  MobileHeader                                   height 56px │
│  ← Back                    Today                  20px/600  │  Back 52×52, labelled
├─────────────────────────────────────────────────────────────┤ y=103
│                        gap 24px                             │
│                                                             │ y=127
│  Four things today                          28px / 700      │  count first (§4.1)
│                                                             │ y=165
│                        gap 24px                             │
├─────────────────────────────────────────────────────────────┤ y=189
│  ITEM LIST — margin 16px, width 358px                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │ y=189
│  │▌ Due now                            16px/600 amber    │  │  4px --amber-500
│  │▌ Morning tablet                     20px/600          │  │  height 108px
│  │▌ 9:00 AM                            18px/400          │  │  radius 16px
│  │▌                          Remind me →  18px/600 teal  │  │  action row 44px
│  └───────────────────────────────────────────────────────┘  │ y=297
│                        gap 12px                             │
│  ┌───────────────────────────────────────────────────────┐  │ y=309
│  │▌ Coming                             16px/600 teal     │  │  4px --teal-900
│  │▌ Ravi's daughter's wedding          20px/600          │  │  height 130px
│  │▌ Saturday · Guruvayur               18px/400          │  │  (title wraps)
│  │▌                          Tell me more →              │  │
│  └───────────────────────────────────────────────────────┘  │ y=439
│                        gap 12px                             │
│  ┌───────────────────────────────────────────────────────┐  │ y=451
│  │▌ Bill                               16px/600 teal     │  │  height 108px
│  │▌ Electricity bill                   20px/600          │  │
│  │▌ Friday · Rs 840                      18px/400          │  │
│  │▌                          Remind me →                 │  │
│  └───────────────────────────────────────────────────────┘  │ y=559
│                        gap 12px                             │
│  ┌───────────────────────────────────────────────────────┐  │ y=571
│  │▌ You mentioned                      16px/600 teal     │  │  height 108px
│  │▌ Calling Priya                      20px/600          │  │
│  │▌ A few days ago                     18px/400          │  │
│  │▌                          Call her now →              │  │
│  └───────────────────────────────────────────────────────┘  │ y=679
│                        gap 24px                             │
│                                                             │
│  That's all.                            20px / 500  70%     │ y=703  the full stop
│                                                             │ y=731
│                        gap 24px                             │
│  Turn this off                          18px / 500  teal    │ y=755  56px tap area
│  ──────────────                                             │
│                                                             │ y=811
│                   scroll padding                            │
├─────────────────────────────────────────────────────────────┤
│  BottomNavigation — fixed, 72px + 34px inset                │  overlays from y=738
└─────────────────────────────────────────────────────────────┘ y=844
```

### 3.1 Row heights and the fold

| Rows | Content height | Scrolls at 390 × 844? |
|---|---|---|
| 3 | 674 | no |
| 4 | 794 | yes — "That's all." and "Turn this off" below the fold |
| 5 | 914 | yes |

The scroll container carries `padding-bottom: calc(72px + max(env(safe-area-inset-bottom), 12px) + 24px)`.
The count line at the top is always visible, which is the point of putting the count first — the elder
knows how many there are before they scroll.

### 3.2 360 × 800 and 430 × 932

| | 360 × 800 | 430 × 932 |
|---|---|---|
| Horizontal margin | 12px → row width 336px | 20px → row width 390px |
| Count line | 26px / 700 | 30px / 700 |
| Row title | 20px — **unchanged** | 20px |
| Row detail | 18px — unchanged | 18px |
| Row min height | 108px | 112px |
| Action row | 44px | 48px |
| Gap between rows | 12px | 14px |
| Usable height (Android chrome) | 744 − 84 bar = **660px** | 932 − 106 = 826px |
| Rows above the fold | 3 fully, 4th partially | 5 fully |

At 360px, Malayalam kind labels ("Due now", "You mentioned") wrap to two lines; the label container
reserves 48px at 16px / 1.5, and the row grows rather than clipping (R18).

### 3.3 While it is being spoken

When the scheduled brief fires, the elder hears it and this screen is shown. During speech:

- The row currently being spoken carries a 4px `--teal-900` left rule at **full opacity**; the others
  sit at 40%. This is paired with the row title going to weight 700 — never opacity alone (R16).
- The recovery bar from `VOICE_INTERACTION_STATES.md` §1.2 is present: **Stop**, **Wait**,
  **Say it again**. The brief is interruptible mid-sentence (`DAILY_LIFE_BRIEF.md` §5.5).
- Stop ends the brief immediately and does not resume unless asked.
- When speech ends, the highlight clears and the bottom navigation returns.

---

## 4. Per-item anatomy

### 4.1 The count line

> **"Four things today"**

28px / 700, `--charcoal-900`, the first thing on screen. `DAILY_LIFE_BRIEF.md` §5.1 — saying the
count first lets the elder relax rather than brace. The written form matches the spoken form exactly.

Counts render as words up to ten: "One thing today", "Two things today". Never "4 items", never
"Today's brief (4)".

### 4.2 A row

| Element | Spec |
|---|---|
| Width | 358px at 390; 336px at 360; 390px at 430 |
| Min height | **108px** (130px when the title wraps to two lines) |
| Radius | 16px |
| Background | `--teal-100` |
| Left rule | 4px full height — `--amber-500` for Due now, `--teal-900` for everything else |
| Padding | 16px, content inset 20px from the left edge |
| **Kind label** | 16px / 600, sentence case, coloured to match the rule |
| **Title** | 20px / 600, `--charcoal-900`, up to 2 lines, `line-height: 1.5` |
| **Detail** | 18px / 400, `--charcoal-900` at 75%, one line, middle-dot separated |
| **Action** | 18px / 600, `--teal-900`, right-aligned, with a trailing chevron **and** its text label (R5). Hit area 358 × 44px, the full width of the row's bottom band. |
| Whole row tappable | The row body opens the item in `/talk`; the action row performs the named action. Two targets, 12px apart vertically, both ≥ 44px tall within a 108px row. |

### 4.3 Action per kind

Every row has exactly one action, named as a verb, never "View" or "Details".

| Kind | Action label | Effect |
|---|---|---|
| Due now / Routine | **Remind me** | Confirms the reminder aloud; stays on `/brief` |
| Upcoming event | **Tell me more** | → `/talk`, opening on that event |
| Bill | **Remind me** | Sets a reminder. **Never "Pay now"** — Thuna is a reminder only (`DAILY_LIFE_BRIEF.md` §3) |
| Delivery | **Check on it** | → `/talk`, opening a tracking check |
| Pending promise | **Call her now** / **Call him now** | → `/talk`, opening the call flow with the named person |
| Unresolved outcome (P0) | **Find out** | → `/talk`, opening the resolution flow |

The promise action names the person, because "Call her now" beside "Calling Priya" reads as an offer,
whereas "Take action" reads as an instruction.

### 4.4 What a row never shows

No amount-based emphasis (a Rs 2,000 bill looks exactly like a Rs 40 one —
`PRIORITY_AND_DEDUP_POLICY.md` §2.4). No "overdue" or "missed" framing. No counts of how many times
something has been raised. No source attribution ("from your calendar", "Ravi added this") unless the
elder accepted it as their own. No `NEEDS_CONFIRMATION` item stated as settled — those surface as a
question at `/events/:id/confirm`, never as a brief row (`DAILY_LIFE_BRIEF.md` §4).

---

## 5. Ordering, dedup, and the count

### 5.1 Ordering

Rows appear in the order produced by the priority function in `PRIORITY_AND_DEDUP_POLICY.md` §2 — P0
first, then P1 through P5, time-ascending within a tier. **The screen does not reorder, regroup, or
sort.** No sections, no headers, no "Morning / Afternoon" grouping. One flat list in policy order, so
the top row is always the most pressing thing.

### 5.2 Deduplication

The screen consumes an already-deduplicated list and never merges anything itself
(`PRIORITY_AND_DEDUP_POLICY.md` §3).

Worked example. Ravi's daughter's wedding on Saturday is known from three sources:

1. An `ELDER_SPOKEN` life event — "Ravi's daughter's wedding is Saturday".
2. A `SHARED_EXTERNAL` calendar entry the elder included.
3. A pending loop — "buy a gift for the wedding".

They share the fuzzy merge key *same kind + same day + same place label*, so **one row appears**:

```
┌───────────────────────────────────────────────────┐
│▌ Coming                                           │
│▌ Ravi's daughter's wedding                        │
│▌ Saturday · Guruvayur                             │
│▌                              Tell me more →      │
└───────────────────────────────────────────────────┘
```

The merged row takes the most actionable source's phrasing and the most authoritative source's
figures (`PRIORITY_AND_DEDUP_POLICY.md` §3). The gift promise does **not** get its own row — it is
raised inside `/talk` when the elder taps Tell me more.

If the merged sources **disagree** — the elder said eleven, the calendar says half past — the row does
not pick one. It becomes a question, in place, with an amber rule:

> **"I've got the wedding at eleven, and your calendar says half past. Which is right?"**

with actions **Eleven** / **Half past** / **I'll check**. Silently choosing is prohibited
(`PRIORITY_AND_DEDUP_POLICY.md` §3).

### 5.3 Three spoken, up to five shown

The spoken brief says **three** items (`DAILY_LIFE_BRIEF.md` §5.2). The screen shows up to **five**.

This is deliberate and is the one place the screen and the voice diverge. Speech is linear and
unskimmable — a fourth spoken item costs real attention and cannot be skipped past. A fifth row on a
screen is glanceable and costs nothing to ignore. The difference in medium justifies the difference
in limit.

The two are reconciled explicitly, never silently. When there are more than three items, Thuna's
spoken close is:

> **"...and a couple of other bits — they're on the screen."**

Truncation is always spoken, never silent (`PRIORITY_AND_DEDUP_POLICY.md` §5.1).

Beyond five, a single line sits below the last row — plain text, not a card, not a count badge:

> **"There are a few more. Ask me and I'll go through them."**

18px / 500, `--teal-900`, underlined, 56px hit area. Tapping opens `/talk` with the remaining items.
Dropped items keep their original timing and are not re-prioritised into tomorrow as though new
(`PRIORITY_AND_DEDUP_POLICY.md` §5.2).

### 5.4 The full stop

> **"That's all."**

20px / 500 at 70% opacity, left-aligned, 24px below the last row. It is not a card, not a divider,
and not tappable.

It exists because `DAILY_LIFE_BRIEF.md` §5.4 requires a definite ending — an elder should never be
left waiting for more. The written form gives the same closure to someone reading rather than
listening.

---

## 6. Zero items

### 6.1 The scheduled brief

> **Nothing to say → say nothing.** No utterance, no session, no notification, no screen.

`DAILY_LIFE_BRIEF.md` §2 and §9.4 are unambiguous: an empty brief produces no utterance and no
session. A brief that fires every morning regardless of content trains the elder to stop listening,
and then it is noise on the day it matters.

So on a day with nothing coming up, **nothing happens at all.** No "you have no events today", no
silent notification, no dot on Home.

### 6.2 The on-demand brief

The elder asked, so they get an answer — a short spoken one and a screen that is calm rather than
broken.

**Spoken:**
> **"Nothing on today."**

**Screen:**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                    Today                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Nothing on today.                          28px / 700      │
│                                                             │
│  I'll tell you if something comes up.       20px / 400 70%  │
│                                                             │
│                                                             │
│  Turn this off                              18px / 500 teal │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

No illustration, no icon, no "All clear!", no green tick, no congratulation. The second line does the
reassurance: an empty brief means nothing is wrong, and Thuna is still paying attention.

"Turn this off" remains present, because an elder who opens an empty brief is exactly the elder most
likely to want it stopped.

---

## 7. Turning it off

> **Off immediately, no argument, no "are you sure?"** — `DAILY_LIFE_BRIEF.md` §2.

### 7.1 On screen

**"Turn this off"** is a plain underlined line at the bottom of `/brief`, 18px / 500, `--teal-900`,
56px hit area. It is not hidden in Settings, not behind an overflow menu, and not smaller than the
rest of the screen.

Tapping it opens a modal sheet at `/brief/settings` with three options, each a 358 × 60px row at 20px:

| Option | Effect |
|---|---|
| **Stop the morning brief** | Off immediately. Confirmed once: *"Alright — I've stopped those."* Sheet closes to Home. |
| **Change the time** | Opens the six time options from §2.4 |
| **Keep it as it is** | Closes the sheet, changes nothing |

There is no confirmation dialog on "Stop", no retention offer, no "you'll miss out", no "are you
sure?", and no re-offer later. This is the difference between a product that respects a decision and
one that negotiates with it.

### 7.2 By voice

> Elder: *"Stop these."*
> Thuna: *"Alright — I've stopped those."*

One utterance, immediate effect, no confirmation ceremony. `recoveryType` handling makes the stop path
deterministic and not model-interpreted (`CHECKIN_CONVERSATION_POLICY.md` §10.2).

Related phrasings that must all work: "stop these", "don't tell me these any more", "turn this off",
"I don't want this". And **"not today"** is different — it skips today and keeps the arrangement
(`DAILY_LIFE_BRIEF.md` §2):

> **"Right, nothing this morning. I'll tell you tomorrow."**

### 7.3 After it is off

- No trace on Home. No card, no line, no re-offer.
- `/brief` remains reachable, and asking *"what's on today?"* still works (§2.5).
- Turning it back on requires the elder to ask. Thuna does not prompt.

---

## 8. Quiet hours

Handled upstream, not on this screen (`DAILY_LIFE_BRIEF.md` §9.2 — quiet hours are checked at
`dueNow()` / `openSession()`, not in the brief builder).

| Situation | Behaviour |
|---|---|
| Scheduled brief due inside quiet hours | Defers to the next allowed slot, or is skipped. Never fires. |
| Elder opens `/brief` during quiet hours | Full content. They chose to look. |
| Elder asks "what's on today?" at 23:00 | Full spoken brief. No quiet-hours check — asking establishes they are awake (`DAILY_LIFE_BRIEF.md` §8). |
| Visual treatment during quiet hours | **None.** No dimming, no banner, no moon icon. |

---

## 9. Accessibility

| Concern | Specification |
|---|---|
| Reading order | Back → title → count line → rows in policy order → "That's all." → "Turn this off" |
| Count line | `role="heading" aria-level="1"` — "Four things today" |
| Row announcement | "Due now. Morning tablet, 9:00 AM. Remind me, button." — kind first, so urgency precedes content |
| Row structure | `<ul>` / `<li>` with `aria-setsize` and `aria-posinset`, so a screen reader announces "2 of 4" |
| Currently-spoken row | `aria-current="true"`, not an `aria-live` update — the highlight must not re-announce each row |
| "That's all." | Static text, part of the list's closing, not an alert |
| Turn this off | "Turn this off. Button." — no hidden confirmation semantics |
| Contrast | All text ≥ 7:1 against `--teal-100` and `--bg-cream` |
| Colour independence | Amber vs teal rules always paired with a distinct kind word (R16) |
| Touch spacing | 12px between rows; 12px between a row's body target and its action target |
| Language | `lang` per profile; Rs amounts written as digits on screen and as words in speech, authored together |

---

## 10. Implementation notes for GLM

1. **The screen never queries sources.** It receives one ordered, deduplicated array from the pure
   priority function (`PRIORITY_AND_DEDUP_POLICY.md` §8.1). No filtering, no sorting, no merging in
   the component.
2. **`DailyBrief` renders rows; it does not decide them.** Truncation to five happens in the caller,
   with the overflow count passed in so §5.3's line can render.
3. **The spoken brief and the screen are built from the same array.** The speech layer takes the
   first three; the screen takes the first five. Two consumers, one source — otherwise they will
   drift and the elder will hear something that is not on screen.
4. **The brief is read-only** (`DAILY_LIFE_BRIEF.md` §9.3). It never transitions a life event and
   never marks anything surfaced beyond the lead times it actually spoke. A row's *action* may cause
   a transition; rendering the row must not.
5. **Empty scheduled brief produces no session and no navigation.** Not a screen with an empty state
   — no screen at all. Only `/brief` opened deliberately can render §6.2.
6. **`enabled` defaults to `false`** in the profile, and the offer card is gated on all three
   conditions of §2.1 evaluated in one predicate.
7. **The offer is one-shot and persisted.** Record that it was made, whatever the answer, so it can
   never appear twice.
8. **"Stop these" is deterministic**, routed through `recoveryType()` in `lib/command-parser.ts`
   before any model call (`CHECKIN_CONVERSATION_POLICY.md` §10.2).
9. **Rows have two targets, not nested buttons.** A row body button and an action button as siblings
   — nesting breaks both hit areas and the screen-reader tree.
10. **Reserve two-line height for titles and kind labels** at `line-height: 1.5`, with
    `overflow: visible` and no ellipsis (R18).
11. **Never render a `NEEDS_CONFIRMATION` event as a row.** Route it to `/events/:id/confirm` instead.
    A type-level guard is preferable to a runtime check.
12. **Amounts are authored in pairs** — "Rs 840" for the screen, "eight hundred and forty rupees" for
    speech — and generated together so they cannot disagree
    (`CHECKIN_CONVERSATION_POLICY.md` §7).
13. **The currently-spoken row highlight is driven by TTS boundary events**, and must degrade to no
    highlight rather than a wrong one if boundaries are unavailable.
14. **No analytics on this screen.** No open counts, no read/unread state, no engagement events
    (`COMPANION_PRODUCT_MODEL.md` §10).

---

## Related

- `docs/companion/DAILY_LIFE_BRIEF.md` — the policy this screen renders: §2 opt-in, §3–§4 content, §5 utterance shape, §8 on-demand
- `docs/companion/PRIORITY_AND_DEDUP_POLICY.md` — §2 tiers, §3 merge keys, §4 suppression, §5 truncation, §6 anti-nagging budget
- `docs/companion/QUIET_HOURS_AND_FREQUENCY.md` — quiet-hours defaults and elder control
- `docs/companion/PENDING_LOOPS.md` — the source of promise rows
- `docs/companion/COMPANION_PRODUCT_MODEL.md` — §1 reactive competence precedes proactive contact, §5 dignity constraints
- `docs/companion/CHECKIN_CONVERSATION_POLICY.md` — §5 refusal handling, §7 language, §10.2 deterministic stop
- `docs/mobile-ui/MOBILE_PRODUCT_PRINCIPLES.md` — R5, R6, R14, R16, R17, R18
- `docs/mobile-ui/INFORMATION_ARCHITECTURE.md` — §4.2 `/brief`, `/brief/settings`
- `docs/mobile-ui/ELDER_HOME_SCREEN.md` — where the offer card appears, and where overflow items go
- `docs/mobile-ui/VOICE_INTERACTION_STATES.md` — §1.2 the recovery bar shown while the brief is spoken
- `COMPONENT_SPECIFICATION.md` — `DailyBrief`, `GuidanceCard`, `PendingLoopCard` (owned elsewhere)
