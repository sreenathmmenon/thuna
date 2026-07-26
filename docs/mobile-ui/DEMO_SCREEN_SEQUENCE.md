# Thuna — Demo Screen Sequence

> Design specification. **Changes no production code.**
>
> The **screen-level counterpart** to `../companion/COMPANION_DEMO_SCRIPT.md`. That document is the
> narrative — what Appa says, what Thuna says, and which design document backs each beat. This one
> is what the judge *sees on the phone*, screen by screen, with exact copy, exact timing, and the
> presenter's actions.
>
> Where the two documents describe the same moment, the narrative script is authoritative on the
> **spoken words** and this document is authoritative on the **screen**. Neither contradicts the
> other; §14 maps them scene by scene.
>
> **Everything external is simulated and labelled `SIMULATED`.** No real order is placed, no real
> money moves, no real message is sent.

---

## 1. The staging rule that governs everything

> ## The elder mobile UI stands alone.
>
> A separate **demo inspector** may run beside it on the presentation laptop — engine events,
> fallback status, the state machine, the refusal trace. It is **never inside the elder UI**, never
> a drawer, never a long-press panel, never a corner overlay, never a debug toggle the presenter
> reveals mid-demo.

This is the single most important staging decision in the demo, for three reasons:

1. **It is the product claim, demonstrated rather than asserted.** Thuna's thesis is that an elder
   gets a calm, uncluttered surface while the sophistication lives behind it. A UI that can reveal
   its own machinery has not made that separation; it has decorated it.
2. **Judges read a debug drawer as unfinished.** A polished consumer surface with a *separate*
   engineering view reads as two deliberate products. The same information inside the phone reads
   as a prototype with the seams showing.
3. **It removes the worst failure mode.** A presenter who can toggle debug will toggle it under
   pressure, at the exact moment the judge is looking at the elder's screen.

Physical setup:

| Surface | Shows | Audience |
|---|---|---|
| **Phone** (or a phone-framed browser at 390×844) | The elder UI, and nothing else | Everyone. This is the demo. |
| **Laptop, second window** | Demo inspector — engine events, `EngineAction` trace, fallback layer, safety-check log | The presenter, and judges who ask "is this real?" |
| **Laptop, screen-mirrored phone** | A mirror of the phone, so the room can see it | Everyone |

If only one screen is available, show **the phone**. The inspector is the answer to a question, not
part of the pitch.

---

## 2. Sequence at a glance

| # | Screen | Duration | Proves | Cut priority |
|---|---|---|---|---|
| 1 | Home | 15s | The product is calm and finished | Never |
| 2 | Listening | 10s | Voice is the interface | Never |
| 3 | Understanding | 8s | It heard correctly | Compress |
| 4 | Food memory | 20s | **Memory pays off** | Never |
| 5 | Contextual question | 25s | It answers *about the screen*, not generically | **Cut 1st** |
| 6 | Correction | 30s | One field changes; confirmation is invalidated | Never |
| 7 | Confirmation | 20s | Nothing happens without an explicit yes | Never |
| 8 | Completion | 15s | Honest, labelled, family-aware | Never |
| 9 | "Remember this" — wedding | 40s | **Candidate, not saved** | Never |
| 10 | Date correction | 30s | One field changes, provenance survives | Never |
| 11 | Reminder / check-in | 30s | **Continuity — the payoff** | Never |
| 12 | Family handoff | 25s | The human bridge, with the message shown | Cut 2nd |
| 13 | Safety warning | 25s | **Deterministic refusal** | Never |

**Total: 4 minutes 53 seconds** of screen time, plus roughly 40 seconds of presenter narration
between beats → **a 5½-minute demo**. §15 gives the cut plan.

---

## 3. Screen 1 — Home

**Duration: 15s · Components: ElderShell · MobileHeader · DailyBrief(on-demand) · BottomNavigation ·
TalkButton(idle)**

### On screen

```
┌────────────────────────────────────────────────┐ 390 × 844
│  safe-top 59px                                 │
├────────────────────────────────────────────────┤
│  Thuna                                    64px │ ← MobileHeader, 20px/600
├────────────────────────────────────────────────┤
│                                                │
│   Good morning, Appa.               32px/600   │ ← --text-greeting
│                                                │
│   ┌──────────────────────────────────────────┐ │
│   │ 📅  Saturday                              │ │
│   │     Meera's wedding is on Saturday.      │ │ ← DailyBrief items,
│   └──────────────────────────────────────────┘ │   20px/400, 80px rows
│   ┌──────────────────────────────────────────┐ │
│   │ ⚡  Tuesday                               │ │
│   │     The electricity bill is due Tuesday. │ │
│   └──────────────────────────────────────────┘ │
│                                                │
│   That's all.                       20px/500   │ ← the full stop
│                                                │
│                                                │
│                    ╭──────────╮                │
│                    │    ▮     │  76px ⌀        │ ← TalkButton, idle
│                    ╰──────────╯                │   --teal-900
│                       Talk                     │
│  ▢ Home  ▢ Today       ▢ Family  ▢ Memory 64px │ ← BottomNavigation
│  safe-bottom 34px                              │
└────────────────────────────────────────────────┘
   --bg-cream #FBF7F0 throughout
```

### Copy on screen

> **Good morning, Appa.**
> Meera's wedding is on Saturday.
> The electricity bill is due on Tuesday.
> **That's all.**
> **Talk** — Tap and speak

### Spoken

*(Nothing. Home is silent. Thuna speaks when spoken to, or when it has a stated reason.)*

### Presenter says / does

> "This is what Appa's phone looks like. One screen. One button. Two things he needs to know today —
> and then it stops, because a list that never stops is a list nobody reads."

Do **not** tap anything for a full three seconds. Let the room look at it. The stillness is the
argument.

### Why this matters to a judge

The first three seconds decide whether the rest of the demo is heard as a product or a prototype.
There is no purple gradient, no chat bubble, no avatar, no notification badge, no sidebar. A judge
who has seen twenty AI demos this week registers the absence immediately.

The **absence of a badge count** is worth naming out loud if the room is technical: the design
deliberately refuses the anxiety-generating pattern every consumer app uses.

---

## 4. Screen 2 — Listening

