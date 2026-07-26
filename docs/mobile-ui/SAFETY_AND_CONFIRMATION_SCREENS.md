# Thuna — Safety and Confirmation Screens

> Design specification. **Changes no production code.**
>
> Two screen families that share one property: they are the moments where Thuna stops being a
> helper and becomes a **checkpoint**. Everything else in the app is guidance the elder can flow
> past. These two must not be flowed past.
>
> Part A is what Thuna shows when it refuses. Part B is what Thuna shows when it is about to do
> something consequential. They are specified together because they share a layout skeleton, a
> takeover behaviour, and one design rule: **a checkpoint screen never looks like a step screen.**

---

## 0. Scope and inherited decisions

| From | What is inherited, not restated |
|---|---|
| `docs/companion/DIGITAL_SAFETY_POLICY.md` | The PAUSE → EXPLAIN → REFUSE → OFFER A PERSON beat order; the exact refusal wording; the "never shame the elder" rule; what is recorded |
| `docs/companion/RISK_SIGNAL_MODEL.md` | The signal ids, their severities, the combination rules, "no continue-anyway path for CRITICAL/HIGH" |
| `docs/contracts/prepared-action.ts` | `PreparedActionState`, `AuthoritativeSnapshot`, `ActionConfirmation`, `boundRevision`, `expiresAt`, `CancellationReason` |
| `docs/contracts/food-commerce-adapter.ts` | `ConfirmationToken.cartRevision`, `PlacementStatus` = PLACED / REJECTED / UNKNOWN, `FoodAdapterCapabilities.isSimulated` |
| `VISUAL_DESIGN_SYSTEM.md` (other subagent) | All colour tokens, type scale, spacing scale, radii, touch sizes, component prop specs |

This file specifies **screens**: what appears, in what order, at what size, with what exact words,
and what each control does to the underlying state machine. It references component names
(`SafetyWarning`, `ConfirmationScreen`, `CompletionReceipt`, `ErrorRecovery`) without defining
their props.

**Viewports.** 390×844 is the primary design target. 360×800 is the narrow constraint that governs
line-wrapping decisions. 430×932 gets the same layout with larger gaps, never more content.

---

# Part A — Safety screens

## A1. The pattern

Every safety screen in Thuna is the same three-band screen. Learning it once is the point.

```
┌──────────────────────────────────────┐ 390 × 844
│ ▓▓▓▓▓ safe-area top inset ▓▓▓▓▓      │  env(safe-area-inset-top)
├──────────────────────────────────────┤
│                                      │  32 gap
│   ◐  (calm mark, 40×40, amber)       │  ← BAND 1: the pause
│                                      │  16 gap
│   Please pause                       │  28px, weight 700, charcoal-900
│                                      │  24 gap
├──────────────────────────────────────┤
│   Never share your OTP, PIN or CVV.  │  ← BAND 2: the reason
│   A real bank will never ask for it. │  20px, weight 400, line-height 1.6
│                                      │     max 2 sentences, max 4 lines @360
│                                      │  40 gap
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │  ← BAND 3: the three actions
│  │      I understand              │  │  56px tall, teal-900 fill, cream text
│  └────────────────────────────────┘  │
│              12 gap                  │
│  ┌────────────────────────────────┐  │
│  │      Ask my trusted person     │  │  56px tall, teal-100 fill, teal-900 text
│  └────────────────────────────────┘  │
│              12 gap                  │
│  ┌────────────────────────────────┐  │
│  │      Stop this task            │  │  56px tall, transparent, 1.5px charcoal
│  └────────────────────────────────┘  │     border, charcoal-900 text
│                                      │
│   ▓▓▓ safe-area bottom inset ▓▓▓     │  min 24 + env(safe-area-inset-bottom)
└──────────────────────────────────────┘
```

The canonical copy, in full:

> **Please pause**
>
> Never share your OTP, PIN or CVV.
>
> `[ I understand ]  [ Ask my trusted person ]  [ Stop this task ]`

### A1.1 Layout rules

| Rule | Value | Why |
|---|---|---|
| Bottom nav | **Absent.** The safety screen is a full takeover. | A tab bar says "this is one place among several". It is not. |
| TalkButton | **Hidden** while a CRITICAL/HIGH warning is showing | Nothing said into the mic can resolve this screen. Leaving the button visible invites the elder to argue with it, or to be coached into speaking a code. |
| Buttons | Stacked vertically, full width minus 24 margin each side, never side-by-side | Side-by-side buttons at 360px force 2-line Malayalam labels into ~150px. Also: a horizontal row invites a mis-tap between adjacent targets. |
| Button order | Never reordered between risk types | Muscle memory is safety. The third slot is always the exit. |
| Dismiss | No back gesture, no swipe-down, no tap-outside, no auto-dismiss | `RISK_SIGNAL_MODEL.md` §2: CRITICAL/HIGH terminate the flow; there is no click-past. |
| Scroll | Body band scrolls if content exceeds; the three actions stay pinned above the safe area | The exit must never be below the fold. |
| Reading order | Mark → heading → body → buttons top to bottom. Focus lands on the heading, not a button. | Prevents a reflex tap resolving a screen the elder has not read. |

### A1.2 The calm mark

A single 40×40 outline glyph in `--amber-500`: a circle with a horizontal pause bar. It is not a
warning triangle, not an exclamation mark, not a shield, not a padlock, not a red octagon.

