# Thuna — Error and Recovery States

> Design specification. **Changes no production code.**
>
> An elder who hits an error in a normal app is left holding a sentence they cannot act on. That is
> the moment they close the app and stop using it, and it is also the moment they are most likely to
> call the number in the scam SMS instead.
>
> So every failure state in Thuna obeys one rule:
>
> > **Every failure offers a human-readable next action, and never blames the elder.**

---

## 1. The three governing rules

### 1.1 No codes, ever

Nothing on any elder-facing screen shows an HTTP status, a stack trace, an `AdapterErrorClass`, a
symbolic code, a correlation id, a JSON body, a provider hostname, or the word "error".

| Never shown | Shown instead |
|---|---|
| `Error 503: upstream_error` | "Swiggy is not answering just now." |
| `STT_TIMEOUT` | "I could not hear that clearly." |
| `NetworkError: Failed to fetch` | "The connection was interrupted." |
| `attemptId: 7f3a-…` | (nothing — logged, never displayed) |
| `blocked_by_policy` | see `SAFETY_AND_CONFIRMATION_SCREENS.md` Part A |
| "Something went wrong" | never — it names nothing and offers nothing |

`AdapterError.message` is the **one** exception, and only when `class === 'domain_failure'`. That
is the provider's own sentence about its own domain ("This restaurant is closed"), it is meant for a
customer, and `food-commerce-adapter.ts` requires it be surfaced as given. Every other class gets a
Thuna sentence.

### 1.2 Never blame the elder

The subject of the failure sentence is Thuna or the world. It is never "you".

| Never | Always |
|---|---|
| "You spoke too quietly." | "I could not hear that clearly." |
| "You are offline." | "The connection was interrupted." |
| "Invalid input." | "I did not follow that." |
| "You took too long." | "I have been holding this a while." |
| "Permission denied by user." | "I do not have permission to use the microphone yet." |
| "Unsupported request." | "That is not something I can do yet." |
| "You tried too many times." | "This is not working for me today." |

The microphone case is worth stating explicitly, because the technically accurate sentence really is
"the user denied permission" — and writing that on screen turns an OS dialog the elder half-read
three weeks ago into a personal accusation. Thuna owns the problem.

### 1.3 Three actions, one of them an exit

Every error screen offers between two and three actions, and the last is always a way out. The
shapes are fixed:

> `[ Try again ]  [ Type instead ]  [ Stop ]`

> `[ Continue from where we stopped ]  [ Start again ]  [ Stop ]`

`Stop` never asks "are you sure". `Stop` always returns to Home, quietly.

---

## 2. The error screen layout

Errors are **not** full takeovers by default — a takeover for a mis-heard word would be
disproportionate and would make the app feel fragile. Two tiers:

| Tier | Used for | Presentation |
|---|---|---|
| **Inline** | Recoverable, in-flow: mis-heard speech, a single retry, no state loss | `ErrorRecovery` renders in place of the current guidance block, on `--bg-cream`, keeping the header and bottom nav. TalkButton stays. |
| **Takeover** | State was lost or an outcome is uncertain: session expired, confirmation expired, provider outcome UNKNOWN, repeated failure, offline mid-task | Full screen, `--bg-cream`, no bottom nav, TalkButton hidden. Distinct from the confirmation takeover, which is `--teal-100`. |

```
INLINE (390 wide, sits where guidance was)
┌──────────────────────────────────────┐
│  ◐  I could not hear that clearly.   │  24px / 600 / charcoal-900
│     16 gap                           │  mark 32×32 amber, optional
│  ┌────────────────────────────────┐  │
│  │        Try again               │  │  56px, teal-900 fill
│  └────────────────────────────────┘  │
│              12 gap                  │
│  ┌────────────────────────────────┐  │
│  │        Type instead            │  │  56px, teal-100 fill
│  └────────────────────────────────┘  │
│              12 gap                  │
│  ┌────────────────────────────────┐  │
│  │        Stop                    │  │  56px, transparent + border
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘

TAKEOVER (390 × 844)
┌──────────────────────────────────────┐
│ ▓▓▓ safe-area top ▓▓▓                │
│  48 gap                              │
│  ◐  40×40 amber                      │
│  16 gap                              │
│  The connection was interrupted.     │  28px / 700, ≤3 lines @360
│  20 gap                              │
│  Nothing was lost. We were at the    │  20px / 400, line-height 1.6
│  delivery address.                   │
│  ─────────── flexible ───────────    │
│  [ Continue from where we stopped ]  │  60px, teal-900
│  [ Start again ]                     │  56px, teal-100
│  [ Stop ]                            │  56px, bordered
│  24 + safe-area bottom               │
└──────────────────────────────────────┘
```

