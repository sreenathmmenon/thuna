# Thuna — Life Events and "Remember This"

> Design specification. **Changes no production code.**
>
> One flow saves every kind of thing an elder wants remembered — a wedding, a bill, an appointment, a
> birthday, a delivery, a renewal, a family gathering, or something that fits no category at all.
> **The event type is data.** It supplies a title, which fields to look for, and a default reminder
> plan. It never supplies a screen.
>
> The `LifeEvent` record, its states, and per-field provenance are defined in
> `docs/companion/LIFE_EVENT_SCHEMA.md` and are not restated here.

---

## 1. The one thing this screen must get right

> ## Nothing is saved until the elder says so.

A `LifeEvent` in `DRAFT` or `NEEDS_CONFIRMATION` is a **candidate** — Thuna's reading of something,
not a fact. `LIFE_EVENT_SCHEMA.md` §3 makes this explicit: candidates are not part of "what Thuna
remembers about me", because reading back unconfirmed guesses as memory misrepresents what Thuna
knows.

The screen has to carry that distinction, at a glance, without the elder learning any vocabulary.
An elder who cannot tell saved from not-saved will either assume everything is saved (and be let down
by a wedding Thuna never had) or assume nothing is (and confirm the same thing four times).

**How candidate-ness is made visible — four devices, used together:**

| Device | Specification |
|---|---|
| **The dashed frame** | The whole candidate card is drawn with a **2px dashed `--teal-900` border at 55% opacity**, radius 24. Confirmed cards use a **solid 2px `--teal-900`** border. Dashed reads as provisional in every culture that has ever printed a coupon |
| **The unsaved strip** | A 40px strip along the card's top edge, inside the frame, `--teal-100`, 16/600: **"Not saved yet"** — plain words, present at all times, not a tooltip |
| **No completed styling** | No tick, no `--green-600`, nothing that reads as done, anywhere on the card |
| **The action is the exit** | The card cannot be left in a half-state by scrolling past it. The only ways out are Save, Change something, or Don't save — all three visible without scrolling |

Together, an elder can answer "is this saved?" from across the room.

---

## 2. The flow — eight steps, one shape

```
input ──► "I understood" ──► candidate details ──► correct one field
                                    │                      │
                                    └──────────◄───────────┘
                                    │
                                    ▼
                          reminder choices ──► SAVE
                                                 │
                                                 ▼
                                    upcoming event ──► due-day check-in ──► completion
```

Steps 1–5 are the candidate; nothing is stored. Save is the transition to `CONFIRMED`. Steps 7–8 reuse
`CheckInScreen` from `ROUTINE_AND_CHECKIN_SCREENS.md` — a due-day reminder is a due-day reminder.

| Step | `LifeEventState` | Screen |
|---|---|---|
| 1 · Input | — | Voice, photo, or forwarded message. No dedicated screen |
| 2 · "I understood" | `DRAFT` | Understanding card (§3) |
| 3 · Candidate details | `NEEDS_CONFIRMATION` | `LifeEventConfirmation` with dashed frame (§4) |
| 4 · Correct one field | `NEEDS_CONFIRMATION` | Single-field correction (§5) |
| 5 · Reminder choices | `NEEDS_CONFIRMATION` | Reminder picker (§6) |
| 6 · Save | `CONFIRMED` | Saved card (§7) |
| 7 · Upcoming | `UPCOMING` | List row + detail (§7) |
| 8 · Due day → completion | `DUE`→`ACTIVE`→`COMPLETED` | `CheckInScreen` (§8) |

**The elder can leave at any step and nothing persists** before step 6. A `DRAFT` never read back is
dropped after 7 days with an event record; a `NEEDS_CONFIRMATION` is read back at most 3 times and
then dropped with dignity.

---

## 3. Step 2 — "I understood"

The elder holds up a wedding invitation, or says it aloud. Before any details, Thuna says what kind
of thing it thinks this is. One sentence, one screen, no fields yet.