**Prohibited absolutely:** flashing, pulsing, colour cycling, shaking, sirens, alert tones, haptic
buzz patterns longer than a single soft tap, full-bleed red, skull/thief/hook/mask imagery, or any
countdown on a safety screen. A scam is already generating alarm; Thuna's contribution is calm.

The screen may play **one** soft single-note chime at 0.4 amplitude on appearance, and speaks the
heading and body aloud in the elder's language at their configured pace. Nothing repeats.

---

## A2. The colour decision

> **Amber attention is the default. Restrained red is reserved and rare.**

`--red-700` in Thuna is not "danger", it is "irreversible". The reasoning: if every refusal is red,
red means "Thuna is refusing again" and stops carrying information. Worse, sustained red framing
teaches an elder that using their phone is frightening — which is a real harm, and one that pushes
people toward asking the scammer for help instead.

| Colour | Used for | Screens |
|---|---|---|
| `--amber-500` mark + `--teal-100` surface | Attention. Something must be understood before continuing. | All `MEDIUM` and `HIGH` signals, and most `CRITICAL` ones |
| `--red-700` mark only, on the same cream surface | An irreversible disclosure or a device takeover is in progress **right now** | `CREDENTIAL_REQUEST` when a code is actively being spoken; `REMOTE_ACCESS_INSTALL`; `SCREEN_SHARING_REQUEST`; accessibility-permission escalation |

Even in the red cases: **the mark is red, the surface is not.** No red fill, no red background, no
red text body. Body copy stays `--charcoal-900` at all severities. The difference between amber and
red on this screen is roughly the difference between a hand on your arm and a hand on your
shoulder — both calm, one firmer.

---

## A3. Per-risk-type specification

Copy below is the English master. `MALAYALAM_CONTENT_GUIDE.md` §9 carries the `ml-IN` strings that
are actually spoken and displayed for the Appa persona. Wording derives from
`DIGITAL_SAFETY_POLICY.md` §4, tightened for a 360px screen — the spoken version may be the longer
policy wording; the on-screen version is the shorter one below. **Both are templates. Neither is
model-generated.**

### A3.1 `CREDENTIAL_REQUEST` — OTP / PIN / CVV — CRITICAL

Mark `--red-700`. Heading and both sentences are also spoken.

> **Please pause**
>
> Never share your OTP, PIN or CVV — not with me, not with them.
> That code is the key to your money, and a real bank will never ask for it.
>
> `[ I understand ]  [ Ask my trusted person ]  [ Stop this task ]`

| Button | Label | Action |
|---|---|---|
| Primary | I understand | Dismisses the screen. Returns to **Home**, not to the interrupted task. The task is `CANCELLED` with `BLOCKED_BY_POLICY`. Records `RiskRefusalRecord{ signal: CREDENTIAL_REQUEST, handoffOffered: true, handoffAccepted: false }`. |
| Secondary | Ask my trusted person | Opens the handoff screen (`TRUSTED_PERSON_HANDOFF.md` §4), pre-filled with the minimum-disclosure line "Appa would like some help with something on his phone." Elder hears the message before it is sent. Sets `handoffAccepted: true`. |
| Tertiary | Stop this task | Ends the session, returns to Home, screen goes quiet. No follow-up prompt, no "are you sure?", no re-engagement for 10 minutes. |

**Note:** "I understand" does **not** resume the task. There is no path from this screen back into
the flow that triggered it. If the elder wants to continue with something else they start it fresh
from Home. This is the `RISK_SIGNAL_MODEL.md` §2 "no continue-anyway" rule made physical.

If the input that fired the signal contained a code, it was already redacted at capture
(`DIGITAL_SAFETY_POLICY.md` §8.4). Nothing on this screen displays it, and no screen anywhere
echoes it back "to check".

### A3.2 Wrong payment recipient — HIGH

Fires when a prepared payment or transfer targets a recipient that does not match the elder's
stated intent, is newly added, or differs from the usual recipient for this biller. The
authoritative recipient is shown; the intended one is shown beside it.

Mark `--amber-500`.

> **Please pause**
>
> This payment is going to **Rajesh K.**, not to the electricity board.
> Money sent to the wrong person usually cannot be brought back.
>
> `[ Check who this is ]  [ Ask my trusted person ]  [ Stop this task ]`

| Button | Label | Action |
|---|---|---|
| Primary | Check who this is | Returns to the **ConfirmationScreen** with the recipient row focused and outlined in amber. The `PreparedAction` stays `PRESENTED_TO_ELDER`; it is not confirmed and not cancelled. |
| Secondary | Ask my trusted person | Handoff. `PreparedAction` → `CANCELLED` / `ELDER_CORRECTED` only after the elder confirms they want to hand off; otherwise it is left open for resume. |
| Tertiary | Stop this task | `PreparedAction` → `CANCELLED` / `ELDER_DECLINED`. Nothing was sent. Screen says so: "Nothing was sent." |

This is the one safety screen with a **return-to-review** primary rather than a dismiss, because
here the elder genuinely may have meant it, and the failure mode of blocking a legitimate payment
to a person is real.

### A3.3 `SUSPICIOUS_LINK` — HIGH

Mark `--amber-500`. The link itself is displayed **only** as its bare host, in `--charcoal-900` at
18px, never as a tappable element and never in full.