Every error screen speaks its heading and body aloud, once, at the elder's configured pace — except
when the failure is TTS itself (§4).

---

## 3. Input failures

### 3.1 Microphone permission not granted

Tier: **takeover** on first encounter, **inline** thereafter. This is a blocker, not a hiccup, but
it is also the single most common first-run stumble.

> **I do not have permission to use the microphone yet.**
>
> You can turn it on in Settings, or type to me instead — both work just as well.
>
> `[ Open Settings ]  [ Type instead ]  [ Stop ]`

| Action | Behaviour | State |
|---|---|---|
| Open Settings | Deep-links to the OS app-settings page. On return, permission is re-checked silently; if granted, the elder lands back in the task with progress intact and no celebration. | preserved |
| Type instead | Switches the session to text input permanently for this session. The TalkButton is replaced by a text field with a 56px Send. Everything else is identical. | preserved |
| Stop | Home. | discarded, nothing was in flight |

Thuna never re-asks for the microphone unprompted, never nags on subsequent launches, and never
degrades functionality to pressure a grant. Typing is a first-class mode, not a penalty box.

### 3.2 Microphone unavailable (in use, hardware failure, no device)

Tier: **inline**.

> **I cannot reach the microphone just now.**
>
> Another app may be using it — a phone call, perhaps.
>
> `[ Try again ]  [ Type instead ]  [ Stop ]`

The "a phone call, perhaps" line is deliberate: during a scam call, the mic *is* busy, and this
sentence quietly tells the elder something true about their own device. `Try again` re-requests the
stream. Progress preserved throughout.

### 3.3 Speech recognition failed — nothing heard, too short, or unintelligible

Tier: **inline**. The canonical pattern.

> **I could not hear that clearly.**
>
> `[ Try again ]  [ Type instead ]  [ Stop ]`

| Action | Behaviour | State |
|---|---|---|
| Try again | Re-opens the mic on the **same** step. The prompt for that step is re-spoken, shortened on the second attempt. | preserved fully |
| Type instead | Text field for this answer only; voice remains available for the next step. | preserved fully |
| Stop | Home. | current `PreparedAction` → `CANCELLED` / `ELDER_DECLINED` |

**No body copy on the first occurrence.** The heading is the whole message. Adding "please speak
clearly into the microphone" would be an instruction to a person who did nothing wrong.

Second consecutive failure adds one neutral, non-corrective line:

> It may be noisy where you are.

Third consecutive failure → §8.

### 3.4 Speech recognised but not understood

Distinct from 3.3: the words came through, the intent did not. Tier: **inline**.

> **I did not follow that.**
>
> I am listening for the delivery address.
>
> `[ Try again ]  [ Type instead ]  [ Stop ]`

The second line restates **what Thuna is waiting for**, which is the actual repair. It is generated
from the current step, not from the model's interpretation of what the elder said, and it never
quotes the elder back at them ("I heard 'meesa' — did you mean...?"), because a misquote reads as
mockery.

### 3.5 Speech output failed (TTS unavailable)

Tier: **inline**, and silent by construction — the failure means nothing can be spoken.

> **I cannot speak just now, but I can still show you everything.**
>
> `[ Continue ]  [ Stop ]`

All guidance continues in text at full size. This degradation is safe **because** of
`ACCESSIBILITY_SPECIFICATION.md` §8: every spoken string in Thuna already exists as visible text, so
losing TTS loses nothing but the audio channel. No feature is behind speech alone.

If TTS recovers mid-session it resumes at the next step without announcing itself.

---

## 4. Network failures

### 4.1 Offline — the banner

`OfflineBanner` is a persistent strip, not a dialog. It never interrupts, never auto-dismisses, and
never appears over a control.

