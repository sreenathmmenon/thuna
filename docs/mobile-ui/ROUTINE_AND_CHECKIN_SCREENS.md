# Thuna — Routine and Check-In Screens

> Design specification. **Changes no production code.**
>
> One `CheckInScreen` serves every routine type. The routine type is **data** — a title, a question,
> and a set of answer buttons. It is never a layout.
>
> The state machine is defined in `docs/companion/ROUTINE_ENGINE.md` and is not restated here. This
> document specifies what each of its eight states looks like and says.

---

## 1. The rule that shapes every screen here

> ## Silence is never completion.

This is a UI requirement before it is an engine requirement, because the UI is where the lie would be
visible. Three concrete consequences that a reviewer should check for:

1. **A `MISSED` occurrence must never render in `--green-600`, never carry a tick, and never sit in a
   "Done" group.** If an elder scrolls a list of today's reminders and cannot tell at a glance which
   ones they actually confirmed, the screen has told them something false about their own day.
2. **There is no "mark as done" affordance on a `MISSED` card that back-dates it.** The elder may
   confirm *now* — that produces a `COMPLETED` at the current time with an honest "Done at 10:40"
   — but the 9:00 occurrence stays `MISSED` in history.
3. **Delivery is never rendered as an outcome.** No "Reminder sent ✓". The check mark belongs to the
   elder's answer, not to Thuna's speaker.

The second rule, equally binding:

> ## MISSED is never shown with blame.

`MISSED` means *Thuna does not know what happened.* The copy says exactly that, about Thuna, not about
the elder. No "you missed", no "you didn't", no red, no exclamation, no counter of how many.

---

## 2. The check-in screen — one layout, 390 × 844

`CheckInScreen` reuses slots 1–5 of `TASK_SCREEN_SYSTEM.md` §2. The difference is the answer row:
a check-in has **one question and a small fixed set of answers**, so the options slot is a horizontal
pair of large buttons rather than a vertical list.

```
┌──────────────────────────────────────────────┐  ← 390 wide
│            safe-area-inset-top (47)          │
├──────────────────────────────────────────────┤  ┐
│  16 │  Morning medicine              │  16   │  │ HEADER — 56
│     │  20/600 --bg-cream on --teal-900│       │  │ SLOT 1 · routine title
├──────────────────────────────────────────────┤  ┘   (elder's own words)
│                24 gap                        │
│  ┌────────────────────────────────────────┐  │  ┐
│  │  9:00 in the morning                   │  │  │ TIME LINE
│  │  18/500 --charcoal-900 at 70%          │  │  │ h 26, pad-bottom 12
│  │  ────────────────────────────────────  │  │  │
│  │                                        │  │  │ GuidanceCard
│  │  It's time for your morning            │  │  │ SLOT 2 · the question
│  │  tablet. Have you taken it?            │  │  │ 26/34, w 358, pad 24
│  │                                        │  │  │ radius 24, --teal-100
│  └────────────────────────────────────────┘  │  ┘ min-height 148 w/ time line
│                24 gap                        │
│  ┌─────────────────┐  ┌─────────────────┐   │  ┐ ANSWER PAIR
│  │                 │  │                 │   │  │ SLOT 3 · options
│  │   Yes, I have   │  │   Not yet       │   │  │ 171 × 88 each, gap 16
│  │   20/600        │  │   20/600        │   │  │ radius 16
│  │                 │  │                 │   │  │ Yes:  --green-600 fill,
│  └─────────────────┘  └─────────────────┘   │  ┘   --bg-cream label
│                12 gap                        │      Not yet: 2px --charcoal
│  ┌────────────────────────────────────────┐  │        border, transparent
│  │        Remind me in 10 minutes         │  │  ┐ SNOOZE
│  │        18/600, 358 × 60, radius 16     │  │  │ full width, outlined
│  └────────────────────────────────────────┘  │  ┘ 2px --teal-900
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │  ┐ CANCEL
│  │        Stop reminding me about this    │  │  │ 358 × 52, no border,
│  │        16/500 --charcoal-900 at 70%    │  │  │ text only
│  └────────────────────────────────────────┘  │  ┘
│                                              │
├──────────────────────────────────────────────┤  ┐
│  [ Wait ]        [ Say again ]               │  │ CONTROL ROW — 72 + 24 pad
│   110×60            132×60                   │  │ no Stop: "Stop reminding
├──────────────────────────────────────────────┤  ┘  me" above is the exit
│           safe-area-inset-bottom (34)        │
└──────────────────────────────────────────────┘
```

