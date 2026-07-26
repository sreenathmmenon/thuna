# Thuna — Mobile Product Principles

> Design specification. **Changes no production code.**
>
> The north star for every screen, every string, and every pixel in the elder-facing mobile UI.

---

## 1. The north star

> ## Thuna must feel easier than calling one's child for help.

This is the only benchmark that matters. Not "easier than the Swiggy app", not "easier than last
year's version". The competitor is a phone call to a son or daughter — a channel that is free,
already installed, and works perfectly. Thuna is only used if it beats that.

Note what the benchmark implies. Calling your child is not *hard*. It is one tap and someone
competent handles everything. Beating it on raw capability is impossible. Thuna wins on the four
costs a phone call carries that an elder feels and rarely says aloud.

### 1.1 What "easier" decomposes into

| Cost of calling your child | What Thuna must beat it on | How we measure it |
|---|---|---|
| **Imposition** — "he's at work, I shouldn't bother him" | Thuna is never busy, never interrupted, never owed a favour | The elder starts a task without hesitation. No "is this a good time?" affordance exists, because the question never arises. |
| **Waiting** — he'll call back after his meeting | Thuna answers now | Time from app open to first Thuna utterance ≤ 3 seconds. Zero blocking spinners on Home. |
| **Embarrassment** — "I've asked him this before" | Thuna does not remember *at* you | No counters, no streaks, no "you asked this on Tuesday", no history surface anywhere in the elder UI. |
| **Decisions** — he asks five clarifying questions | Thuna asks one thing at a time | ≤ 1 decision per screen. ≤ 1 question per voice turn. Measured by counting interactive choices per rendered view; a view with two is a defect. |

### 1.2 The measurable form

These are the acceptance thresholds. A screen that fails any of them is not shippable.

| # | Measure | Threshold |
|---|---|---|
| M1 | Decisions presented on any one screen | **exactly 1** dominant, plus at most 3 secondary context items |
| M2 | Taps from app open to speaking to Thuna | **1** |
| M3 | Taps from anywhere back to Home | **≤ 2** |
| M4 | Blocking wait states with no visible exit | **0** |
| M5 | On-screen elements that require reading more than 12 words to act on | **0** |
| M6 | Words in any single paragraph of guidance | **≤ 25**, split across ≤ 2 lines at 390px |
| M7 | Interactive targets below 52px | **0** |
| M8 | Icons rendered without an accompanying text label | **0** |
| M9 | States where Stop is unavailable during an active task | **0** |
| M10 | Meanings conveyed by colour alone | **0** |

If a design meets M1–M10 and still feels harder than calling Ravi, the design is wrong even though
it passes. These thresholds are necessary, not sufficient.

---

## 2. The eighteen rules

Each rule is stated, then justified against the north star. The justification is the important part —
a rule whose reason is understood survives contact with an edge case; a rule memorised as a number
does not.

### 2.1 Structure

**R1 — One screen, one decision.**
Every screen answers exactly one question the elder is currently asking. Home answers *"what now?"*.
Talk answers *"what am I saying and is it hearing me?"*. Reminders answers *"what is coming?"*.
*Why:* the cost Thuna is beating is decision load (§1.1). A screen with two decisions has already
lost to the phone call, where the child makes the decisions.

**R2 — One dominant action per screen.**
Exactly one element is the largest, highest-contrast, most obviously tappable thing in view. On Home
that is TalkButton. Secondary actions are visibly secondary — smaller, lower contrast, but never
below the 52px floor.
*Why:* elders with low vision, low confidence, or low familiarity scan for "the big one". If there
are two big ones, they stop and ask someone. That someone is the child we are trying to beat.

**R3 — No long paragraphs.**
Maximum 25 words in a run of prose, and it must break into at most two lines at 390px. Longer content
is spoken, not written.
*Why:* Thuna is a voice product with a screen, not a text product with a microphone. Text on screen
exists to *confirm* and *anchor*, never to *explain*. Explanation is TTS's job.

**R4 — Never expose raw engine or AI state.**
No `EngineAction` values, no `ScreenState.status` strings, no skill ids, no model names, no token
counts, no confidence scores, no "processing", no JSON. `lib/types.ts` defines `EngineAction` as
`route | ask | confirm | complete | refuse | handoff | repeat_slowly | answer_question | go_back`
and `ScreenState.status` as `idle | awaiting_confirmation | done | refused | paused | handedoff`.
**None of these strings is ever rendered.** Each maps to elder-facing copy specified in
`VOICE_INTERACTION_STATES.md`.
*Why:* `refused` on screen reads as *the elder* was refused. `handedoff` reads as being passed
around. These are internal words with cruel accidental meanings.