```
┌──────────────────────────────────────┐  390 wide
│ ◐  No connection just now. I will     │  full width, 56px tall (2 lines @360)
│    keep everything and carry on when  │  --amber-500 4px left border,
│    it is back.                        │  --teal-100 fill, 18px charcoal-900
└──────────────────────────────────────┘  sits directly under the header,
                                          pushes content down (never overlays)
```

| Property | Specification |
|---|---|
| Position | Below the header, above content. Pushes layout; does not overlay. |
| Persistence | Visible for the whole offline period. No auto-hide, no timer. |
| Dismissible | No. It is state, not a notification. |
| On reconnect | Replaced for 4 seconds by a `--green-600`-bordered strip: "Back online." Then removed with a 200ms fade (instant under `prefers-reduced-motion`). |
| Screen reader | `role="status"`, `aria-live="polite"`. Announced once per state change, never repeated. |
| Malayalam | Wraps to 2 lines at 360px; the strip grows to 72px rather than clipping. |

**What still works offline**, listed on the Home screen while offline so the elder is not guessing:
reading existing reminders and events, hearing today's brief, adding a reminder or calendar entry
(local store, `source: 'LOCAL'`), and reviewing a saved receipt. What does not: anything with a
provider. Attempting one gives §4.2.

### 4.2 Offline when a provider action is attempted

Tier: **takeover**.

> **I cannot reach Swiggy without a connection.**
>
> I have kept your order exactly as it is. We can finish when the connection is back.
>
> `[ Try again ]  [ Keep this for later ]  [ Stop ]`

| Action | Behaviour | State |
|---|---|---|
| Try again | One connectivity check, then one retry. No auto-retry loop, no exponential-backoff spinner the elder watches. | preserved |
| Keep this for later | `PreparedAction` stays open until its `expiresAt`. Home shows a "Waiting to finish" row. When connectivity returns, Thuna offers to resume **once** — it does not resume by itself, because the price may have moved and the elder must see B6. | preserved |
| Stop | `CANCELLED` / `ELDER_DECLINED`. "Nothing was ordered." | discarded |

### 4.3 Connection interrupted mid-task

Tier: **takeover**. The second canonical pattern.

> **The connection was interrupted.**
>
> Nothing was lost. We were at the delivery address.
>
> `[ Continue from where we stopped ]  [ Start again ]  [ Stop ]`

| Action | Behaviour | State |
|---|---|---|
| Continue from where we stopped | Restores the session at the exact step, with all collected fields (`INTERRUPTION_AND_RESUME.md` §2). | fully preserved |
| Start again | Discards collected fields, keeps the task. New `PreparedAction`. | task kept, answers cleared |
| Stop | Home. | discarded |

**"Nothing was lost" leads, and the second sentence names the actual step.** Both are load-bearing:
the first answers the fear, the second proves the claim. A generic "your progress has been saved" is
a promise; "we were at the delivery address" is evidence.

If the interruption happened **after** a provider write was attempted, this screen does not apply —
that is §5.3 (UNKNOWN), and the difference matters enormously.

---

## 5. Provider failures

### 5.1 Provider unavailable (`upstream_timeout`, `upstream_error`, `rate_limited`)

Tier: **takeover**. No write was attempted or the failure was definitively pre-write.

> **Swiggy is not answering just now.**
>
> Nothing was ordered. This usually clears up in a few minutes.
>
> `[ Try again ]  [ Keep this for later ]  [ Stop ]`

Retries follow the adapter's own policy (backoff, max 5, honour `Retry-After`) and happen **behind**
a single calm `LoadingState`. The elder sees one "Let me try that again." — never a retry counter,
never "attempt 3 of 5", never a growing wait figure.

For `rate_limited` specifically, the body becomes: "Swiggy has asked me to wait a moment. Nothing
was ordered." The `Retry-After` value is honoured silently; it is never displayed as a countdown
(same reasoning as `SAFETY_AND_CONFIRMATION_SCREENS.md` §B5).

### 5.2 Provider refused definitively (`REJECTED`, `domain_failure`)

Tier: **takeover**. This is a clean, speakable outcome.