### Why the answers are this big

88 × 171 is far above the 52 minimum. A check-in is answered by someone who has just been interrupted,
possibly holding something, possibly without their glasses. It is the single most mis-tap-prone
moment in the product, and a mis-tap here writes a false record into a health-adjacent history.

### Why cancel is text-only and still full width

"Stop reminding me about this" must be **easy to find and impossible to hit by accident.** Full width
makes it findable; no border and 70% weight keeps it visually subordinate to the answers; its position
below the snooze keeps it out of the primary thumb arc. It is honoured immediately with no "are you
sure?" — per `ROUTINE_ENGINE.md` §3, cancel is always available and always immediate.

### Viewports

| Viewport | Changes |
|---|---|
| **360 × 800** | Answer buttons 156 × 88, gap 16. Guidance 24/32. Snooze/cancel width 328. |
| **430 × 932** | Answer buttons 191 × 88. Card width 398. Extra height becomes a 32 gap above the answer pair — more separation between reading and acting. |

Malayalam answer labels ("അതെ, കഴിച്ചു") fit one line at 20px inside 171px. If a translated label
would wrap, the button grows to 104 tall; the label never wraps to two lines.

---

## 3. One screen, seven routine types

Everything below is `RoutineType` data filling slots 1–3. There are no other differences.

| Type | Title (slot 1) | Question (slot 2) | Answers (slot 3) | Snooze default |
|---|---|---|---|---|
| `MEDICINE_REMINDER` | Morning medicine | "It's time for your morning tablet. Have you taken it?" | Yes, I have · Not yet | 10 minutes |
| `WATER_REMINDER` | Water | "Have you had some water recently?" | Yes · Not yet | 30 minutes |
| `BILL_REMINDER` | Electricity bill | "The electricity bill is due on Friday. Shall I remind you again tomorrow?" | Yes, remind me · No need | 1 day |
| `FAMILY_CALL_REMINDER` | Call Priya | "You wanted to call Priya today. Did you get through?" | Yes, we spoke · Not yet | 2 hours |
| `DELIVERY_FOLLOW_UP` | Your food order | "Did your order from Saravana Bhavan arrive?" | Yes, it came · Not yet | 20 minutes |
| Wedding reminder (`LifeEvent` occurrence) | Meera and Arun's wedding | "Meera and Arun's wedding is on Saturday at Guruvayur, half past ten. Would you like anything arranged?" | Nothing for now · Yes, help me | — |
| `GENERAL_CHECK_IN` | A quick hello | "Just saying hello. How has your morning been?" | *(none — see below)* | — |

### `GENERAL_CHECK_IN` is the exception that proves the schema

It has **no completion semantics** (`ROUTINE_ENGINE.md` §5) — a social call is not a task. So slot 3
renders differently *by data, not by layout*: no Yes/No pair, because there is nothing to complete.
Instead:

```
┌────────────────────────────────────────┐
│        I'm here if you need me         │  ← 358 × 60, outlined
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│   Don't check in on me like this       │  ← 358 × 52, text-only
└────────────────────────────────────────┘
```

The stop option is **mandatory** on every general check-in, in the same position every time. A
proactive contact the elder cannot switch off is not companionship.

### The wedding reminder is a `LifeEvent` occurrence, not a routine type

It renders through this same `CheckInScreen` because a due-day reminder is a due-day reminder. Its
content comes from the event's `fields[]`; its lifecycle is owned by
`LIFE_EVENTS_AND_REMEMBER_THIS.md`. The screen does not know the difference, which is the point.

---

## 4. The eight states

Every state gets: what the elder sees, exact copy, actions, and its list-row form.

### 4.1 `SCHEDULED`

The routine exists and its time is in the future. There is no full screen — a scheduled routine is
never pushed at the elder. It appears only where they look for it.

**List row (72 tall):**

```
┌────────────────────────────────────────┐
│  ○  Morning medicine                   │  ← ○ 12px ring, --teal-900, 2px
│     9:00 tomorrow                      │     title 18/600, sub 16/400 @70%
└────────────────────────────────────────┘
```

