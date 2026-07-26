# Thuna — Mobile Information Architecture

> Design specification. **Changes no production code.**
>
> Three destinations. Talk is the centre. Everything else is reached at the moment it is needed.

---

## 1. The shape of the product

Thuna is a **voice product with a screen**, not an app with a voice feature. The architecture must
make that true structurally, not just visually: the screen exists to anchor, confirm and offer, while
the conversation does the work.

That yields one governing constraint:

> **There are exactly three primary destinations: Home, Talk, Reminders. Talk is dominant and
> central. Nothing else is ever promoted to the navigation bar.**

Every feature request that arrives as "can we add a tab for…" is answered by §4 — it becomes a
contextual surface reached from the place where it is relevant, not a fourth destination.

---

## 2. The three destinations

| # | Destination | Route | The one question it answers | Dominant element |
|---|---|---|---|---|
| 1 | **Home** | `/` | *What now?* | TalkButton (96px) |
| 2 | **Talk** | `/talk` | *What am I saying, and is it hearing me?* | TalkButton + VoiceStatePanel |
| 3 | **Reminders** | `/reminders` | *What is coming?* | The list itself |

### 2.1 Why these three and no others

- **Home** is the resting state. It answers *what now* in under three seconds of looking, and offers
  one obvious way to act.
- **Talk** is the product. It is central and raised because it is used more than the other two
  combined, and because a voice product whose voice control is a peer of a settings tab has
  mis-stated its own priority.
- **Reminders** is the only thing an elder reliably wants to check *without* speaking — "did I set
  the tablet one for nine or half past?". It is the sole read-only destination that earns permanence.

Everything else — memory, privacy, the daily brief, family handoff, life-event confirmation,
settings — is either (a) rare, (b) reached in response to something Thuna just said, or (c) both.
Those are contextual surfaces (§4), not destinations.

### 2.2 Home and Talk are distinct, deliberately

Home shows context and offers to start. Talk shows the conversation and its controls. They are not
merged because Home must be calm and scannable while Talk must be dense with live state and recovery
controls. Tapping TalkButton on Home navigates to `/talk` and starts listening in one action — the
elder experiences it as one thing (M2: one tap from open to speaking), while the two screens keep
their distinct jobs.

---

## 3. Bottom navigation geometry

`BottomNavigation` is fixed to the bottom of the viewport, above the safe-area inset, on Home, Talk
and Reminders. It is **hidden** on modal and full-screen contextual surfaces (§4.3) so that those
screens have exactly one way out.

### 3.1 Measurements (390 × 844 primary)

```
┌───────────────────────────────────────────────────────────┐  ← content ends here
│                     content bottom padding 24px           │
├───────────────────────────────────────────────────────────┤  y = 844 - 34 - 72 - 22 = 716
│                        ╭──────────╮                       │  raised Talk cap rises 22px
│                        │          │                       │  above the bar's top edge
│   ┌────────┐           │    ⬤     │          ┌────────┐   │
│   │  ⌂     │           │  (72px)  │          │  ⏰    │   │  bar height 72px
│   │ Home   │           ╰──────────╯          │Reminders│  │
│   └────────┘             Talk                └────────┘   │
├───────────────────────────────────────────────────────────┤  y = 844 - 34 = 810
│              safe-area-inset-bottom (34px iPhone)         │
└───────────────────────────────────────────────────────────┘  y = 844
   0        130            195            260           390
```

