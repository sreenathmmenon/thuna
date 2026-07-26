# Thuna — Voice Interaction States

> Design specification. **Changes no production code.**
>
> Route `/talk`. Sixteen states, fully specified. This is the screen the product lives or dies on.

---

## 1. The frame every state shares

`/talk` has one layout. States change what is inside it; they never change where things are. An
elder who has learned where Stop is must find Stop in the same place in all sixteen states.

### 1.1 The invariant layout — 390 × 844

```
 x=0                        390
┌─────────────────────────────────────────────────────────────┐ y=0
│              safe-area-inset-top — 47px                     │
├─────────────────────────────────────────────────────────────┤ y=47
│  MobileHeader                                   height 56px │
│  ← Back                                    Thuna     20/600 │  Back 52×52, labelled
├─────────────────────────────────────────────────────────────┤ y=103
│                                                             │
│  STATUS LINE                                     18px / 600 │ y=127  height 28
│  (what Thuna is doing — one short phrase, always present)   │
│                                                             │
├─────────────────────────────────────────────────────────────┤ y=155
│                                                             │
│  GUIDANCE                                     24-28px / 500 │ y=179
│  (the one sentence that matters — up to 3 lines)            │        height up to 126
│                                                             │
├─────────────────────────────────────────────────────────────┤ y=305
│                                                             │
│  DETAIL REGION — VoiceStatePanel body            width 358  │ y=329
│  (read-back block, transcript echo, options, or empty)      │        flexible, min 0
│  Scrolls independently if content exceeds the region.       │
│                                                             │
├─────────────────────────────────────────────────────────────┤ y=497
│                                                             │
│         ╭───────────────────────────────────╮               │ y=521
│         │            TalkButton             │               │
│         │              96px                 │               │  centre (195, 569)
│         ╰───────────────────────────────────╯               │ y=617
│                Listening              20px / 600            │ y=629  state label
│                                                             │ y=657
├─────────────────────────────────────────────────────────────┤
│  RECOVERY BAR — always present in active states             │ y=681
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────────┐  │
│  │  Stop    │  │  Wait    │  │     Say it again          │  │  height 56px
│  └──────────┘  └──────────┘  └───────────────────────────┘  │  gap 8px
│     104px         104px              134px                  │ y=737
├─────────────────────────────────────────────────────────────┤
│              safe-area-inset-bottom — 34px                  │ y=810
└─────────────────────────────────────────────────────────────┘ y=844
```

`BottomNavigation` is **hidden** on `/talk` while a task is active, so the recovery bar occupies the
bottom. It is visible in `idle` and `completed`. This is the one place the navigation yields, because
Stop / Wait / Say it again must be in the thumb's home position during a conversation.

### 1.2 The recovery bar — non-negotiable

> **Stop, Wait and Say it again are visible in every active task state.** They do not collapse into
> a menu, do not scroll away, do not fade in after a delay, and do not require interrupting Thuna to
> reach.

| Control | Label | Width (390) | Effect |
|---|---|---|---|
| **Stop** | "Stop" | 104px | Ends the task immediately. `recoveryType: 'stop'`. Never asks "are you sure?". |
| **Wait** | "Wait" | 104px | Pauses. Thuna stops speaking and stops listening. `recoveryType: 'wait'`. |
| **Say it again** | "Say it again" | 134px | Repeats the last utterance, slower. `recoveryType: 'repeat_slowly'`. |

| Property | Value |
|---|---|
| Height | **56px** — above the 52px floor |
| Radius | 12px |
| Fill | `--teal-100` |
| Border | 1.5px `--teal-900` at 30% |
| Text | 18px / 600, `--teal-900` |
| Label container | `min-height: 48px` — two lines of Malayalam at 18px without clipping (R18) |
| Gap | 8px between buttons |
| At 360px | Widths 96 / 96 / 128, gaps 8px, margins 12px. Height unchanged. |
| At 430px | Widths 116 / 116 / 150. Height 56px. |
| Stop styling | Same as the others. **Stop is not red.** It is a normal, unalarming choice, and colouring it as danger discourages using it — which would defeat `COMPANION_PRODUCT_MODEL.md` §5.6. |

These three map directly to `ParsedCommand.recoveryType` in `lib/types.ts`
(`'wait' | 'repeat_slowly' | 'go_back' | 'stop'`). `go_back` has no bar button — it is reached by
speaking ("go back") or by the header Back control, because a fourth button crowds the bar at 360px
and going back is far rarer than the other three.

### 1.3 What is never on this screen

No waveform visualiser with recognisable amplitude detail. No live transcript scrolling as words
arrive. No confidence scores. No timers or countdowns. No "processing" spinners. No engine values
(R4). No microphone level meter in decibels.

A short **transcript echo** of what Thuna understood does appear in the detail region — but only
after the utterance is complete, at 18px, as a settled sentence. Live streaming text makes elders
watch their own speech being transcribed imperfectly and is a confidence-destroying pattern.

### 1.4 TalkButton appearance vocabulary

Five appearances, reused across the sixteen states. Each is distinguished by fill, ring, glyph **and**
its state label — never by colour alone (R16).

| Appearance | Fill | Ring | Glyph | Label position |
|---|---|---|---|---|
| **Ready** | `--teal-900` | none | microphone, 40px | below, 20px / 600 |
| **Active** | `--teal-900` | 4px `--teal-100`, breathing | microphone, 40px | below |
| **Thinking** | `--teal-900` at 85% | 4px `--teal-100`, stepped rotation | three dots, 32px | below |
| **Speaking** | `--teal-100` | 4px `--teal-900`, static | speaker glyph, 36px, `--teal-900` | below |
| **Held** | `--teal-100` | 2px `--charcoal-900` at 25% | pause bars, 32px, `--charcoal-900` at 60% | below |