> "Next: morning medicine, 9 in the morning."

| | |
|---|---|
| **Actions** | Tap → detail: change the time · stop this reminder |
| **Colour** | Neutral. `--charcoal-900` text on `--bg-cream`. No accent — nothing has happened yet |
| **Full screen** | None |

### 4.2 `DUE`

Trigger time reached, session not yet open. **Transient — the elder never sees this state.** It exists
so the engine can check quiet hours before speaking (`ROUTINE_ENGINE.md` §3: a `DUE` inside quiet
hours defers rather than fires).

| | |
|---|---|
| **Elder sees** | Nothing |
| **List row** | Renders as `SCHEDULED` until `ACTIVE` |
| **Design note** | If `DUE` ever persists visibly, that is a bug worth surfacing in the Demo Inspector, not in the elder's UI |

### 4.3 `ACTIVE`

Thuna is asking. This is the full `CheckInScreen` in §2.

> "It's time for your morning tablet. Have you taken it?"

| | |
|---|---|
| **Actions** | Yes, I have · Not yet · Remind me in 10 minutes · Stop reminding me about this · Wait · Say again |
| **Colour** | `--teal-100` guidance surface. **Not amber.** A due medicine is a normal part of a day, not an alert |
| **List row** | `● Morning medicine — asking now`, dot `--teal-900` filled, row raised 2px with a 1px `--teal-900` border |
| **Timing** | The screen does not count down, does not show a listen-window timer, and does not dim as the window closes. Visible pressure produces the exact rushed non-answer this design is trying to avoid |

### 4.4 `SNOOZED`

The elder asked for later. The new time is **stated aloud and on screen** — this is a hard
requirement, not a nicety. A snooze whose new time is unknown is indistinguishable from a dismissal.

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │  I'll ask again at quarter        │  │  ← 26/34
│  │  past nine.                       │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │        Ask me sooner              │  │  ← 358 × 60, outlined
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │   Stop reminding me about this    │  │  ← 358 × 52, text-only
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

> **Spoken and shown:** "I'll ask again at quarter past nine."

| | |
|---|---|
| **Copy rule** | Time in words, the way it would be said: *"quarter past nine"*, not "09:15". Both the voice line and the screen line use the same words |
| **List row** | `◑ Morning medicine — I'll ask again at 9:15`, half-filled dot in `--teal-900` |
| **Colour** | Neutral. Snoozing is a legitimate answer, not a deferral of a problem |
| **Snooze cap** | At the cap (`ROUTINE_ENGINE.md` §3 suggests 3), the screen changes to offer a way out rather than another snooze: |

> "I've asked a few times. Shall I leave this for today, or move it to a better time?"
>
> `[ Leave it for today ]  [ Pick a better time ]`

No count is shown. "I've asked a few times" is honest without being a tally of the elder's misses.

### 4.5 `COMPLETED`

The elder explicitly confirmed. This is the **only** state with a tick and the only state in
`--green-600`.

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │  ✓                                │  │  ← 32px tick, --green-600
│  │  Good. Noted at two minutes       │  │  ← 26/34
│  │  past nine.                       │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

> "Good. Noted at two minutes past nine."

| | |
|---|---|
| **Actions** | None required. The screen closes itself after 4 seconds, or on any tap. A completion that demands a dismissal tap is a completion that isn't finished |
| **List row** | `✓ Morning medicine — done at 9:02`, tick `--green-600`, title at 70% weight (past tense recedes) |
| **Copy rule** | "Good" and "Noted", not "Well done" or "Great job". The elder took their own tablet; they are not being congratulated by an app |
| **Family** | If `ROUTINE_COMPLETED` consent exists for a recipient, the screen adds one line: *"I've let Sree know."* — never silently. `FAMILY_CONSENT_POLICY.md` §7 |

### 4.6 `MISSED`