**Duration: 10s · Components: + VoiceStatePanel · TalkButton(listening)**

### On screen

```
│   ┌──────────────────────────────────────────┐ │
│   │  ● Listening…                    16px/600│ │ ← VoiceStatePanel state row
│   │  ┌────────────────────────────────────┐  │ │
│   │  │ "Order my usual dosa"              │  │ │ ← live transcript
│   │  │                                    │  │ │   18px/400, --surface-2
│   │  └────────────────────────────────────┘  │ │   min-height 64px
│   └──────────────────────────────────────────┘ │
│                                                │
│              ╭ ─ ─ ─ ─ ─ ─ ─ ─ ╮               │ ← ring 2, 124px ⌀, 10% α
│            ╭ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─╮              │ ← ring 1, 100px ⌀, 20% α
│            │  ╭──────────────╮  │              │   breathing 1.0↔1.06
│            │  │      ▮       │  │              │   2200ms, --ease-calm
│            │  ╰──────────────╯  │              │
│            ╰ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─╯              │
│                  Listening…                    │
│              Tap again when finished           │
```

### Copy on screen

> **Listening…**
> "Order my usual dosa"
> **Listening…** — Tap again when finished

### Spoken (Appa)

> **"Order my usual dosa."**
> *(Malayalam: "എന്റെ പതിവ് ദോശ ഓർഡർ ചെയ്യൂ.")*

### Presenter says / does

Tap the TalkButton. Speak. **Say nothing over the top of it** — let the rings breathe and the
transcript appear on their own.

### Why this matters to a judge

Two things are being proved silently: the transcript appears *as he speaks* (so "did it hear me?"
is answered before it is asked), and the breathing rings are slow — 2200ms, a calm respiratory rate,
not a frantic pulse. Judges will not consciously register the timing, but they will register that it
feels unhurried.

If a judge asks about accessibility later, this is the screen to return to: the effective tap target
is 92px, and under `prefers-reduced-motion` the rings hold still while the word "Listening…" carries
the state.

### Timing note

Hold this state for a full 3 seconds after the utterance ends before tapping stop. A demo that snaps
instantly to the next screen looks scripted; a beat of real latency looks real.

---

## 5. Screen 3 — Understanding

**Duration: 8s · Components: + GuidanceCard · TalkButton(thinking)**

### On screen

```
│   ┌──────────────────────────────────────────┐ │
│   │  ● Thinking…                             │ │
│   │  ┌────────────────────────────────────┐  │ │
│   │  │ "Order my usual dosa"              │  │ │ ← transcript frozen, final
│   │  └────────────────────────────────────┘  │ │
│   └──────────────────────────────────────────┘ │
│                                                │
│            ╭ ─ ─ ─ ─ ─ ─ ─ ─ ╮                 │ ← single ring, 24% α
│            │  ╭──────────────╮  │              │
│            │  │   • • •      │  │              │ ← three dots, sequential fade
│            │  ╰──────────────╯  │              │   1400ms, 160ms stagger
│            ╰ ─ ─ ─ ─ ─ ─ ─ ─ ╯                 │
│                   Thinking…                    │
│                   One moment                   │
```

### Copy on screen

> **Thinking…** — One moment

### Presenter says / does

> "It's matching 'my usual' against what it already knows about him."

### Why this matters to a judge

This screen exists to make the next one land. Without a visible thinking beat, screen 4's fully
populated summary looks pre-baked. Eight seconds of honest latency, clearly labelled, buys the
credibility of the memory reveal.

**Compress this** if running short: 3 seconds is enough.

---

## 6. Screen 4 — Food memory

**Duration: 20s · Components: GuidanceCard(neutral) · TaskSummary · TalkButton(speaking)**

### On screen

```
│   ┌──────────────────────────────────────────┐ │
│   │  🍽  Food order        ┌────────────┐     │ │ ← TaskSummary
│   │                        │ SIMULATED  │     │ │
│   │  ──────────────────────────────────────  │ │
│   │   What      Masala Dosa, no chutney      │ │ ← 56px rows
│   │  ──────────────────────────────────────  │ │   label 16px --text-secondary
│   │   From      Udupi Cafe                   │ │   value 20px/500
│   │  ──────────────────────────────────────  │ │
│   │   To        Home                         │ │
│   │  ──────────────────────────────────────  │ │
│   │   Total     Rs 145              24px     │ │ ← --font-numeric, tabular
│   └──────────────────────────────────────────┘ │
│   ┌──────────────────────────────────────────┐ │
│   │  Shall I place the order?                │ │ ← GuidanceCard, --surface-teal
│   │                                          │ │   24px/600
│   │  Say 'yes' to confirm.                   │ │   18px --text-secondary
│   └──────────────────────────────────────────┘ │
│                    ╭──────────╮                │
│                    │   ≋≋≋    │                │ ← TalkButton speaking
│                    ╰──────────╯                │   --teal-100 fill,
│              Thuna is speaking                 │   3px --teal-900 border
```

### Copy on screen

> **Masala Dosa, no chutney** · **Udupi Cafe** · **Home** · **Rs 145**
> **Shall I place the order?** Say 'yes' to confirm.

### Spoken (Thuna)

> **"Masala Dosa, no chutney, from Udupi Cafe, to Home. Total: Rs 145. Shall I place the order?
> Say 'yes' to confirm."**

### Presenter says / does

Point at the summary, not the phone as a whole.

> "He said four words. Everything on that card came from memory — the dish, that he doesn't want
> chutney, his restaurant, his address. He was never asked for any of it."

Then, pointing at the `SIMULATED` chip:

> "And it says SIMULATED, because it is. We're not placing a real order for an elder on a stage."

### Why this matters to a judge

This is the first payoff and the first honesty beat, in the same frame. The `SIMULATED` chip being
*prominent* rather than hidden is a deliberate credibility move — a team confident enough to label
its own limitation is a team whose other claims survive scrutiny.

Note also what is *not* on screen: no restaurant photos, no upsells, no "people also ordered", no
delivery-tracking map. The card contains exactly the four facts he is agreeing to.

---

## 7. Screen 5 — Contextual question

**Duration: 25s · Components: GuidanceCard(neutral) · TaskSummary (unchanged)**

### On screen