### 2.2 Legibility and labelling

**R5 — Never an icon without text.**
Every icon carries a visible text label. Bottom navigation, header controls, in-card actions — all
of them. An icon may never be the sole carrier of meaning, and a text label may never be hidden to
save space.
*Why:* icon literacy is learned, not innate. A microphone glyph means "record" to someone who has
used recording apps and means nothing otherwise. The label costs 16px of height and removes an entire
class of failure.

**R6 — Essential text is never below 16px.**
Anything the elder must read to act: ≥ 16px. There is no 12px or 14px tier in this product. Metadata
that would want to be 13px is either promoted to 16px or deleted.
*Why:* if it can be set at 13px, it was not essential; if it is essential, 13px is a barrier. The
rule forces the editorial decision rather than deferring it to a font size.

**R7 — Main guidance is 24–28px.**
The single sentence telling the elder what is happening or what to do renders at 24–28px, and is the
first thing read on the screen.
*Why:* this is the line that replaces the child saying "okay, now tap the blue one". It must be
readable at arm's length in Kerala afternoon light, on a phone held at a slight angle, without
reading glasses if possible.

**R18 — Malayalam wraps to two lines without clipping.**
Every label container is sized for two lines of Malayalam at the label's type size, with
`line-height: 1.5` minimum for `ml-IN` and no `overflow: hidden` on any text node. Navigation labels,
button labels, card titles and status text all reserve two-line height whether or not English uses
it. No ellipsis truncation on any elder-facing string.
*Why:* Malayalam is the primary language of the seed profile (`ml-IN`, per `DAILY_LIFE_BRIEF.md` §7),
and its words are long. A layout that only fits English is a layout that ships broken to the actual
user. Reserving the space unconditionally also stops the layout jumping when the language changes.

### 2.3 Touch

**R8 — Primary targets ≥ 52px.**
Every interactive element the elder is expected to use has a hit area of at least 52 × 52 CSS px,
with ≥ 8px of clear space between adjacent targets.
*Why:* 44px is the accessibility floor for a steady hand. Tremor, dry skin, thicker fingers and
imprecise aim on a phone held one-handed all argue upward. 52px plus spacing is where mis-taps stop
being routine.

**R9 — TalkButton is 76–96px.**
The primary voice control is 96px in diameter on 390px and 430px viewports, and never smaller than
76px on 360px.
*Why:* it is used more than everything else combined, often while the elder is looking at something
else, and sometimes with a shaking hand. It should be findable by thumb without looking.

### 2.4 Safety and consequence

**R10 — Confirmation is visually distinct.**
A screen asking the elder to confirm something consequential does not look like any other screen. It
uses `--teal-100` as a full-bleed surface rather than `--bg-cream`, gains a 4px left rule in
`--teal-900` on the read-back block, and its dominant action carries a different word — never "OK",
always the actual verb ("Place the order", "Send the message").
*Why:* the elder must be able to tell, from across the room and before reading a word, that this
screen is different from the ones they have been tapping through. Confirmation fatigue is defeated by
visual difference, not by more text.

**R11 — Safety warnings are calm, not alarming.**
Warnings use `--amber-500` for attention and `--red-700` only for genuine danger, both as a left rule
and an icon-plus-label pair, never as a background fill, never with a triangle-and-exclamation
klaxon, never with animation. Copy states the fact and the option, in that order.
*Why:* alarm makes elders freeze or hand the phone to someone. A warning that causes the elder to
stop using Thuna and call their child has technically succeeded and actually failed. Compare:
> Not: **⚠️ WARNING! Never share your OTP with anyone!**
> But: **Thuna never asks for an OTP or PIN. If something asks you for one, it isn't Thuna.**

**R12 — Consequential actions require read-back.**
Anything that spends money, sends a message to a person, books a slot, or cannot be undone gets a
read-back block: what will happen, to whom, for how much, in the elder's own words and their own
language. Spoken and shown simultaneously. Only an explicit affirmative proceeds — silence, "hmm",
"wait" and vagueness never do. This mirrors `readback()` on `SkillHandler` and the `readback` safety
rule type in `lib/types.ts`, and `COMPANION_PRODUCT_MODEL.md` §6.
*Why:* it is the single mechanism that makes an assistant safe to hand real money to.