The state that most needs getting right.

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │  I asked about your morning       │  │  ← 26/34, --charcoal-900
│  │  tablet at nine and didn't hear   │  │     on --teal-100
│  │  back. No trouble.                │  │
│  │                                   │  │
│  │  Would you like me to ask again?  │  │
│  └──────────────────────────────────┘  │
│  ┌─────────────────┐ ┌───────────────┐ │
│  │  Ask me again   │ │  Leave it     │ │  ← 171 × 88 each
│  └─────────────────┘ └───────────────┘ │
└────────────────────────────────────────┘
```

> "I asked about your morning tablet at nine and didn't hear back. No trouble. Would you like me to
> ask again?"

**Copy analysis, because this paragraph is the whole state:**

| Phrase | Why |
|---|---|
| "I asked … and didn't hear back" | The subject is Thuna and Thuna's knowledge. Not "you missed" |
| "at nine" | A fact, once. No "twice", no "again", no count |
| "No trouble." | Two words that do most of the work. It closes the question the elder is silently asking |
| "Would you like me to ask again?" | Control returns to the elder immediately |

| | |
|---|---|
| **Colour** | **Neutral `--teal-100`.** Not amber, not red, no warning rule. `MISSED` is not an error state — `ROUTINE_ENGINE.md` §1 calls it "a genuine third state, not a failure" |
| **List row** | `○ Morning medicine — no answer at 9:00`, **hollow** dot in `--charcoal-900` at 40%. Visually distinct from `SCHEDULED`'s teal ring and from `COMPLETED`'s green tick, and readable as "unknown" rather than "bad" |
| **Grouping** | In a day list, `MISSED` rows sit in chronological position, not in a "Missed" section at the bottom. A section header called Missed is a scoreboard |
| **Never** | No red. No exclamation mark. No badge count on an app icon. No "you have 2 missed reminders" summary anywhere in the product |
| **Retry** | Exactly one, after ~10 minutes (`ROUTINE_ENGINE.md` §3). The second ask is worded identically to the first — a differently-worded second ask ("I'm asking again…") signals impatience |

### 4.7 `ESCALATED`

Family was told. **This state can only render when consent exists** — `MISSED → ESCALATED` requires a
prior `ROUTINE_MISSED` grant for that recipient. With no grant, the routine stays `MISSED` and this
screen never appears at all.

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │  I let Sree know that two         │  │  ← 26/34
│  │  reminders went unanswered, at    │  │
│  │  nine and at ten past nine.       │  │
│  │                                   │  │
│  │  That's all I told him.           │  │  ← the reassurance line
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │      Stop telling Sree this       │  │  ← 358 × 60, outlined
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

> "I let Sree know that two reminders went unanswered, at nine and at ten past nine. That's all I told
> him."

| | |
|---|---|
| **Requirement** | The elder is told **at the time**, not only in a log (`FAMILY_CONSENT_POLICY.md` §7) |
| **Content** | Facts only, and the exact facts that were sent. Never "he may be unwell", never anything about how the elder seemed |
| **"That's all I told him"** | Required. It answers the question the elder is actually worried about |
| **Revocation** | One tap, in this screen, effective immediately, never questioned. Revocation must be at least as easy as granting (§6 of the consent policy) |
| **List row** | `○ Morning medicine — no answer at 9:00 · Sree was told`, same hollow dot as `MISSED`, the escalation as a plain sub-line |
| **No-consent case** | The screen renders as `MISSED`, plus one offer, once, at the next contact: *"You didn't answer this morning's reminder. Would you like me to let Sree know when that happens? I won't unless you say so."* Two buttons of equal weight: `[ Yes, tell Sree ]` `[ No, keep it between us ]`. If declined, **not re-asked in the same session** |

### 4.8 `CANCELLED`

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │  I won't remind you about the     │  │
│  │  morning tablet any more.         │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │      Actually, keep it            │  │  ← 358 × 60, outlined
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

> "I won't remind you about the morning tablet any more."

| | |
|---|---|
| **Actions** | "Actually, keep it" — an undo, available on this screen only, for as long as it is open |
| **Never** | No confirmation dialog before cancelling. No "are you sure?". No "Sree set this up for you" guilt. No explanation requested |
| **List row** | The routine leaves the active list entirely. It appears in the reminders settings as `Morning medicine — stopped`, at 60% opacity, with "Start again" |
| **Family** | Cancelling is **never** notified. There is no category for it and none may be added |

### 4.9 State reference — one line each

| State | The line the elder sees |
|---|---|
| `SCHEDULED` | "Next: morning medicine, 9 in the morning." |
| `DUE` | *(never shown)* |
| `ACTIVE` | "It's time for your morning tablet. Have you taken it?" |
| `SNOOZED` | "I'll ask again at quarter past nine." |
| `COMPLETED` | "Good. Noted at two minutes past nine." |
| `MISSED` | "I asked about your morning tablet at nine and didn't hear back. No trouble." |
| `ESCALATED` | "I let Sree know that two reminders went unanswered. That's all I told him." |
| `CANCELLED` | "I won't remind you about the morning tablet any more." |

---

## 5. The list view

Where an elder sees the day's routines together. This is the screen where "silence is never
completion" is either honoured or broken.

```
┌──────────────────────────────────────────────┐
│  Today                               [ ⟵ ]   │  ← 56 header
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  ✓  Morning medicine                   │  │  ← 72 row, COMPLETED
│  │     done at 9:02                       │  │
│  └────────────────────────────────────────┘  │
│                8 gap                         │
│  ┌────────────────────────────────────────┐  │
│  │  ○  Water                              │  │  ← MISSED, hollow dot
│  │     no answer at 11:00                 │  │     40% charcoal
│  └────────────────────────────────────────┘  │
│                8 gap                         │
│  ┌────────────────────────────────────────┐  │
│  │  ◑  Call Priya                         │  │  ← SNOOZED, half dot
│  │     I'll ask again at 4:00             │  │
│  └────────────────────────────────────────┘  │
│                8 gap                         │
│  ┌────────────────────────────────────────┐  │
│  │  ○  Electricity bill                   │  │  ← SCHEDULED, teal ring
│  │     6:00 this evening                  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**Rules for this list:**