```
┌──────────────────────────────────────────────┐  ← 390 wide
│  Something to remember                [ ⟵ ]  │  ← 56 header, --teal-900
├──────────────────────────────────────────────┤
│                24 gap                        │
│  ╔══════════════════════════════════════════╗│  ┐ dashed 2px --teal-900 @55%
│  ║  Not saved yet                           ║│  │ strip 40, --teal-100, 16/600
│  ╟──────────────────────────────────────────╢│  │
│  ║                                          ║│  │ w 358, radius 24
│  ║   This looks like a wedding              ║│  │ 26/34, pad 24
│  ║   invitation.                            ║│  │
│  ║                                          ║│  │
│  ║   Shall I read what it says?             ║│  │
│  ║                                          ║│  │
│  ╚══════════════════════════════════════════╝│  ┘
│                24 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   Yes, read it                    ›    │  │  ← 358 × 72
│  └────────────────────────────────────────┘  │
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   It's something else             ›    │  │  ← 358 × 72
│  └────────────────────────────────────────┘  │
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │        Never mind                      │  │  ← 358 × 52, text-only
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

> "This looks like a wedding invitation. Shall I read what it says?"

**Why type-first.** If the type is wrong, everything downstream is wrong, and correcting a type after
six extracted fields means discarding six answers. Asking first costs one screen and saves the elder
from confirming a bill's worth of fields about a wedding.

"It's something else" opens a plain list: Wedding · Birthday · Appointment · Bill · Delivery ·
Renewal · Family event · Something else. Choosing "Something else" gives a `CUSTOM` event: the elder
says what it is in their own words, and that string becomes the title. **A custom event is not a
lesser event** — it gets the same fields, the same reminders, and the same save.

---

## 4. Step 3 — candidate details, with provenance per field

The heart of the screen. Every field shows **what Thuna read** and **where it read it from.**

Worked example throughout: **Meera and Arun, Saturday 8 August, Guruvayur, half past ten.**

```
┌──────────────────────────────────────────────┐
│  Wedding                              [ ⟵ ]  │
├──────────────────────────────────────────────┤
│  ╔══════════════════════════════════════════╗│  ┐ dashed frame
│  ║  Not saved yet                           ║│  │
│  ╟──────────────────────────────────────────╢│  │
│  ║                                          ║│  │
│  ║   I read this from the invitation.       ║│  │  ← 20/500, @70%, pad-b 16
│  ║                                          ║│  │     the source, said once
│  ║  ┌────────────────────────────────────┐  ║│  │
│  ║  │ Who                                │  ║│  │  ← FIELD ROW
│  ║  │ Meera and Arun          [ Change ] │  ║│  │  label 16/500 @70%
│  ║  └────────────────────────────────────┘  ║│  │  value 20/600
│  ║  ┌────────────────────────────────────┐  ║│  │  Change 88×52, text-only
│  ║  │ Day                                │  ║│  │  --teal-900 16/600
│  ║  │ Saturday, 8 August      [ Change ] │  ║│  │  row h 76, gap 8
│  ║  └────────────────────────────────────┘  ║│  │  1px --teal-900@15% rule
│  ║  ┌────────────────────────────────────┐  ║│  │  between rows
│  ║  │ Time                               │  ║│  │
│  ║  │ Half past ten           [ Change ] │  ║│  │
│  ║  └────────────────────────────────────┘  ║│  │
│  ║  ┌────────────────────────────────────┐  ║│  │
│  ║  │ Where                              │  ║│  │
│  ║  │ Guruvayur               [ Change ] │  ║│  │
│  ║  └────────────────────────────────────┘  ║│  │
│  ║                                          ║│  │
│  ╚══════════════════════════════════════════╝│  ┘
│                20 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   That's right                    ›    │  │  ← 358 × 72, --teal-900 fill
│  └────────────────────────────────────────┘  │     --bg-cream label 20/600
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │        Don't save this                 │  │  ← 358 × 52, text-only
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

> "I read this from the invitation. Meera and Arun, Saturday the eighth of August, at Guruvayur, half
> past ten. Is that right?"

### 4.1 Provenance display

`FieldValue.source` and `extractedFrom` exist so Thuna can say the sentence that makes it
trustworthy. On screen, provenance follows one rule:

> **State the source once, above the fields, when every field shares it. Attach it per field only
> when they differ.**

| Situation | Display |
|---|---|
| All fields from one source | One line above the rows: *"I read this from the invitation."* |
| Mixed sources | The line above states the majority source; **only the odd ones out** carry a per-row sub-line at 15/400 @60%: *"you told me this"* |
| A field Thuna could not read | Row shows **"I couldn't read this"** in `--charcoal-900` @60% italic where the value would be, with the Change button reading **[ Tell me ]** |
| A field derived, not read | Sub-line: *"worked out from the date"* |