> **Please pause**
>
> I cannot tell where this link really goes.
> Links sent this way are often used to take money, so it is safer not to open it.
>
> `[ I understand ]  [ Ask my trusted person ]  [ Stop this task ]`

| Button | Action |
|---|---|
| I understand | Home. The link is not opened, not previewed, not fetched — `RISK_SIGNAL_MODEL.md` §3.7. |
| Ask my trusted person | Handoff. Message: "Appa would like someone to look at a message he received." The link is **not** forwarded (`MINIMUM_DISCLOSURE_POLICY.md`); the trusted person is asked to call, not sent the payload. |
| Stop this task | End session, Home. |

**Never says the link is safe.** There is no "looks fine to me" state and no green outcome on this
screen. Absence of signal is not evidence.

### A3.4 `REMOTE_ACCESS_INSTALL` — CRITICAL

Mark `--red-700`. This is the case where Thuna's advice extends past the current moment, because
the harm survives the call.

> **Please pause**
>
> That app would let someone else see and control this phone, including your bank app.
> No real bank or company ever asks for it. It is safer not to install it, even after the call ends.
>
> `[ I understand ]  [ Ask my trusted person ]  [ Stop this task ]`

| Button | Action |
|---|---|
| I understand | Home. Flow terminated. |
| Ask my trusted person | Handoff, **pressed harder**: the button sits in the primary slot styling (`--teal-900` fill) while "I understand" takes secondary styling. This is the only reordering-by-emphasis permitted, and the label order is still unchanged. |
| Stop this task | End session, Home. |

If the app is already installed, the screen adds one line and one link-styled row:

> This app is on the phone now. Sree can help you remove it safely.

No uninstall instructions are given on-screen. `SCREEN_CONTEXT_ASSISTANCE.md` forbids
tap-instructions without visible evidence, and a takeover in progress is precisely when a wrong
instruction is most costly.

### A3.5 `UNKNOWN_QR` — HIGH

Mark `--amber-500`. The QR image is **not** re-rendered on this screen.

> **Please pause**
>
> Scanning a code like this sends money out of your account. It never brings money in,
> even when someone says it is a refund.
>
> `[ I understand ]  [ Ask my trusted person ]  [ Stop this task ]`

The second sentence is the highest-value line in this entire file — it is a durable piece of
understanding the elder keeps after Thuna is closed. It is spoken slowly, and it is the one place a
safety screen may offer a **"Say that again"** affordance: a 44px text-only control below the body,
which re-speaks the body copy. It does not re-speak on a loop and it does not add a fourth
decision.

### A3.6 `URGENT_TRANSFER_PRESSURE` — HIGH

Mark `--amber-500`. Notably: this screen has **no timer, no countdown, no progress bar** of any
kind. Introducing time pressure onto a screen about time pressure would be an unforced error.

> **Please pause**
>
> Nothing here has to happen this minute — that hurry is part of how this works.
> Real offices do not ask for money in the next ten minutes.
>
> `[ I understand ]  [ Ask my trusted person ]  [ Stop this task ]`

| Button | Action |
|---|---|
| I understand | Home. The payment flow is `CANCELLED` / `BLOCKED_BY_POLICY`. |
| Ask my trusted person | Handoff. Message: "Appa would like some help with a payment." |
| Stop this task | End session, Home. |

### A3.7 `SECRECY_REQUEST` — CRITICAL, the highest-signal case

This screen gets the most careful treatment in the package, for the reason
`RISK_SIGNAL_MODEL.md` §3.2 gives: secrecy is the instruction specifically designed to make the
elder decline the handoff offer that every other refusal ends with. It attacks the mitigation
directly, so the mitigation has to be presented differently here.

Mark `--amber-500` — deliberately **not** red. A red screen at this moment reads as an accusation,
and the elder is at that instant holding a request from someone they may like, trust, or feel
sorry for. Red says "you are being robbed". Amber says "let us slow down". Only one of those gets
the elder to press the second button.

> **Please pause**
>
> When someone asks you to keep money matters from your family, that is the clearest sign
> there is that something is wrong. Honest people never need that.
>
> Nothing has gone wrong yet. Talking to Sree now is the safe thing to do.
>
> `[ Talk to Sree ]  [ I understand ]  [ Stop this task ]`

Four things are specific to this screen:

1. **Button order is inverted.** The handoff is the primary action in the first slot, `--teal-900`
   filled. This is the only screen in the package where the first slot is not "I understand", and
   the inversion is the whole point: the attacker has just instructed the elder not to press this
   button.
2. **The trusted person is named**, not described. "Talk to Sree", not "Ask my trusted person". A
   named person is a real relationship; a category is a system feature that is easier to decline.
3. **The third sentence exists only here.** "Nothing has gone wrong yet" is a factual reassurance
   that removes the reason the elder might avoid telling their family — the fear of having to admit
   to a mistake. There is no mistake yet, and saying so plainly makes the handoff cheap.
4. **Declining is not challenged.** If the elder presses "I understand", the screen closes to Home.
   Thuna does **not** ask again, does not say "are you sure?", does not send a notification anyway,
   and does not escalate. `TRUSTED_PERSON_HANDOFF.md` §3: pressing harder means arranging the offer
   better, never overriding consent. An elder who cannot decline safely does not have a companion.