The `TaskSummary` stays exactly as it was — **it does not reload, flicker, or re-animate.** A new
`GuidanceCard` replaces the question card beneath it:

```
│   ┌──────────────────────────────────────────┐ │
│   │   Total     Rs 145                       │ │ ← unchanged, still visible
│   └──────────────────────────────────────────┘ │
│   ┌──────────────────────────────────────────┐ │
│   │  The food price is the same, but today   │ │ ← GuidanceCard --surface-teal
│   │  there is a Rs 25 delivery charge        │ │   24px/600
│   │  because the restaurant is farther away. │ │   min-height 82px (2 ml lines)
│   │                                          │ │
│   │  We can go back and look for a closer    │ │ ← 18px --text-secondary
│   │  restaurant.                             │ │
│   └──────────────────────────────────────────┘ │
```

### Copy on screen

> **The food price is the same, but today there is a Rs 25 delivery charge because the restaurant is
> farther away.**
> We can go back and look for a closer restaurant.

### Spoken (Appa, then Thuna)

> **Appa:** "Why is it more than usual?"
>
> **Thuna:** "The food price is the same, but today there is a Rs 25 delivery charge because the
> restaurant is farther away. We can go back and look for a closer restaurant."

### Presenter says / does

> "He asked a question *about what's on the screen*, not a new command. It answered from the actual
> order state — the delivery fee, specifically — and it offered a way out rather than pushing him
> forward."

### Why this matters to a judge

Most voice demos break here. "Why is it more than usual?" is not an intent, has no slots, and refers
to a value the elder never stated. Answering it requires the assistant to hold the *screen* in
context — which is exactly what `answerContextual` in the skill handler does, per `lib/guidance.ts`.

The second sentence matters as much as the first: it offers a retreat. A system that only ever moves
the user forward is a sales funnel.

### Cut note

**This is the first screen to cut.** It is the most impressive and the least essential. If the demo
is running long, jump straight from screen 4 to screen 6.

---

## 8. Screen 6 — Correction

**Duration: 30s · Components: TaskSummary(`changedRowIds: ['item']`) · GuidanceCard**

### On screen

```
│   ┌──────────────────────────────────────────┐ │
│   │  🍽  Food order        ┌────────────┐     │ │
│   │                        │ SIMULATED  │     │ │
│   │  ──────────────────────────────────────  │ │
│   │ ┃ What    Plain Dosa,      ┌─────────┐  │ │ ← CHANGED ROW:
│   │ ┃         no chutney       │ changed │  │ │   --surface-attention
│   │ ┃                          └─────────┘  │ │   4px --amber-500 left rule
│   │  ──────────────────────────────────────  │ │   "changed" chip
│   │   From      Udupi Cafe                   │ │ ← UNCHANGED
│   │  ──────────────────────────────────────  │ │
│   │   To        Home                         │ │ ← UNCHANGED
│   │  ──────────────────────────────────────  │ │
│   │   Total     R̶s̶ ̶1̶4̶5̶   Rs 125              │ │ ← struck previous + new
│   └──────────────────────────────────────────┘ │
│   ┌──────────────────────────────────────────┐ │
│   │  Plain Dosa, no chutney, from Udupi      │ │ ← re-read, full
│   │  Cafe, to Home. Total Rs 125.            │ │
│   │                                          │ │
│   │  Shall I place the order?                │ │
│   └──────────────────────────────────────────┘ │
```

### Copy on screen

> **Plain Dosa, no chutney** ← *changed* · **Udupi Cafe** · **Home** · ~~Rs 145~~ **Rs 125**
> **Plain Dosa, no chutney, from Udupi Cafe, to Home. Total Rs 125. Shall I place the order?**

### Spoken (Appa, then Thuna)

> **Appa:** "Wait — plain dosa, not masala."
>
> **Thuna:** "Plain Dosa, no chutney, from Udupi Cafe, to Home. Total: Rs 125. Shall I place the
> order?"

### Presenter says / does

Point at the three unchanged rows first, then at the changed one.

> "'Wait' could mean stop. Here it means *hold on, change something* — and it changed exactly one
> field. The restaurant, the address and the no-chutney preference are untouched.
>
> And look at the total. He had already been asked to confirm Rs 145. That confirmation is now
> **void**. He agreed to Rs 125 — not to whatever the total happened to become."

### Why this matters to a judge

Three distinct claims land in one screen:

1. **Disambiguation** — "wait" parsed as a correction, not a pause.
2. **Surgical update** — one field changed; the other three, including a *learned preference*,
   survived.
3. **Confirmation invalidation** — a real safety property. A system that lets a stale "yes" apply to
   a changed total is a system that will eventually charge someone the wrong amount.

The **permanent** amber highlight (never a fade-out flash — see `COMPONENT_SPECIFICATION.md` §8.4)
is what lets the presenter point at it thirty seconds later. This is deliberate: an elder who looked
away must still be able to see what changed, and so must a judge who was writing a note.

The confirm button is also locked for 400ms after the change lands, so a tap already in flight
cannot confirm the new value. Mention this only if a judge asks about race conditions — it is a good
answer to have.

---

## 9. Screen 7 — Confirmation

**Duration: 20s · Components: ConfirmationScreen(sheet) · TaskSummary(read-only)**

### On screen

```
│░░░░░░░░ scrim rgba(31,36,33,0.45) ░░░░░░░░░░░░░│ ← content still visible behind
│                                                │
│   ┌──────────────────────────────────────────┐ │ ← sheet, --radius-lg top
│   │                 ▬▬▬▬                     │ │   40×4 grabber
│   │  ┌────────────────────────────────────┐  │ │
│   │  │ Plain Dosa, no chutney             │  │ │ ← TaskSummary read-only
│   │  │ Udupi Cafe · Home                  │  │ │
│   │  │ Total  Rs 125                      │  │ │
│   │  │                     ┌───────────┐  │  │ │
│   │  │                     │ SIMULATED │  │  │ │
│   │  └────────────────────────────────────┘  │ │
│   │                                          │ │
│   │  Shall I place the order?      28px/600  │ │ ← --text-guidance-lg
│   │                                          │ │   min-height 92px
│   │  ┌────────────────────────────────────┐  │ │
│   │  │         Yes, place it              │  │ │ ← 64px --teal-900, 20px/600
│   │  └────────────────────────────────────┘  │ │
│   │                  12px                    │ │
│   │  ┌────────────────────────────────────┐  │ │
│   │  │          No, not now               │  │ │ ← 52px secondary
│   │  └────────────────────────────────────┘  │ │
│   │           Change something               │ │ ← text action, 52px hit
│   │  24px + safe-bottom 34px                 │ │
│   └──────────────────────────────────────────┘ │
```

