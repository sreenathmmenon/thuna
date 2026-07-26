# Thuna — Elder Home Screen

> Design specification. **Changes no production code.**
>
> Route `/`. Depth 0. The screen an elder sees more than any other, and the one that must answer
> *"what now?"* in under three seconds of looking.

---

## 1. What is on this screen — and nothing else

Home contains exactly six things, in this order:

1. **Greeting** — time of day plus the elder's name
2. **One large Talk button** — the dominant action
3. **One due item** — what is happening now or very soon
4. **One upcoming event** — what is coming
5. **One unfinished item** — what was left half-done
6. **Contextual family help** — present only when there is something a person would help with

> **Never more than 3 context items.** Items 3, 4 and 5 are the ceiling, not a starting point. If
> only one qualifies, only one appears — the screen does not pad itself to look full.

Everything else that might want to be here is not here. No history. No streaks. No counts. No
weather. No suggestions. No cards for features the elder has not asked for. No badges. No search.

### 1.1 The reference content

Every measurement in this document is derived from this exact content, at 390 × 844:

```
Good morning, Appa
What can I help you with?

[ Talk to Thuna ]

Due now      Evening reminder · 7:30 PM
Coming soon  Ravi's daughter's wedding · Saturday · Guruvayur
Continue     Wi-Fi setup paused yesterday
```

---

## 2. Wireframe — 390 × 844

Measurements are CSS pixels. `y` values assume an iPhone standalone PWA:
`env(safe-area-inset-top) = 47px`, `env(safe-area-inset-bottom) = 34px`.

```
 x=0                        390
┌─────────────────────────────────────────────────────────────┐ y=0
│              safe-area-inset-top — 47px                     │
├─────────────────────────────────────────────────────────────┤ y=47
│  MobileHeader                                   height 56px │
│  ┌───────────────────────────┐          ┌────────────────┐  │
│  │ Thuna              20/600 │          │ ⚙ Settings 16px│  │  control 52×52
│  └───────────────────────────┘          └────────────────┘  │  right edge x=374
├─────────────────────────────────────────────────────────────┤ y=103
│                        gap 24px                             │
│                                                             │ y=127
│  Good morning, Appa                              32px / 700 │  line box 44px
│                                                             │ y=171
│                        gap 8px                              │
│  What can I help you with?                       24px / 400 │  line box 34px
│                                                             │ y=213
│                        gap 32px                             │
│                                                             │
│         ╭───────────────────────────────────╮               │ y=245
│         │                                   │               │
│         │              ⬤  96px              │               │  TalkButton
│         │                                   │               │  centre (195, 293)
│         ╰───────────────────────────────────╯               │ y=341
│                        gap 12px                             │
│              Talk to Thuna            20px / 600            │ y=353
│                                                             │ y=381
│                        gap 32px                             │
├─────────────────────────────────────────────────────────────┤ y=413
│  CONTEXT REGION — margin 16px each side, width 358px        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │ y=413
│  │▌ Due now                              16px/600 amber  │  │  4px rule --amber-500
│  │▌                                                      │  │  card height 96px
│  │▌ Evening reminder                     20px/600        │  │  radius 16px
│  │▌ 7:30 PM                              18px/400        │  │  padding 16px
│  └───────────────────────────────────────────────────────┘  │ y=509
│                        gap 12px                             │
│  ┌───────────────────────────────────────────────────────┐  │ y=521
│  │▌ Coming soon                          16px/600 teal   │  │  4px rule --teal-900
│  │▌                                                      │  │  card height 118px
│  │▌ Ravi's daughter's wedding            20px/600        │  │  (title wraps 2 lines)
│  │▌ Saturday · Guruvayur                 18px/400        │  │
│  └───────────────────────────────────────────────────────┘  │ y=639
│                        gap 12px                             │
│  ┌───────────────────────────────────────────────────────┐  │ y=651
│  │▌ Continue                             16px/600 teal   │  │  4px rule --teal-900
│  │▌                                                      │  │  card height 96px
│  │▌ Wi-Fi setup                          20px/600        │  │
│  │▌ Paused yesterday                     18px/400        │  │
│  └───────────────────────────────────────────────────────┘  │ y=747
│                        gap 20px                             │
│                                                             │
│  Would you like me to ask Ravi?          18px/500  teal     │ y=767
│  ───────────────────────────────────                        │  underlined, 56px tap
│                                                             │ y=823
│                   scroll padding 24px                       │
├─────────────────────────────────────────────────────────────┤
│  BottomNavigation — fixed, 72px + 34px inset                │  overlays from y=738
└─────────────────────────────────────────────────────────────┘ y=844
```