| Button | Action |
|---|---|
| Talk to Sree | Handoff screen. Message: "Appa would like a call when you have a moment." No mention of secrecy, no mention of a scam — `MINIMUM_DISCLOSURE_POLICY.md`. |
| I understand | Home. `handoffAccepted: false`. No re-prompt, no follow-up, nothing sent to anyone. |
| Stop this task | End session, Home, quiet. |

### A3.8 Summary table

| Signal | Severity | Mark colour | Slot 1 | Slot 2 | Slot 3 | Returns to |
|---|---|---|---|---|---|---|
| `CREDENTIAL_REQUEST` | CRITICAL | `--red-700` | I understand | Ask my trusted person | Stop this task | Home |
| Wrong recipient | HIGH | `--amber-500` | Check who this is | Ask my trusted person | Stop this task | ConfirmationScreen |
| `SUSPICIOUS_LINK` | HIGH | `--amber-500` | I understand | Ask my trusted person | Stop this task | Home |
| `REMOTE_ACCESS_INSTALL` | CRITICAL | `--red-700` | I understand | **Ask my trusted person** (emphasised) | Stop this task | Home |
| `UNKNOWN_QR` | HIGH | `--amber-500` | I understand | Ask my trusted person | Stop this task | Home |
| `URGENT_TRANSFER_PRESSURE` | HIGH | `--amber-500` | I understand | Ask my trusted person | Stop this task | Home |
| `SECRECY_REQUEST` | CRITICAL | `--amber-500` | **Talk to Sree** | I understand | Stop this task | Home |

---

## A4. Copy we will never use

`DIGITAL_SAFETY_POLICY.md` §5 states the rule. This is the screen-level enforcement list. Every
line below is realistic — each is the kind of string that gets written by a well-meaning developer
under deadline, and each must fail review.