Per-row provenance on every row would be four repetitions of the same phrase, and repetition is how a
screen becomes unreadable. The point of the phrase is honesty about origin — once is honest, four
times is noise.

**Never shown:** `confidence` numbers, `status` enum values, `rawText`, `evidence` handles, or the
word "extracted". `FieldValue.confidence` decides whether Thuna *asks* about a field; the number
itself never reaches the elder. "I'm 0.72 sure about the venue" is not a sentence a person says.

### 4.2 Fields by event type — data, not layout

| Type | Field rows | Title |
|---|---|---|
| Wedding | Who · Day · Time · Where | The names |
| Birthday | Whose · Day | "Priya's birthday" |
| Appointment | What · Day · Time · Where | The subject |
| Bill | What · How much · Due day | The provider |
| Delivery | What · When | The item |
| Renewal | What · Expires | The subject |
| Family event | What · Who · Day · Time · Where | Elder's words |
| Custom | Elder's words · Day · Time | Elder's words |

Rows render in this order, every time, using **only** the field keys in `LIFE_EVENT_SCHEMA.md` §4. No
key is invented at extraction time, and no type gets a bespoke row.

Two content rules with teeth:

- **A bill's `amount` always shows its `unit`** and is never silently rounded: "Rs 1,340", never "about
  1,300".
- **`reference` is never rendered** unless the elder asks for it. Per the schema it is never spoken
  aloud unasked, and a screen that displays a 16-digit consumer number has told the elder their
  invitation is a form.

### 4.3 Unknown fields do not block saving

If the elder does not know the wedding's time, the row reads:

```
┌────────────────────────────────────┐
│ Time                               │
│ You said you don't know  [ Tell me]│  ← @60%, not an error
└────────────────────────────────────┘
```

The event saves anyway, with a morning-of reminder instead of a timed one. `UNKNOWN_ACCEPTED` is a
real state, not a failure — blocking on completeness is a software preference, not the elder's. The
row is never red, never marked required, and never prevents the "That's right" button from working.

---

## 5. Step 4 — correcting one field

The case this whole design exists for: **"Not Sunday, Saturday."**

The elder changes one thing. Everything else stays, including its provenance. This mirrors the
engine's targeted correction — *"wait, plain dosa"* changes the item and leaves the restaurant and
address alone — and `LIFE_EVENT_SCHEMA.md` §4's correction rule: a correction rewrites only that
field's `value`, `source`, `confidence`, `status`, `correctedFrom` and `correctedAt`.

Two ways in, one result: **tap [ Change ] on the Day row**, or **just say it.**

### 5.1 The single-field screen