### Copy on screen

> **Shall I place the order?**
> **Yes, place it** · **No, not now** · Change something

### Spoken

> **Appa:** "Yes."

### Presenter says / does

Do **not** tap the button. Say "yes" out loud into the phone.

> "He can say yes, or he can tap. Both work, always. But notice the button doesn't say 'OK' or
> 'Confirm' — it says *'Yes, place it'*. If he's forgotten what screen he's on, the button itself
> tells him what he's agreeing to.
>
> And 'No' is not a small grey link in the corner. It's a full-size button, right underneath, easy
> to hit."

### Why this matters to a judge

Confirmation design is where products reveal what they actually optimise for. Three details, all
deliberate, all inspectable on this one screen:

| Detail | What it prevents |
|---|---|
| Confirm names the action ("Yes, place it") | Agreeing to something you cannot recall |
| Cancel is full-size and directly below | The dark pattern of a hard-to-find "no" |
| Tapping the scrim does **not** cancel | Losing a minute of work to a stray touch |

Buttons are stacked, never side-by-side — at 360px two half-width buttons is a mis-tap generator,
and even at 430px a side-by-side "No" sits under the right thumb's natural landing point.

If a judge asks "what if he changes his mind after saying yes?" — the honest answer is that the
confirmation is the commitment point, which is precisely why so much care goes into the moment
before it.

---

## 10. Screen 8 — Completion

**Duration: 15s · Components: CompletionReceipt**

### On screen

```
│   ┌──────────────────────────────────────────┐ │ ← --surface-success #E6F2EA
│   │                  ✓                       │ │ ← 48px check, --green-600
│   │                                          │ │   draws over 240ms
│   │        Your order is placed               │ │ ← 24px/600, centred
│   │                                          │ │
│   │  ┌────────────────────────────────────┐  │ │
│   │  │           SIMULATED                │  │ │ ← full-width bar, 44px
│   │  └────────────────────────────────────┘  │ │   --surface-2, 16px/600
│   │  ┌────────────────────────────────────┐  │ │
│   │  │ Plain Dosa, no chutney             │  │ │
│   │  │ Udupi Cafe · Home                  │  │ │
│   │  │ Total  Rs 125                      │  │ │
│   │  └────────────────────────────────────┘  │ │
│   │                                          │ │
│   │  Today at 1:20 pm            16px/500    │ │
│   │  ────────────────────────────────────    │ │
│   │  Sree was told you placed an order.      │ │ ← 18px/400
│   │                                          │ │
│   │  You changed: Masala Dosa → Plain Dosa   │ │ ← 16px --text-secondary
│   │                                          │ │
│   │  ┌────────────────────────────────────┐  │ │
│   │  │              Done                  │  │ │ ← 64px primary
│   │  └────────────────────────────────────┘  │ │
│   └──────────────────────────────────────────┘ │
```

### Copy on screen

> **Your order is placed**
> **SIMULATED**
> Plain Dosa, no chutney · Udupi Cafe · Home · **Rs 125**
> Today at 1:20 pm
> Sree was told you placed an order.
> You changed: Masala Dosa → Plain Dosa
> **Done**

### Spoken (Thuna)

> **"SIMULATED ORDER SUCCESS — Plain Dosa, no chutney, from Udupi Cafe, to Home. Total: Rs 125.
> This is a simulated result — no real order was placed."**

### Presenter says / does

> "Three things on that receipt. What happened. That Sree was told — because Appa granted consent
> for *that* category, to *that* person. And a note of what he changed, so if he calls his son
> later, the record matches what he remembers."

### Why this matters to a judge

The correction trail is the detail worth pausing on. Most systems record the final state; this one
records that a change happened, because a *human* remembering the transaction will remember the
change. Matching the elder's mental model of the event, not the database's, is the whole design
posture in miniature.

The family notice is also doing consent work: it appears because `TASK_COMPLETED` consent exists for
Sree. Screen 11's counterpart — where consent is *absent* — is where that becomes a story.

---

## 11. Screen 9 — "Remember this" (the wedding invitation)

**Duration: 40s · Components: LifeEventConfirmation(from-document)**

### On screen

```
│   ┌────────┐                                   │
│   │ [invite│  It looks like a wedding          │ ← 96×96 thumbnail
│   │  photo]│  invitation.                      │   intro 20px/500
│   └────────┘                                   │
│   ┌──────────────────────────────────────────┐ │
│   │            NOT SAVED YET                 │ │ ← 44px bar
│   └──────────────────────────────────────────┘ │   --surface-attention
│                                                │   --text-attention 16px/600
│    What    Meera and Arun's wedding    Change  │ ← 64px rows
│    ──────────────────────────────────────────  │   label 16px --text-secondary
│    Where   Guruvayur                   Change  │   value 20px/500
│    ──────────────────────────────────────────  │   "Change" = 52px text action
│    When    Sunday, 9 August,           Change  │
│            10:30 in the morning                │
│                                                │
│    Shall I remember this for you?     24px/600 │
│                                                │
│   ┌──────────────────────────────────────────┐ │
│   │          Yes, remember it                │ │ ← 64px primary
│   └──────────────────────────────────────────┘ │
│   ┌──────────────────────────────────────────┐ │
│   │           No, forget it                  │ │ ← 52px secondary
│   └──────────────────────────────────────────┘ │
```

### Copy on screen

> **It looks like a wedding invitation.**
> **NOT SAVED YET**
> What: Meera and Arun's wedding · Where: Guruvayur · When: Sunday, 9 August, 10:30 in the morning
> **Shall I remember this for you?**
> **Yes, remember it** · **No, forget it**

### Spoken (Appa, then Thuna)