| Never on screen | Why it fails | What we say instead |
|---|---|---|
| "⚠️ SCAM ALERT!" | Shouting. Alarm as a design element. | "Please pause" |
| "You almost gave away your PIN!" | Frames the elder as the near-cause | "Never share your OTP, PIN or CVV." |
| "You should be more careful." | Correcting a competent adult | (nothing — no advice about the elder's conduct) |
| "Don't fall for this!" | Second person, imperative, implies they were falling | "It is safer not to open it." |
| "This is a common scam — you didn't recognise it?" | Implies a deficit | "Links sent this way are often used to take money." |
| "Good thing I was here!" | Positions Thuna as a minder | (nothing) |
| "Well done for stopping!" | Congratulating an adult for ordinary judgement | (nothing) |
| "I'll let Sree know you nearly fell for something." | The most humiliating string Thuna could produce | "Appa would like a call when you have a moment." |
| "Are you sure? This is very risky." | A second challenge after a decision | (nothing — the decision stands) |
| "Blocked for your protection." | Custodial. Thuna is not a guardian. | "It is safer not to." |
| "Suspicious activity detected on your account" | Reproduces the scammer's own register | "I cannot tell where this link really goes." |
| "Error: BLOCKED_BY_POLICY" | A code shown to a person | see `ERROR_AND_RECOVERY_STATES.md` §1 |
| "3rd warning this month" | Behavioural analytics, prohibited by `MEMORY_MODEL.md` §9 | (nothing — no counts exist) |
| "You have been targeted by fraudsters." | Makes the elder a victim in their own UI | "That message is a trick." |

**The governing sentence:** *the message is at fault, never the person.* Every string on a safety
screen must survive being read aloud to the elder by their own son without either of them feeling
embarrassed. If it would not survive that, it does not ship.

---

# Part B — Confirmation screens

## B1. Why confirmation is a full-screen takeover

The `PreparedAction` contract makes one claim checkable: *the elder agreed to **this** state.*
`ActionConfirmation.boundRevision` must equal `authoritative.revision` at execute time or the
execution is refused. That guarantee is worth nothing if the elder did not actually look at the
state they were agreeing to.

So confirmation is not an inline card, not a bottom sheet, not a dialog over the task, and not a
toast with an undo. It is a distinct screen that replaces everything.

### B1.1 How it is made visually distinct — exactly

| Property | Normal guidance screen | ConfirmationScreen |
|---|---|---|
| Surface | `--bg-cream` | `--teal-100`, full bleed, edge to edge |
| Bottom nav | Present, 64px | **Absent** |
| TalkButton | Present, 76–96px, pinned bottom-centre | **Absent** — see B1.2 |
| Back gesture | Enabled | **Disabled**; "Cancel" is the only exit |
| Heading size | 24px / weight 600 | **28px / weight 700** |
| Body size | 18px | **20px** |
| Total amount | n/a | **32px / weight 700**, its own row, `--charcoal-900` |
| Card radius | 16 | 24 on the summary card, sitting on the teal surface |
| Entry animation | 180ms fade | 220ms slide-up from bottom, or instant under `prefers-reduced-motion` |
| Status bar | default | matches `--teal-100` |
| Auto-dismiss | n/a | **never** |
| Scroll behaviour | whole page | summary card scrolls; the three buttons are pinned |

Four independent signals change at once — surface colour, chrome disappearing, type weight
jumping, and the motion of arrival. Any one alone could be missed by an elder with low vision or
low colour discrimination. Together they are unmissable without relying on colour at all, which
satisfies `ACCESSIBILITY_SPECIFICATION.md` §9.

### B1.2 Why the TalkButton is hidden here

Because a voice "yes" arriving mid-readback is ambiguous: was it an answer, a backchannel, or the
person on the phone talking? `ActionConfirmation.elderResponseText` is stored verbatim and is
auditable, so it must be unambiguous. The confirmation is a **deliberate tap**.

The elder can still **hear** the whole readback — it is spoken automatically on arrival, and a
"Say that again" 52px control sits under the summary card. Speech is available for input again as
soon as the confirmation resolves.

---

## B2. The confirmation layout

```
┌──────────────────────────────────────┐ 390 × 844   surface: --teal-100
│ ▓▓▓ safe-area top ▓▓▓                │
├──────────────────────────────────────┤
│  24 pad                              │
│  Shall I place this order?           │  28px / 700 / charcoal-900, ≤2 lines
│  24 gap                              │
│ ┌──────────────────────────────────┐ │  ← summary card, --bg-cream, radius 24
│ │ 20 pad                           │ │     scrolls internally if needed
│ │ SIMULATED — nothing will be      │ │  ← B4 status strip (when simulated)
│ │ ordered and no money will move   │ │
│ │ ────────────────────────────     │ │
│ │ From    Udupi Cafe               │ │  label 16px charcoal-600 /
│ │ 12 gap                           │ │  value 20px charcoal-900
│ │ To      Home                     │ │  ← recipient / address
│ │ 12 gap                           │ │
│ │ ────────────────────────────     │ │
│ │ Masala Dosa            ×2   Rs 120 │ │  ← authoritative.lines[]
│ │ Filter Coffee          ×1    Rs 40 │ │
│ │ ────────────────────────────     │ │
│ │ Delivery                     Rs 25 │ │  ← authoritative.charges[]
│ │ Taxes                        Rs 18 │ │
│ │ ────────────────────────────     │ │
│ │ Total                       Rs 203 │ │  ← authoritative.total, 32px / 700
│ │ 12 gap                           │ │
│ │ Paid by  Cash on delivery        │ │
│ │ 20 pad                           │ │
│ └──────────────────────────────────┘ │
│  12 gap                              │
│      ↻ Say that again                │  52px, text-only, teal-900
│  16 gap                              │
│  I will ask again if anything        │  16px charcoal-600, only when
│  changes before this is placed.      │  an expiry applies (B5)
│  24 gap                              │
│ ┌──────────────────────────────────┐ │
│ │        Yes, continue             │ │  60px, --teal-900 fill, cream text, 20px/600
│ └──────────────────────────────────┘ │
│  12 gap                              │
│ ┌──────────────────────────────────┐ │
│ │        Change something          │ │  56px, --bg-cream fill, teal-900 text
│ └──────────────────────────────────┘ │
│  12 gap                              │
│ ┌──────────────────────────────────┐ │
│ │        Cancel                    │ │  56px, transparent, 1.5px charcoal border
│ └──────────────────────────────────┘ │
│  24 + safe-area bottom               │
└──────────────────────────────────────┘
```

The exact button row, everywhere in the package:

> `[ Yes, continue ]  [ Change something ]  [ Cancel ]`

At 360px the card's label column is 96px and the value column takes the rest; item rows put
quantity and amount right-aligned and let the item name wrap to a second line rather than
truncating. **No `text-overflow: ellipsis` on any row of this card.** A truncated line item is a
confirmation the elder did not actually see.

### B2.1 What every confirmation must show

Non-negotiable, in this order, for every capability:

1. **The question**, in the elder's framing — from `PreparedAction.summary`.
2. **Real-or-SIMULATED status** (B4), when simulated — before anything else in the card.
3. **Who / where it lands** — `authoritative.target.label`, plus `displayText` when it is an
   address. Session-scoped, never persisted (`prepared-action.ts` rule 5).
4. **The items** — `authoritative.lines[]`, every one, no "and 3 more".
5. **The charges** — `authoritative.charges[]`, each labelled. Estimates say "about".
6. **The total** — `authoritative.total`, rendered largest on the screen. Never locally summed.
   If the provider gave no total, the row is absent; Thuna does not compute one to fill the gap.
7. **How it is paid**, where money moves.
8. **Expiry**, when one applies (B5).

### B2.2 The three buttons

| Button | State transition | Behaviour |
|---|---|---|
| Yes, continue | `PRESENTED_TO_ELDER` → `CONFIRMED` | Mints `ActionConfirmation` with `boundRevision = authoritative.revision`, `readbackText` = the text just spoken, `elderResponseText` = `"[tapped: Yes, continue]"`, `confirmedVia = 'APP'`. Then re-reads the authoritative snapshot before execute (B6). |
| Change something | `PRESENTED_TO_ELDER` → `CANCELLED` / `ELDER_CORRECTED` | Returns to the task with the summary card's rows tappable. Editing produces a **new** `PreparedAction`; the old one is cancelled, never mutated (`prepared-action.ts` note 6). |
| Cancel | `PRESENTED_TO_ELDER` → `CANCELLED` / `ELDER_DECLINED` | Immediate. No "are you sure?". Goes to a one-line acknowledgement: "Nothing was ordered." then Home. |

**Cancel is never behind a confirmation of its own.** Doubling back on a decline is how an elder
ends up ordering something they refused.

---

## B3. Per-capability specification

The skeleton is identical. Only the rows change. That uniformity is the feature
(`prepared-action.ts`, "WHAT THIS IS").

### B3.1 Order (`FOOD` / `GROCERY`) — risk `MEDIUM`

> **Shall I place this order?**

| Row | Source |
|---|---|
| From | `authoritative.providerDisplayName` + restaurant/store, via `lines`/`extras` |
| To | `target.label` ("Home") + `target.displayText` (the address, session-only) |
| Items | every `ActionLine`, with quantity |
| Charges | every `ActionCharge`; `isEstimate: true` renders "about Rs 25" |
| Total | `authoritative.total` — provider-reported |
| Paid by | `ConfirmationToken.confirmedPaymentMethod` |
| Expiry | shown, per B5 |

Cancellation caveat: when `FoodAdapterCapabilities.supportsCancellation === false`, the screen adds
one 16px line under the total, in `--charcoal-600`, **before** the elder confirms:

> Once this is placed, I cannot cancel it here. Sree or Swiggy's helpline can.

Saying this before rather than after is the difference between informing and apologising.

### B3.2 Payment (`BILLS`) — risk `HIGH`

> **Shall I pay this bill?**

| Row | Source |
|---|---|
| Bill | `lines[0].label` — "Electricity bill — June" |
| To | `target.label` — "BESCOM account ending 4821". Account is masked to last 4. |
| Amount | `authoritative.total`, 32px |
| Charges | late fee etc., each labelled |
| Paid from | payment instrument, masked |
| Expiry | shown |

Adds one row above the buttons, `--amber-500` left border 4px, cream fill:

> A payment cannot be undone once it is sent.

That is the whole warning. It does not say "be careful", does not ask "are you sure", and does not
add a fourth button. Then the recipient-mismatch check in A3.2 runs before `CONFIRMED` is reached.

### B3.3 Family request (`MESSAGING`) — risk `MEDIUM`

> **Shall I send this to Sree?**

The message body is shown **verbatim** in a cream card at 20px — exactly the bytes that will be
sent, per `MINIMUM_DISCLOSURE_POLICY.md` §"the elder hears the message first". No summary, no
paraphrase, no "and details".

| Row | Source |
|---|---|
| To | `target.label` — "Sree" |
| Message | verbatim body, wrapping freely, never truncated |
| Total | **absent** — no money |
| Expiry | not shown; a message has no provider state to drift |

Buttons unchanged. "Change something" opens the message for editing, which produces a new
`PreparedAction`.

### B3.4 Event creation (`CALENDAR`) — risk `LOW`

> **Shall I add this to your calendar?**

| Row | Source |
|---|---|
| What | event title |
| When | day, date, time — spelled out: "Saturday, 2 August, 11:00 in the morning" |
| Where | place |
| Who | people, when known |
| Total | absent |
| Expiry | absent — local store, `source: 'LOCAL'`, no drift |

Risk `LOW` and reversible, but it still gets a full confirmation screen, because a second ritual
for "small" things is a second thing to learn and the first thing to be exploited.

### B3.5 Reminder creation — risk `LOW`

> **Shall I remind you about this?**

| Row | Source |
|---|---|
| What | reminder text, verbatim |
| When | "Every morning at nine" / "Tomorrow at four in the afternoon" |
| Until | end date, when set |
| Total | absent |

Repeating reminders additionally show a plain-language repetition line and, for medicine, a line
naming what Thuna will **not** do:

> I will remind you. I will not tell anyone whether you took it.

(`MINIMUM_DISCLOSURE_POLICY.md`; adherence is not reported.)

### B3.6 Prepared provider action (generic `PreparedAction`) — risk from the contract

The fallback rendering for any capability, driven purely by the contract fields. Heading from
`summary`. Rows from `lines` and `charges`. Total from `total`. Target from `target`.

Additional handling:

- **`totalIsEstimate: true`** → the total row reads "about Rs 240" and gains a 16px sub-line: "The
  final amount may be a little different." Rides always take this path.
- **`findings[]` with `severity: 'ADVISORY'`** → each `spokenExplanation` renders as its own
  `--amber-500`-bordered row above the buttons, in the elder's terms. Never the `code`.
- **`findings[]` with `severity: 'BLOCKING'`** → this screen never renders. A blocking finding means
  the action never reached `VALIDATED`; the elder sees the `spokenExplanation` as guidance with a
  "Change something" affordance, not a confirmation.
- **`ExecutionGate.providerIsOfficial` undefined for `RIDES`** → confirmation is not offered at all.
  The elder sees "I cannot book this ride myself. Shall I ask Sree?" This is a refusal, not an
  error, and it belongs to this file rather than the error file.

---

## B4. Real or SIMULATED

`FoodAdapterCapabilities.isSimulated` and `AuthoritativeSnapshot.source` govern this. It is stated
in words, on the confirmation and again on the receipt.

**Simulated** — a full-width strip at the top of the summary card, `--amber-500` 4px left border,
cream fill, 18px `--charcoal-900`, spoken aloud as part of the readback:

> **This is a practice run.** Nothing will be ordered and no money will move.

Not the word "SIMULATED" alone, not a badge, not a dev-flavoured pill. "Practice run" is a phrase
an elder parses instantly; "simulated" is a phrase from our side of the screen. The internal label
stays `SIMULATED` in logs and contracts.

**Real** — no strip. Real is the unmarked case, because a "REAL" badge would make its absence the
signal and absence is exactly what a rendering bug produces. Instead, the money itself is the
signal: the total is the largest thing on the screen, and simulated runs are the ones carrying the
extra sentence.

The same rule holds on `CompletionReceipt`: a simulated completion says "This was a practice run.
Nothing was ordered." at the top, in the same words as the confirmation.

---

## B5. Expiry, without pressure

`PreparedAction.expiresAt` and `ActionConfirmation.expiresAt` are real and short. But a ticking
countdown on a screen where an elder is deciding about money is functionally the same design as
`URGENT_TRANSFER_PRESSURE`, which is the thing this whole package exists to defend against. We
will not build a pressure timer to enforce a safety property.

**Rules:**

| Rule | Specification |
|---|---|
| No seconds | Never display seconds. Never display a ticking number. |
| No progress bar | No shrinking bar, no arc, no colour drift toward red. |
| No countdown sound | Nothing audible relates to expiry. |
| Static sentence | While `now < expiresAt − 60s`, the sentence under the card is static and reassuring, not temporal: **"I will ask again if anything changes before this is placed."** |
| Approaching expiry | In the final 60s, that line changes **once**, without animation, to: **"I have been holding this a while. I will check the price again before placing it."** |
| At expiry | The confirmation does not vanish. The screen stays, `Yes, continue` becomes disabled (`--charcoal-600` on `--teal-100`, 3.1:1, plus the word "waiting"), and a `--teal-100` row appears: **"Let me check this is still the same."** Thuna re-reads the authoritative snapshot automatically. |
| Outcome of re-read | Identical revision → the screen simply re-enables, no message. Different revision → the B6 "this changed" screen. Read failed → `ERROR_AND_RECOVERY_STATES.md` §5. |
| Hard expiry | If `PreparedAction.expiresAt` passes, the action is `CANCELLED` / `EXPIRED` and the elder sees: **"I did not want to guess after so long. Shall we do this again?"** with `[ Start again ]  [ Not now ]`. Nothing was placed, and the screen says so. |

The elder is never punished for taking time. Taking time is the correct behaviour and the product
should not have a mechanic that discourages it.

---

## B6. "This changed while you were deciding"

This screen encodes the central safety property of both contracts:
`ActionConfirmation.boundRevision !== authoritative.revision` ⇒ the confirmation is void.

Triggered whenever a re-read before execute returns a different revision — a price change, an item
going out of stock, a fare requote, a delivery fee change, a slot disappearing.

```
┌──────────────────────────────────────┐  surface: --teal-100
│  ◐  (amber, 40×40)                   │
│  This changed while you were         │  28px / 700, wraps to 2 lines @360
│  deciding                            │
│  20 gap                              │
│  The total is now Rs 228, not Rs 203.    │  20px / 400
│  I have not placed anything.         │  ← the load-bearing sentence
│  24 gap                              │
│ ┌──────────────────────────────────┐ │
│ │  Before        Now               │ │  cream card, radius 24
│ │  Rs 203          Rs 228              │ │  24px / 700, changed value amber-underlined
│ │  ─────────────────────────       │ │
│ │  Delivery Rs 25  Delivery Rs 50      │ │  only the rows that differ,
│ │                                  │ │  18px, unchanged rows omitted
│ └──────────────────────────────────┘ │
│  24 gap                              │
│ ┌──────────────────────────────────┐ │
│ │      Yes, continue at Rs 228       │ │  60px, teal-900 — new amount IN the label
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │      Change something            │ │  56px
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │      Cancel                      │ │  56px
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

> **This changed while you were deciding**
>
> The total is now Rs 228, not Rs 203. I have not placed anything.
>
> `[ Yes, continue at Rs 228 ]  [ Change something ]  [ Cancel ]`

**Specification points:**

1. **"I have not placed anything" is mandatory** and appears before the comparison. The elder's
   first question at a screen like this is always "did it go through anyway?" Answer it first.
2. **The primary button carries the new amount in its label.** Confirming a changed total by tapping
   a button that just says "Yes, continue" reproduces exactly the ambiguity `boundRevision` exists
   to eliminate. The label is the readback.
3. **Only changed rows appear** in the comparison. A full re-listing buries the delta.
4. **No blame framing.** Not "your confirmation expired", not "you took too long", not "session
   timed out". The provider changed its price; that is the provider's doing.
5. **A fresh confirmation is minted on tap** — new token, new `boundRevision`, new `readbackText`.
   The old `ActionConfirmation` is dead and is never reused.
6. **If it changed twice**, the screen shows again with the newest figures. It does not escalate its
   tone, does not add urgency, and does not offer "confirm anyway at any price". After a third
   change in one session, a `--charcoal-600` line is added: "Prices are moving about just now. We
   can also try later." with `[ Try later ]` joining as a fourth, tertiary control.
7. **Item disappeared** rather than reprice: same screen, body reads "Filter Coffee is not available
   just now. The total is Rs 163 without it." and the primary becomes `[ Yes, continue without it ]`.
8. **Everything gone** (cart emptied, restaurant closed): this is not a change screen, it is a
   failure — `ERROR_AND_RECOVERY_STATES.md` §6.

---

## B7. After confirmation: the three outcomes

`PlacementStatus` is three-state and the UI must be three-state. Detailed error copy is in
`ERROR_AND_RECOVERY_STATES.md`; here is the mapping so the confirmation flow is complete.

| `outcome.status` | Screen | Copy opening | Speakable? |
|---|---|---|---|
| `PLACED` | `CompletionReceipt` | "That is ordered. Rs 203 from Udupi Cafe, coming to Home." | Yes |
| `REJECTED` | `ErrorRecovery` | "That did not go through. Nothing was charged." + `error.message` when `class: 'domain_failure'` | Yes |
| `UNKNOWN` | `LoadingState`, then resolution | "Let me check whether that went through." | **No** — nothing definitive |

The `UNKNOWN` screen is the one that matters most and the one most likely to be built wrong. Per
`prepared-action.ts` note 4, `EXECUTED` + `UNKNOWN` **has no speakable template** other than "let me
check". Concretely, while `state === 'EXECUTED' && outcome.status === 'UNKNOWN'`:

- No checkmark, no cross, no green, no red, no receipt, no order number.
- No "Try again" button. Retrying an ambiguous placement is how an elder gets charged twice.
- The screen shows a calm indeterminate indicator and one sentence, and waits for
  `reconcile()` (`recommendedWaitMs`, Swiggy 2–5s).
- On `{ resolved: true, status: 'PLACED' }` → receipt. On `{ resolved: true, status: 'NOT_PLACED' }`
  → "That did not go through. Nothing was charged." On `{ resolved: false }` → **do not guess**:
  "I could not tell whether that went through. Sree can check for you." with
  `[ Ask Sree ]  [ Show me the helpline ]  [ Stop ]`.

---

## 7. Implementation notes for GLM

1. **Two components, many configurations.** `SafetyWarning` and `ConfirmationScreen` are each one
   component driven by data. Adding a risk type is adding a row to a table keyed by signal id, in
   the same spirit as `RISK_SIGNALS` in `RISK_SIGNAL_MODEL.md` §6.1. Do not fork a component per
   risk type; the identical layout across risks is the safety feature.
2. **Copy lives in a keyed table beside `lib/guidance.ts`**, keyed by signal id / capability, with
   an `ml-IN` column. Never model-generated at render time. The model may pace and translate; it
   may not author a refusal or a confirmation string.
3. **Render the confirmation from `authoritative` only.** If the component receives a locally
   computed total, that is a bug — the prop should not exist. Line items, charges, and total all
   come from the same snapshot object, and the total is never `lines.reduce(...)`.
4. **Bind the tap to the revision.** The `Yes, continue` handler must capture
   `authoritative.revision` at render, and the mint must use that captured value. If the component
   re-renders with a new snapshot between paint and tap, the tap is void — show B6.
5. **Re-read before execute, always.** Two reads is the design, not an optimisation target
   (`prepared-action.ts` note 3).
6. **The confirmation screen owns no timer that changes a number.** One `setTimeout` at
   `expiresAt − 60s` and one at `expiresAt`. No `setInterval`. If you find yourself formatting
   `mm:ss`, B5 has been violated.
7. **No `confirmed: boolean` anywhere in component state.** Derive from
   `state === 'CONFIRMED' && confirmation.boundRevision === stateRevision && now < expiresAt`.
8. **`SafetyWarning` must render with no model available.** Same test discipline as
   `DIGITAL_SAFETY_POLICY.md` §8.6: if the safety screen needs a network call to produce its words,
   the architecture is wrong.
9. **No `Alert`, no `confirm()`, no toast, no snackbar** for anything in this file. Native alerts
   cannot be styled, cannot be sized for 200% text, cannot be screen-reader-labelled to our spec,
   and auto-dismiss.
10. **Screen-reader announcement.** `SafetyWarning` and `ConfirmationScreen` mount with
    `role="dialog"` `aria-modal="true"`, focus moving to the heading, and a focus trap. See
    `ACCESSIBILITY_SPECIFICATION.md` §5.
11. **Test the copy, not just the logic.** Snapshot every string in A3 and A4 against a forbidden-
    phrase list ("you should", "you almost", "be careful", "well done", "alert", "warning!",
    "detected"). A copy regression here is a product failure, not a cosmetic one.

---

## Related

- `docs/companion/DIGITAL_SAFETY_POLICY.md` — the beats, the wording, the shame prohibition
- `docs/companion/RISK_SIGNAL_MODEL.md` — signals, severities, combination rules
- `docs/companion/TRUSTED_PERSON_HANDOFF.md` — what "Ask my trusted person" opens
- `docs/companion/MINIMUM_DISCLOSURE_POLICY.md` — what the handoff message may contain
- `docs/contracts/prepared-action.ts` — lifecycle, snapshot, confirmation, gate, outcome
- `docs/contracts/food-commerce-adapter.ts` — `ConfirmationToken`, `PlacementStatus`, reconciliation
- `docs/mobile-ui/ERROR_AND_RECOVERY_STATES.md` — REJECTED, UNKNOWN, expiry failure, offline
- `docs/mobile-ui/ACCESSIBILITY_SPECIFICATION.md` — touch, contrast, focus, reduced motion
- `docs/mobile-ui/MALAYALAM_CONTENT_GUIDE.md` — `ml-IN` strings for every screen above
- `VISUAL_DESIGN_SYSTEM.md` — tokens, type scale, component props
