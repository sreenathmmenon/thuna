# Thuna — Task Screen System

> Design specification. **Changes no production code.**
>
> There is **one task screen**. Every task Thuna performs — ordering food, sending a payment,
> changing a phone setting, tracking an order, answering a question, declining something it cannot
> do — renders through the same schema. What differs between tasks is **data in slots**, never
> layout.

---

## 1. Why one screen

The engine already works this way. `lib/engine.ts` does not branch per skill: it reads
`skill.steps[ctx.stepIndex]`, calls `buildScreen()`, and returns a `ScreenState`. A skill contributes
steps, safety rules, and an optional handler — not a UI.

If the UI branched per task, an elder who learned to order food would have to learn payments from
zero. The whole value of a single screen is that **the second task is easier than the first, and the
sixth is free.** Position teaches: the instruction is always in the same place, the buttons are
always in the same place, Stop is always in the same place.

A per-task layout is also the failure mode that makes an assistant feel like six apps wearing one
coat. Thuna is one thing.

### The rule for anyone extending this

> A new skill adds **rows to the slot table in §4**. It does not add a screen.
>
> If a new task cannot be expressed in the seven slots, the correct response is to question the
> task's shape, not to add an eighth layout.

---

## 2. The seven slots

Every task screen is composed of exactly these, in this order, top to bottom:

| # | Slot | Always present? | Source in `ScreenState` / `SessionCtx` |
|---|---|---|---|
| 1 | **Title** | Yes | `skill.label` |
| 2 | **Current instruction** | Yes | `stepPrompt(skill, ctx)` — the spoken line, shown verbatim |
| 3 | **Options** | When the step offers choices | step-provided choices, or restored preference |
| 4 | **Summary fields** | Once any field is filled | `screen.fields` — one row per known field |
| 5 | **Warning** | When a safety rule or cost surfaced | `skill.safetyRules` message, or a fee/total delta |
| 6 | **Confirmation** | Only at `confirmBefore` steps | `screen.status === 'awaiting_confirmation'` |
| 7 | **Completion** | Only at terminal states | `screen.status === 'done' \| 'refused' \| 'handedoff'` |

Slots 6 and 7 are **mutually exclusive** with each other and take over the guidance region when
present. Slots 1–5 are additive: a slot with no data is not rendered, and the slots below it move up.
No slot ever renders as an empty box, a skeleton, or a dash.

### Slot occupancy is monotonic within a task

Fields appear as they are learned and never disappear mid-task. A correction **rewrites one row in
place**; it never clears the panel. This mirrors the correction rule the engine already enforces —
*"wait, plain dosa"* changes `items` and leaves `restaurant` and `address` untouched.

---

## 3. The wireframe — 390 × 844