> **Appa:** "Thuna, what is this?"
>
> **Thuna:** "It looks like a wedding invitation. I read: Meera and Arun's wedding, at Guruvayur,
> on Sunday the 9th of August, at half past ten in the morning. Shall I remember this for you?"

### Presenter says / does

Hold up a printed invitation to the phone camera. Then, before saying anything else, point at the
amber bar.

> "**Not saved yet.** It read the invitation, it pulled out four fields, and it has stored precisely
> nothing. It's a candidate until he says yes."

### Why this matters to a judge

This is the thesis screen, and the amber bar is the whole argument. Every document-scanning demo in
existence extracts fields and saves them. This one shows the extraction and then visibly *withholds*
the write.

The reason it matters is compounding: an assistant that saves what it thinks it read accumulates
errors silently, and by month three the elder's memory is full of things they never said. Gating on
confirmation is the only design that stays correct over years — which is the timescale a companion
product actually operates on.

Say out loud, because it pre-empts the obvious question:

> "Nothing about weddings is hardcoded. A birthday, a bill, a hospital appointment — same engine.
> The event type is data."

---

## 12. Screen 10 — Date correction

**Duration: 30s · Components: LifeEventConfirmation(`correctedFieldIds: ['when']`, + `relation`)**

### On screen

```
│   ┌──────────────────────────────────────────┐ │
│   │            NOT SAVED YET                 │ │ ← still amber, still true
│   └──────────────────────────────────────────┘ │
│    What    Meera and Arun's wedding    Change  │ ← UNCHANGED
│    ──────────────────────────────────────────  │
│    Who     Meera, your brother's       Change  │ ← ADDED, not replaced
│            daughter                            │
│    ──────────────────────────────────────────  │
│    Where   Guruvayur                   Change  │ ← UNCHANGED
│    ──────────────────────────────────────────  │
│  ┃ When    S̶u̶n̶d̶a̶y̶ ̶9̶ ̶A̶u̶g̶  ┌─────────┐         │ ← CHANGED:
│  ┃         Saturday,       │ changed │        │   --surface-attention
│  ┃         8 August,       └─────────┘        │   3px --amber-500 left rule
│  ┃         10:30 am                           │   struck previous kept visible
│                                                │
│    I'll remind you:                            │ ← reminder preview,
│    • A week before                             │   18px/400, 32px rows
│    • The evening before                        │
│    • On the morning itself                     │
│                                                │
│    Is that right?                     24px/600 │ ← question CHANGED
│                                                │
│   ┌──────────────────────────────────────────┐ │
│   │          Yes, remember it                │ │
│   └──────────────────────────────────────────┘ │
```

### Copy on screen

> **NOT SAVED YET**
> Who: Meera, your brother's daughter ← *added* · When: ~~Sunday 9 Aug~~ **Saturday, 8 August,
> 10:30 am** ← *changed*
> I'll remind you: a week before · the evening before · on the morning itself
> **Is that right?**

### Spoken (Appa, then Thuna)

> **Appa:** "Meera is my brother's daughter. But it's not Sunday — it's Saturday."
>
> **Thuna:** "Saturday the 8th of August, half past ten, at Guruvayur — Meera, your brother's
> daughter. Is that right?"
>
> **Appa:** "Yes."
>
> **Thuna:** "I'll remind you a week before, the evening before, and on the morning itself."

### Presenter says / does

> "Two corrections in one sentence, handled differently. 'It's Saturday' **changed** a field — you
> can still see what it was. 'Meera is my brother's daughter' **added** one, because that isn't a
> correction, it's new information.
>
> The date, the place, the names — untouched. And the question changed from 'shall I remember this'
> to 'is that right', because he's now confirming a *correction*, not an extraction."

Then point at the reminder list:

> "Three reminders. Not because someone wrote a wedding rule — because the reminder policy is
> declarative, per event type. A bill would get a different schedule from the same engine."

### Why this matters to a judge

This screen answers the question every experienced judge is already forming: *what happens when it
gets something wrong?* The answer is visible rather than asserted — one field changed, provenance
preserved, the question restated, and the elder confirming the corrected version rather than the
original.

The distinction between a **correction** and an **addition** is the subtle part, and it is worth
naming, because it is the difference between a system that overwrites and a system that accumulates
understanding.

---

## 13. Screen 11 — Reminder / check-in (the payoff)

**Duration: 30s · Components: CheckInScreen(`pending_loop`) · PendingLoopCard · TalkButton(inline)**

*(Earlier, off-screen or in one quick beat, Appa said: "Ask Sree if he is coming on Saturday", and
Thuna asked when to bring it up. He said "after dinner". The demo clock now advances — minutes map
to seconds, per `../companion/ROUTINE_ENGINE.md` §8.)*

### On screen

```
│  --surface-attention page tint · nav HIDDEN    │
│                                                │
│   🕐  After dinner, as you asked       16px/500 │ ← --text-attention
│                                                │
│   Hello Appa, it's Thuna.             24px/600 │ ← WHO — always first
│                                                │
│   Earlier you asked me to remind you  20px/400 │ ← WHY — the stated reason
│   to check with Sree about Saturday.           │
│                                                │
│   Shall I call him now?               24px/600 │ ← the ask
│                                                │
│   ┌──────────────────────────────────────────┐ │
│   │           Yes, call Sree                 │ │ ← 64px primary
│   └──────────────────────────────────────────┘ │
│   ┌──────────────────────────────────────────┐ │
│   │             Not now                      │ │ ← 52px — the STOP,
│   └──────────────────────────────────────────┘ │   always above the fold
│                                                │
│                 ╭────────╮                     │ ← inline TalkButton, 64px
│                 │   ▮    │                     │
│                 ╰────────╯                     │
│              Or just answer                    │
```

### Copy on screen

> **Hello Appa, it's Thuna.**
> Earlier you asked me to remind you to check with Sree about Saturday.
> **Shall I call him now?**
> **Yes, call Sree** · **Not now**

### Spoken (Thuna, then Appa)

> **Thuna:** "Hello Appa, it's Thuna. Earlier you asked me to remind you to check with Sree about
> Saturday. Say 'stop' any time if you'd rather not now."
>
> **Appa:** "Yes, call him."

### Presenter says / does