| Property | Value |
|---|---|
| Bar height (excluding inset) | **72px** |
| Bottom padding | `env(safe-area-inset-bottom, 0px)`, **minimum 12px** when the inset is 0 (Android) |
| Total occupied height | `72px + max(env(safe-area-inset-bottom), 12px)` → 106px on iPhone, 84px on Android |
| Background | `--bg-cream`, opaque — never translucent, never blurred |
| Top border | 1px solid, `--charcoal-900` at 12% opacity |
| Item count | **3**, equal thirds: 130px each at 390px |
| Side items hit area | 130 × 72px (well above the 52px floor) |
| Talk cap diameter | **72px**, centred at x = 195px, rising **22px** above the bar's top edge |
| Talk total hit area | 72 × 94px (cap plus the bar segment beneath it) |
| Icon size | 26px side items, 30px inside the Talk cap |
| Label size | **16px**, `font-weight: 600` when active, `500` when inactive |
| Icon-to-label gap | 4px |
| Label container | `min-height: 44px` — two lines of 16px Malayalam at `line-height: 1.35` (R18) |

### 3.2 Talk cap treatment

The centre item is a raised circular cap, not a flat tab.

- 72px circle, `--teal-900` fill, `--bg-cream` icon.
- Sits in a 80px circular cut-out of the bar background, giving a 4px `--bg-cream` ring so the cap
  reads as raised without a shadow.
- The label **"Talk"** sits *below* the cap, inside the bar, at 16px — the cap does not replace the
  label (R5).
- When Talk is the active route the cap fill stays `--teal-900` and gains a 3px `--teal-100` inner
  ring; the label goes to `font-weight: 600`. Active state is never signalled by colour alone (R16).

### 3.3 Active state

| Signal | Inactive | Active |
|---|---|---|
| Label weight | 500 | **600** |
| Label colour | `--charcoal-900` at 70% | `--teal-900` |
| Icon | outline | **filled** |
| Indicator | none | 3px × 24px `--teal-900` rule, 6px above the icon, centred |

Four differentiators, only one of which is colour (R16).

### 3.4 Narrow and wide viewports

| Viewport | Item width | Talk cap | Bar height | Notes |
|---|---|---|---|---|
| **360 × 800** | 120px | 68px, rise 20px | 72px | Labels still 16px. "Reminders" in Malayalam wraps to two lines; the 44px label container absorbs it without clipping. |
| **390 × 844** | 130px | 72px, rise 22px | 72px | Reference. |
| **430 × 932** | 143px | 76px, rise 24px | 76px | Bar grows to 76px; labels stay 16px — the extra space becomes padding, not type. |

### 3.5 Android browser chrome

On Android Chrome the URL bar occupies roughly 56px and collapses on scroll. The elder shell must
never rely on that collapse.

- Use `100dvh` for the shell height with a `100vh` fallback, so the layout reflows when the chrome
  hides rather than leaving a gap or a clipped bar.
- The bottom navigation uses `position: fixed; bottom: 0` with the safe-area padding of §3.1; on
  Android the 12px minimum stands in for the absent inset.
- Assume a worst case of **800 − 56 = 744px** of usable height on a 360 × 800 device. Every screen
  in this specification fits its essential content inside 744px minus the 84px bar — **660px of
  guaranteed content height.** Anything below that line must be reachable by scrolling and must not
  contain the screen's dominant action.

### 3.6 One-handed reach

The dominant action of every screen sits in the **bottom 60%** of the viewport — below y = 338 on
390 × 844, below y = 320 on 360 × 800.

- TalkButton on Home: centred at y ≈ 486 (§ `ELDER_HOME_SCREEN.md` §3).
- TalkButton on Talk: centred at y ≈ 600.
- Confirmation and recovery buttons: bottom-anchored, above the navigation.
- The header is for orientation only — nothing in `MobileHeader` is required to complete a task, and
  nothing destructive lives there.

---

## 4. Full route map

### 4.1 Primary routes

| Route | Screen | Entry | Navigation bar | Notes |
|---|---|---|---|---|
| `/` | Home | App launch; Home tab; back from anywhere | visible | Never more than 3 context items |
| `/talk` | Talk | Talk tab; TalkButton on Home; a tapped context item | visible | Starts listening on arrival when entered via TalkButton |
| `/reminders` | Reminders | Reminders tab; "See all" from Home's due item | visible | Read-only list plus per-item actions |

### 4.2 Secondary surfaces

Each is reached from a specific moment, and each states how it is presented and how it closes.