Primary viewport. Measurements are CSS pixels. Safe-area insets are added on top of the
values shown (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`); the layout below assumes
the iPhone-class 47 / 34 insets and still fits.

```
┌──────────────────────────────────────────────┐  ← 390 wide
│              safe-area-inset-top (47)        │
├──────────────────────────────────────────────┤  ┐
│  16 ┆                                   ┆ 16 │  │ HEADER BAR — 56 tall
│     │  Order food                       │    │  │ bg: --teal-900
│     │  20px/600, --bg-cream on teal     │    │  │ SLOT 1 · TITLE
│     │                          [ ⟵ ]    │    │  │ back: 52×52, right edge
├──────────────────────────────────────────────┤  ┘
│                24 gap                        │
│  ┌────────────────────────────────────────┐  │  ┐
│  │ 16                                  16 │  │  │ GuidanceCard
│  │  ┌──────────────────────────────────┐  │  │  │ SLOT 2 · INSTRUCTION
│  │  │  What would you like             │  │  │  │ w 358 (390 − 16 − 16)
│  │  │  to order today?                 │  │  │  │ pad 24
│  │  │                                  │  │  │  │ radius 24
│  │  │  26px / line-height 34 / 500     │  │  │  │ bg --teal-100
│  │  │  --charcoal-900                  │  │  │  │ min-height 120
│  │  └──────────────────────────────────┘  │  │  │ 2 ML lines fit at 26/34
│  └────────────────────────────────────────┘  │  ┘
│                16 gap                        │
│  ┌────────────────────────────────────────┐  │  ┐
│  │  ┌──────────────────────────────────┐  │  │  │ TaskChoiceList
│  │  │  Your usual — Masala Dosa   ›    │  │  │  │ SLOT 3 · OPTIONS
│  │  │  from Saravana Bhavan            │  │  │  │ row h 72 (≥52 target)
│  │  └──────────────────────────────────┘  │  │  │ radius 16
│  │                12 gap                  │  │  │ 18px/600 primary line
│  │  ┌──────────────────────────────────┐  │  │  │ 16px/400 sub line
│  │  │  Something else             ›    │  │  │  │ pad-x 20, pad-y 12
│  │  └──────────────────────────────────┘  │  │  │ 2px --teal-900 border
│  └────────────────────────────────────────┘  │  ┘
│                16 gap                        │
│  ┌────────────────────────────────────────┐  │  ┐
│  │  Item        Masala Dosa               │  │  │ TaskSummary
│  │  Restaurant  Saravana Bhavan           │  │  │ SLOT 4 · FIELDS
│  │  Address     Home                      │  │  │ row h 44, label 16/500
│  │  Total       Rs 145                    │  │  │ value 18/600 right-set
│  └────────────────────────────────────────┘  │  ┘ label col 112, gap 16
│                16 gap                        │
│  ┌────────────────────────────────────────┐  │  ┐ SLOT 5 · WARNING
│  │ ▍ Rs 25 delivery charge today.         │  │  │ 4px --amber-500 left rule
│  └────────────────────────────────────────┘  │  ┘ 18/500, pad 16, radius 12
│                                              │
│         ⋮  scroll region ends 24 above ⋮     │
├──────────────────────────────────────────────┤  ┐
│  ┌──────┐  ┌──────────┐  ┌──────────────┐   │  │ CONTROL ROW — persistent
│  │ Stop │  │  Wait    │  │  Say again   │   │  │ h 72 + 12 pad top/bottom
│  │ 96×60│  │  110×60  │  │   132×60     │   │  │ bg --bg-cream, 1px top rule
│  └──────┘  └──────────┘  └──────────────┘   │  │ gap 12, side pad 16
├──────────────────────────────────────────────┤  ┘
│            safe-area-inset-bottom (34)       │
└──────────────────────────────────────────────┘
```

### Vertical budget check

| Region | Height |
|---|---|
| Safe top + header | 47 + 56 = 103 |
| Gap | 24 |
| GuidanceCard (2 lines) | 120 |
| Gap + options (2 rows) | 16 + 156 = 172 |
| Gap + summary (4 rows) | 16 + 176 = 192 |
| Gap + warning | 16 + 56 = 72 |
| Control row + safe bottom | 96 + 34 = 130 |
| **Total** | **813 of 844** |

Fits without scrolling in the fullest ordinary case. When Malayalam wraps the guidance to three lines
(+34) or a fifth summary row appears (+44), the **scroll region** (slots 2–5) scrolls; the header and
the control row do not. The control row is never pushed off-screen and is never overlaid by content.

### Other viewports

| Viewport | Changes |
|---|---|
| **360 × 800** | Card width 328. Guidance drops to 24px/32. Control row buttons 88 / 102 / 124 — all still ≥52 tall and ≥88 wide. Summary label column 104. |
| **430 × 932** | Card width 398. Guidance stays 26/34 (do not scale type up — larger text on a larger phone reads as shouting; the extra space becomes breathing room). Gaps between cards 20 instead of 16. |

---

## 4. What each task puts in each slot

This table **is** the per-task design. There is nothing else.

### 4.1 ORDER_FOOD

Real steps: `ask_item → ask_restaurant → confirm_address → readback (confirmBefore) → place`.

| Slot | Content |
|---|---|
| Title | Order food |
| Instruction | The step prompt, verbatim: "What would you like to order today?" / "From which restaurant?" / "Is the delivery address still the usual one?" |
| Options | At `ask_item` with a stored `usualOrder`: two rows — the restored usual, and "Something else". At `ask_restaurant`: restaurant rows. At `confirm_address`: "Yes, home" / "A different address". |
| Summary | Item · Restaurant · Address · Total |
| Warning | Delivery fee line whenever `screen.deliveryFee > 0` |
| Confirmation | Full readback + "Yes, place it" / "Change something" |
| Completion | CompletionReceipt with the **SIMULATED** label (§8) |

### 4.2 SEND_PAYMENT

Real steps: `ask_recipient → ask_amount → readback (confirmBefore) → send`.

| Slot | Content |
|---|---|
| Title | Send money |
| Instruction | "Who should we send the money to?" / "How much should we send?" |
| Options | At `ask_recipient`: frequent recipients, one row each, name + relationship ("Priya Menon — your daughter"). At `ask_amount`: none — amount is spoken or typed, never guessed. |
| Summary | To · Relationship · Amount |
| Warning | **Two rules, both `--red-700`, not amber.** `mismatch_check`: "The name matches, but you said this was for your daughter and this looks like a shop. I have stopped here." `no_credential`: "I will never ask for an OTP, PIN, or CVV." The credential warning appears the moment such a word is spoken, at any step. |
| Confirmation | Amount and recipient read back together; button reads "Yes, send Rs 500 to Priya" — the amount is **in the button**, not only above it |
| Completion | SIMULATED receipt |

### 4.3 PHONE_HELP

Real steps: `identify_goal → guide_step`.

| Slot | Content |
|---|---|
| Title | Phone help |
| Instruction | "What would you like to change on your phone?" then one step at a time |
| Options | At `identify_goal`: "Make the writing bigger" / "Make it louder" / "Something else". At `guide_step`: a single wide row — "Done, what's next?" — plus the persistent Wait and Say-again. |
| Summary | What we're changing · Where we are (e.g. "Step 2 of 4") |
| Warning | `no_destructive`: "That would erase things on your phone. I will not guide that without checking with you first." `--red-700`. |
| Confirmation | Only for destructive goals. Ordinary setting changes need no confirmation gate — there is nothing irreversible to gate. |
| Completion | "The writing is bigger now." No SIMULATED label — nothing was transacted. If Thuna cannot verify the change, it says so and asks. |

### 4.4 TRACK_ORDER

| Slot | Content |
|---|---|
| Title | Where is my order |
| Instruction | The status in plain words: "Your food left the restaurant. About fifteen minutes." |
| Options | "Tell me again later" (sets a follow-up) / "Call the restaurant" |
| Summary | Order · From · Expected |
| Warning | Only on a real problem: "The restaurant says it is delayed." `--amber-500`. Never a spinner-as-warning. |
| Confirmation | None. Reading a status changes nothing, so nothing is confirmed. |
| Completion | Not a completion — this task **ends** rather than completing. Closing line: "I'll stop watching this now." |

### 4.5 GENERAL_HELP

The router's `question` route. It is not a skill in the registry, and it still renders here.

| Slot | Content |
|---|---|
| Title | The elder's own question, shortened to fit one line |
| Instruction | The answer, in the guidance card, at full 26px |
| Options | Up to two follow-ups Thuna can actually do: "Order that" / "Ask Sree" |
| Summary | Empty — a question has no fields |
| Warning | Only if the answer touches a boundary: "I'm not certain about that." |
| Confirmation | None |
| Completion | None. The screen just rests; the elder speaks again or leaves. |

### 4.6 UNSUPPORTED

The most important row in this table, because it is where a bad assistant lies.

| Slot | Content |
|---|---|
| Title | I can't do that one |
| Instruction | > "I can't do that. I can order food, send a payment, or help with your phone." — the engine's own refusal line, verbatim, no apology theatre |
| Options | The three things Thuna *can* do, as three rows, each starting the real task. Plus "Ask someone" → FamilyHandoff. |
| Summary | Empty |
| Warning | None. **Being unable to help is not a warning state.** Rendering it in amber or red would tell the elder they did something wrong. They did not. |
| Confirmation | None |
| Completion | None |

> **Design note.** UNSUPPORTED uses `--teal-100`, the same calm surface as every other guidance card.
> The visual system must never make an elder's ordinary request look like an error.

---

## 5. The persistent control row

**Stop, Wait, and Say again are visible for the entire duration of an active task.** Not in a menu,
not behind a long-press, not revealed on scroll. They are the elder's exits, and an exit you have to
find is not an exit.

| Button | Size (390) | Copy | Engine action | Visual |
|---|---|---|---|---|
| **Stop** | 96 × 60 | Stop | `recoveryType → 'stop'` → `action: 'handoff'` | 2px `--red-700` border, transparent fill, `--red-700` label 18/600 |
| **Wait** | 110 × 60 | Wait | `recoveryType → 'wait'` → `status: 'paused'` | 2px `--charcoal-900` border, transparent fill, 18/600 |
| **Say again** | 132 × 60 | Say again | `recoveryType → 'repeat_slowly'` → `pace: 'slow'` | 2px `--charcoal-900` border, transparent fill, 18/600 |

Total width: 96 + 12 + 110 + 12 + 132 = 362, plus 16 side padding each side = 394. At 390 the gaps
compress to 10 (= 390). At 360, use 88 / 102 / 124 with 10 gaps (= 346 + 32 = 378 → side padding 8).
At 430 keep the sizes and let the row centre with 34 side padding.

### Why outline, not filled

The primary action for the current step lives above, in the options or the confirmation. If Stop were
filled `--red-700` it would out-shout the thing the elder is actually trying to do, and a permanently
alarming button becomes invisible within a day. Outlined at 18/600 with a 2px border is unmissable
and unalarming.

### Behaviour

- **Stop** ends the task immediately. No "are you sure?". The engine returns
  > "Stopping here. You can come back anytime, or I can hand this to a family member — just say so."
  The screen shows that line in the guidance card, with "Start again" and "Ask someone" as options.
  Nothing was placed, and the completion slot says so plainly.
- **Wait** pauses. Guidance becomes:
  > "Paused. Take your time — say 'continue' when you're ready."
  The summary panel stays fully visible — pausing must not cost the elder their place. The control
  row's Wait button swaps its label to **Continue** while paused, same size, same position.
- **Say again** re-renders the *same* step at `pace: 'slow'`. The guidance card re-reads with the
  engine's "Slowly: " prefix stripped from the display (it is a speech directive, not elder-facing
  text) and the spoken rate reduced. The card does a 200ms fade-out/fade-in so the elder can see that
  something responded — repetition with no visible response reads as a dead button.

**One-handed reach.** All three sit in the bottom 130px, within thumb arc for a right or left hand at
390 width. Nothing destructive is in that zone: Stop is safe (it stops), and the irreversible action
— confirmation — is deliberately placed higher, in the guidance region, where it takes a deliberate
reach.

---

## 6. ORDER_FOOD walked through — the hero flow

Six screens. The same seven slots throughout.

### Screen 1 — restored usual order

Elder says: *"I want my usual dosa."*

`parseCommand` matches `/my usual/` → `restorePreference: true` → `restorePreference()` fills
`restaurant`, `items`, `address` from `ctx.preferences.usualOrder` in one move, then the same
utterance is re-parsed for corrections.

```
┌──────────────────────────────────────────────┐
│  Order food                          [ ⟵ ]   │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  Your usual order, from Saravana       │  │  ← 26/34
│  │  Bhavan. Shall I go ahead?             │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Yes, that one                    ›    │  │  ← 72 tall
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Change something                 ›    │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Item        Masala Dosa               │  │
│  │  Restaurant  Saravana Bhavan           │  │
│  │  Address     Home                      │  │
│  │  Total       Rs 145                    │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ ▍ Rs 25 delivery charge today.         │  │
│  └────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│  [ Stop ]  [ Wait ]  [ Say again ]           │
└──────────────────────────────────────────────┘
```

Three fields arrive at once. The summary panel fills in a single render — **memory is visible as
saved effort**, which is the entire point of storing a usual order.

### Screen 2 — the contextual question

Elder says: *"Why is it more than last time?"*

`isContextualQuestion()` catches it *before* the step machinery. `answerContextual()` matches
`/why.*more/` and returns the delivery-fee explanation. Critically, `ctx.stepIndex` does not move and
no field changes.

```
┌──────────────────────────────────────────────┐
│  Order food                          [ ⟵ ]   │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  You asked: why is it more             │  │  ← 16/400, --charcoal-900 at 70%
│  │  than last time?                       │  │     ANSWER BAND, pad-bottom 12
│  │  ────────────────────────────────────  │  │  ← 1px rule, --teal-900 at 20%
│  │  The food costs the same. Today        │  │  ← 26/34, full weight
│  │  there is a Rs 25 delivery charge      │  │
│  │  because the restaurant is farther     │  │
│  │  away.                                 │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Go ahead anyway                  ›    │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Find a closer restaurant         ›    │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Item        Masala Dosa               │  │  ← UNCHANGED, still visible
│  │  Restaurant  Saravana Bhavan           │  │
│  │  Address     Home                      │  │
│  │  Total       Rs 145                    │  │
│  └────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│  [ Stop ]  [ Wait ]  [ Say again ]           │
└──────────────────────────────────────────────┘
```

**How a question renders without losing the task.** Four rules:

1. The summary panel **does not move, dim, or clear.** The elder's order is still there, still
   readable. Their question did not undo their work.
2. The answer occupies the guidance card, with the elder's own question echoed above it in a smaller,
   lighter band. The echo exists so an elder who asked something and then looked away can see what
   Thuna is answering.
3. The warning slot's fee line is **absorbed into the answer** and is not rendered twice. Saying the
   same thing in two places at once reads as two different problems.
4. The options become the two real continuations. There is no "OK" button — acknowledging an answer
   is not an action, and a dead-end OK forces the elder to make a meaningless choice before they can
   continue.

The task is not interrupted. It is exactly where it was.

### Screen 3 — the correction

Elder says: *"Actually, plain dosa, no chutney."*

`parseCommand` matches `/plain dosa/` → `order.name = 'Plain Dosa'`, and `\bno (\w+)/` → `chutney`
moves to `excludes`. Returns `kind: 'correction'` with `patch.items`. **`restaurant` and `address`
are not in the patch and are not touched.**

```
┌──────────────────────────────────────────────┐
│  Order food                          [ ⟵ ]   │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  Changed to plain dosa, no chutney.    │  │
│  │  Everything else is the same.          │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  That's right                     ›    │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Change something else            ›    │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Item        Plain Dosa, no chutney  ● │  │  ← ● changed dot, --green-600
│  │  Restaurant  Saravana Bhavan           │  │     6px, right of value, 8 gap
│  │  Address     Home                      │  │
│  │  Total       Rs 125                    │  │  ← recomputed silently
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ ▍ Rs 25 delivery charge today.         │  │
│  └────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│  [ Stop ]  [ Wait ]  [ Say again ]           │
└──────────────────────────────────────────────┘
```

**How corrections re-render.**

| Rule | Detail |
|---|---|
| **The changed row is rewritten in place** | The row keeps its position in the panel. The panel does not reorder, and rows never animate to new positions — an elder tracking "Item" by position must find it in the same place. |
| **A change dot marks it** | A 6px `--green-600` filled circle, 8px right of the value, on the changed row only. It persists for the rest of the task, not for a few seconds — an elder who looks back a minute later should still see what changed. |
| **Untouched rows get no treatment at all** | No dimming, no re-animation, no "unchanged" label. Absence of the dot is the signal. |
| **Derived values update without ceremony** | `Total` recomputes from 145 to 125 with no dot, no flash, no callout. The total is not a thing the elder changed; it is a consequence. Marking consequences as changes teaches the elder to distrust the dot. |
| **The guidance card names both parts** | What changed *and* what did not: "Everything else is the same." This is the screen equivalent of the readback honesty rule — an elder who corrected one thing needs to hear the other things survived. |
| **`correctionHistory` is never shown** | It is `PRIVATE` in `MEMORY_MODEL.md` §10 and is not shareable at all. A visible "corrections: 2" counter would be a difficulty tally on the elder's own screen. |

### Screen 4 — the confirmation

`confirmBefore: true` on the `readback` step sets `awaitingConfirmation`, and
`buildScreen()` returns `status: 'awaiting_confirmation'`.

The confirmation slot takes over the guidance region. Its full layout is owned by
`SAFETY_AND_CONFIRMATION_SCREENS.md`; from this document's side, three things are fixed:

1. `handler.readback()` output is shown **and** spoken, word for word. The screen may not paraphrase
   what the voice says.
2. The affirmative button carries the consequence in its label — **"Yes, place this order"**, not
   "Yes" or "Confirm". An elder tapping a button should not have to hold the sentence in their head.
3. The control row **stays**. Stop, Wait, and Say again are still there at the confirmation step. This
   is the moment an elder is most likely to want out, and the exit must not have moved.

Vague input does not pass. The engine's `confirmation_refused` path re-renders the same
ConfirmationScreen with:

> "I need a clear yes. Your order: Plain Dosa, no chutney, from Saravana Bhavan, to Home. Total: Rs 125."

No red, no shame, no counter of attempts. Asking again is a normal thing to do.

### Screen 5 — completion, SIMULATED

```
┌──────────────────────────────────────────────┐
│  Order placed                        [ ⟵ ]   │  ← header --green-600
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  ┌──────────────────────────────────┐  │  │  ← SIMULATED BANNER
│  │  │  SIMULATED — no real order was   │  │  │     full card width, h 64
│  │  │  placed                          │  │  │     bg --amber-500 at 18%
│  │  └──────────────────────────────────┘  │  │     3px --amber-500 left rule
│  │                                        │  │     18/700 --charcoal-900
│  │   Your order is placed.                │  │     letter-spacing .04em on
│  │                                        │  │     the word SIMULATED
│  │   Item        Plain Dosa, no chutney   │  │
│  │   Restaurant  Saravana Bhavan          │  │  ← CompletionReceipt
│  │   Address     Home                     │  │     same rows, same 112 label
│  │   Food        Rs 100                   │  │     column, same order as the
│  │   Delivery    Rs 25                    │  │     in-task summary
│  │   Total       Rs 125                   │  │  ← total row: 20/700, 1px
│  │                                        │  │     top rule, 12 above
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Where is my order?               ›    │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Done                             ›    │  │
│  └────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│  (control row hidden — task is over)         │
└──────────────────────────────────────────────┘
```

**The SIMULATED label.** `SimulatedReceipt.simulated` is typed `true` — not `boolean` — so it is
structurally impossible for a receipt to exist without it. The UI honours that:

- The banner is the **first thing inside the receipt card**, above the success line. An elder reading
  top-down meets it before they meet "placed".
- It is **amber, not red.** Nothing went wrong. A red banner on a successful order would teach the
  elder that Thuna's successes are failures.
- It is **not dismissible** and does not fade. It is part of the receipt.
- The word is spoken too: the engine says *"SIMULATED ORDER SUCCESS — … (This is a simulated result —
  no real order was placed.)"*. Screen and voice agree.
- It appears **identically on every terminal receipt from every skill**. Same position, same wording
  shape, same colour. A label that varies by task is a label the elder learns to skip.
- The receipt's field rows are in the **same order with the same labels** as the in-task summary
  panel. A receipt that re-sorts its rows makes the elder re-read something they had already checked.

### Screen 6 — the same flow when the elder stops

At any point, Stop yields:

```
┌──────────────────────────────────────────────┐
│  Order food                          [ ⟵ ]   │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  Stopped. Nothing was ordered.         │  │
│  │                                        │  │
│  │  You can come back to this any time.   │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Start again                      ›    │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Ask someone for help             ›    │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**"Nothing was ordered" is required copy.** An elder who stops mid-task must be told, explicitly, that
stopping did not accidentally do the thing. An empty screen after Stop leaves that question open, and
the open question is what makes people afraid to stop.

---

## 7. State → slot mapping

`ScreenState.status` drives which of slots 6 and 7 renders.

| `status` | Slots 1–5 | Slot 6 | Slot 7 | Control row |
|---|---|---|---|---|
| `idle` | Rendered | — | — | Visible |
| `awaiting_confirmation` | Summary + warning stay; instruction replaced by readback | ConfirmationScreen | — | Visible |
| `done` | Replaced | — | CompletionReceipt + SIMULATED | Hidden |
| `refused` | Instruction = refusal line; summary cleared | — | Refusal + alternatives | Hidden |
| `paused` | All stay, fully lit | — | — | Visible, Wait → **Continue** |
| `handedoff` | Replaced | — | Stop / handoff card | Hidden |

Note `paused`: the screen does not dim, grey out, or overlay. Pausing is the elder taking a moment,
not the app going to sleep, and a dimmed screen would make a five-second pause feel like an
interruption of Thuna rather than a pause by the elder.

---

## 8. Malayalam and wrapping

- The guidance card is sized for **two lines of Malayalam at 26px/34** = 68px of text inside 24px
  padding = 116, rounded to a 120 min-height. Malayalam's taller glyph stack and frequent conjuncts
  need the 34 leading; 26/30 clips descenders on stacked conjuncts.
- **Never truncate guidance.** No ellipsis, no clamp, no "more". If it does not fit, the card grows
  and the region scrolls.
- Summary **values** may wrap to two lines; the row grows from 44 to 76. Summary **labels** never
  wrap — if a label does not fit the 112px column in Malayalam, shorten the label, do not shrink the
  type below 16.
- Button labels never wrap. If a translated label exceeds its button, the button grows in height to
  76 and the label stays on one line at 18px. Two-line button text is the fastest way to make a
  control look like a paragraph.
- Numerals stay Latin (Rs 125) in both languages. Mixed-script numerals in a total is the one place an
  elder cannot afford ambiguity.

---

## 9. Implementation notes for GLM

1. **One component renders every task.** `TaskScreen` takes `ScreenState` plus the skill's `label` and
   current `SkillStep`. It has no `switch (skillId)`. If a skill needs something the schema cannot
   express, the slot table gains a row — the component does not gain a branch.
2. **Slots are conditional renders, not hidden elements.** `{screen.deliveryFee ? <Warning/> : null}`.
   Do not render zero-height boxes; the gaps stack and the layout drifts.
3. **The guidance text is `stepPrompt()` output with the `"Slowly: "` prefix stripped for display.**
   That prefix is a speech-pace directive from `lib/guidance.ts`, not text for the elder to read.
4. **The change dot derives from a diff of the previous `screen.fields`**, held in a ref across
   renders. Do not read `ctx.correctionHistory` for this — that store is `PRIVATE` and must not reach
   the view layer at all.
5. **The control row is outside the scroll container**, in a flex column: `header / main(overflow-y:
   auto) / controls`. Do not use `position: fixed` — it fights the iOS keyboard and the safe-area
   inset, and Stop must never be under a keyboard.
6. **The SIMULATED banner reads `receipt.simulated`, which is always `true`.** Do not add a prop to
   suppress it, do not add a "demo mode" flag that hides it. There is no code path where a receipt
   renders without it.
7. **`awaiting_confirmation` must keep the control row mounted.** The most common regression will be
   an overlay/modal confirmation that covers Stop. Confirmation is a region swap inside the scroll
   area, not a modal.
8. **Test that a correction re-renders exactly one summary row.** Snapshot the panel before and after
   `parseCommand`; assert exactly one value string differs plus any derived total. This is the UI
   mirror of the engine's targeted-correction guarantee.
9. **Touch targets: every interactive element ≥ 52 × 52** including the header back button. Verify at
   360 width, where the control row is tightest.
10. **No spinners in the guidance card.** If Thuna is working, the card says so in words: "One
    moment — I'm checking." An elder cannot tell a spinner from a frozen screen.

---

## Related

- `VISUAL_DESIGN_SYSTEM.md` — tokens, type scale, spacing, radii
- `COMPONENT_SPECIFICATION.md` — `GuidanceCard`, `TaskChoiceList`, `TaskSummary`, `ConfirmationScreen`,
  `CompletionReceipt`
- `SAFETY_AND_CONFIRMATION_SCREENS.md` — full confirmation and refusal layouts
- `ROUTINE_AND_CHECKIN_SCREENS.md` — the check-in screen, which reuses slots 1–5
- `FAMILY_HANDOFF_SCREEN.md` — where "Ask someone" leads
- `lib/skills/order-food.ts`, `lib/skills/send-payment.ts`, `lib/skills/phone-help.ts` — real steps
- `lib/types.ts` — `ScreenState`, `SessionCtx`, `SimulatedReceipt`
- `docs/companion/MEMORY_MODEL.md` §10 — why correction history never renders