"Held" covers paused, interrupted, and every failure state — the button is not the way out of those,
the offered action is.

---

## 2. State index

| # | State | `ScreenState.status` | Active task? | Recovery bar |
|---|---|---|---|---|
| 1 | Idle | `idle` | no | hidden — nav bar shown instead |
| 2 | Requesting microphone permission | `idle` | no | Stop only |
| 3 | Listening | `idle` / in-flight | **yes** | all three |
| 4 | Understanding | in-flight | **yes** | all three |
| 5 | Speaking | in-flight | **yes** | all three |
| 6 | Waiting for action | `awaiting_confirmation` | **yes** | all three |
| 7 | Paused | `paused` | **yes** | all three |
| 8 | Interrupted | `paused` | **yes** | all three |
| 9 | Reconnecting | in-flight | **yes** | all three |
| 10 | Microphone denied | `idle` | no | Stop only |
| 11 | Could not hear (STT failure) | in-flight | **yes** | all three |
| 12 | Cannot speak aloud (TTS failure) | in-flight | **yes** | all three |
| 13 | No connection | in-flight | **yes** | all three |
| 14 | Beyond me | `refused` | **yes** | all three |
| 15 | Handing to a person | `handedoff` | **yes** | all three |
| 16 | Completed | `done` | no | hidden — nav bar shown instead |

None of the `ScreenState.status` strings is ever displayed (R4). The column exists so GLM can map
engine state to UI state.

---

## 3. The sixteen states

### 3.1 Idle

Thuna is open and waiting. Nothing is in flight.

**What the elder sees.** The full frame with an empty detail region. TalkButton at Ready, centred and
dominant. Bottom navigation visible; recovery bar hidden, because there is nothing to stop.

**Copy.**
> Status line: *(none — the line is empty in idle, and the space is reserved so nothing shifts)*
> Guidance, 28px: **What would you like to do?**
> TalkButton label: **Talk to Thuna**

**TalkButton.** Ready. 96px, `--teal-900`, microphone glyph.

**Controls visible.** TalkButton. Header Back. Bottom navigation.

**Motion.** None. The screen is completely still.
*Reduced motion:* identical — there is nothing to reduce.

**Screen reader.** "Thuna. What would you like to do? Talk to Thuna, button."

**How to leave.** Tap TalkButton → **Listening** (or → **Requesting microphone permission** if
permission has never been granted). Tap Back or a nav item → leave `/talk`.

---

### 3.2 Requesting microphone permission

The browser permission prompt is about to appear, or is showing. This state exists so the elder is
never surprised by a system dialog they do not understand.

**What the elder sees.** The guidance explains what is about to happen, in plain words, *before* the
browser prompt fires. The detail region carries one line naming the button they should tap in the
system dialog. TalkButton is Held and non-interactive while the prompt is open.

**Copy.**
> Status line: **Getting ready**
> Guidance, 26px: **Your phone will ask if Thuna can use the microphone. Please choose Allow.**
> Detail: **This is so I can hear you. Nothing is recorded or kept.**
> TalkButton label: **Waiting for your phone**

**TalkButton.** Held, `aria-disabled`, no press effect.

**Controls visible.** Stop only, full-width at 358px, labelled **"Not now"**. Header Back.
Wait and Say it again are hidden here because there is nothing to wait for or repeat, and offering
them would imply Thuna is doing something.

**Motion.** None.
*Reduced motion:* identical.

**Screen reader.** Announced as `role="status"`: "Getting ready. Your phone will ask if Thuna can use
the microphone. Please choose Allow."

**How to leave.** Permission granted → **Listening**. Permission denied → **Microphone denied**.
"Not now" → **Idle**. Dismissed without answering → **Idle**, with the guidance reverting silently.

---

### 3.3 Listening

The microphone is open and Thuna is hearing.

**What the elder sees.** TalkButton at Active, its ring breathing slowly. The status line says
Listening. The detail region is empty — no live transcript (§1.3). The whole screen is calm; nothing
moves except the ring.

**Copy.**
> Status line: **Listening**
> Guidance, 28px: **Go ahead — I'm listening.**
> TalkButton label: **Listening**

On a resumed task the guidance is the current step's question instead, e.g. **"Which dosa would you
like?"** — the status line still says Listening.

**TalkButton.** Active. Ring 4px `--teal-100`, breathing 1.4s per cycle, amplitude 4px, ease-in-out.

**Controls visible.** Stop, Wait, Say it again. TalkButton (tapping it stops listening and submits).
Header Back.

**Motion.** The ring breathes: scale 1.0 → 1.04 → 1.0 over 1.4s, infinite. Nothing else moves.
*Reduced motion:* the ring does not scale. Instead it steps through three static thicknesses
(3px → 4px → 5px) at 1.4s intervals with no transition. The information — "I am alive and hearing
you" — is preserved (R15). It is never simply removed.

**Screen reader.** On entry: "Listening. Go ahead, I'm listening." `aria-live="polite"`. The breathing
indicator is `aria-hidden`.

**How to leave.** Speech ends → **Understanding**. Wait → **Paused**. Stop → **Idle**.
Say it again → repeats the last guidance, stays in **Listening**. Silence for 12 seconds →
**Could not hear**. Connection lost → **Reconnecting**.