### 2.1 Scroll behaviour

Content above the fold at 390 × 844 with the fixed navigation bar occupying from y = 738:

| Element | Range | Above fold? |
|---|---|---|
| Greeting | 127–213 | yes |
| TalkButton + label | 245–381 | **yes — the dominant action never scrolls** |
| Due now card | 413–509 | yes |
| Coming soon card | 521–639 | yes |
| Continue card | 651–747 | partially — bottom 9px behind the bar |
| Family help line | 767–823 | requires scroll |

The scroll container carries `padding-bottom: calc(72px + max(env(safe-area-inset-bottom), 12px) + 24px)`
= 130px on iPhone, so the family line clears the bar when scrolled. **The TalkButton is always fully
visible without scrolling on every supported viewport** — this is the load-bearing guarantee of the
layout, and the reason the greeting block is capped at two lines.

### 2.2 Vertical budget

| Region | Height |
|---|---|
| Safe area top | 47 |
| Header | 56 |
| Greeting block (incl. gaps) | 110 |
| TalkButton block (incl. gaps) | 168 |
| Context region (3 items) | 334 |
| Family line (incl. gap) | 76 |
| Scroll padding | 24 |
| Navigation (incl. inset) | 106 |
| **Total** | **921** — 77px of scroll on 390 × 844 |

With two context items the total is 803px and nothing scrolls. With one, 685px. The three-item case
is the only one that scrolls, and only the family line falls below.

---

## 3. Layout notes for 360 × 800 and 430 × 932

### 3.1 360 × 800 — the narrowest case

Android Chrome with visible URL bar: **744px of usable height.** This is the binding constraint on
the whole design.

| Change from 390 | Value |
|---|---|
| Horizontal margin | **12px** (from 16px) → card width 336px |
| Greeting | **28px / 700** (from 32px), still one line for "Good morning, Appa" |
| Sub-greeting | 22px (from 24px) |
| TalkButton | **80px** (from 96px), still well above the 76px floor |
| TalkButton label | 20px, unchanged |
| Gap above TalkButton | 24px (from 32px) |
| Gap below TalkButton block | 24px (from 32px) |
| Card padding | 14px (from 16px) |
| Card title | 20px, unchanged — **type does not shrink below the R6/R7 floors** |
| Card gap | 12px, unchanged |
| Safe-area top | 24px typical Android status bar |

Resulting layout with the URL bar shown:

| Element | y range |
|---|---|
| Header | 24–80 |
| Greeting block | 100–176 |
| TalkButton block | 200–332 (centre 240) |
| Due now card | 356–448 |
| Coming soon card | 460–590 (title wraps to 2 lines) |
| Continue card | 602–694 |
| Navigation top edge | 744 − 84 = **660** |

The Continue card and the family line scroll. TalkButton sits at centre y = 240, comfortably above
the 320px one-handed-reach threshold measured from the bottom — i.e. within the bottom 60% of the
744px viewport (threshold y = 298 … 744). **TalkButton centre at y = 240 is above that line**, so on
360 × 800 the TalkButton is raised into the upper-middle of the screen by the shortened greeting.
This is accepted: the button is 80px across and centred horizontally, which keeps it inside comfortable
thumb arc for a one-handed grip even at that height, and moving it lower would push the first context
item below the fold. **Do not shrink it further to move it down.**

Malayalam checks at 360:
- Greeting *"സുപ്രഭാതം, അപ്പാ"* at 28px fits one line in 336px.
- "Coming soon" label in Malayalam wraps to two lines; the label container reserves 48px.
- Card titles reserve two lines at 20px (`line-height: 1.5` → 60px), so a card is 96px minimum and
  grows to 118px when the title wraps. No clipping, no ellipsis (R18).

### 3.2 430 × 932

| Change from 390 | Value |
|---|---|
| Horizontal margin | 20px → card width 390px |
| Greeting | 34px / 700 |
| TalkButton | **96px** — unchanged; it is already at the right size and growing it makes it look like a novelty |
| Gaps | +4px on the two 32px gaps |
| Card padding | 18px |

All three context items and the family help line fit above the fold. Nothing scrolls. The extra
height becomes breathing space between the TalkButton block and the context region (gap 44px), not
extra content.