| Route | Screen | Presented as | Reached from | Dismiss |
|---|---|---|---|---|
| `/brief` | Daily Brief | **Push** from Home | Home's "Today" affordance when the brief is on; the elder saying "what's on today?" | Back → Home (1 tap) |
| `/brief/settings` | Brief on/off and time | **Modal sheet** over `/brief` | "Turn this off" on `/brief`; the offer card on Home | Close → `/brief` or Home |
| `/talk/confirm` | Read-back confirmation | **Full-screen replace** of `/talk` | Engine `action: 'confirm'` / `ScreenState.status: 'awaiting_confirmation'` | Confirm or Stop only — no back gesture, no nav bar |
| `/talk/handoff` | Family handoff offer | **Inline panel** inside `/talk`, expanding in place | Engine `action: 'handoff'`; elder asking for a person; a failure state offering help | "Not now" collapses it; sending returns to `/talk` |
| `/events/:id/confirm` | Life event confirmation | **Modal sheet** over the current screen | A `NEEDS_CONFIRMATION` life event surfaced on Home or in Talk | Yes / Not right / Ask me later — all close it |
| `/memory` | What Thuna remembers | **Push** from `/settings` | Settings; the elder asking "what do you remember about me?" | Back → Settings → Home (2 taps, meets M3) |
| `/memory/:id` | One remembered item, with Forget | **Modal sheet** over `/memory` | Tapping an item in `/memory` | Close → `/memory` |
| `/privacy` | What is shared, and with whom | **Push** from `/settings` | Settings; the elder asking "who can see this?" | Back → Settings → Home |
| `/settings` | Quiet hours, frequency, language, pace, brief | **Push** from `MobileHeader` | The single header control on Home | Back → Home (1 tap) |
| `/receipt/:id` | Simulated receipt | **Push** from `/talk` | Completion of a consequential task | "Done" → Home |

### 4.3 Presentation rules

| Presentation | When | Behaviour |
|---|---|---|
| **Push** | The elder chose to go somewhere and will come back | Navigation bar stays visible. Back returns to the referrer. |
| **Modal sheet** | A single decision, returning to exactly where they were | Bottom sheet, `--bg-cream`, 24px top radii, covering ≤ 70% of viewport height. Navigation bar hidden behind it. Dismissible by the explicit close control **and** by tapping the scrim — never by swipe alone, because an accidental swipe on a confirmation is a real risk. |
| **Full-screen replace** | Confirmation of a consequential action | Navigation bar hidden. No back gesture. Exactly two ways out: the affirmative action or Stop (R10, R12). |
| **Inline panel** | An offer made mid-conversation | Expands in place within `/talk` under the guidance line, pushing content down; never covers Stop / Wait / Say it again. |

### 4.4 Family help is contextual, never a tab

There is **no Family destination.** Family appears only at the moment it is useful, in one of four
places:

1. **On Home** — a single contextual line under the context items, present only when there is
   something a person would help with:
   > **Would you like me to ask Ravi?**
2. **Inside `/talk`** — the handoff panel (`/talk/handoff`) when the engine returns
   `action: 'handoff'`, or when a failure state offers a person as the next step
   (`VOICE_INTERACTION_STATES.md`).