The 12-second threshold is generous by design. `COMPANION_PRODUCT_MODEL.md` §5.2 forbids rushing, and
an elder composing a sentence in Malayalam should not be cut off mid-thought. There is **no visible
countdown** of that 12 seconds.

---

### 3.4 Understanding

Thuna has the utterance and is working out what to do.

**What the elder sees.** TalkButton at Thinking with a three-dot glyph. The detail region shows the
transcript echo — what Thuna heard, as a settled sentence, so the elder can see whether it landed.

**Copy.**
> Status line: **One moment**
> Guidance, 26px: **Let me see.**
> Detail, 18px, `--teal-100` block: **"I want two plain dosas"**
> TalkButton label: **One moment**

**TalkButton.** Thinking. Fill at 85%, ring stepping.

**Controls visible.** Stop, Wait, Say it again. TalkButton is non-interactive.

**Motion.** The ring rotates in **four discrete steps** of 90° at 400ms intervals — stepped, not
continuous, so it reads as deliberate rather than as a loading spinner.
*Reduced motion:* the three dots fill one at a time, left to right, at 500ms intervals, with no
transition. Still conveys progress; no rotation.

**Screen reader.** "One moment. I heard: I want two plain dosas."

**How to leave.** Engine returns `ask` / `answer_question` / `route` → **Speaking**. Returns
`confirm` → **Waiting for action**. Returns `refuse` → **Beyond me**. Returns `handoff` →
**Handing to a person**. Returns `complete` → **Completed**. Transcription empty or unusable →
**Could not hear**. Request fails → **No connection**. Wait → **Paused**. Stop → **Idle**.

**Timing guard.** If Understanding lasts more than 6 seconds, the guidance changes once to
**"Still working on it."** — no timer, no progress bar, no percentage. After 15 seconds it becomes
**No connection**.

---

### 3.5 Speaking

Thuna is talking.

**What the elder sees.** TalkButton at Speaking — inverted, a speaker glyph, static. The guidance
shows the *same sentence* Thuna is saying, so an elder who did not catch it aloud can read it. If the
utterance is longer than three lines, the guidance shows the first sentence and the detail region
carries the rest at 20px.

**Copy.**
> Status line: **Thuna is speaking**
> Guidance, 26px: *(the utterance being spoken, verbatim)*
> TalkButton label: **Tap to interrupt**

The label is important. It tells the elder the button is now a way to break in, which is the single
most common thing they will want and the least obvious affordance.

**TalkButton.** Speaking. `--teal-100` fill, 4px `--teal-900` ring, static.

**Controls visible.** Stop, Wait, Say it again. TalkButton (interrupts). Header Back.

**Motion.** None on the button. A 3px `--teal-900` progress rule runs beneath the guidance text,
advancing with the utterance. This is the one place a progress indicator is allowed, because it shows
how much longer the elder must listen, which is information they want and cannot otherwise get.
*Reduced motion:* the rule advances in sentence-sized steps rather than continuously.

**Screen reader.** The spoken text is rendered in an `aria-live="polite"` region so a screen-reader
user receives it as text. TTS is suppressed when a screen reader is active, to avoid two voices.

**How to leave.** Utterance finishes and a reply is expected → **Listening**. Finishes with nothing
expected → **Completed** or **Idle**. Elder speaks over it → **Listening** (barge-in;
`DAILY_LIFE_BRIEF.md` §5.5 makes interruptibility a requirement). Tap TalkButton → **Listening**.
Wait → **Paused**. Stop → **Idle**. Say it again → restarts the utterance at slow pace, stays in
**Speaking**. Audio output fails → **Cannot speak aloud**.

---

### 3.6 Waiting for action

Thuna has read back a consequential action and is waiting for an explicit yes.
`ScreenState.status: 'awaiting_confirmation'`. This state renders at `/talk/confirm` as a full-screen
replace, and it is visually distinct from every other state (R10).

**What the elder sees.** The surface is `--teal-100` rather than `--bg-cream`. The read-back block
sits in the detail region on `--bg-cream` with a 4px `--teal-900` left rule, at 20px, listing exactly
what will happen, to whom, and for how much — in words, in the elder's language. Two large actions
at the bottom. The bottom navigation is hidden; there is no back gesture.

**Copy.**
> Status line: **Before I do this**
> Guidance, 26px: **Shall I place this order?**
> Read-back block, 20px:
> **Two plain dosas from Hotel Saravana**
> **Three hundred and forty rupees**
> **To your home address**
> Primary action, 20px / 600: **Yes, place the order**
> Secondary action, 20px / 600: **No, don't**
> TalkButton label: **Or tell me**

The primary action carries the **actual verb**, never "OK" and never "Confirm" (R10).

**TalkButton.** Ready, but reduced to 76px and positioned to the right of the two action buttons —
speech is still accepted ("yes", "no", "wait"), but the tap path is deliberately dominant here.

**Controls visible.** Yes / No (each 358 × 60px, stacked, 12px gap), TalkButton, and the recovery bar
with all three controls. **Stop remains available in the confirmation state** — this is the state
where an elder is most likely to want out.

**Motion.** None. The confirmation screen is completely static. Any movement here reads as pressure.
*Reduced motion:* identical.

**Screen reader.** Announced as `role="alertdialog"`, focus moved to the guidance: "Before I do this.
Shall I place this order? Two plain dosas from Hotel Saravana. Three hundred and forty rupees. To
your home address. Yes, place the order, button. No, don't, button."