---

## 4. Element specifications

### 4.1 Greeting

| Property | Value |
|---|---|
| Component | Plain text in `ElderShell` content area |
| Line 1 | Greeting + name, 32px / 700, `--charcoal-900` |
| Line 2 | "What can I help you with?", 24px / 400, `--charcoal-900` at 80% |
| Max lines | 1 each. If the name is long enough to wrap at 390px, drop to 28px rather than wrap. |
| Tappable | **No.** The greeting is not a control. |

**Greeting logic** — resolved by local time on the elder's device, in the elder's language:

| Local time | English | Notes |
|---|---|---|
| 04:00 – 11:59 | Good morning, {name} | |
| 12:00 – 16:59 | Good afternoon, {name} | |
| 17:00 – 20:59 | Good evening, {name} | |
| 21:00 – 03:59 | Good evening, {name} | Quiet hours — see §7. Never "Good night", which reads as a dismissal. |

**Name** comes from the elder's profile as the form they chose to be addressed by — "Appa" in the
seed profile. It is a term of address, not a legal name field. Rules:

- Use it exactly as stored. Never abbreviate, never title-case it, never append a surname.
- If no name is stored, the greeting is **"Good morning"** with no comma. Never "Good morning, User",
  never "Good morning, friend", never a placeholder.
- The greeting never varies beyond this table. No rotating messages, no "you're up early", no
  weather, no quotes. Variation reads as a machine performing friendliness.

### 4.2 TalkButton

| Property | Value |
|---|---|
| Component | `TalkButton` (props owned by `COMPONENT_SPECIFICATION.md`) |
| Diameter | 96px at 390 and 430; 80px at 360 |
| Fill | `--teal-900`, flat, no gradient, no shadow |
| Icon | Microphone glyph, 40px, `--bg-cream`, centred |
| Label | **"Talk to Thuna"**, 20px / 600, `--teal-900`, 12px below the circle, centred |
| Hit area | The circle **and** its label — a single control of 96 × 148px |
| Pressed state | Fill darkens 8%, scale 0.97, 120ms — and under reduced motion, fill change only |
| Position | Horizontally centred; centre at y = 293 (390 × 844) |
| Tap behaviour | Navigate to `/talk` **and begin listening in the same action** — one tap from Home to speaking (M2) |

The label is not optional and is never replaced by the icon alone (R5). At 360px the label stays
20px; if a translation is long it wraps to two lines and the block grows — the circle does not shrink
to compensate.

### 4.3 Context items

All three share one anatomy. They are rendered by `GuidanceCard` (due, coming) and `PendingLoopCard`
(continue).

| Property | Value |
|---|---|
| Width | 358px at 390; 336px at 360; 390px at 430 |
| Minimum height | **96px** — comfortably above the 52px floor, and sized so a two-line Malayalam title fits without growth in most cases |
| Radius | 16px |
| Background | `--teal-100` |
| Left rule | 4px, full height, colour per kind (below) |
| Padding | 16px, plus 4px for the rule → content inset 20px from the left edge |
| Kind label | 16px / 600, uppercase never used — sentence case, coloured per kind |
| Title | 20px / 600, `--charcoal-900`, up to 2 lines, `line-height: 1.5` |
| Detail | 18px / 400, `--charcoal-900` at 75%, 1 line, middle dot separators |
| Gap between cards | 12px |
| Whole card tappable | Yes — the entire card is one hit target, minimum 358 × 96px |
| Pressed state | Background darkens to `--teal-100` at 92% brightness, 120ms |

#### Due now

| | |
|---|---|
| Left rule | `--amber-500` |
| Kind label | **"Due now"** in `--amber-500`, at 16px / 600 |
| Shows | The elder's own words for the item, then the time. *"Evening reminder · 7:30 PM"* |
| Populated from | P0/P1 in `PRIORITY_AND_DEDUP_POLICY.md` §2 |
| Tap → | `/talk`, opening on that item: *"Your evening reminder is at half past seven. Shall I remind you then?"* |
| Hit area | 358 × 96px |
| Never shows | Anything overdue framed as a lapse. A passed reminder shows as "Due now", never "Missed" or "Overdue" (`DAILY_LIFE_BRIEF.md` §4). |

#### Coming soon