**R13 — External actions say SIMULATED.**
Where an action does not actually reach a provider, the screen says so plainly in elder-readable
words, not a developer badge. The `SimulatedReceipt` type in `lib/types.ts` carries
`simulated: true` unconditionally; the UI must render that fact, not hide it.
> **This was a practice run — no order was placed and no money was spent.**
*Why:* `CHECKIN_CONVERSATION_POLICY.md` §9 makes claiming a real action occurred when it was
simulated an absolute prohibition. A UI that shows a realistic receipt without the label breaks that
prohibition visually, whatever the voice said.

### 2.5 Dignity

**R14 — Never shame, rush, or infantilise.**
No countdown timers. No "are you still there?". No progress streaks. No "you missed this yesterday".
No congratulation for ordinary acts. No cartoon mascot, no smiley faces, no exclamation marks in
system copy. Failure is always attributed to Thuna, never to the elder.
*Why:* `COMPANION_PRODUCT_MODEL.md` §5 makes these product requirements, not tone preferences. §3 of
the same document names "a childish interface" as a betrayal, in the same table as "a monitoring
device". They are the same category of harm.

**R6b — Stop, Wait and Repeat stay visible during any active task.**
Whenever Thuna is listening, thinking, speaking, or holding an unfinished task, three controls remain
on screen and reachable: **Stop**, **Wait**, **Say it again**. They never collapse into a menu, never
scroll off, never appear only after a delay, and never require the elder to interrupt speech to find
them. Full state-by-state specification in `VOICE_INTERACTION_STATES.md`.
*Why:* `COMPANION_PRODUCT_MODEL.md` §5.6 — "the elder can always stop". A stop that must be hunted
for is not a stop. This is the rule most likely to be eroded by a designer wanting a cleaner screen;
it is not negotiable.

### 2.6 Perception

**R15 — Motion is subtle and reduced-motion aware.**
Transitions are 180–240ms, ease-out, opacity and ≤ 8px translation only. The listening indicator
breathes at ~1.4s per cycle with an amplitude of ≤ 4px. Under
`@media (prefers-reduced-motion: reduce)` every animation is replaced by a static state change or a
stepped indicator — never simply removed, because the motion was carrying the information that Thuna
is alive.
*Why:* vestibular sensitivity is common with age, and large motion on a small screen reads as an
error. But a completely still "listening" screen is indistinguishable from a frozen app, which is
why the fallback must be a *substitution*, not a deletion.

**R16 — Meaning is never carried by colour alone.**
Every state that is coloured is also labelled in words and differentiated in shape or weight.
Amber attention carries the word "Due now" and a filled left rule; green success carries "Done" and
a check glyph *with* its text label; red carries the specific word for the risk.
*Why:* age-related colour vision change, plus outdoor glare, plus the possibility the phone is in
grayscale accessibility mode. Also the plainest instance of R5's principle: never one carrier of
meaning.

**R17 — No dense information.**
A card holds at most: one title line, one detail line, one action. Three context items maximum on
Home. Three items maximum spoken in a brief (`DAILY_LIFE_BRIEF.md` §5). Five maximum shown in the
Daily Brief screen.
*Why:* density is the visual form of the decision cost in §1.1. A dense screen is a screen that
requires triage, and triage is the work the elder came here to avoid.

---

## 3. What we are NOT building

Stated as prohibitions because each is a specific, plausible drift and each one, arrived at
gradually, would be defended as "modern".

| Not this | Why it is wrong here |
|---|---|
| **Purple/violet AI theming** | Signals "this is an AI product" — a category the elder has no relationship with and reasonable suspicion of. Thuna is a helper, not a demo of a technology. |
| **Hospital blue, clinical whites** | Casts the elder as a patient. `COMPANION_PRODUCT_MODEL.md` §3: Thuna is not a medical device and must not dress as one. |
| **Glassmorphism, frosted panels, blur** | Reduces effective contrast, makes edges ambiguous, and looks broken on older Android rendering. Style bought at the cost of legibility. |
| **Gradients on surfaces or text** | Shifting contrast across a text run. Flat, solid fills only. Gradient is permitted nowhere in the elder UI. |
| **Childish avatars, mascots, cartoon faces** | Infantilising (R14). Also implies a personhood Thuna does not have — `CHECKIN_CONVERSATION_POLICY.md` §4 prohibits faked personhood in copy; a face does it in pixels. |
| **Dense cards, multi-column grids, tables** | Violates R1 and R17. Every dashboard layout is a triage layout. |
| **Neon, saturated accents, high-chroma darks** | Glare and afterimage on older eyes. The palette is warm, low-chroma and matte by design. |
| **Small grey secondary labels** | The 13px grey caption is the single most common elder-hostile pattern in modern UI. Violates R6 outright. |
| **Excessive animation, confetti, celebratory effects** | Violates R15 and R14 together — motion sickness plus congratulating an adult for ordinary competence. |
| **Enterprise dashboard patterns** | Charts, KPIs, streaks, activity feeds, "insights". These are surveillance affordances wearing a product-design hat, and they are also what a *family* dashboard would look like. The elder is the principal (`COMPANION_PRODUCT_MODEL.md` §4). |
| **A history or transcript surface in the elder UI** | Would make the elder's own past askings visible to them as a record, feeding the embarrassment cost in §1.1. Sessions end; they do not accumulate on screen. |
| **Badges, unread counts, red dots** | Manufactured urgency (`CHECKIN_CONVERSATION_POLICY.md` §4). Nothing in Thuna is owed. |
| **Onboarding carousels and feature tours** | Five screens of reading before the first use, from a product whose whole claim is that it is easier than a phone call. First run goes straight to Home. |