**How to leave.** Explicit yes (tap or speech) → **Speaking**, then **Completed**. No → **Speaking**
("Alright, I've left it."), then **Idle**. Wait → **Paused** with the read-back preserved.
Stop → **Idle**, nothing executed. **Silence, "hmm", "maybe" and any vagueness change nothing** — the
state holds indefinitely with no timeout, per `COMPANION_PRODUCT_MODEL.md` §6.

There is **no auto-proceed on any timer, ever.**

---

### 3.7 Paused

The elder said Wait, or tapped Wait. Thuna has stopped and is holding the task.

**What the elder sees.** TalkButton at Held. The detail region shows what is being held, so the elder
can pick it up without remembering. Everything is quiet — no microphone open, no speech.

**Copy.**
> Status line: **Paused**
> Guidance, 26px: **Take your time. I'll be here.**
> Detail, 18px: **We were on: two plain dosas from Hotel Saravana.**
> TalkButton label: **Carry on**

Note there is no "are you still there?", no countdown, no auto-resume, and no auto-expiry while the
elder is on the screen (`COMPANION_PRODUCT_MODEL.md` §5.2).

**TalkButton.** Held. Tappable — tapping resumes.

**Controls visible.** Stop, Wait (disabled with reduced contrast but still present, so the bar does
not reflow), Say it again. TalkButton. Header Back.

Keeping a disabled Wait in place rather than removing it is deliberate: a bar that changes shape
between states destroys the muscle memory the bar exists to build.

**Motion.** None.
*Reduced motion:* identical.

**Screen reader.** "Paused. Take your time, I'll be here. We were on: two plain dosas from Hotel
Saravana. Carry on, button."

**How to leave.** Tap TalkButton or say "carry on" → **Listening**, resuming at the same step.
Stop → **Idle**, and the task becomes a Continue item on Home (`ELDER_HOME_SCREEN.md` §4.3).
Leaving `/talk` → the task is preserved as a pending loop; nothing is lost.

---

### 3.8 Interrupted

Something outside the conversation broke it — an incoming call, the app backgrounded, the screen
locked. Distinct from Paused because the elder did not choose it, so Thuna must explain and take
responsibility for the resumption.

**What the elder sees.** On return to the app, the guidance acknowledges the break without asking
what happened and without any suggestion the elder did something wrong.

**Copy.**
> Status line: **We were interrupted**
> Guidance, 26px: **We stopped partway. Shall we carry on?**
> Detail, 18px: **We were on: two plain dosas from Hotel Saravana.**
> Primary action: **Carry on**
> Secondary action: **Leave it for now**
> TalkButton label: **Carry on**

Never: "You left", "Your call interrupted us", "Session expired", "You were away".

**TalkButton.** Held.

**Controls visible.** Carry on / Leave it for now (358 × 56px, stacked, 12px gap). Stop, Wait
(disabled), Say it again. Header Back.

**Motion.** None.
*Reduced motion:* identical.

**Screen reader.** `role="status"`: "We were interrupted. We stopped partway. Shall we carry on? We
were on: two plain dosas from Hotel Saravana."

**How to leave.** Carry on → **Listening**, at the same step. Leave it for now → **Idle**, and the
task becomes a Continue item on Home. Stop → **Idle**.

**Retention.** An interrupted task is resumable for the rest of the day. After that it becomes a
pending loop with the ageing rules of `PENDING_LOOPS.md` — one quiet mention, then it expires. It is
never re-raised repeatedly.

---

### 3.9 Reconnecting

The network dropped mid-task and Thuna is trying again. Distinct from **No connection**, which is
the state after retries have failed.

**What the elder sees.** TalkButton at Thinking. The guidance says what is happening in terms of
effect, not cause. No error codes, no retry counter, no "attempt 2 of 3".

**Copy.**
> Status line: **Reconnecting**
> Guidance, 26px: **I've lost the connection for a moment. I'm trying again.**
> Detail, 18px: **Nothing is lost — we'll pick up where we left off.**
> TalkButton label: **Reconnecting**

That detail line matters more than it looks. The elder's first fear on a dropped connection is that
their half-finished order is gone or, worse, has been placed twice.

**TalkButton.** Thinking, non-interactive.

**Controls visible.** Stop, Wait, Say it again. Header Back.

**Motion.** The stepped ring rotation from **Understanding**, at a slower 600ms step.
*Reduced motion:* three dots filling in sequence at 700ms.

**Screen reader.** "Reconnecting. I've lost the connection for a moment. I'm trying again. Nothing is
lost."

**How to leave.** Connection restored → back to the state it left (**Listening**, **Speaking**, or
**Waiting for action**), with a one-line spoken re-entry: *"Right — where were we."*
Retries exhausted (3 attempts over ~10 seconds) → **No connection**.
Stop → **Idle**, task preserved as a Continue item. Wait → **Paused**.

---

### 3.10 Microphone denied

Permission was refused, or has been revoked in browser settings.

**What the elder sees.** A calm explanation and two real ways forward. Not an error. The screen does
not look broken, does not use red, and does not use a warning icon.

**Copy.**
> Status line: **I can't hear**
> Guidance, 26px: **I can't use the microphone just now.**
> Detail, 18px: **You can type to me instead, or turn the microphone on in your phone's settings.**
> Primary action: **Type instead**
> Secondary action: **How to turn it on**
> TalkButton label: **Microphone off**

Never: "Permission denied", "NotAllowedError", "You must grant microphone access", "Enable
permissions to continue".

**TalkButton.** Held, `aria-disabled`, no press effect.

**Controls visible.** Type instead / How to turn it on (358 × 56px, stacked). **Stop only**, labelled
**"Not now"**, full width. Wait and Say it again are hidden — there is no active task.