```
┌──────────────────────────────────────────────┐
│  Wedding                              [ ⟵ ]  │
├──────────────────────────────────────────────┤
│  ╔══════════════════════════════════════════╗│
│  ║  Not saved yet                           ║│
│  ╟──────────────────────────────────────────╢│
│  ║                                          ║│
│  ║   Which day is it?                       ║│  ← 26/34
│  ║                                          ║│
│  ║   I read Sunday the ninth from the       ║│  ← 18/400 @70%
│  ║   invitation.                            ║│     what it currently holds
│  ║                                          ║│     and where that came from
│  ╚══════════════════════════════════════════╝│
│                20 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   Saturday, 8 August              ›    │  │  ← 358 × 72, likely alternates
│  └────────────────────────────────────────┘  │     from the same source
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   Sunday, 9 August                ›    │  │  ← what Thuna read, kept as
│  └────────────────────────────────────────┘  │     an option, not privileged
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   A different day                 ›    │  │
│  └────────────────────────────────────────┘  │
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │        Leave it as it is               │  │  ← 358 × 52, text-only
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**Only the Day is on this screen.** Who, Time and Where are not shown, not re-asked, and not editable
from here. Correcting one field must never re-open the others — that is precisely the experience that
makes people stop correcting things and accept a wrong date.

### 5.2 Back to the details, with the change marked

```
│  ║   I read this from the invitation.       ║│
│  ║  ┌────────────────────────────────────┐  ║│
│  ║  │ Who                                │  ║│
│  ║  │ Meera and Arun          [ Change ] │  ║│
│  ║  └────────────────────────────────────┘  ║│
│  ║  ┌────────────────────────────────────┐  ║│
│  ║  │ Day                                │  ║│
│  ║  │ Saturday, 8 August    ● [ Change ] │  ║│  ← ● 6px --green-600
│  ║  │ you corrected this                 │  ║│  ← 15/400 @60% sub-line
│  ║  └────────────────────────────────────┘  ║│
│  ║  ┌────────────────────────────────────┐  ║│
│  ║  │ Time                               │  ║│
│  ║  │ Half past ten           [ Change ] │  ║│  ← untouched, no marks
│  ║  └────────────────────────────────────┘  ║│
│  ║  ┌────────────────────────────────────┐  ║│
│  ║  │ Where                              │  ║│
│  ║  │ Guruvayur               [ Change ] │  ║│
│  ║  └────────────────────────────────────┘  ║│
```

> "Saturday the eighth, then. The rest is still what I read from the invitation."

That sentence is the reason per-field provenance exists. A record-level source cannot produce it —
after one correction, a record-level source would have to call the whole thing "partly corrected",
which tells the elder nothing about which parts.

| Rule | Detail |
|---|---|
| **Row position never changes** | The Day row stays third. Rows do not reorder on correction |
| **The changed row gets a dot and a sub-line** | 6px `--green-600` dot left of [ Change ], 8px gap; sub-line "you corrected this" at 15/400 @60% |
| **Untouched rows get nothing** | No dimming, no re-marking, no "still from the invitation" on every row. The top line already said it |
| **Corrections are unlimited and unremarked** | A third correction reads exactly like the first. No "are you sure?", no count, no note that this field has changed before |
| **Derived values update silently** | Correcting the day recomputes "in 13 days" with no dot. Consequences are not changes |

### 5.3 Correcting by voice mid-screen

*"No, Saturday"* while the details are showing skips §5.1 entirely and lands directly on §5.2, with
the same dot and sub-line. Voice and touch produce identical state — an elder who used their voice
must not get a lesser record than one who tapped.

---

## 6. Step 5 — reminder choices

Defaults come from the **event type's reminder policy**. They are pre-selected, visible, changeable,
and stated in words.

```
┌──────────────────────────────────────────────┐
│  Wedding                              [ ⟵ ]  │
├──────────────────────────────────────────────┤
│  ╔══════════════════════════════════════════╗│
│  ║  Not saved yet                           ║│
│  ╟──────────────────────────────────────────╢│
│  ║   When shall I remind you?               ║│  ← 26/34
│  ╚══════════════════════════════════════════╝│
│                20 gap                        │
│  ┌────────────────────────────────────────┐  │  ┐ REMINDER OPTIONS
│  │  ☑  The day before                     │  │  │ 358 × 72 each
│  │     Friday, 7 August                   │  │  │ gap 12, radius 16
│  └────────────────────────────────────────┘  │  │ checked: 3px --teal-900
│  ┌────────────────────────────────────────┐  │  │   border + --teal-100 fill
│  │  ☑  On the morning                     │  │  │ unchecked: 2px charcoal
│  │     Saturday, 8 August                 │  │  │   @30% border, no fill
│  └────────────────────────────────────────┘  │  │ box 28px, 20 from left
│  ┌────────────────────────────────────────┐  │  │ label 18/600
│  │  ☐  A week before                      │  │  │ sub 16/400 @70% — the
│  │     Saturday, 1 August                 │  │  ┘   real date, always
│  └────────────────────────────────────────┘  │
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │  ☐  Don't remind me                    │  │  ← clears the others
│  └────────────────────────────────────────┘  │
│                24 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   Save this                       ›    │  │  ← 358 × 72, --teal-900 fill
│  └────────────────────────────────────────┘  │
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │        Don't save this                 │  │  ← 358 × 52, text-only
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

> "I'll remind you the day before, and on the morning. Shall I save this?"

### 6.1 Defaults by type

| Type | Pre-selected | Rationale |
|---|---|---|
| Wedding | Day before · Morning of | Travel needs a day's notice; the morning is for leaving on time |
| Birthday | Morning of | A wish is same-day |
| Appointment | Day before · 2 hours before | Two hours is enough to get ready and travel |
| Bill | 3 days before · Due day | Time to arrange, then a last word |
| Delivery | Morning of | — |
| Renewal | A week before · Day before | Renewals take paperwork |
| Family event | Day before · Morning of | |
| Custom | Morning of | The safest single default |

### 6.2 Rules

1. **Every option shows the real date underneath.** "The day before" is a rule; "Friday, 7 August" is
   what will actually happen. The elder should never have to compute.