> **That did not go through.**
>
> Udupi Cafe says: "This restaurant is closed."
>
> Nothing was charged.
>
> `[ Try something else ]  [ Ask Sree ]  [ Stop ]`

| Rule | Specification |
|---|---|
| Provider text | Rendered verbatim in quotation marks, attributed by name. Never paraphrased, never merged into Thuna's own voice. |
| "Nothing was charged" | Mandatory on every REJECTED screen. It is the elder's first question. |
| Missing provider text | The attribution line is omitted entirely. Thuna does not invent a reason. |
| `auth` class | Body becomes: "I need to sign in to Swiggy again before I can order." Primary becomes `[ Sign in ]`. Never "token expired", never "401". |
| `bad_input` class | Never surfaced as an error. A malformed request is Thuna's bug; it presents as "I could not put that order together." with `[ Start again ] [ Ask Sree ] [ Stop ]`, and logs at full detail on our side. |

### 5.3 Ambiguous result — the `UNKNOWN` case

The most important screen in this file. `food-commerce-adapter.ts` is explicit: on UNKNOWN the order
**may or may not exist**, and the caller must reconcile before telling the user anything.
`prepared-action.ts` note 4 goes further: `EXECUTED` + `UNKNOWN` is **not a speakable state**.

**Phase 1 — while checking.** Tier: takeover. Duration: `recommendedWaitMs` (Swiggy 2–5s) plus the
reconcile call.

> **Let me check whether that went through.**
>
> This takes a moment. Please do not close this.
>
> `[ ]` — **no buttons at all**

| Prohibited in phase 1 | Why |
|---|---|
| Any checkmark or cross | Both are claims. Neither is known. |
| `--green-600` or `--red-700` anywhere | Colour is a claim too. |
| An order number | It may not exist. |
| "Your order has been placed" | The exact sentence this state exists to prevent. |
| "Something went wrong" | Also a claim, and the wrong one. |
| A `Try again` button | **The dangerous one.** Retrying an ambiguous placement double-charges. There is no retry affordance in phase 1 and none appears if the elder taps around. |
| A timer or progress percentage | We do not know how long. |

The indicator is a calm indeterminate pulse in `--teal-900` at 1.2s period, replaced by a static
`--teal-100` bar under `prefers-reduced-motion`. Back gesture disabled. If the elder force-closes
the app, reconciliation resumes on next launch and the result is shown then.

**Phase 2 — resolution.**

| `ReconciliationOutcome` | Screen | Copy |
|---|---|---|
| `{ resolved: true, status: 'PLACED' }` | `CompletionReceipt` | "That is ordered. Rs 203 from Udupi Cafe, coming to Home." No mention of the wobble. |
| `{ resolved: true, status: 'NOT_PLACED' }` | `ErrorRecovery` | "That did not go through. Nothing was charged." `[ Try again ]  [ Stop ]` — retry is safe now, and only now. |
| `{ resolved: false, reason }` | `ErrorRecovery`, takeover | see below |

Unresolved:

> **I could not tell whether that order went through.**
>
> I do not want to guess, and I do not want you charged twice. Sree can check in a moment.
>
> `[ Ask Sree ]  [ Show me Swiggy's number ]  [ Stop ]`

| Action | Behaviour |
|---|---|
| Ask Sree | Handoff. Message: "Appa would like someone to check whether an order went through." (`MINIMUM_DISCLOSURE_POLICY.md` — the amount is not sent; the elder tells him himself.) |
| Show me Swiggy's number | Displays `FoodAdapterCapabilities.cancellationInstructions` (Swiggy: 080-67466729) at 24px with a 56px call control. This is a **printed, provider-published** number, which is the one kind of number Thuna is happy to surface. |
| Stop | Home. The action remains visible on Home as "Not yet confirmed" until reconciled or expired. It does **not** silently disappear. |

`{ resolved: false }` never auto-retries. `food-commerce-adapter.ts`: escalate to a human, do not
retry.

---

## 6. State and session failures

### 6.1 Session expired

Tier: **takeover**. The elder left, came back, and `PreparedAction.expiresAt` has passed.

> **I did not want to guess after so long.**
>
> Nothing was ordered. Shall we do this again? It will be quick — I remember what you wanted.
>
> `[ Start again ]  [ Not now ]`