Let the screen appear **on its own** — do not tap anything. Then:

> "Nobody opened the app. It came to him.
>
> Three things in the first two sentences, in this order: **who** is speaking, **why** — and it's a
> specific reason traceable to something he said hours ago, not 'just checking in' — and **how to
> stop**. That order is policy, not styling.
>
> And 'Not now' is a full-size button, above the fold. If a stop control is below the fold, it isn't
> a stop control."

Optionally tap **Not now** to show it:

> "'Alright.' And that's the end of it. No 'are you sure', no second ask. Refusal is a complete
> answer."

### Why this matters to a judge

This is the demo. Everything else supports it.

> "Appa said one sentence hours ago and never had to remember it again."

The distinction being drawn is between a **task bot** — which answers when asked — and a
**companion** — which holds a thread across time. Screens 1–10 could all be built by a competent
team with a good intent classifier. This one requires the system to have stored a commitment, chosen
a moment, and returned with a reason.

The **anchor** is worth naming if a judge is technical: "after dinner" is not a clock time. It is an
event anchor, and a valid pending loop may have no trigger time at all — `OPEN` is a resting state,
not an error.

---

## 14. Screen 12 — Family handoff

**Duration: 25s · Components: FamilyHandoff**

### On screen

```
│      ╭──────╮                                  │
│      │  S   │   Sree                  24px/600 │ ← 56px initials circle,
│      ╰──────╯   Your son              18px     │   --teal-100 / --text-teal
│                                                │   INITIALS ONLY, never a face
│   Appa would like to talk to you.     20px/400 │
│                                                │
│   ┌──────────────────────────────────────────┐ │
│   │ The message Sree will get:      16px/500  │ │ ← --surface-2, --radius-md
│   │                                          │ │   min-height 96px
│   │ "Appa asked me to let you know he'd      │ │ ← 18px/400, NEVER truncated
│   │  like to talk to you about Saturday."    │ │
│   │                          ┌───────────┐   │ │
│   │                          │ SIMULATED │   │ │
│   └──────────────────────────────────────────┘ │
│                                                │
│   Sree usually replies within the hour.  16px  │
│                                                │
│   ┌──────────────────────────────────────────┐ │
│   │            Send to Sree                  │ │ ← 64px primary
│   └──────────────────────────────────────────┘ │
│   ┌──────────────────────────────────────────┐ │
│   │              Not now                     │ │ ← 52px secondary
│   └──────────────────────────────────────────┘ │
```

### Copy on screen

> **Sree** — Your son
> Appa would like to talk to you.
> The message Sree will get: *"Appa asked me to let you know he'd like to talk to you about
> Saturday."*
> **Send to Sree** · **Not now**

### Spoken (Thuna)

> **"I'll let Sree know you'd like to talk to him about Saturday. This is exactly what he'll get.
> Shall I send it?"**

### Presenter says / does

Point at the message preview.

> "That's the entire message. Not a summary of it — the whole thing, before it goes.
>
> What's *not* in it matters more. No 'Appa tried three times.' No 'Appa seemed confused.' No
> capability report. If it isn't in that box, it isn't sent — and Sree gets no new permissions from
> this. A handoff never inherits authority."

### Why this matters to a judge

This screen is where a companion product either stays a companion or quietly becomes a monitoring
device. The design line is explicit: **the elder is the principal; family is a resource the elder may
choose to draw on.**

Families usually want more visibility than elders want to give, and a product that resolves that
tension in the family's favour — because the family often set it up and often pays — has silently
changed who the user is. Showing the exact outbound payload, with nothing inferred about the elder's
competence in it, is that principle made inspectable.

Worth adding if the room is interested:

> "A handoff isn't a failure. We deliberately don't measure 'fewer handoffs' as success — that would
> be optimising against the elder's interest."

### Cut note

**Second to cut.** Screens 11 and 13 carry the same values; this one adds nuance rather than a new
claim.

---

## 15. Screen 13 — Safety warning

**Duration: 25s · Components: SafetyWarning · ElderShell(layout="focus", surface="danger")**

### On screen