2. **Checked state is a border and a fill, not a colour alone.** A 3px border plus `--teal-100` fill;
   the 28px box holds a `--teal-900` tick. Legible without colour vision.
3. **"Don't remind me" is a first-class option**, not hidden behind unchecking everything. Selecting it
   clears the others and saves the event with an empty `reminderPlan`. The event is still saved —
   remembering and reminding are separate things, and an elder may want the first without the second.
4. **The whole 358 × 72 row is the target.** Never the 28px box alone.
5. **No more than four options.** More is a settings screen.
6. **Reminders are changeable later**, from the saved event's detail screen, with this exact screen.

---

## 7. Step 6–7 — saved, and upcoming

Save is the moment `NEEDS_CONFIRMATION → CONFIRMED`, `reminderPlan` materialises, and the dashed
frame becomes solid. The transition is the whole confirmation: **the frame closes.**

```
┌──────────────────────────────────────────────┐
│  Wedding                              [ ⟵ ]  │
├──────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐│  ┐ SOLID 2px --teal-900
│  │  Saved                                   ││  │ strip 40, --teal-100
│  ├──────────────────────────────────────────┤│  │ 16/600 with a 20px
│  │                                          ││  │ --green-600 tick, 8 left
│  │   Meera and Arun's wedding               ││  │
│  │   Saturday, 8 August                     ││  │ title 24/600
│  │   Half past ten, at Guruvayur            ││  │ detail 20/400, lh 30
│  │                                          ││  │
│  │   I'll remind you on Friday and on       ││  │ 18/400 @70%, pad-t 16
│  │   Saturday morning.                      ││  │ 1px @15% rule above
│  │                                          ││  │
│  └──────────────────────────────────────────┘│  ┘
│                20 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   Change something                ›    │  │  ← 358 × 72, outlined
│  └────────────────────────────────────────┘  │
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   Done                            ›    │  │  ← 358 × 72, --teal-900 fill
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

> "Saved. Meera and Arun's wedding, Saturday the eighth of August, half past ten, at Guruvayur. I'll
> remind you on Friday and on Saturday morning."

**The saved card differs from the candidate card in five ways at once** — solid frame, "Saved" strip,
a tick, no [ Change ] buttons on individual rows, and prose instead of a field table. Five
simultaneous differences means the elder never has to notice any particular one.

### 7.1 The upcoming list row

```
┌────────────────────────────────────────┐
│  Meera and Arun's wedding              │  ← 18/600, row h 84
│  Saturday, 8 August · Guruvayur        │  ← 16/400 @70%
│  in 13 days                            │  ← 16/500 --teal-900
└────────────────────────────────────────┘
```

Rows are chronological. **No countdown badge, no urgency colouring as the date nears, no bold on
"tomorrow".** The date approaching is not an emergency, and a list that escalates its own styling
teaches the elder to feel behind.

### 7.2 Candidates in the list

A `NEEDS_CONFIRMATION` event appearing in a list keeps its **dashed border and its "Not saved yet"
strip**, at the same 84 height:

```
╔════════════════════════════════════════╗
║  Not saved yet                         ║
╟────────────────────────────────────────╢
║  A wedding, I think                    ║
║  Saturday, 8 August                    ║
║  Tap to finish                         ║  ← 16/500 --teal-900
╚════════════════════════════════════════╝
```

It sits in date order with the confirmed events, not in a separate "drafts" section — an elder should
see their upcoming life in one list — but it can never be mistaken for saved.

---

## 8. Step 8 — due day and completion

The due-day reminder renders through `CheckInScreen` (`ROUTINE_AND_CHECKIN_SCREENS.md` §2). The event
supplies the title, the question, and the answers.

```
┌──────────────────────────────────────────────┐
│  Meera and Arun's wedding             [ ⟵ ]  │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  This morning                          │  │
│  │  ────────────────────────────────────  │  │
│  │  Meera and Arun's wedding is today     │  │  ← 26/34
│  │  at Guruvayur, half past ten.          │  │
│  │                                        │  │
│  │  Would you like anything arranged?     │  │
│  └────────────────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │  Nothing for    │  │  Yes, help me   │   │  ← 171 × 88
│  │  now            │  │                 │   │
│  └─────────────────┘  └─────────────────┘   │
└──────────────────────────────────────────────┘
```

"Yes, help me" reveals up to **three** offers from the event's `offers` — never more in one turn.
For a wedding: **Directions to Guruvayur · A ride · Help with a gift.** Each is an offer, and each
still requires its own yes before anything happens. Nothing is booked, ordered, or arranged from this
screen.

### 8.1 Completion — the day after

```
┌──────────────────────────────────────────────┐
│  ┌────────────────────────────────────────┐  │
│  │  Did you go to Meera and Arun's        │  │
│  │  wedding yesterday?                    │  │
│  └────────────────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │  Yes, I went    │  │  I didn't go    │   │
│  └─────────────────┘  └─────────────────┘   │
│  ┌────────────────────────────────────────┐  │
│  │        Rather not say                  │  │  ← 358 × 52, text-only
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