| | |
|---|---|
| Left rule | `--teal-900` |
| Kind label | **"Coming soon"** in `--teal-900` |
| Shows | Event title, then day and place. *"Ravi's daughter's wedding · Saturday · Guruvayur"* |
| Populated from | P2/P3, and P5 only when nothing higher qualifies |
| Tap → | `/talk`, opening on that event: *"The wedding is on Saturday, at Guruvayur. Would you like me to help with anything for it?"* |
| Hit area | 358 × 118px when the title wraps |
| Never shows | A `NEEDS_CONFIRMATION` event as though settled (`DAILY_LIFE_BRIEF.md` §4). Those surface as a question via `/events/:id/confirm` instead, and only one such question appears at a time. |

#### Continue

| | |
|---|---|
| Left rule | `--teal-900` |
| Kind label | **"Continue"** in `--teal-900` |
| Shows | What was being done, then when it stopped. *"Wi-Fi setup · Paused yesterday"* |
| Populated from | P4 open loops (`PENDING_LOOPS.md`) and open `PreparedAction`s — a `ScreenState.status` of `paused` from a previous session |
| Tap → | `/talk`, resuming that task at the step it stopped, with a one-line recap: *"We were setting up the Wi-Fi. We'd got as far as the password. Shall we carry on?"* |
| Hit area | 358 × 96px |
| Copy rule | **"Paused yesterday"**, never "Unfinished", "Incomplete", "Abandoned" or "You didn't finish". The task paused; the elder did not fail. |
| Ageing | An open loop is shown once, then expires quietly per `PRIORITY_AND_DEDUP_POLICY.md` §6 — one mention for an unfinished prepared action, one per week for a promise. It never accumulates on Home. |

### 4.4 Contextual family help

| Property | Value |
|---|---|
| Form | A single line of text, underlined, not a card and not a button |
| Copy | **"Would you like me to ask Ravi?"** — the named person, phrased as an offer |
| Type | 18px / 500, `--teal-900`, underlined 1px with 3px offset |
| Hit area | Full content width × 56px |
| Position | 20px below the last context item |
| Tap → | Expands `/talk/handoff` — the inline panel, not a new screen |

**When it appears:**

1. A context item is one a person would plausibly help with (a paused technical task, an event needing
   arrangements, an unresolved P0 outcome), **and**
2. The elder has at least one contact with consent on record (`FAMILY_CONSENT_POLICY.md`), **and**
3. It has not already been offered and declined for this same item in this session.

**When it does not appear:** everything else. Absent context, Home has no family element at all. It
is never a permanent fixture, never a card, never above the context items, and never phrased as a
suggestion that the elder needs help.

> Never: **Need help? Ask a family member.**
> Never: **Ravi is available.**
> Always: **Would you like me to ask Ravi?**

The difference is who is doing the reaching. Thuna offers to ask; it does not send the elder away.

---

## 5. Priority rules when more than three candidates exist

Ordering is **defined in `docs/companion/PRIORITY_AND_DEDUP_POLICY.md`** and is not restated here.
Home applies that policy with three additional display constraints.

### 5.1 Slot assignment

Home has three slots with fixed semantics, filled from the ordered, deduplicated list:

| Slot | Takes the highest-ranked item that is | If none exists |
|---|---|---|
| Due now | P0 or P1 | Slot is omitted entirely — no placeholder |
| Coming soon | P2, P3, or P5 | Slot omitted |
| Continue | P4 | Slot omitted |

Slots are **not** interchangeable filler. If there are two P1 items and nothing else, Home shows
**one** card — the higher-ranked P1 — and the second does not get promoted into the "Coming soon"
slot, because calling a due reminder "Coming soon" is a lie about its urgency.

Rationale: the three slots exist to make the screen instantly parseable by position. An elder learns
"the top one is now, the middle one is later, the bottom one is unfinished". Filling slots
opportunistically destroys that learning.

### 5.2 Overflow

Dropped items are **not** shown on Home and **not** silently discarded. They remain available:

- Through Reminders (`/reminders`) for anything schedule-shaped.
- Through the Daily Brief (`/brief`) if it is on.
- By asking: *"what else is on today?"* — which is the on-demand brief (`DAILY_LIFE_BRIEF.md` §8).

Home does **not** carry a "2 more" affordance, a count, or a "See all" link on the context region.
A count on Home is a badge, and badges manufacture urgency (`MOBILE_PRODUCT_PRINCIPLES.md` §3).

### 5.3 Three P0 items