**Motion.** None.
*Reduced motion:* identical.

**Screen reader.** `role="status"`: "I can't hear. I can't use the microphone just now. You can type
to me instead, or turn the microphone on in your phone's settings. Type instead, button."

**How to leave.** Type instead → **Listening** in typed mode: the detail region becomes a text field
at 20px with a 56px **Send** button, and every state below works identically without audio input.
How to turn it on → an inline panel with 3 numbered steps at 20px, illustrated with the actual
setting name for the detected browser, and a **Back** control. Not now → **Idle**.

**Typed mode is a first-class path**, not a degraded one. It also serves elders who cannot speak
comfortably, and it must be reachable from the header on any state via **Type instead** at 16px.

---

### 3.11 Could not hear — STT failure

Speech recognition returned nothing usable, or heard silence.

**What the elder sees.** One short line taking responsibility, and three ways forward. This is the
state an elder will hit most often, so the copy is the most carefully chosen in the document.

**Copy.**
> Status line: **Sorry**
> Guidance, 26px: **I couldn't hear that clearly.**
> Detail, 18px: **Shall we try once more?**
> Primary action: **Try again**
> Secondary action: **Type instead**
> TalkButton label: **Try again**

Never: "STT error 500", "No speech detected", "You didn't say anything", "Speak louder", "Speak more
clearly", "I didn't understand you". `COMPANION_PRODUCT_MODEL.md` §5.3: failure is Thuna's.

Note "I couldn't hear **that**", not "I couldn't hear **you**". The object of the failure is the
audio, not the person.

**Repeat handling.** On the second consecutive occurrence the guidance changes to
**"I'm still not hearing it — this is my end, not yours."** and Type instead is promoted to the
primary action. On the third, Thuna offers a person:
**"Let's not fight with this. Shall I ask Ravi?"** → **Handing to a person**.
Never more than three attempts before offering a human — `HUMAN_ATTENTION_BRIDGE.md` names
retry-before-escalate loops that exhaust the elder as an anti-pattern.

**TalkButton.** Held, but tappable — tapping is "Try again".

**Controls visible.** Try again / Type instead (358 × 56px, stacked). Stop, Wait, Say it again.

**Motion.** None.
*Reduced motion:* identical.

**Screen reader.** `role="status"`: "Sorry. I couldn't hear that clearly. Shall we try once more? Try
again, button."

**How to leave.** Try again → **Listening**. Type instead → **Listening** in typed mode.
Stop → **Idle**. Third failure → **Handing to a person**.

---

### 3.12 Cannot speak aloud — TTS failure

Audio output failed — synthesis error, the device is muted, or output is routed somewhere silent.
The conversation continues in text.

**What the elder sees.** Everything Thuna would have said, shown at 26px in the guidance region,
plus a short note that it could not be spoken. The task is **not** interrupted.

**Copy.**
> Status line: **I'll show you instead**
> Guidance, 26px: *(the utterance that would have been spoken)*
> Detail, 18px: **I can't speak aloud right now, so I'll write it. Check your phone isn't on silent.**
> Primary action: **Try sound again**
> TalkButton label: **Talk to Thuna**

Never: "TTS synthesis failed", "AudioContext error", "Playback unavailable".

**TalkButton.** Ready — voice *input* still works; only output failed. This asymmetry must be obvious,
which is why the label stays "Talk to Thuna".

**Controls visible.** Try sound again (358 × 56px). Stop, Wait, Say it again — **Say it again
re-renders the text**, since there is nothing to hear.

**Motion.** None.
*Reduced motion:* identical.

**Screen reader.** The utterance in an `aria-live="polite"` region — the screen-reader user is
unaffected by TTS failure and must not be told about it twice.

**How to leave.** Try sound again → retries synthesis; on success → **Speaking**. Task continues in
text with no further prompting — the notice is shown once per session, not on every turn. Stop →
**Idle**.

---

### 3.13 No connection — network failure

Retries have failed. Thuna cannot reach anything.

**What the elder sees.** A calm statement of fact and a clear reassurance that nothing was half-done.
Two ways forward.

**Copy.**
> Status line: **No connection**
> Guidance, 26px: **I can't reach the internet just now.**
> Detail, 18px: **Nothing was sent and nothing was ordered. We can pick this up when you're back online.**
> Primary action: **Try again**
> Secondary action: **Stop for now**
> TalkButton label: **Offline**

Never: "Network request failed", "ECONNRESET", "Check your internet connection and try again"
(instruction-shaped), "Something went wrong".

The detail line is the load-bearing sentence. On a payment or an order, the elder's real question is
"did it go through?". If the outcome is genuinely unknown rather than known-not-sent, the copy must
say so honestly and the item becomes a **P0 unresolved outcome**
(`PRIORITY_AND_DEDUP_POLICY.md` §2), surfacing on Home until resolved:
> **I'm not sure whether that went through. I'll check as soon as I'm back online, and I'll tell you either way.**

**TalkButton.** Held, `aria-disabled`.

**Controls visible.** Try again / Stop for now (358 × 56px, stacked). Stop, Wait (disabled),
Say it again.

**Motion.** None.
*Reduced motion:* identical.

**Screen reader.** `role="status"`: "No connection. I can't reach the internet just now. Nothing was
sent and nothing was ordered. Try again, button."