3. **Inside a failure state** — always as an offer, never as a redirection ("This one needs a
   person. Shall I get Ravi?" — never "ask someone to help you").
4. **In `/privacy`** — the elder's view of what is shared and the control to revoke it.

The reason is `COMPANION_PRODUCT_MODEL.md` §4: the elder is the principal and family is a resource
the elder may draw on. A permanent Family tab inverts that — it makes family a standing presence in
the elder's own interface, which is the first structural step toward the monitoring device §3 of that
document prohibits. A dense family dashboard in the elder UI is prohibited outright.

Whatever family-facing views exist, they live in a **separate application** with a separate route
space, reached by the family member on their own device with consent recorded per
`FAMILY_CONSENT_POLICY.md`. They are out of scope for this specification and must not share a shell
with the elder UI.

### 4.5 The Demo Inspector is not in the elder UI

> **The Demo Inspector is not a destination, not a nav item, not a header control, and not reachable
> by any gesture, tap sequence, or long-press available to an elder.**

| Property | Specification |
|---|---|
| Route | `/inspector` — a separate route tree with its own layout, not nested under the elder shell |
| Shell | Does **not** use `ElderShell`. No `MobileHeader`, no `BottomNavigation`, no elder type scale, no `--bg-cream`. It is a developer surface and should look like one. |
| Discoverability | Zero. No link from any elder route. No entry in the navigation. No debug gesture. It is reached only by typing the URL. |
| Availability | Gated on an explicit development/demo flag. In an elder-facing build the route is not registered at all — not hidden, **absent**, so that a typed URL 404s. |
| Contents | Engine events, priority and suppression traces (`PRIORITY_AND_DEDUP_POLICY.md` §8.5), raw `ScreenState`, `EngineAction` history, adapter calls. All the things R4 forbids showing an elder. |
| Back-navigation | The Inspector must not link into elder routes in a way that leaves inspector state visible. Opening the elder app from the Inspector is a full navigation, not an overlay. |

The reason for absence rather than hiding: a hidden route is one mistap, one shared link or one
screen-reader traversal away from an elder seeing `handedoff`, `refused`, and a list of everything
the system knows. `MOBILE_PRODUCT_PRINCIPLES.md` R4 is not enforceable if the raw state has a URL in
the shipped build.

---

## 5. Navigation depth rule

> **An elder is never more than two taps from Home, and never in a place with no visible way out.**

### 5.1 Depth budget

| Depth | Contains | Return cost |
|---|---|---|
| 0 | Home | — |
| 1 | Talk, Reminders, Brief, Settings, Receipt | 1 tap |
| 2 | Brief settings, Memory, Privacy, Memory item, Event confirmation, Handoff | 2 taps |
| 3+ | **Does not exist** | — |

Any surface that would sit at depth 3 must be restructured — flattened into its parent, or promoted
to depth 2 with a direct return to Home.

### 5.2 Always-visible exit

Every screen has a visible way out at all times, sized ≥ 52px and labelled in words:

| Screen type | Exit |
|---|---|
| Primary destination | `BottomNavigation` — Home is always one tap |
| Push | Back control in `MobileHeader`, labelled **"Back"** with a chevron (never a bare chevron, R5) |
| Modal sheet | **"Close"** control in the sheet header, plus the scrim |
| Confirmation | **"Stop"** — always present, always the same word (R6b) |
| Any active voice state | **Stop**, **Wait**, **Say it again** — always all three (R6b) |

### 5.3 Never lost

Three structural guarantees:

1. **Every screen names itself** in `MobileHeader` at 20px, in the elder's language. No screen is
   identifiable only by its contents.
2. **Back always goes to the referrer**, never to an arbitrary parent. An elder who reached
   `/reminders` from a Home context item returns to Home, not to a list they never chose.
3. **The Home tab is a hard reset.** Tapping Home from anywhere returns to `/` and clears any
   half-open modal — with one exception: an in-flight consequential confirmation
   (`/talk/confirm`) hides the navigation bar entirely, so this cannot silently abandon a read-back.
   That flow ends with an explicit answer or an explicit Stop.

### 5.4 Interruption and resume

If a conversation is interrupted by navigation, the unfinished task becomes a pending loop and
surfaces on Home as the **"Continue"** context item (`ELDER_HOME_SCREEN.md` §4.3,
`docs/companion/PENDING_LOOPS.md`). Nothing is silently lost, and nothing traps the elder in order to
avoid losing it.

---

## 6. Route-to-state mapping

How engine values reach routes. The elder never sees any of these strings (R4).

| `ScreenState.status` (`lib/types.ts`) | Route | Elder-facing framing |
|---|---|---|
| `idle` | `/` or `/talk` idle | "What can I help you with?" |
| `awaiting_confirmation` | `/talk/confirm` (full-screen replace) | The read-back, with the real verb as the action |
| `done` | `/receipt/:id`, then `/` | "That's done." |
| `refused` | `/talk`, refusal panel inline | "That one's beyond me." + a concrete next step |
| `paused` | `/talk`, paused panel; a Continue item appears on Home | "We can pick this up whenever you like." |
| `handedoff` | `/talk/handoff` inline panel, then `/` | "Ravi's picking this up." |

| `EngineAction` | Effect on navigation |
|---|---|
| `route`, `ask`, `answer_question`, `repeat_slowly`, `go_back` | Stay in `/talk`; `VoiceStatePanel` changes state |
| `confirm` | Navigate to `/talk/confirm` |
| `complete` | Navigate to `/receipt/:id` when a receipt exists, otherwise return to `/` with a completion line |
| `refuse` | Stay in `/talk`; render the refusal panel |
| `handoff` | Expand `/talk/handoff` inline |

---

## 7. Implementation notes for GLM

1. **Two route trees, one build flag.** `app/(elder)/…` uses `ElderShell`; `app/(inspector)/…` does
   not. Register the inspector tree only when the demo flag is set, so an elder-facing build 404s on
   `/inspector` rather than rendering it.
2. **`BottomNavigation` is rendered by `ElderShell`,** not by individual screens, and takes a
   `hidden` condition driven by the route group. Screens must not each remember to hide it — that is
   how a confirmation screen ends up with an escape hatch.
3. **Reserve the bar's space in layout,** with `padding-bottom: calc(72px + max(env(safe-area-inset-bottom), 12px))`
   on the scroll container. Never let the bar overlap content; a covered action is an unreachable
   action.
4. **The Talk cap cut-out** is a `--bg-cream` ring on the cap element, not a clip path on the bar.
   Clip paths render inconsistently across Android WebView versions.
5. **Use `100dvh` with a `100vh` fallback** for the shell. Test with the Android URL bar both shown
   and collapsed.
6. **Route names, not enums, drive the header title.** One map from route → title string per
   language; no screen composes its own title from engine state.
7. **Back behaviour is referrer-based.** Keep the referrer in navigation state; do not derive the
   back target from the URL hierarchy, or Home-context entries will return to the wrong place.
8. **Modal sheets are focus-trapped** and announce their title on open, and the scrim is a real
   dismissible control with an accessible name — not a bare `div`.
9. **`/talk/confirm` disables browser back** for the duration of the read-back and must be the only
   screen in the product that does so. Every other back suppression is a defect.
10. **No prefetching of `/inspector`** and no import of inspector components from elder modules;
    keep the bundles separate so inspector strings cannot leak into an elder build.

---

## Related

- `docs/mobile-ui/MOBILE_PRODUCT_PRINCIPLES.md` — R1, R4, R5, R16, M2, M3
- `docs/mobile-ui/ELDER_HOME_SCREEN.md` — what sits at depth 0
- `docs/mobile-ui/VOICE_INTERACTION_STATES.md` — `/talk` and its states
- `docs/mobile-ui/DAILY_BRIEF_SCREEN.md` — `/brief` and `/brief/settings`
- `docs/companion/COMPANION_PRODUCT_MODEL.md` — §4 elder-as-principal, §3 not a monitoring device
- `docs/companion/FAMILY_CONSENT_POLICY.md` — why family lives elsewhere
- `docs/companion/PENDING_LOOPS.md` — what becomes a Continue item
- `docs/companion/PRIORITY_AND_DEDUP_POLICY.md` — §8.5 suppression traces belong in the Inspector
- `lib/types.ts` — `ScreenState.status`, `EngineAction` (read-only reference)
- `COMPONENT_SPECIFICATION.md` — `ElderShell`, `MobileHeader`, `BottomNavigation` (owned elsewhere)