`PRIORITY_AND_DEDUP_POLICY.md` §5.3 says P0 is never truncated. On Home that resolves as: the Due now
slot takes the top P0, and the remaining P0 items take the Coming soon and Continue slots **with the
"Due now" kind label and amber rule**, in rank order. This is the single exception to §5.1, and it is
the only case in which Home shows three amber cards. It should be rare; if it is not rare, the
suppression rules upstream are not working.

### 5.4 Dedup

Home consumes the already-deduplicated list. It never performs its own merging, and it never shows
the same real-world thing in two slots — a wedding that is both an upcoming event and an open promise
to buy a gift is one item, appearing in the highest slot it qualifies for
(`PRIORITY_AND_DEDUP_POLICY.md` §3).

---

## 6. Empty states

An empty Home must not read as broken, and must not read as an achievement either. There is no
"All done!", no green check, no confetti, no "You're all caught up".

### 6.1 Nothing due, nothing coming, nothing unfinished

The context region is replaced by a single line, and the layout keeps its shape — the greeting and
TalkButton do not move.

```
Good morning, Appa
What can I help you with?

[ Talk to Thuna ]

Nothing needs you right now.
```

| Property | Value |
|---|---|
| Copy | **"Nothing needs you right now."** |
| Type | 20px / 400, `--charcoal-900` at 70% |
| Position | Where the first context card would have started (y = 413 at 390 × 844) |
| Alignment | Left, matching the cards' left inset |
| Tappable | No |
| Illustration | **None.** No empty-state graphic, no icon, no mascot. |

Why this line: it says the state of the world, not the state of the elder. Compare the alternatives —
"You have no reminders" makes it about them; "All caught up!" congratulates them for nothing
(`COMPANION_PRODUCT_MODEL.md` §5.4); "Nothing here yet" implies something is missing.

The screen is not empty in any case: the greeting and a 96px TalkButton are still there, and the
TalkButton is the point of the screen. An elder looking at this sees an invitation, not a void.

### 6.2 First run, before anything is known

Same structure. The sub-greeting does the work:

```
Good morning
What can I help you with?

[ Talk to Thuna ]

Ask me anything — ordering food, a reminder, or help with the phone.
```

| Property | Value |
|---|---|
| Copy | **"Ask me anything — ordering food, a reminder, or help with the phone."** |
| Type | 18px / 400, `--charcoal-900` at 70%, up to 2 lines |
| Duration | Shown until the elder's first completed task, then replaced by §6.1's line |
| Tappable | No — it is an example, not a menu. Making the examples tappable turns Home into a feature list. |

No onboarding carousel, no tour, no permission prompts on first paint. Microphone permission is
requested at the moment of first use, inside `/talk` (`VOICE_INTERACTION_STATES.md` §3.2).

### 6.3 Partial fills

One or two items simply render one or two cards. The remaining space is space. Home never pads with a
suggestion card, a tip, or a promotion.

---

## 7. Quiet hours appearance

Quiet hours default to **21:00–07:00** (`QUIET_HOURS_AND_FREQUENCY.md` §2) and are elder-set.

The elder opening Thuna during quiet hours has chosen to be there. Quiet hours restrict what Thuna
*initiates*, not what it *offers* when opened. Home therefore stays fully functional — but it stops
volunteering.

| Element | During quiet hours |
|---|---|
| Greeting | "Good evening, {name}" — never "Good night", never "You should be asleep" |
| Sub-greeting | Unchanged: "What can I help you with?" |
| TalkButton | **Fully enabled, full size, unchanged.** Thuna is never unavailable to an elder who reached for it. |
| Due now slot | Only P0 (unresolved provider outcome) and P1 items that fall *inside* quiet hours by the elder's own scheduling — e.g. a 21:30 tablet reminder they set themselves |
| Coming soon slot | **Suppressed.** Tomorrow's wedding is not raised at 23:00. |
| Continue slot | **Suppressed.** A paused task is not raised at night. |
| Family help line | **Suppressed.** Never offer to contact a person during quiet hours; that offer, accepted at 2am, wakes someone. |
| Visual treatment | **None.** No dimming, no dark mode switch, no moon icon, no "quiet hours" banner. The screen looks the same. |
| Brief | Deferred per `DAILY_LIFE_BRIEF.md` §2 — never fires inside quiet hours |

The absence of a visual treatment is deliberate. A "quiet hours" banner tells the elder the system has
an opinion about when they should be using their phone. It does not. It simply does not interrupt
them, and there is nothing to announce about that.

If suppression empties the context region, §6.1 applies unchanged.