**How to leave.** Try again → **Reconnecting**. Stop for now → **Idle**, task preserved as a Continue
item. Connection returns while on this screen → the guidance changes once to
**"We're back. Shall we carry on?"** with a **Carry on** action. **It never auto-resumes** — resuming
without asking, after a gap the elder may have used to change their mind, is exactly the kind of
autonomy `COMPANION_PRODUCT_MODEL.md` §3 rules out.

---

### 3.14 Beyond me — unsupported request

The elder asked for something Thuna does not do, or must not do. Covers `ScreenState.status:
'refused'` and `RouteType: 'unsupported'`.

**What the elder sees.** A short, unembarrassed statement and a real next step. No apology spiral, no
list of things Thuna *can* do (which reads as a rebuke), no "I'm only an AI".

**Copy.**
> Status line: **Not something I can do**
> Guidance, 26px: **That one's beyond me.**
> Detail, 18px: **Would you like me to ask Ravi?**
> Primary action: **Yes, ask Ravi**
> Secondary action: **No, something else**
> TalkButton label: **Ask me something else**

**Safety refusals** — dosage, medical advice, OTP/PIN/CVV — use the same layout with specific copy,
stated calmly, no red, no warning triangle (R11):

| Request | Copy |
|---|---|
| Dosage or medical | **I'm only a reminder — I can't advise on medicine. Your doctor or pharmacist is the right person. Shall I help you call them?** |
| OTP / PIN / password | **I never ask for an OTP or a PIN, and you shouldn't give one to anyone who does. If something asked you for one, it wasn't me.** |
| Money to an unknown recipient | **I'd rather not send money to someone I don't know for you. Shall I check with Ravi first?** |

The OTP copy protects the elder from a *third party*, so it names the risk plainly while attributing
nothing to the elder. It uses `--amber-500` as a 4px left rule on the detail block, with the word
"never" carrying the emphasis, not colour (R16).

**TalkButton.** Ready — the elder may immediately ask something else, which is the point of the
secondary action's phrasing.

**Controls visible.** Yes, ask Ravi / No, something else (358 × 56px, stacked). Stop, Wait, Say it
again.

**Motion.** None.
*Reduced motion:* identical.

**Screen reader.** `role="status"`: "Not something I can do. That one's beyond me. Would you like me
to ask Ravi? Yes ask Ravi, button. No something else, button."

**How to leave.** Yes → **Handing to a person**. No → **Listening**. Stop → **Idle**.

If no family contact has consent on record, the detail line becomes
**"Is there something else I can help with?"** and only the secondary action shows. Thuna never
suggests contacting someone it has no consent to contact (`FAMILY_CONSENT_POLICY.md`).

---

### 3.15 Handing to a person — human handoff

Thuna is passing the task to a real person. `ScreenState.status: 'handedoff'`.

> **This is a success state and must look like one.** `HUMAN_ATTENTION_BRIDGE.md` §1: handoff is a
> normal, intended terminal state, never an error path. It uses `--green-600`, not amber and not red,
> and it is the same visual weight as **Completed**.

**What the elder sees.** Two phases.

*Phase 1 — the offer* (inline panel at `/talk/handoff`):
> Status line: **Getting help**
> Guidance, 26px: **Shall I ask Ravi to help with this?**
> Detail, 18px: **I'll tell him: "Appa needs a hand setting up the Wi-Fi." Nothing else.**
> Primary action: **Yes, ask Ravi**
> Secondary action: **Not now**

The detail line shows the **exact message** that will be sent, verbatim, before it is sent. This is
`MINIMUM_DISCLOSURE_POLICY.md` made visible: the elder sees precisely what is disclosed, and nothing
about them is shared beyond it.

*Phase 2 — sent:*
> Status line: **Done**
> Guidance, 26px: **Ravi's picking this up.**
> Detail, 18px: **I've asked him. He'll be in touch.**
> Primary action: **Back to start**

Never: "I couldn't do that, so I've escalated", "Transferring to a human agent", "Your request has
been escalated to support". The first frames the right outcome as a shortfall
(`HUMAN_ATTENTION_BRIDGE.md` §1); the others are contact-centre language.

**TalkButton.** Held in phase 1, Ready in phase 2.

**Controls visible.** Phase 1: the two actions, plus Stop, Wait, Say it again. Phase 2: Back to start
(358 × 56px), plus the bottom navigation returning.

**Motion.** None in phase 1. Phase 2 enters with a 200ms opacity fade only.
*Reduced motion:* no fade; the content swaps.

**Screen reader.** Phase 1 `role="status"`: "Getting help. Shall I ask Ravi to help with this? I'll
tell him: Appa needs a hand setting up the Wi-Fi. Nothing else." Phase 2: "Done. Ravi's picking this
up. I've asked him. He'll be in touch."

**How to leave.** Yes → phase 2 → **Completed**. Not now → **Listening**. Stop → **Idle**.

**Never claim contact that did not happen.** `CHECKIN_CONVERSATION_POLICY.md` §9 prohibits claiming
family was notified unless it actually occurred with consent. If sending fails, the copy is
**"I couldn't get a message to Ravi just now. Shall I try again?"** — never "Ravi has been notified".

---

### 3.16 Completed

The task is done. `ScreenState.status: 'done'`.

**What the elder sees.** A short confirmation of what happened and a clear ending, so the elder knows
it is over (`CHECKIN_CONVERSATION_POLICY.md` §8). Bottom navigation returns; the recovery bar is
gone, because there is nothing left to stop.

**Copy.**
> Status line: **Done**
> Guidance, 28px: **That's ordered.**
> Detail, 20px, `--green-600` 4px left rule with a check glyph **and** the word "Done":
> **Two plain dosas from Hotel Saravana · Three hundred and forty rupees**
> Primary action: **Back to start**
> TalkButton label: **Talk to Thuna**