| Answer | `CompletionRecord.method` | Reply |
|---|---|---|
| Yes, I went | `ELDER_CONFIRMED` | "I'm glad. I'll keep it in mind." |
| I didn't go | `ELDER_CONFIRMED` | "Alright. I've noted that." |
| Rather not say | `ELDER_DECLINED_TO_SAY` | "Of course." |
| No answer at all | *(none — stays `MISSED`)* | — |

**"Rather not say" is a complete and respected answer.** It closes the event without claiming the
underlying thing happened, and it is not `MISSED`, because Thuna did get a response. The reply is two
words and no follow-up: an elder who declined to answer must not then be asked why.

There is no `INFERRED` method. A screen may never mark an event completed because its date passed.

---

## 9. Implementation notes for GLM

1. **One `LifeEventConfirmation` component for all types.** Field rows render from
   `event.fields[]` in the type's declared key order. No `switch (type)` in the view.
2. **Candidate-ness is derived from `state`**, one predicate: `state === 'DRAFT' || state ===
   'NEEDS_CONFIRMATION'`. It drives the border style and the strip. Do not thread a separate
   `isDraft` prop — two sources of truth for "is this saved" is the bug that shows a saved badge on an
   unsaved event.
3. **The dashed border is `border: 2px dashed`, not a background image or a pseudo-element.** It must
   survive theme changes and be visible in a screenshot at 50% scale.
4. **`confidence`, `status`, `rawText`, and `evidence` must not be in the component's props type at
   all.** Structural enforcement — a value the view cannot reach is a value it cannot leak. Map to a
   view model at the boundary.
5. **The correction screen takes one `fieldKey`.** It cannot render a second field. Assert in tests
   that `applyCorrection` results in exactly one differing `FieldValue`, matching the pure-function
   assertion the schema already calls for.
6. **Reminder option sub-lines are computed dates**, formatted with the same date formatter used for
   speech. "The day before" and "Friday, 7 August" must never disagree.
7. **Nothing writes to memory before Save.** The candidate lives in component/session state. Test that
   abandoning the flow at any step leaves the memory store byte-identical.
8. **A candidate is excluded from the memory readback.** The "what do you remember about me?" list
   (`MEMORY_AND_PRIVACY_SCREEN.md`) must filter `DRAFT` and `NEEDS_CONFIRMATION`. They belong to
   "what are you still asking me about?", a different question.
9. **Default `sharingClass` is `PRIVATE` for every type, including weddings and birthdays.** The save
   screen offers no share toggle. Sharing is a separate, explicit act.
10. **Never persist image bytes.** The invitation photo is transient; `evidence` is a handle. The
    confirmation screen shows no thumbnail of the invitation — a thumbnail implies the image is kept.

---

## Related

- `docs/companion/LIFE_EVENT_SCHEMA.md` — `LifeEvent`, `FieldValue`, states, `CompletionRecord`, `OfferKind`
- `docs/companion/LIFE_EVENTS_ENGINE.md` — transitions
- `docs/companion/REMINDER_POLICY_ENGINE.md` — how `reminderPlan` is built
- `docs/companion/EVENT_EXTRACTION_POLICY.md` — how field confidence is set and acted on
- `docs/companion/MEMORY_MODEL.md` §8 — targeted correction
- `ROUTINE_AND_CHECKIN_SCREENS.md` §2, §4 — the due-day screen and its states
- `TASK_SCREEN_SYSTEM.md` §6 — the correction re-render pattern this mirrors
- `MEMORY_AND_PRIVACY_SCREEN.md` — where a confirmed event becomes something Thuna remembers
- `COMPONENT_SPECIFICATION.md` — `LifeEventConfirmation`, `CheckInScreen`, `GuidanceCard`
- `VISUAL_DESIGN_SYSTEM.md` — tokens