| Rule | Specification |
|---|---|
| Never say | "Your session has expired", "you took too long", "timed out" |
| The reason given | Thuna's caution, not the elder's delay. This is true: the reason really is that stale state cannot be trusted. |
| What is preserved | The **intent** (the usual order, the biller, the recipient) is remembered per `INTERRUPTION_AND_RESUME.md`. The **snapshot** is not. `Start again` re-reads authoritatively and lands on a fresh confirmation, pre-filled. |
| What is discarded | `ActionConfirmation`, `stateRevision`, any capability token. |

### 6.2 Confirmation expired

Handled at the confirmation screen, not as an error — `SAFETY_AND_CONFIRMATION_SCREENS.md` §B5. The
screen remains, `Yes, continue` disables with the word "waiting", Thuna re-reads, and either
re-enables silently or shows the "this changed while you were deciding" screen. **Nothing is thrown
away and no error is shown**, because nothing failed: a confirmation getting old is expected
behaviour, not a fault.

An error appears only if the **re-read itself** fails, which routes to §5.1 with the body: "I could
not check the price again. Nothing was ordered."

### 6.3 Unsupported request

Not an error in the elder's world — it is Thuna admitting a limit. Tier: **inline**.

> **That is not something I can do yet.**
>
> I can order food, book a ride, keep your reminders and calendar, and pass a message to your family.
>
> `[ Try one of those ]  [ Ask Sree ]  [ Stop ]`

| Rule | Specification |
|---|---|
| Always list what Thuna **can** do | A bare refusal leaves the elder with no next move and a sense that they asked wrongly. |
| Never say | "Invalid command", "I don't understand that request", "unsupported" |
| Never imply a phrasing error | The limit is Thuna's, and "yet" says so. |
| Never promise a future version | No "coming soon", no "we're working on it". |
| Capability list | Generated from registered adapters, in the elder's words, max 5 items, ordered by how often this elder uses them. |

A capability that exists but is **unavailable to this elder** (`providerIsOfficial` undefined for
RIDES, permission not granted) is not this screen — it is
`SAFETY_AND_CONFIRMATION_SCREENS.md` §B3.6: "I cannot book this ride myself. Shall I ask Sree?"

### 6.4 Resume from where we stopped

Shown when a session with preserved state is re-entered — after a call, a crash, a reconnect, or a
next-day launch inside the expiry window.

```
┌──────────────────────────────────────┐  390 × 844
│  48 gap                              │
│  Shall we finish what we started?    │  28px / 700
│  20 gap                              │
│ ┌──────────────────────────────────┐ │  cream card, radius 24, 20 pad
│ │  Ordering from Udupi Cafe        │ │  20px / 600
│ │  ────────────────────────────    │ │
│ │  ✓ Masala Dosa ×2                │ │  18px, --green-600 tick + text
│ │  ✓ Filter Coffee ×1              │ │  (icon AND text — never colour alone)
│ │  ✓ Delivering to Home            │ │
│ │  ○ Still to choose: how to pay   │ │  18px, charcoal-600, hollow mark
│ └──────────────────────────────────┘ │
│  24 gap                              │
│  [ Continue from where we stopped ]  │  60px, teal-900
│  [ Start again ]                     │  56px, teal-100
│  [ Stop ]                            │  56px, bordered
└──────────────────────────────────────┘
```

> **Shall we finish what we started?**
>
> `[ Continue from where we stopped ]  [ Start again ]  [ Stop ]`

| Rule | Specification |
|---|---|
| Show what was preserved, itemised | "Progress saved" is a claim. A list is proof, and it lets the elder catch a wrong answer before continuing. |
| Ticks carry an icon **and** a word | `ACCESSIBILITY_SPECIFICATION.md` §9 — never state by colour alone. |
| Never show a stale total | Prices are re-read on continue. If it moved, the elder meets the B6 change screen — which is the correct place for that news. |
| Never resume automatically | Even with everything preserved, the elder re-enters deliberately. Auto-resume into a payment after an interruption is how money moves without attention. |
| Confirmed actions | A `CONFIRMED` action is **not** resumable past its confirmation expiry — `INTERRUPTION_AND_RESUME.md` §5. It re-presents for confirmation. |