1. **Chronological, always.** Never grouped by state, never sorted with misses last. Grouping creates
   a scoreboard.
2. **No counts anywhere.** No "3 of 5 done", no progress ring, no streak. A day is not a score, and a
   streak turns a missed tablet into a broken run.
3. **Four distinguishable marks**, all in the same 12px slot: `✓` green tick (`COMPLETED`), `●` filled
   teal (`ACTIVE`), `◑` half teal (`SNOOZED`), `○` teal ring (`SCHEDULED`), `○` charcoal-40% hollow
   (`MISSED`/`ESCALATED`). Shape carries the meaning; colour reinforces it. Never colour alone.
4. **Row heights are identical.** A `MISSED` row is not taller, not bolder, not badged.
5. Tapping any row opens its full screen in the current state.

---

## 6. Medicine safety on screen

The strictest constraints in the product, expressed as UI rules.

### 6.1 What the screen may show

Only the elder's own words for the medicine: **"your morning tablet"**, **"the white one"**, whatever
they called it when they set the reminder. The routine title is elder-authored text, rendered
verbatim.

### 6.2 What the screen must never show

| Never rendered | Even if |
|---|---|
| A dosage — any number of tablets, any mg, any "take one" | The elder told Thuna and it is in memory |
| A medicine's brand or generic name Thuna inferred | Extraction was confident |
| A purpose — "for blood pressure" | It came from a photographed strip |
| A schedule Thuna adjusted | It looks obviously wrong |
| Any field labelled Dose, Strength, or Quantity | — |

**There is no dose field in the check-in schema.** Not empty, not hidden, not optional — absent. A
field that exists is a field something will eventually populate.

### 6.3 The screen must not invite a dosage question

This is a layout requirement, not just a copy one.

- No "More about this medicine" link.
- No "?" or info icon on the medicine card.
- No "Details" affordance on a medicine reminder of any kind.
- The guidance card asks one question — *have you taken it* — and offers no adjacent surface that
  implies Thuna knows more.

An info icon is a promise. On a medicine reminder, it is a promise Thuna must refuse to keep, and it
is better not to make it.

### 6.4 When the elder asks anyway

*"Should I take two since I missed yesterday?"*

Routed through the same **pre-model deterministic refusal path** as OTP/PIN/CVV — `quickCheck()` in
`lib/router.ts`. No LLM call is made, because an LLM asked about dosage produces a plausible answer,
and plausible is exactly the danger.

```
┌──────────────────────────────────────────────┐
│  Morning medicine                    [ ⟵ ]   │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  You asked: should I take two          │  │  ← 16/400 @70%, echo band
│  │  ────────────────────────────────────  │  │
│  │  I can't advise on doses — I'm only    │  │  ← 26/34
│  │  a reminder. Please check with your    │  │
│  │  doctor or pharmacist.                 │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Call someone who can help        ›    │  │  ← 358 × 72
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Go back to the reminder          ›    │  │  ← 358 × 72
│  └────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│  [ Wait ]        [ Say again ]               │
└──────────────────────────────────────────────┘
```