No praise. Not "Well done!", not "Great!", not "Success!". The elder ordered food; that is a Tuesday,
not an accomplishment (`COMPANION_PRODUCT_MODEL.md` §5.4).

**Simulated actions.** When the completion is a `SimulatedReceipt` (`lib/types.ts`, where `simulated`
is `true` by construction), the detail block carries a plainly worded line above the summary, at
18px / 600 with an `--amber-500` 4px left rule (R13):
> **This was a practice run — no order was placed and no money was spent.**

Never a "SIMULATED" developer badge, never a watermark, never small grey text. The sentence must be
readable and unambiguous to someone who does not know what a demo is.

**TalkButton.** Ready.

**Controls visible.** Back to start (358 × 56px). TalkButton. Bottom navigation. Recovery bar hidden.

**Motion.** A 200ms opacity fade on entry. The check glyph does not animate — no draw-on, no bounce,
no confetti (R15, R14).
*Reduced motion:* no fade.

**Screen reader.** `role="status"`: "Done. That's ordered. Two plain dosas from Hotel Saravana, three
hundred and forty rupees." Simulated case prepends: "This was a practice run. No order was placed and
no money was spent."

**How to leave.** Back to start → `/` (Home). TalkButton → **Listening** for a new task. Navigation →
anywhere. Auto-returning to Home after a delay is **prohibited** — the elder reads at their own pace.

---

## 4. State transition table

| From | To | Trigger |
|---|---|---|
| Idle | Requesting microphone permission | TalkButton tapped, permission not yet granted |
| Idle | Listening | TalkButton tapped, permission already granted |
| Requesting permission | Listening | Permission granted |
| Requesting permission | Microphone denied | Permission refused |
| Requesting permission | Idle | "Not now"; prompt dismissed |
| Listening | Understanding | Speech ended (endpoint detected or TalkButton tapped) |
| Listening | Could not hear | 12s silence; empty transcript |
| Listening | Paused | Wait |
| Listening | Idle | Stop |
| Listening | Reconnecting | Network lost |
| Listening | Listening | Say it again (guidance repeated slowly) |
| Understanding | Speaking | Engine `ask` / `answer_question` / `route` / `repeat_slowly` / `go_back` |
| Understanding | Waiting for action | Engine `confirm` |
| Understanding | Beyond me | Engine `refuse`; route `unsupported` |
| Understanding | Handing to a person | Engine `handoff` |
| Understanding | Completed | Engine `complete` |
| Understanding | Could not hear | Transcript unusable |
| Understanding | No connection | Request failed after retries; >15s elapsed |
| Understanding | Reconnecting | Network lost |
| Understanding | Paused | Wait |
| Understanding | Idle | Stop |
| Speaking | Listening | Utterance ends with a reply expected; barge-in; TalkButton tapped |
| Speaking | Completed | Utterance ends, task complete |
| Speaking | Idle | Utterance ends, nothing pending; Stop |
| Speaking | Cannot speak aloud | Audio output fails |
| Speaking | Paused | Wait |
| Speaking | Speaking | Say it again (restarts slowly) |
| Waiting for action | Speaking | Explicit yes, or explicit no |
| Waiting for action | Paused | Wait |
| Waiting for action | Idle | Stop |
| Waiting for action | Waiting for action | Silence, vagueness, "hmm" — **no change, no timeout** |
| Paused | Listening | TalkButton tapped; "carry on" |
| Paused | Idle | Stop — task saved as a Continue item |
| Paused | Interrupted | App backgrounded while paused |
| Interrupted | Listening | Carry on |
| Interrupted | Idle | Leave it for now; Stop — task saved as a Continue item |
| Reconnecting | Listening / Speaking / Waiting for action | Connection restored — returns to the originating state |
| Reconnecting | No connection | 3 retries exhausted (~10s) |
| Reconnecting | Paused | Wait |
| Reconnecting | Idle | Stop |
| Microphone denied | Listening | "Type instead" (typed mode); permission granted in settings |
| Microphone denied | Idle | "Not now" |
| Could not hear | Listening | Try again; Type instead |
| Could not hear | Handing to a person | Third consecutive failure, elder accepts the offer |
| Could not hear | Idle | Stop |
| Cannot speak aloud | Speaking | "Try sound again" succeeds |
| Cannot speak aloud | Listening | Task continues in text; a reply is expected |
| Cannot speak aloud | Idle | Stop |
| No connection | Reconnecting | Try again |
| No connection | Idle | Stop for now — task saved as a Continue item |
| No connection | Speaking | Connection returns **and** the elder taps Carry on |
| Beyond me | Handing to a person | "Yes, ask Ravi" |
| Beyond me | Listening | "No, something else" |
| Beyond me | Idle | Stop |
| Handing to a person | Completed | Message sent |
| Handing to a person | Listening | "Not now" |
| Handing to a person | Idle | Stop |
| Completed | Idle | "Back to start"; TalkButton for a new task |
| **Any active state** | **Idle** | **Stop — always, immediately, without confirmation** |
| **Any active state** | **Paused** | **Wait — always** |
| **Any active state** | **Interrupted** | **App backgrounded, screen locked, incoming call** |

### 4.1 Universal invariants

1. **Stop always works, from every active state, in one tap, with no confirmation.**
2. **No state auto-advances on a timer** except the two protective transitions: Listening → Could not
   hear at 12s, and Understanding → No connection at 15s. Neither is displayed as a countdown, and
   neither ends a task — both offer a next step.