---

## 4. The dignity test

Before any string ships, read it aloud and ask: **would I say this, in these words, to a competent
adult I respect who happens to need a hand with a phone?**

If the answer is no, the string fails, however friendly it sounds.

### 4.1 Failure attribution

| Condescending | Respectful | What changed |
|---|---|---|
| You didn't say anything. | I didn't catch that. | Failure is Thuna's (`COMPANION_PRODUCT_MODEL.md` §5.3) |
| You're speaking too quietly. | I'm having trouble hearing — could you say it once more? | Removes the instruction-to-the-elder framing |
| Invalid input. Please try again. | That one's beyond me. Would you like me to get Ravi? | No blame, and a concrete way forward |
| You missed your medicine yesterday. | *(nothing — this is never said)* | Prohibited outright (`DAILY_LIFE_BRIEF.md` §4) |
| Sorry, I didn't understand you. | Sorry, I didn't follow that. | "understand *you*" locates the deficiency in the person |

### 4.2 Capability framing

| Condescending | Respectful | What changed |
|---|---|---|
| Let me do that for you. | Let me help with that. | `COMPANION_PRODUCT_MODEL.md` §5.1 verbatim |
| Don't worry, it's easy! | Here's the next step. | Removes the implication that worry was expected |
| I'll take care of everything. | I'll set it up and read it back before anything happens. | States the actual mechanism; preserves control |
| You just need to tap the green button. | Tap **Place the order** when you're ready. | "just" minimises; the button is named, not colour-described (R16) |
| Great job! You took your tablet! | Good. That's all I needed. | No praise for ordinary acts (`COMPANION_PRODUCT_MODEL.md` §5.4) |

### 4.3 Pace and pressure

| Condescending | Respectful | What changed |
|---|---|---|
| Are you still there? | *(silence, then)* I'll be here when you're ready. | No nagging (`COMPANION_PRODUCT_MODEL.md` §5.2) |
| Hurry — this offer ends in 4:59. | *(no countdowns exist in this product)* | Manufactured urgency prohibited |
| You've been inactive. Session will end in 30s. | Take your time. Tap **Talk** whenever you like. | Removes the timer entirely |
| Are you sure? Are you really sure? | *(one read-back, one confirmation, then it proceeds)* | Double-checking an adult reads as distrust |
| Would you like to stop these reminders? Are you sure you want to stop? They're good for you. | Alright — I've stopped those. | `DAILY_LIFE_BRIEF.md` §2: off immediately, no argument |

### 4.4 Technical leakage

| Leaky | Respectful | What changed |
|---|---|---|
| STT error 500 | I couldn't hear that clearly. | No codes, no subsystem names (R4) |
| ScreenState: handedoff | Ravi's picking this up. | Internal enum → human sentence |
| Skill ORDER_FOOD step 3/5 | Which dosa would you like? | No progress arithmetic, no skill ids |
| Network request failed (ECONNRESET) | I've lost my connection. I'll try again in a moment. | States the effect, not the cause |
| Confidence: 0.62 — did you mean…? | Did you mean the plain dosa, or the masala one? | Never surface uncertainty as a number |

### 4.5 Family framing