> "I can't advise on doses — I'm only a reminder. Please check with your doctor or pharmacist. Would
> you like me to help you call someone?"

And for *"What is this tablet for?"*:

> "I don't know what your medicines do, and I shouldn't guess. Your doctor or pharmacist can tell you
> properly."

**Rendering rules for a refusal:**

| Rule | Reason |
|---|---|
| **Neutral `--teal-100`, no red, no warning rule** | The elder asked a completely reasonable question. Nothing is wrong |
| **The human-help offer is the first option, full width, 72 tall** | "Offer human help" is the substance of the refusal, not a footnote to it |
| **The reminder is not lost** | "Go back to the reminder" returns to the exact `ACTIVE` state. Asking a question must not cost the elder their place — same rule as contextual questions in `TASK_SCREEN_SYSTEM.md` §6 |
| **No "I'm sorry"** | Thuna is not sorry; it is bounded. An apology invites the elder to push |
| **Never re-asked or logged as a difficulty** | The question does not appear in any history the elder or family can see |

**Uncertainty pauses.** If Thuna cannot tell whether the elder is confused or in difficulty, it does
not diagnose. It offers human help, in exactly this layout.

---

## 7. Implementation notes for GLM

1. **One `CheckInScreen` component, one `RoutineState` prop.** No `switch (routineType)` anywhere in
   the view layer. Type-specific strings come from a routine-type table, the way `TaskSkill` supplies
   step prompts.
2. **The state → visual mapping is a lookup table, not conditionals.** `{ COMPLETED: {mark:'tick',
   color:'--green-600'}, MISSED: {mark:'hollow', color:'charcoal-40'}, … }`. This makes the
   "MISSED must not be green" rule reviewable in one place and testable directly.
3. **Assert in tests that no `MISSED` render path can produce `--green-600` or a tick glyph.** This is
   the UI mirror of `ROUTINE_ENGINE.md` §4's prohibited transitions and deserves the same weight.
4. **The snooze confirmation string is generated once and used for both speech and screen.** Do not
   format the time twice — a screen saying "9:15" while the voice says "quarter past nine" is two
   different times to a listener who is not looking.
5. **The `ESCALATED` screen must read the actual sent `disclosure` string**, not reconstruct it. What
   Thuna says it sent must be byte-identical to what was sent.
6. **The escalation offer renders only when `hasConsent(recipient, ROUTINE_MISSED)` is false and the
   elder has not declined this session.** Track the decline in session state; do not re-ask.
7. **No dose field in any type.** Add a test asserting the check-in props type has no `dose`,
   `strength`, `quantity`, or `medicineName` key. Fail on the field's presence, not on a string match.
8. **The dosage refusal renders from the router's pre-model path.** The screen must be reachable
   without any model call having occurred, so it cannot depend on a streamed response.
9. **No timers rendered anywhere in `ACTIVE`.** No countdown, no progress bar, no dimming as the listen
   window closes.
10. **Cancel is immediate.** No confirm dialog component may be wired to the cancel control. Undo lives
    on the resulting screen instead.

---

## Related

- `docs/companion/ROUTINE_ENGINE.md` — the eight states, transitions, prohibited transitions, medicine safety
- `docs/companion/FAMILY_CONSENT_POLICY.md` §4, §7, §10 — the `ROUTINE_MISSED` gate and the no-consent case
- `docs/companion/MINIMUM_DISCLOSURE_POLICY.md` §5 — what an escalation message may contain
- `docs/companion/CHECKIN_CONVERSATION_POLICY.md` — what Thuna says once `ACTIVE`
- `TASK_SCREEN_SYSTEM.md` §2, §5 — the slot schema and control row this screen reuses
- `LIFE_EVENTS_AND_REMEMBER_THIS.md` — due-day reminders that render through this screen
- `FAMILY_HANDOFF_SCREEN.md` — where "Call someone who can help" leads
- `COMPONENT_SPECIFICATION.md` — `CheckInScreen`, `GuidanceCard`
- `VISUAL_DESIGN_SYSTEM.md` — tokens