---

## 7. Loading states

Not errors, but the same discipline, because a bad loading state manufactures errors — an elder who
sees nothing happening taps again.

| Wait | Presentation |
|---|---|
| < 400ms | Nothing. No flash of a spinner. |
| 400ms – 3s | Calm indeterminate indicator, `--teal-900`, 1.2s period, plus one sentence naming the activity: "Getting the menu." |
| > 3s | The sentence updates **once** to set expectations: "Swiggy is taking a moment." No percentage, no counter, no second update. |
| > 15s | Treat as §5.1 provider unavailable. Do not spin indefinitely. |
| `prefers-reduced-motion` | Static `--teal-100` bar with the same sentence. No pulse. |

Loading sentences always name what is happening in the elder's terms — "Getting the menu", "Checking
the price", "Sending your message" — never "Loading…", never "Please wait", never a bare spinner.

---

## 8. Repeated failure — the third try

The most important behavioural rule in this file. Three consecutive failures of the same kind in the
same session means the situation is not going to be fixed by another attempt, and continuing to
offer `Try again` is how an elder is left alone with a broken thing.

**On the third consecutive failure of the same kind, Thuna stops offering to retry and offers a
person.** Tier: **takeover**.

> **This is not working for me today.**
>
> I am sorry — it is not you. Sree could sort this out in a minute, or we can leave it and try
> later.
>
> `[ Ask Sree ]  [ Try later ]  [ Stop ]`

| Rule | Specification |
|---|---|
| "It is not you" | Explicit, once, only here. After three failures an elder has usually concluded the opposite, and only a direct sentence corrects it. |
| Counting | Consecutive failures of the **same kind** within one session. A success resets the counter. Never persisted across sessions — `MEMORY_MODEL.md` §9 prohibits counts and trends about the person. |
| `Try again` is gone | It must not be the primary. Offering a fourth attempt after three failures is the app failing to notice. |
| Handoff message | "Appa would like a hand with something on his phone." Nothing about failures, nothing about attempts. (`MINIMUM_DISCLOSURE_POLICY.md`) |
| Try later | Preserves the `PreparedAction` until `expiresAt`, surfaces it on Home as "Waiting to finish", and Thuna does not raise it again unprompted. |
| Never | "You have exceeded the maximum number of attempts." A person is not rate-limited. |