| Coercive | Respectful | What changed |
|---|---|---|
| Ravi will worry if you don't. | *(never said)* | Emotional coercion, prohibited (`CHECKIN_CONVERSATION_POLICY.md` §4) |
| Your family has been notified. | Would you like me to let Ravi know? | Consent flows from the elder (`COMPANION_PRODUCT_MODEL.md` §4) |
| Ask someone to help you with this. | Would you like me to ask Ravi? | Thuna does the reaching out; the elder isn't sent away |
| This is too difficult for you. | This one needs a person. Shall I get Ravi? | The task is hard, not the elder |

### 4.6 The read-aloud rule

Every elder-facing string in the UI must be sayable by TTS as-is, because much of it will be. That
rules out, at the string level: bare numerals for money ("Rs 340" → "three hundred and forty rupees"
when spoken), 24-hour times, ids of any kind, abbreviations, and punctuation that does not survive
speech. `CHECKIN_CONVERSATION_POLICY.md` §7 governs the spoken form; the screen may show "Rs 340" and
"7:30 PM" where those are conventional to read, but the two forms must be authored together and must
never disagree.

---

## 5. How to apply this document

1. **Design review order.** Check M1–M10 first (§1.2) — they are mechanical. Then R1–R18. Then read
   every string aloud against §4.
2. **When two rules conflict**, the one that better serves §1 wins. In practice that is almost always
   the one that removes a decision.
3. **When a rule seems to block something the elder asked for**, the design is wrong, not the rule.
   Find the shape that satisfies both.
4. **New surfaces inherit all eighteen rules.** There is no "just this one screen" exemption, and
   there is no denser variant of a screen for "power users". There are no power users.

---

## 6. Implementation notes for GLM

1. **Type scale and colours are not defined here.** Use the tokens from `VISUAL_DESIGN_SYSTEM.md`
   (`--bg-cream`, `--teal-900`, `--teal-100`, `--green-600`, `--amber-500`, `--red-700`,
   `--charcoal-900`). Never hard-code a hex value in a component.
2. **Enforce R4 at the boundary.** No component may accept an `EngineAction` or
   `ScreenState['status']` value and render it. Map every engine value to display copy in one
   module, so the mapping is exhaustive and reviewable in one place. A missing mapping should fail
   loudly in development, not fall through to the raw string.
3. **Enforce R6 in CSS.** Set a minimum font size on the elder shell and do not introduce utility
   classes below 16px. If a 14px class exists, it will be used.
4. **Enforce R8 with a shared minimum.** Give every interactive primitive a `min-height: 52px` and
   `min-width: 52px` floor at the base layer rather than per-component, so a new button cannot be
   born too small.
5. **Enforce R18 by reserving height.** Label containers use `min-height` calculated for two lines
   at their type size, `overflow: visible`, and no `text-overflow: ellipsis` anywhere in the elder
   shell.
6. **Enforce R15 globally.** One `prefers-reduced-motion` block that substitutes stepped or static
   indicators, not one that sets `animation: none`. Removing the animation without a replacement
   creates the frozen-app failure described in R15.
7. **Enforce R16 in review.** Any component whose only differentiator between two states is a colour
   token is a defect. Add the word.
8. **Simulated actions are labelled at the type level.** `SimulatedReceipt.simulated` is `true` by
   construction in `lib/types.ts`; the receipt component should have no code path that renders
   without the label.
9. **No analytics of elder behaviour.** No event counting, no session length, no engagement
   instrumentation in the elder shell. `COMPANION_PRODUCT_MODEL.md` §10 rules these out as product
   goals, and the cleanest way to keep them out is not to collect them.

---

## Related

- `docs/companion/COMPANION_PRODUCT_MODEL.md` — §4 elder-as-principal, §5 dignity constraints, §10 success criteria
- `docs/companion/CHECKIN_CONVERSATION_POLICY.md` — §4 prohibited patterns, §7 language, §9 absolute prohibitions
- `docs/companion/DAILY_LIFE_BRIEF.md` — §4 what may never appear
- `docs/mobile-ui/INFORMATION_ARCHITECTURE.md` — routes, navigation, depth rule
- `docs/mobile-ui/ELDER_HOME_SCREEN.md` — the principles applied to Home
- `docs/mobile-ui/VOICE_INTERACTION_STATES.md` — the principles applied to voice
- `docs/mobile-ui/DAILY_BRIEF_SCREEN.md` — the principles applied to the brief
- `VISUAL_DESIGN_SYSTEM.md` — colour, type, spacing tokens (owned elsewhere)
- `COMPONENT_SPECIFICATION.md` — component props and behaviour (owned elsewhere)
- `lib/types.ts` — `EngineAction`, `ScreenState`, `SimulatedReceipt` (read-only reference)