An elder who *asks* during quiet hours gets everything: the on-demand brief has no quiet-hours check
because asking establishes they are awake (`DAILY_LIFE_BRIEF.md` §8).

---

## 8. Accessibility

| Concern | Specification |
|---|---|
| Screen-reader order | Header → greeting → sub-greeting → TalkButton → context cards in slot order → family line |
| TalkButton announcement | "Talk to Thuna. Button. Starts a conversation." |
| Context card announcement | "Due now. Evening reminder, 7:30 PM. Button." — kind label first, so the reader hears the urgency before the content |
| Greeting | Announced as static text, in `aria-live="off"` — it must not re-announce on re-render |
| Empty state | "Nothing needs you right now." as static text, not an alert |
| Focus order | Matches visual order; no focus traps on Home |
| Contrast | All text ≥ 7:1 against its background (WCAG AAA), including the 75%-opacity detail line |
| Colour independence | Every kind label is a word as well as a colour (R16) |
| Language | `lang` attribute set per the elder's profile so Malayalam is pronounced correctly |
| Touch spacing | ≥ 12px between all adjacent targets on Home |

---

## 9. Implementation notes for GLM

1. **Home never calls the priority engine itself.** It receives an already-ordered, already-deduplicated
   list and takes the top item per slot kind. Ordering logic lives in the pure function described in
   `PRIORITY_AND_DEDUP_POLICY.md` §8.1.
2. **Slot assignment is a filter, not a fill.** Implement as "first item matching this slot's tier
   set", not "next item off the list". The §5.3 all-P0 case is an explicit branch, not an emergent
   behaviour.
3. **Reserve the context region's height for the tallest case** so the TalkButton never shifts
   between renders. A greeting that changes at noon must not move the button.
4. **Card `min-height` is 96px with `height: auto`.** Do not fix the height — a wrapped Malayalam
   title must grow the card, not clip (R18).
5. **The whole card is one `button`,** not a card containing a button. Nested interactive elements
   inside a card break both the hit area and the screen-reader announcement.
6. **Greeting is computed from device local time,** not server time, and re-evaluates on focus so a
   phone opened at 12:01 does not still say "morning".
7. **Empty state is the same layout,** not a different component tree. Swapping to a dedicated empty
   component causes the TalkButton to shift, which is the one thing that must never move.
8. **No skeleton loaders on Home.** If context data is not ready, render the greeting and TalkButton
   immediately and let cards appear when they resolve. A shimmering placeholder is an animation that
   says "wait" (M4, R15).
9. **The family line is conditional on all three tests in §4.4,** evaluated together in one predicate
   so it cannot appear from a partial condition.
10. **Quiet-hours suppression happens upstream** in the priority function, not in the Home component.
    Home renders what it is given. This is the same chokepoint argument as `DAILY_LIFE_BRIEF.md` §9.2.
11. **Never render `ScreenState.status` or `EngineAction` values.** The Continue card is driven by a
    `paused` status but displays "Continue" and "Paused yesterday" — the mapping lives in the display
    layer (R4).
12. **Relative dates are computed for display** — "yesterday", "Saturday" — and are capped at seven
    days, beyond which an absolute date is used. Never show a timestamp, never show a duration in
    hours.

---

## Related

- `docs/mobile-ui/MOBILE_PRODUCT_PRINCIPLES.md` — R1, R2, R6, R7, R8, R9, R14, R16, R17, R18
- `docs/mobile-ui/INFORMATION_ARCHITECTURE.md` — §3 navigation geometry, §4 route map, §5 depth rule
- `docs/mobile-ui/VOICE_INTERACTION_STATES.md` — what happens after TalkButton is tapped
- `docs/mobile-ui/DAILY_BRIEF_SCREEN.md` — where overflow items go
- `docs/companion/PRIORITY_AND_DEDUP_POLICY.md` — the ordering and dedup policy Home consumes
- `docs/companion/QUIET_HOURS_AND_FREQUENCY.md` — §2 defaults and elder control
- `docs/companion/PENDING_LOOPS.md` — the source of the Continue item
- `docs/companion/FAMILY_CONSENT_POLICY.md` — the precondition for the family line
- `docs/companion/COMPANION_PRODUCT_MODEL.md` — §5 dignity constraints
- `COMPONENT_SPECIFICATION.md` — `TalkButton`, `GuidanceCard`, `PendingLoopCard`, `MobileHeader` (owned elsewhere)