3. **Waiting for action has no timeout at all.** A consequential confirmation waits forever.
4. **Every failure state offers a concrete action**: Try again, Type instead, Carry on, Ask Ravi, or
   Stop. No failure state is a dead end.
5. **No state blames the elder.** Every failure sentence has Thuna as its subject.

---

## 5. Copy summary

Every elder-facing line in one place, for translation review.

| State | Primary line |
|---|---|
| Idle | What would you like to do? |
| Requesting permission | Your phone will ask if Thuna can use the microphone. Please choose Allow. |
| Listening | Go ahead — I'm listening. |
| Understanding | Let me see. |
| Speaking | *(the utterance)* |
| Waiting for action | Shall I place this order? |
| Paused | Take your time. I'll be here. |
| Interrupted | We stopped partway. Shall we carry on? |
| Reconnecting | I've lost the connection for a moment. I'm trying again. |
| Microphone denied | I can't use the microphone just now. |
| Could not hear | I couldn't hear that clearly. |
| Cannot speak aloud | *(the utterance, shown)* — I can't speak aloud right now, so I'll write it. |
| No connection | I can't reach the internet just now. |
| Beyond me | That one's beyond me. |
| Handing to a person | Shall I ask Ravi to help with this? → Ravi's picking this up. |
| Completed | That's ordered. |

### 5.1 Words this screen never uses

error · failed · invalid · unsupported operation · session · timeout · retry limit · permission
denied · unavailable · sorry, I didn't understand you · you didn't · you must · please ensure ·
try again later · something went wrong · oops · are you still there · well done · great job ·
escalated · agent · ticket

---

## 6. Implementation notes for GLM

1. **One state machine, sixteen states, in one module.** Not a set of booleans on `/talk`. The
   transition table in §4 is the specification; an unlisted transition is a defect.
2. **Map engine values to UI states in one place.** `EngineAction` and `ScreenState['status']` from
   `lib/types.ts` enter through a single exhaustive mapping function. No component receives an engine
   value directly (R4). Make the mapping exhaustive at the type level so a new `EngineAction` fails
   to compile rather than falling through to a raw string.
3. **`VoiceStatePanel` renders the frame, not the state.** Status line, guidance, detail region and
   the TalkButton slot are always mounted; only their contents change. This is what keeps controls
   from moving between states.
4. **The recovery bar is rendered by the `/talk` layout,** not by individual states, with per-state
   `disabled` flags. A state must not be able to unmount it. Add a development assertion that the bar
   is mounted whenever the state is in the active set.
5. **Reserve the guidance region at three lines** (126px at 26px / 1.6) so a longer Malayalam sentence
   does not push the TalkButton down. Text is vertically top-aligned within the reserved box.
6. **All motion behind one `prefers-reduced-motion` block** that *substitutes* stepped indicators, per
   §3.3, §3.4 and §3.9. Never `animation: none` alone.
7. **Barge-in must be real.** The microphone opens before TTS finishes so an elder speaking over
   Thuna is heard, per `DAILY_LIFE_BRIEF.md` §5.5.
8. **The 12s and 15s thresholds are constants in one place,** never rendered, never counted down on
   screen.
9. **Typed mode is a full alternative input,** not a fallback modal. Every state must render
   correctly with audio input unavailable, and **Type instead** is reachable from the header on any
   state at 16px.
10. **Never render a `SimulatedReceipt` without its label.** The completion component should have no
    code path that omits it.
11. **Never claim family contact that did not occur** — phase 2 of §3.15 renders only after the send
    succeeds. Failure renders the retry copy.
12. **Screen reader and TTS must not double up.** Detect an active screen reader and suppress TTS,
    routing the utterance to an `aria-live` region instead.
13. **Suppress browser back on `/talk/confirm` only.** Every other state keeps normal back behaviour.
14. **Persist enough to resume.** Paused, Interrupted and No connection all promise the task is
    preserved; that promise must hold across an app restart via the session store, or the copy is a
    lie.

---

## Related

- `docs/mobile-ui/MOBILE_PRODUCT_PRINCIPLES.md` — R4, R6b, R10, R11, R12, R13, R14, R15, R16, §4 dignity test
- `docs/mobile-ui/INFORMATION_ARCHITECTURE.md` — §4.2 `/talk/confirm`, `/talk/handoff`; §6 route-to-state mapping
- `docs/mobile-ui/ELDER_HOME_SCREEN.md` — where a stopped task reappears as Continue
- `docs/companion/COMPANION_PRODUCT_MODEL.md` — §5 dignity constraints, §6 interaction shape
- `docs/companion/CHECKIN_CONVERSATION_POLICY.md` — §7 language, §8 ending, §9 absolute prohibitions
- `docs/companion/HUMAN_ATTENTION_BRIDGE.md` — §1 handoff is a success state
- `docs/companion/INTERRUPTION_AND_RESUME.md` — resumption semantics
- `docs/companion/PENDING_LOOPS.md` — what a stopped task becomes
- `docs/companion/MINIMUM_DISCLOSURE_POLICY.md` — what the handoff message may contain
- `docs/companion/PRIORITY_AND_DEDUP_POLICY.md` — §2 P0 unresolved outcomes
- `lib/types.ts` — `EngineAction`, `ScreenState`, `ParsedCommand.recoveryType`, `SimulatedReceipt`
- `COMPONENT_SPECIFICATION.md` — `TalkButton`, `VoiceStatePanel`, `GuidanceCard` (owned elsewhere)