```
┌────────────────────────────────────────────────┐ ← --surface-danger #F9E7E5
│  safe-top                                      │   full page tint
│                     48px                       │   NAV HIDDEN
│                                                │   TALKBUTTON HIDDEN
│                      🛡                        │ ← 48px shield, --red-700
│                                                │   stroke 3px
│                     24px                       │
│                                                │
│   Please don't share that              28px/600│ ← --text-danger
│   with anyone — not even with me.              │   min-height 92px
│                                                │
│                     16px                       │
│                                                │
│   A real bank will never ask for       18px/400│ ← --text-primary
│   an OTP.                                      │   the REASON is not alarming
│                                                │
│                     32px                       │
│   ┌──────────────────────────────────────────┐ │
│   │         Ask Sree to call you             │ │ ← 64px --teal-900 PRIMARY
│   └──────────────────────────────────────────┘ │   TEAL, not red —
│                     12px                       │   the safe action isn't
│   ┌──────────────────────────────────────────┐ │   the dangerous one
│   │            I understand                  │ │ ← 52px secondary
│   └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### Copy on screen

> **Please don't share that with anyone — not even with me.**
> A real bank will never ask for an OTP.
> **Ask Sree to call you** · **I understand**

### Spoken (Appa, then Thuna)

> **Appa:** "Someone called from the bank. They want the OTP that just came. Shall I read it out?"
>
> **Thuna:** *(immediately)* "Please don't share that with anyone — not even with me. A real bank
> will never ask for an OTP. Would you like me to ask Sree to call you about this?"

### Presenter says / does

There is **no thinking state**. The screen appears instantly, with no animation at all, while Appa
is still finishing his sentence. Let that land before speaking.

> "No thinking indicator. No model call. That refusal fired **before** anything reached an AI — a
> regular expression in the router, ten lines of code.
>
> That's deliberate. A model asked to help with a scam can be talked round. Fraud scripts are
> adversarial prose written by people who iterate against refusals — *'it's not really an OTP, it's
> a verification code'*, *'I'm from the bank's own security team'*. A language model weighing
> context will eventually find one of those persuasive. A regular expression has nothing to weigh."

Then point at the primary button:

> "And the biggest button on the screen isn't 'OK'. It's 'Ask Sree to call you'. Refusing is half
> the job — the other half is giving him a real person."

Then at the colour:

> "That button is teal, not red. The safe thing shouldn't look like the dangerous thing."

### Why this matters to a judge

This is the credibility beat, and it is the one that survives hostile questioning. Elders are the
most targeted demographic for digital fraud in India, and the attacks are scripted, patient, and
specifically engineered to defeat trust, politeness, and a wish not to cause trouble.

Four properties are demonstrable on this screen:

| Property | Visible how |
|---|---|
| The refusal precedes the model | No thinking state; instant appearance |
| The credential is never repeated | The transcript panel is cleared; nothing on screen echoes the OTP |
| The tone is calm, not alarming | Tinted surface, no siren red, no exclamation mark, no all-caps |
| A human is offered | The primary action is the handoff |

There is also no input field anywhere on this screen. The screen that refuses to handle a credential
is not capable of receiving one.

### The secrecy variant

If time allows, run the higher-signal variant:

> **Appa:** "They said not to tell my son."
>
> **Thuna:** "Please don't keep this from your family. Anyone who asks you to keep a payment secret
> is not from your bank. Shall I ask Sree to call you now?"

Secrecy pressure is the single highest-signal fraud indicator in the risk model, and it is the one
most people in the room will have heard about from their own parents.

---

## 16. Alignment with `COMPANION_DEMO_SCRIPT.md`

The narrative script's seven scenes map to these thirteen screens. **The narrative script is
authoritative on spoken words; this document is authoritative on the screen.** Where the narrative
runs scenes in a different order for storytelling reasons, follow the narrative — the screens are
order-independent.

| Narrative scene | Screens here | Notes |
|---|---|---|
| Scene 1 — Wedding invitation (90s) | **9, 10** | Split into extraction and correction so the "not saved yet" gate gets its own beat |
| Scene 2 — Open loop (30s) | *(setup for 11)* | Compressed to a single spoken beat; the pending loop is not given its own screen |
| Scene 3 — OTP refusal (30s) | **13** | The narrative runs this **early**; see §17 |
| Scene 4 — Loop returns (45s) | **11** | The payoff |
| Scene 5 — Order food (75s) | **2, 3, 4, 5, 6, 7, 8** | Expanded — the food flow is the most screen-rich sequence |
| Scene 6 — Missed reminder / consent (45s) | *(CheckInScreen `consent_request`)* | Same component as screen 11, different data. Cut in the short version. |
| Scene 7 — Daily brief (30s, optional) | **1** | Folded into Home rather than given a separate screen |
| — | **12** | Family handoff — implied by scenes 3 and 4 in the narrative; given its own screen here |

**Ordering recommendation:** run the food flow (screens 1–8) first for a linear-time demo, because
it establishes the visual language cheaply before the harder claims land. Run the narrative order
(safety early) if the audience is investor-heavy and credibility must be bought up front. Both work;
do not mix them mid-rehearsal.

---

## 17. Timing and the cut plan

### Full run

| Screen | Screen time | + Narration | Running total |
|---|---|---|---|
| 1 Home | 15s | 10s | 0:25 |
| 2 Listening | 10s | 0s | 0:35 |
| 3 Understanding | 8s | 5s | 0:48 |
| 4 Food memory | 20s | 15s | 1:23 |
| 5 Contextual question | 25s | 10s | 1:58 |
| 6 Correction | 30s | 20s | 2:48 |
| 7 Confirmation | 20s | 15s | 3:23 |
| 8 Completion | 15s | 10s | 3:48 |
| 9 Wedding | 40s | 15s | 4:43 |
| 10 Date correction | 30s | 20s | 5:33 |
| 11 Check-in | 30s | 20s | 6:23 |
| 12 Family handoff | 25s | 15s | 7:03 |
| 13 Safety | 25s | 25s | **7:53** |

**Full demo: 7 minutes 53 seconds.** That is the version for a booth or a long slot.

### The 5-minute version (recommended default)

Cut **screen 5** (contextual question) and **screen 12** (family handoff), compress screen 3 to 3
seconds.

| Cut | Saves | Running total |
|---|---|---|
| Screen 5 | −35s | 7:18 |
| Screen 12 | −40s | 6:38 |
| Screen 3 compressed | −10s | 6:28 |
| Trim narration on 4, 7, 8 | −25s | 6:03 |
| Home narration trimmed to one line | −5s | **5:58** |

Hold to **6 minutes** and rehearse to 5:30, because live speech runs long.

### The 3-minute version (hard time limit)

Screens **1 · 9 · 10 · 11 · 13**, in that order.

| Screen | Time |
|---|---|
| 1 Home | 20s |
| 9 Wedding | 50s |
| 10 Date correction | 45s |
| 11 Check-in | 45s |
| 13 Safety | 45s |
| **Total** | **3:05** |

This drops the entire food flow. That is the right call: the food order is the most *finished*
feature but the least *differentiated* claim. Continuity (9→10→11) and deterministic safety (13) are
what nobody else in the room is showing.

### Cut order, in priority

1. **Screen 5** — contextual question. Impressive, inessential.
2. **Screen 12** — family handoff. Its values are covered by 11 and 13.
3. **Screen 3** — compress to 3 seconds, do not remove entirely.
4. **Screens 2, 4, 7, 8** — the food flow, as a block. Never cut individually; a half-shown
   transaction is worse than none.

### Never cut

| Screen | Why |
|---|---|
| **9 + 10** (wedding + correction) | The thesis. "Not saved yet" is the single most differentiating frame in the demo. |
| **11** (check-in) | The payoff. Without it, this is a task bot with good typography. |
| **13** (safety) | The credibility. It is the beat that survives a hostile question. |
| **6** (correction), if the food flow runs at all | A food flow without the correction proves nothing a 2019 voice assistant could not. |

If the demo lands only two screens: **11 and 13.** Continuity is the thesis; safety is the
credibility.

---

## 18. Pre-generated audio

Live TTS is the single biggest live-demo risk: a Bulbul call that takes four seconds instead of one
turns a calm screen into an awkward silence, and the room reads the silence as a bug.

### Pre-generate these, without exception

| Screen | Line | Why it is critical |
|---|---|---|
| **13** | The full OTP refusal | Must fire **instantly**. Any latency destroys the "before the model" claim — which is the entire point of the screen. |
| **9** | The wedding read-back | Longest utterance in the demo (~11s). Highest chance of a mid-sentence stall. |
| **10** | The corrected read-back + reminder schedule | Second longest, and it is the correction proof. |
| **4** | The order read-back with the total | Contains a number; TTS numeric errors ("one four five" vs "one hundred forty-five") are embarrassing and hard to recover from. |
| **6** | The corrected read-back at Rs 125 | Same, and it must be audibly *different* from screen 4's line. |
| **7 / 8** | "Shall I place the order?" and the SIMULATED success | The confirmation pair; must be crisp. |
| **11** | The check-in opening | Fires unprompted; a stall here reads as the system having failed to initiate at all. |

That is **eight** clips. Generate all of them in **both** Malayalam and English.

### Rules for the pre-generated set

| Rule | Detail |
|---|---|
| Same voice, same settings | Generate from the same Bulbul voice/pace as live TTS, so a fallback is inaudible |
| Slow pace | Generate at the demo's `pace: 'slow'` setting — it is the setting the seed state uses |
| Normalise loudness | −16 LUFS across all clips. A refusal clip quieter than the order clip undercuts it. |
| Trim leading silence | Under 100ms. The refusal in particular must feel instantaneous. |
| Preload on app start | All eight into memory before the demo begins. Do **not** fetch on demand. |
| Fallback is silent | If a clip is missing, fall back to live TTS, then browser speech. The elder UI must never show which layer is active — that is inspector-only. |

### The fallback chain (rehearse all of it)

Per `../companion/COMPANION_DEMO_SCRIPT.md` §11:

| Layer | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| Input | Live microphone | Pre-recorded audio | Typed transcript |
| Interpretation | Sarvam model | Deterministic parser | — |
| Speech | Live Bulbul | **Pre-generated audio** | Browser speech |
| Vision | Sarvam Vision | Pre-extracted fixture | Typed fields |

**Fallback status is visible only in the demo inspector. Never on the phone.**

Rehearse the demo once at every fallback level. A presenter who has run it on typed transcripts and
browser speech is a presenter who will not freeze when the venue wifi fails.

---

## 19. Presenter checklist

**Before**

- [ ] Phone at 390×844 (or browser at exactly that viewport, device-framed)
- [ ] Brightness at maximum; auto-brightness **off**; auto-lock **off**
- [ ] Do Not Disturb on; the elder UI must not be covered by a notification banner
- [ ] Language set to the intended demo language; `<html lang>` verified
- [ ] All eight audio clips preloaded and verified audible in the room
- [ ] Demo inspector open on the laptop, on a **separate window** — never mirrored to the phone
- [ ] Seed state loaded: Appa · `ml-IN` · slow pace · Sree (son) · `ELDER_REQUESTED_HELP` granted ·
      `ROUTINE_MISSED` **not** granted · usual order = Masala Dosa, Udupi Cafe, Home
- [ ] Printed wedding invitation in hand for screen 9
- [ ] Demo clock acceleration confirmed (minutes → seconds)

**During**

- [ ] Never open the inspector on the phone. There is no way to; verify there is no way to.
- [ ] Let screens 1, 11 and 13 sit in silence for two seconds before narrating
- [ ] Say the word **"simulated"** out loud at screens 4, 8 and 12
- [ ] Never claim a real order was placed, that Swiggy is integrated, that telephony works, that
      Thuna detects health or mood, or that it books rides

**If asked "is this real?"**

> "The engine, the safety rules and the memory are real and tested. External providers are simulated
> behind adapters, because placing a real order for an elder needs approved production access — and
> we won't fake that."

That is a strong answer. Give it without hedging.

---

## 20. Implementation notes for GLM

1. **Build a demo runner, not thirteen hard-coded screens.** The sequence is a data array of
   `{ screenId, props, autoAdvanceMs? }` fed to the same components a real session would render.
   A demo that renders special-case screens is a demo that diverges from the product by the third
   rehearsal.
2. **Screen advance is presenter-driven**, not timed — except screen 11, which must arrive
   unprompted (that is its entire point). Advance via a keyboard shortcut on the **laptop**, never a
   control on the phone.
3. **There is no debug affordance in the elder build.** No long-press panel, no five-tap easter egg,
   no `?debug=1` that renders inside the phone frame. `TalkButton.onLongPress` is `undefined` in the
   elder build (see `COMPONENT_SPECIFICATION.md` §4.2).
4. **Screen 6's changed-row highlight must be permanent**, not a 1200ms flash. The presenter points
   at it thirty seconds after it appears.
5. **Screen 13 must not render a thinking state, a spinner, or any entrance animation.** Mount at
   full opacity, `--dur-instant`. Route the refusal through `quickCheck()` before any async call so
   the instantaneity is real, not simulated.
6. **Clear the transcript when `SafetyWarning` mounts.** The credential must not survive in the DOM,
   in a React state atom, or in any log.
7. **Preload all eight audio clips on app mount.** A `fetch` at screen 13 defeats the point.
8. **Test the whole sequence at 360×800 before the demo**, not just 390. If the venue provides the
   phone, it may well be an Android at 360.

---

## Related

- `../companion/COMPANION_DEMO_SCRIPT.md` — the narrative counterpart; authoritative on spoken words
- `VISUAL_DESIGN_SYSTEM.md` — every colour, size and timing referenced above
- `COMPONENT_SPECIFICATION.md` — the components each screen composes (§21 has the full map)
- `../companion/LIFE_EVENT_DEMO_SCENARIOS.md` — deeper per-scenario walkthroughs
- `../companion/DIGITAL_SAFETY_POLICY.md` — screen 13
- `../companion/CHECKIN_CONVERSATION_POLICY.md` — screen 11's opening structure
- `../companion/PENDING_LOOPS.md` — the record behind screen 11
- `../companion/HUMAN_ATTENTION_BRIDGE.md` — screen 12
- `../companion/CONFIRM_BEFORE_MEMORY.md` — screens 9 and 10
- `../companion/COMPANION_FEATURE_MATRIX.md` — what is built vs designed