Two failure kinds escalate on the **second** occurrence rather than the third, because a third
attempt is itself harmful: a provider write ending `UNKNOWN` twice (double-charge risk), and any
`auth` failure (repeated auth attempts can lock the elder's provider account).

---

## 9. The full matrix

| # | Failure | Tier | Heading | Actions | State preserved |
|---|---|---|---|---|---|
| 3.1 | Mic permission denied | Takeover→inline | I do not have permission to use the microphone yet. | Open Settings / Type instead / Stop | Yes |
| 3.2 | Mic unavailable | Inline | I cannot reach the microphone just now. | Try again / Type instead / Stop | Yes |
| 3.3 | STT failed | Inline | I could not hear that clearly. | Try again / Type instead / Stop | Yes |
| 3.4 | Not understood | Inline | I did not follow that. | Try again / Type instead / Stop | Yes |
| 3.5 | TTS failed | Inline | I cannot speak just now, but I can still show you everything. | Continue / Stop | Yes |
| 4.1 | Offline | Banner | No connection just now. I will keep everything and carry on when it is back. | — | Yes |
| 4.2 | Offline at provider call | Takeover | I cannot reach Swiggy without a connection. | Try again / Keep this for later / Stop | Yes |
| 4.3 | Interrupted mid-task | Takeover | The connection was interrupted. | Continue from where we stopped / Start again / Stop | Yes |
| 5.1 | Provider unavailable | Takeover | Swiggy is not answering just now. | Try again / Keep this for later / Stop | Yes |
| 5.2 | Provider REJECTED | Takeover | That did not go through. | Try something else / Ask Sree / Stop | Intent only |
| 5.3a | UNKNOWN, checking | Takeover | Let me check whether that went through. | **none** | Yes, locked |
| 5.3b | UNKNOWN, unresolved | Takeover | I could not tell whether that order went through. | Ask Sree / Show me Swiggy's number / Stop | Yes, held open |
| 6.1 | Session expired | Takeover | I did not want to guess after so long. | Start again / Not now | Intent only |
| 6.2 | Confirmation expired | (confirmation screen) | Let me check this is still the same. | — | Yes |
| 6.3 | Unsupported | Inline | That is not something I can do yet. | Try one of those / Ask Sree / Stop | n/a |
| 6.4 | Resume | Takeover | Shall we finish what we started? | Continue from where we stopped / Start again / Stop | Yes, itemised |
| 8 | Third failure | Takeover | This is not working for me today. | Ask Sree / Try later / Stop | Held to expiry |

---

## 10. Implementation notes for GLM

1. **One `ErrorRecovery` component, one table.** Keyed by a Thuna-internal reason id (`STT_FAILED`,
   `PROVIDER_UNREACHABLE`, `OUTCOME_UNKNOWN`, …) yielding `{ tier, heading, body?, actions[],
   preservesState }`. Never map an `AdapterErrorClass` straight to a string at the call site.
2. **The mapping layer is where safety lives.** `AdapterErrorClass` → reason id happens in one
   function. `domain_failure` is the only class that passes `error.message` through, and even then
   it is quoted and attributed, never interpolated into a Thuna sentence.
3. **Assert no codes reach the UI.** A dev-mode assertion that error props contain no digits-plus-
   colon, no `_`-cased identifiers, and no `Error:` prefix will catch this class of regression cheaply.
4. **`UNKNOWN` gets its own component**, not a variant of the receipt with a flag. The prop that
   would let it render a checkmark should not exist. This is the same reasoning as
   `prepared-action.ts` note 2 on `confirmed: boolean`.
5. **No retry button in the UNKNOWN checking state.** Not disabled — absent. A disabled button is a
   button an elder taps repeatedly.
6. **Failure counter is session-scoped, in memory, per reason id.** Never persisted, never in the
   memory store, never in analytics. It resets on success and dies with the session.
7. **Preserve before you render.** State snapshot happens on the failure path before the error
   component mounts, so "Continue from where we stopped" can never be offered when it would not work.
   If preservation failed, offer `Start again` only — never an option that will disappoint.
8. **`OfflineBanner` is layout, not overlay.** It must push content down. An overlay banner covers
   the top of a scrolled list, which at 200% text is the whole first item.
9. **Errors that fire during a safety refusal do not replace it.** The `SafetyWarning` outranks
   every screen in this file. If the network dies while a refusal is showing, the refusal stays.
10. **Test with the network off, the mic revoked, and the provider stubbed to return each of PLACED,
    REJECTED, UNKNOWN-resolved-placed, UNKNOWN-resolved-not-placed, and UNKNOWN-unresolved.** Those
    five provider paths are the ones that decide whether an elder gets charged twice.
11. **Snapshot every string against the forbidden list**: "you spoke", "you took", "you tried",
    "invalid", "failed to", "unsupported", "error", "oops", "something went wrong", any digit
    followed by a colon.

---

## Related

- `docs/mobile-ui/SAFETY_AND_CONFIRMATION_SCREENS.md` — refusals, confirmation, expiry, B6 change screen
- `docs/mobile-ui/ACCESSIBILITY_SPECIFICATION.md` — reduced motion, live regions, focus on error
- `docs/mobile-ui/MALAYALAM_CONTENT_GUIDE.md` — `ml-IN` strings for every error above
- `docs/companion/INTERRUPTION_AND_RESUME.md` — what is preserved, and resuming a CONFIRMED action
- `docs/companion/TRUSTED_PERSON_HANDOFF.md` — what "Ask Sree" opens
- `docs/companion/MINIMUM_DISCLOSURE_POLICY.md` — what a handoff message may say about a failure
- `docs/contracts/food-commerce-adapter.ts` — `AdapterErrorClass`, `PlacementStatus`, reconciliation
- `docs/contracts/prepared-action.ts` — `CancellationReason`, `ActionOutcome`, non-speakable UNKNOWN
- `VISUAL_DESIGN_SYSTEM.md` — `ErrorRecovery`, `OfflineBanner`, `LoadingState` props
