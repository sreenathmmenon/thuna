# Thuna — Component Specification

> Design specification. **Changes no production code.**
>
> Implementation-ready specifications for the 20 components of Thuna's elder-facing mobile UI.
> All colour, type, spacing, radius, motion and safe-area values are the tokens defined in
> `VISUAL_DESIGN_SYSTEM.md`; this file never redefines them.
>
> **Props are UI-shaped, not engine-shaped.** Every component takes plain presentational data.
> The mapping from engine output (`lib/types.ts` → `EngineResponse`, `ScreenState`, `SessionCtx`)
> to these props lives in **one adapter module, `lib/client-api.ts`**, which GLM writes. No
> component imports from `lib/engine.ts`, `lib/types.ts`, or any skill module directly.
>
> Where a prop corresponds to a field in a production contract, it is marked
> **⟨contract⟩** with the field name as currently known. **GLM must verify every ⟨contract⟩ field
> name against the latest release before binding** — Codex may still rename contract fields, and
> the adapter is the only place that should have to change when it does.

---

## Contents

| § | Component | Role |
|---|---|---|
| 1 | [ElderShell](#1-eldershell) | Layout frame |
| 2 | [MobileHeader](#2-mobileheader) | Top chrome |
| 3 | [BottomNavigation](#3-bottomnavigation) | Bottom chrome |
| 4 | [**TalkButton**](#4-talkbutton) | **Signature component** |
| 5 | [VoiceStatePanel](#5-voicestatepanel) | Live voice status + transcript |
| 6 | [GuidanceCard](#6-guidancecard) | What Thuna is saying |
| 7 | [TaskChoiceList](#7-taskchoicelist) | Pick one of a few |
| 8 | [TaskSummary](#8-tasksummary) | Data-driven read-back |
| 9 | [ConfirmationScreen](#9-confirmationscreen) | The explicit yes |
| 10 | [CompletionReceipt](#10-completionreceipt) | It is done |
| 11 | [SafetyWarning](#11-safetywarning) | The refusal |
| 12 | [CheckInScreen](#12-checkinscreen) | Data-driven proactive contact |
| 13 | [LifeEventConfirmation](#13-lifeeventconfirmation) | Remember this? |
| 14 | [DailyBrief](#14-dailybrief) | What's coming up |
| 15 | [PendingLoopCard](#15-pendingloopcard) | An open thread |
| 16 | [FamilyHandoff](#16-familyhandoff) | Bridge to a person |
| 17 | [MemoryReview](#17-memoryreview) | What Thuna remembers |
| 18 | [ErrorRecovery](#18-errorrecovery) | Something went wrong |
| 19 | [LoadingState](#19-loadingstate) | Working |
| 20 | [OfflineBanner](#20-offlinebanner) | Connection lost |

---

## 0. Shared conventions

### 0.1 Types used across components

```ts
/** Every component accepts these. Defined once. */
export interface BaseProps {
  /** BCP-47. Drives font fallback and the --lh-* overrides. */
  lang: 'en-IN' | 'ml-IN';
  /** Extra class for layout composition only. Never for colour. */
  className?: string;
  /** Stable id for E2E selectors and the demo runner. */
  testId?: string;
}

/** A string that may exist in both languages. The component renders `text`
 *  and sets `lang` on the node; `alt` is available for a side-by-side caption
 *  mode used only on the presentation laptop, never in the elder UI. */
export interface LocalisedText {
  text: string;
  lang: 'en-IN' | 'ml-IN';
  alt?: string;
}

export type VoiceState =
  | 'idle' | 'listening' | 'thinking' | 'speaking' | 'error' | 'disabled';

/** UI-level severity. Maps from engine action, never equals it. */
export type Tone = 'neutral' | 'attention' | 'success' | 'danger';

/** Every action the elder can take is one of these. Rendered as a button. */
export interface UiAction {
  id: string;
  label: string;                    // ALWAYS present. Never icon-only.
  kind: 'primary' | 'secondary' | 'danger' | 'text';
  icon?: IconName;                  // optional, always accompanied by `label`
  disabled?: boolean;
  /** If true the button shows "Working…" and blocks re-entry. */
  busy?: boolean;
  onSelect: () => void;
}

export type IconName =
  | 'mic' | 'mic-off' | 'waveform' | 'check' | 'shield' | 'phone'
  | 'calendar' | 'clock' | 'home' | 'people' | 'memory' | 'back'
  | 'close' | 'edit' | 'refresh' | 'cloud-off' | 'bell' | 'food'
  | 'rupee' | 'info' | 'stop';
```

### 0.2 The three rules every component obeys

1. **Every icon has a visible text label** (`VISUAL_DESIGN_SYSTEM.md` §9.2). `icon` is never
   sufficient; `label` is never optional.
2. **Every interactive element is ≥52px tall** with ≥12px between adjacent targets.
3. **Every text block reserves two lines of Malayalam** at its type token's Malayalam line-height,
   so switching language never reflows the layout.

### 0.3 Simulation labelling

Anything representing an external side effect (an order, a payment, a message, a call) carries a
`simulated: boolean` prop. When `true`, the component renders a `SIMULATED` chip:

```
┌─────────────┐
│ SIMULATED   │  16px/600, --text-secondary on --surface-2,
└─────────────┘  --radius-sm, 4px/8px padding, letter-spacing 0.02em
```

Required by `../companion/COMPANION_DEMO_SCRIPT.md` §13. The chip is never hidden to make a
screenshot look better.

### 0.4 Live-region policy

Thuna speaks; the screen must not duplicate that speech into a screen reader at the same time.

| Region | `aria-live` | Reason |
|---|---|---|
| `GuidanceCard` primary text | `polite` | The canonical announcement channel |
| `VoiceStatePanel` state label | `polite`, `aria-atomic="true"` | State changes |
| `SafetyWarning` | `assertive` | Must interrupt |
| `OfflineBanner` | `polite` | Important, not urgent |
| Everything else | none | Only one polite region should speak at a time |

---

## 1. ElderShell

### 1.1 Purpose

The single layout frame every elder-facing screen mounts inside. Owns the viewport contract
(`100dvh`, safe areas, gutters), the scroll region, the header/nav slots, and the global
`aria-live` root. Nothing else positions itself against the viewport.

### 1.2 Props

```ts
export interface ElderShellProps extends BaseProps {
  header?: React.ReactNode;              // <MobileHeader/>, omitted on single-focus screens
  children: React.ReactNode;             // scrollable content
  nav?: React.ReactNode;                 // <BottomNavigation/>, omitted on single-focus screens
  banner?: React.ReactNode;              // <OfflineBanner/> — pinned above content, below header
  /** 'standard' shows header+nav. 'focus' hides both: used by
   *  ConfirmationScreen, SafetyWarning, CheckInScreen(active). */
  layout?: 'standard' | 'focus';
  /** Adds bottom padding for the raised TalkButton overhang. Default true. */
  reserveTalkSpace?: boolean;
  /** Tints the page background. Used only by SafetyWarning ('danger'). */
  surface?: 'cream' | 'danger';
}
```

### 1.3 Variants

| Variant | Header | Nav | Bottom padding | Used by |
|---|---|---|---|---|
| `standard` | yes | yes | `--content-bottom-pad` | Home, Today, Family, Memory |
| `focus` | no (a bare Back action sits in-content) | no | `--space-12` | ConfirmationScreen, SafetyWarning, active CheckInScreen |

### 1.4 States

`default` · `banner-present` (content shifts down by the banner height, no overlap) ·
`keyboard-open` (nav hidden via `visualViewport` listener) · `scrolled` (header gains a 1px
`--border-subtle` bottom border; no shadow, no colour change).

### 1.5 Accessibility

| Concern | Requirement |
|---|---|
| Landmarks | `<header>`, `<main id="main">`, `<nav aria-label="Main">` |
| Skip link | First DOM node: `<a href="#main">Skip to main content</a>`, visually hidden until focused, then rendered as a 52px `--teal-900` pill at top-left |
| Live root | `<div aria-live="polite" aria-atomic="true" class="sr-only">` owned by the shell; components publish through it rather than each declaring their own |
| Focus on screen change | Move focus to `<main>` (`tabIndex={-1}`) and announce the screen title. Never leave focus on a control that no longer exists. |
| Zoom | `user-scalable` is **not** disabled. Pinch-zoom must work. |

### 1.6 Dimensions

```
390 × 844, standard layout, iPhone standalone PWA
┌──────────────────────────────────────┐ ─┐
│           safe-top  59px             │  │
├──────────────────────────────────────┤  │
│  MobileHeader                  64px  │  │
├──────────────────────────────────────┤  │
│  [OfflineBanner]        56px if shown│  │
├──────────────────────────────────────┤  │  844
│                                      │  │
│  <main>  scrollable                  │  │  content height =
│  padding: 0 24px                     │  │  844 − 59 − 64 − 98 = 623px
│  padding-bottom: --content-bottom-pad│  │  (with nav + talk overhang)
│                                      │  │
├──────────────────────────────────────┤  │
│  ( TalkButton overhang       54px )  │  │
│  BottomNavigation             64px   │  │
│           safe-bottom  34px          │  │
└──────────────────────────────────────┘ ─┘
```

| Viewport | Gutter | Content column | `main` height (standard) |
|---|---|---|---|
| 360 × 800 | 24px | 312px | ~617px (Android chrome ≈24/24) |
| 390 × 844 | 24px | 342px | 623px |
| 430 × 932 | 24px | 382px | 711px |

### 1.7 Interaction

- Scroll is `overscroll-behavior: contain` on `<main>` so pull-to-refresh never fires accidentally.
- **No pull-to-refresh.** An elder mid-task must not be able to discard state with a stray gesture.
- **No swipe-back gesture handling** in-app; the browser's own back is not intercepted.
- Screen transitions: `--dur-slow` fade + 8px translateY (reduced-motion: fade only).

### 1.8 Implementation notes for GLM

- Flex column: `header (flex-shrink:0)` / `main (flex:1; overflow-y:auto)` / `nav (flex-shrink:0)`.
  **Do not use `position: fixed` for the nav** — see `VISUAL_DESIGN_SYSTEM.md` §11.3.
- `min-height: 100dvh` with a `100svh` fallback. Never `100vh`.
- The TalkButton is a child of `BottomNavigation`, not of `ElderShell`, so its overhang is
  positioned relative to the bar, not to the viewport.

---

## 2. MobileHeader

### 2.1 Purpose

Minimal top chrome: where the elder is, how to go back, and — when Thuna is mid-utterance — a
small persistent speaking indicator so the state is never ambiguous.

### 2.2 Props

```ts
export interface MobileHeaderProps extends BaseProps {
  title: string;                    // e.g. "Thuna" on Home, "Your memories" on Memory
  /** Rendered under the title at --text-essential. Optional. Max 1 line. */
  subtitle?: string;
  back?: { label: string; onSelect: () => void };   // label is REQUIRED, e.g. "Back"
  /** Small speaking/listening dot + word. Mirrors TalkButton state. */
  voiceState?: VoiceState;
  /** Right-side single action. Text always shown. Max one. */
  action?: UiAction;
}
```

### 2.3 Variants

| Variant | Content |
|---|---|
| `home` | Title "Thuna" only, no back |
| `section` | Title + back action |
| `active-voice` | Any of the above + a 20px state dot and word ("Listening", "Speaking") right-aligned |

### 2.4 States

`default` · `scrolled` (1px `--border-subtle` bottom border appears) · `voice-active`.
The header **never** changes background colour; it is always `--bg-cream`.

### 2.5 Accessibility

- `<header>` with the title as `<h1>` (one `<h1>` per screen).
- Back is a `<button>` with visible text "Back" plus the `back` icon; `aria-label` is not used as a
  substitute for the text.
- The voice indicator is `aria-hidden="true"` — `VoiceStatePanel` already announces the state, and
  duplicating it would double-speak.

### 2.6 Dimensions (390px)

```
├─── 24px ───┬────────────────────────────────┬─── 24px ───┤
┌────────────────────────────────────────────────────────┐
│ ← Back                                    ● Listening  │  64px tall
│ Thuna                                                  │  title 20px/600
└────────────────────────────────────────────────────────┘
  ↑ 52×52 hit area, text 18px       ↑ dot 12px + label 16px
```

| Property | Value |
|---|---|
| Height | 64px + `--safe-top` padding |
| Title | `--text-secondary-lg` (20px/500); on Home only, the greeting lives in the content, not here |
| Back hit area | 52 × 52px minimum, extending left to the gutter edge |
| At 360px | If back label + title + voice indicator exceed the width, drop the **back icon** (keep the word "Back"); never truncate the title |
| At 430px | Unchanged |

### 2.7 Copy

> Home title: **"Thuna"**
> Back: **"Back"** (never "‹" alone, never "Cancel")
> Voice indicator: **"Listening"** / **"Speaking"** / **"Thinking"**

---

## 3. BottomNavigation

### 3.1 Purpose

Five destinations, the centre one raised as the TalkButton. The only persistent navigation in the
product.

### 3.2 Props

```ts
export interface BottomNavigationProps extends BaseProps {
  items: NavItem[];                 // exactly 5, centre index 2 is the Talk slot
  activeId: string;
  onNavigate: (id: string) => void;
  /** Rendered raised over the centre slot. */
  talkButton: React.ReactNode;      // <TalkButton/>
  /** Hidden while a text input is focused. */
  hidden?: boolean;
}

export interface NavItem {
  id: 'home' | 'today' | 'talk' | 'family' | 'memory';
  label: string;                    // ALWAYS visible
  icon: IconName;
}
```

### 3.3 The five items

| id | Icon | English label | Malayalam label | Destination |
|---|---|---|---|---|
| `home` | `home` | Home | വീട് | Greeting + TalkButton + one suggestion |
| `today` | `calendar` | Today | ഇന്ന് | `DailyBrief` + `PendingLoopCard`s |
| `talk` | — (TalkButton) | Talk | സംസാരിക്കൂ | Opens the voice session |
| `family` | `people` | Family | കുടുംബം | `FamilyHandoff` + consent settings |
| `memory` | `memory` | Memory | ഓർമ്മ | `MemoryReview` |

### 3.4 States

Per item: `inactive` · `active` · `pressed` · `focus-visible`. There is **no badge state** — badge
counts create the low-grade anxiety this product exists to remove.

### 3.5 Accessibility

- `<nav aria-label="Main">` containing a `<ul>`; each item a `<button aria-current="page">` when
  active.
- The Talk slot's `<li>` contains the label text; the raised TalkButton is a sibling positioned
  over it and carries its own label (§4).
- Tab order: home → today → **TalkButton** → family → memory. The TalkButton takes the centre tab
  position so keyboard order matches visual order.
- Every item ≥52px hit height (actual: 64px).

### 3.6 Dimensions

Geometry is fully specified in `VISUAL_DESIGN_SYSTEM.md` §11.4. Summary:

| Property | 360 | 390 | 430 |
|---|---|---|---|
| Bar content height | 64px | 64px | 64px |
| Item width | 72px | 78px | 86px |
| TalkButton diameter | 76px | 76px | 80px |
| Talk overhang above bar | 54px | 54px | 56px |
| Label size | 16px/500 (active 600) | same | same |
| Icon | 32px, stroke 2.5px | same | same |

### 3.7 Interaction

- Tap navigates immediately; no confirmation, no animation gate.
- Active indicator (3px top rule) slides over `--dur-slow`; reduced-motion: appears instantly.
- Navigating away **never discards an in-progress confirmation**. If `status ===
  'awaiting_confirmation'`, tapping another nav item shows an inline line in the destination:
  > "You still have an order waiting for your answer. Tap here to go back to it."

  Rather than blocking navigation with a modal — trapping an elder is worse than letting them
  wander and offering the thread back.

### 3.8 Implementation notes for GLM

- Do not render badges. Do not add a sixth item. If a new destination is needed, it lives inside
  Today or Memory.
- The nav is hidden entirely on `layout="focus"` screens; do not merely disable it.

---

## 4. TalkButton

> **The signature component.** Everything else in this product is a supporting surface. This is the
> one control an elder must be able to find without looking, understand without instruction, and
> operate with a shaking hand.

### 4.1 Purpose

Start, stop, and reflect the voice session. It is simultaneously (a) the primary input control,
(b) the primary *status* display for the voice channel, and (c) the visual anchor of the brand.

### 4.2 Props

```ts
export interface TalkButtonProps extends BaseProps {
  /** Current voice state. Drives fill, icon, ring, motion, and label. */
  state: VoiceState;

  /** Fired on tap in 'idle'. Begins capture. */
  onStart: () => void;
  /** Fired on tap in 'listening'. Ends capture and submits. */
  onStop: () => void;
  /** Fired on tap in 'speaking'. Barges in: stops TTS, begins capture. */
  onInterrupt?: () => void;

  /** 0..1 microphone amplitude, sampled ≤20Hz. Optional; when absent
   *  the listening rings use their steady ambient breath instead. */
  level?: number;

  /** Overrides the default per-state label. Use only for localisation. */
  label?: string;
  /** Sub-label under the button. Defaults per state (§4.6). Pass '' to hide. */
  hint?: string;

  /** Rendered smaller and inline, e.g. inside CheckInScreen. */
  size?: 'primary' | 'inline';      // primary = 76–80px, inline = 64px

  /** Reason shown when state === 'disabled'. */
  disabledReason?: string;

  /** Fired when the elder holds for 600ms — used by the demo runner
   *  to open the presenter's inspector on the laptop, never in the elder UI. */
  onLongPress?: () => void;
}
```

⟨contract⟩ `state` derives from `EngineResponse.action` + local mic/TTS state in
`lib/client-api.ts`. Specifically: `clearMic === true` → return to `idle`;
`action === 'ask' | 'confirm'` while TTS plays → `speaking`. **Verify `clearMic` and `action`
against the latest `lib/types.ts` before binding** — Codex may still rename `EngineAction` members.

### 4.3 Variants

| Variant | Diameter | Where |
|---|---|---|
| `primary` | 76px (360/390) · 80px (430) | Raised over the centre nav slot. The default. |
| `inline` | 64px | Inside `CheckInScreen` and `ConfirmationScreen` where "just answer out loud" is the expected path and the nav is hidden |

**Ceiling: 96px.** Beyond that the button stops reading as a button and starts reading as a
decorative graphic, and it eats the content area.
**Floor: 76px.** Below that it loses its status legibility at arm's length.

### 4.4 States — full specification

| State | Fill | Border | Ring | Icon | Label | Sub-label | Tap does |
|---|---|---|---|---|---|---|---|
| `idle` | `--teal-900` | none | none | `mic`, white, 36px, stroke 3px | **Talk** | "Tap and speak" | `onStart()` |
| `listening` | `--teal-900` | none | 2 rings at +12px / +24px, `--teal-900` @20% / @10% | `mic`, white, 36px | **Listening…** | "Tap again when finished" | `onStop()` |
| `thinking` | `--teal-900` | none | 1 ring at +12px, `--teal-900` @24% | 3 dots, white, 8px, 6px gap | **Thinking…** | "One moment" | nothing (`aria-disabled`, still focusable) |
| `speaking` | `--teal-100` | 3px `--teal-900` | none | `waveform`, `--teal-900`, 36px | **Thuna is speaking** | "Tap to interrupt" | `onInterrupt()` |
| `error` | `--surface-danger` | 3px `--red-700` | none | `mic-off`, `--text-danger`, 36px | **Didn't catch that** | "Tap to try again" | `onStart()` |
| `disabled` | `--disabled-bg` | 2px `--disabled-border` | none | `mic-off`, `--text-disabled`, 36px | **Not available** | `disabledReason` | nothing |

State transitions are legal only along these edges:

```
        onStart              (capture ends)          (engine returns)
 idle ───────────► listening ──────────► thinking ──────────────► speaking
   ▲                   │                     │                       │
   │  onStop (empty)   │                     │  error                │ TTS ends
   └───────────────────┘                     ▼                       │
   ▲                                       error ───── tap ──────────┤
   │                                                                 │
   └─────────────────────── clearMic / onInterrupt ──────────────────┘
```

`disabled` may be entered from any state (permission denied, offline) and exits only to `idle`.

### 4.5 Geometry (390 × 844, `primary`)

```
                       centre-x = 195px
                            │
            ╭ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ╮   outer ring  124px ⌀  (10% alpha)
          ╭ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─╮  inner ring  100px ⌀  (20% alpha)
        ┌───────────────────┼──────────────────┐
        │      ╭──────────────────────╮        │  button      76px ⌀
        │      │                      │        │  --teal-900
        │      │         ▮ mic        │        │  36px icon, stroke 3px
        │      │         36px         │        │  --elev-2
        │      ╰──────────────────────╯        │  3px --bg-cream separation ring
        └───────────────────┼──────────────────┘
                     4px gap│
                    ┌───────┴────────┐
                    │     Talk       │  16px/600 --teal-900   ← the nav slot label
                    └────────────────┘
        ═══════════════════════════════════════  nav top edge
                   22px clearance above this line
```

| Property | 360 | 390 | 430 |
|---|---|---|---|
| Diameter | 76px | 76px | 80px |
| Icon | 36px, stroke 3px | 36px | 36px |
| Ring 1 / Ring 2 diameter | 100 / 124px | 100 / 124px | 104 / 128px |
| Bottom edge above nav top | 22px | 22px | 22px |
| Overhang above the bar | 54px | 54px | 56px |
| Separation ring | 3px `--bg-cream` | 3px | 3px |
| Hit area | The full 76px circle **plus** an invisible 8px inset extension → effective 92px tap diameter | same | same |

The 92px effective hit target is deliberately larger than the visual: it absorbs tremor without
making the button look oversized. Implement with `::before { inset: -8px; border-radius: inherit; }`
— never by scaling the visual.

**One-handed reach:** at 390 × 844 with a 34px home indicator, the button's centre sits roughly
**155px above the bottom edge of the screen** — comfortably inside the natural arc of either thumb
in a one-handed grip, and dead-centre so neither handedness is penalised. This is why the Talk
control is not in the header, not a floating action button in a corner, and not full-width.

### 4.6 Copy

| State | Label | Sub-label |
|---|---|---|
| idle | > **Talk** | > Tap and speak |
| listening | > **Listening…** | > Tap again when finished |
| thinking | > **Thinking…** | > One moment |
| speaking | > **Thuna is speaking** | > Tap to interrupt |
| error | > **Didn't catch that** | > Tap to try again |
| disabled (no mic permission) | > **Not available** | > Thuna needs permission to use the microphone |
| disabled (offline) | > **Not available** | > No connection right now |

Malayalam:

| State | Label |
|---|---|
| idle | സംസാരിക്കൂ |
| listening | കേൾക്കുന്നു… |
| thinking | ആലോചിക്കുന്നു… |
| speaking | തുണ സംസാരിക്കുന്നു |
| error | മനസ്സിലായില്ല |

Copy rules: never "Tap to speak to Thuna" (too long for the label row), never "Recording" (sounds
like surveillance), never a timer or a countdown (creates pressure — an elder who is thinking about
what to say must not see a clock).

### 4.7 Motion

| State | Animation | Timing | Reduced-motion |
|---|---|---|---|
| Press | `scale(1) → scale(0.96)` | `--dur-fast`, `--ease-standard` | Fill → `--teal-900-active`, no scale |
| Release | back to `scale(1)` | `--dur-fast` | — |
| `listening` rings | Both rings `scale(1.0 ↔ 1.06)`, opacity `0.20 ↔ 0.10`, ring 2 offset by 400ms | `--dur-ambient` (2200ms), `--ease-calm`, infinite | **Rings static at `scale(1.03)`, opacity 0.24, no animation.** Label carries the state. |
| `listening` with `level` | Inner ring radius modulated by `level` (map 0..1 → +12px..+20px), smoothed with a 120ms rolling mean | continuous | Ignored — falls back to the static ring |
| `thinking` dots | Opacity `0.35 → 1.0` sequentially, 3 dots, 160ms stagger | 1400ms loop, `--ease-calm` | Static 3 dots at full opacity |
| `speaking` waveform | 3 bars `scaleY 0.5 ↔ 1.0`, 120ms stagger | 900ms loop, `--ease-calm` | Static bars at 0.6 / 1.0 / 0.75 heights |
| `error` entry | **None.** Instant. | `--dur-instant` | Identical |
| State fill change | Colour cross-fade | `--dur-base` | `--dur-fast` |

Rules: the button **never** bounces, springs, jiggles, or pulses to attract attention. It never
animates while idle. The listening breath is deliberately slow (2200ms, roughly a calm respiratory
rate) — it reads as *attentive*, not *urgent*.

`level` sampling must be ≤20Hz and must run off `requestAnimationFrame`; if the tab is
backgrounded, freeze the ring rather than continuing to animate.

### 4.8 Accessibility

| Concern | Requirement |
|---|---|
| Element | A real `<button type="button">`. Never a `<div role="button">`. |
| Accessible name | The visible label text, via the DOM — e.g. `<span id="talk-label">Listening…</span>` referenced by `aria-labelledby`. **Not** a hard-coded `aria-label` that can drift from the visible text. |
| Description | `aria-describedby` → the sub-label node |
| State announcement | The state word is inside a `aria-live="polite" aria-atomic="true"` node so a screen reader announces "Listening…", "Thinking…", "Thuna is speaking" as they change. Never `assertive` — it would cut off Thuna's own speech. |
| `thinking` | `aria-disabled="true"`, **not** the `disabled` attribute — it must stay focusable so a keyboard user does not lose their place |
| `disabled` | `disabled` attribute **and** the reason in `aria-describedby` |
| Keyboard | `Space` / `Enter` activate. `Escape` while `listening` cancels without submitting. |
| Touch target | 92px effective, far above the 44px WCAG 2.5.5 minimum |
| Colour independence | Every state has a distinct **icon** and a distinct **word**; colour is never the only differentiator |
| Focus | 4px `--focus-ring` at 6px offset (larger than the global 3px/2px, because the button is round and larger), plus the `--focus-ring-halo` |
| Motion | Respects `prefers-reduced-motion` per §4.7 without losing state information |
| Haptics | 10ms light impact on start, 10ms on stop, via `navigator.vibrate` where available. **No haptic on error** — a buzz on failure reads as reproach. |

### 4.9 Interaction behaviour

| Interaction | Behaviour |
|---|---|
| **Tap-to-start, tap-to-stop** | The model is **toggle**, not hold-to-talk. Press-and-hold requires sustained grip strength and fails for tremor and arthritis. |
| Silence timeout | After **8 seconds** of silence in `listening`, auto-stop and submit whatever was captured. If nothing was captured, return to `idle` and Thuna says: > "I didn't hear anything. Tap the button and try again." Never an error state for silence. |
| Maximum utterance | 30 seconds, then auto-stop and submit. No visible countdown. |
| Barge-in | Tapping during `speaking` stops TTS within 100ms and enters `listening`. This is essential: an elder must be able to interrupt. |
| Double-tap | Debounced at 400ms. A second tap inside that window is ignored, not treated as stop-then-start. |
| Long-press (600ms) | Fires `onLongPress` if provided. **Used only by the presenter's demo runner**; in the elder build `onLongPress` is undefined and long-press behaves as a normal tap on release. |
| While a confirmation is pending | Fully enabled — "yes" is a voice answer. The button is never disabled to force a screen tap. |
| Mic permission denied | `state="disabled"` with the reason; a secondary "How to allow the microphone" text action appears in `VoiceStatePanel`, not on the button. |
| Offline | `state="disabled"`, `OfflineBanner` shown. |

### 4.10 Implementation notes for GLM

1. Round `TalkButton` sizes come from `--touch-talk` / `--touch-talk-lg`. Do not hard-code 76.
2. The button lives inside `BottomNavigation`, absolutely positioned relative to the bar
   (`position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(100% - 54px)`), so the
   overhang is bar-relative and survives safe-area changes.
3. Rings are two sibling `<span aria-hidden="true">` elements, not `box-shadow`, so their opacity and
   scale can animate independently and be frozen under reduced-motion.
4. The `speaking` state must be driven by real TTS playback events (`onplay` / `onended` on the
   audio element), not by a timer. A timer will desynchronise the moment the network hiccups —
   and a button that says "Thuna is speaking" while it is silent destroys trust in every other
   status in the product.
5. Write an explicit `@media (prefers-reduced-motion: reduce)` block; the global `!important` net
   in `VISUAL_DESIGN_SYSTEM.md` §10.3 would otherwise leave the listening rings invisible-by-
   stillness with no compensating static treatment.
6. Debounce, silence-timeout, and max-utterance are **component-local timers**. Do not put them in
   the engine.

---

## 5. VoiceStatePanel

### 5.1 Purpose

The area directly above the TalkButton that makes the voice channel legible: what Thuna heard, what
state the conversation is in, and — when recognition failed — what to do next. It is the screen's
answer to "did it hear me?", which is the single most common anxiety in voice UIs.

### 5.2 Props

```ts
export interface VoiceStatePanelProps extends BaseProps {
  state: VoiceState;
  /** Live partial transcript while listening; final transcript after. */
  transcript?: string;
  /** true while `transcript` is still being revised. Renders lighter weight. */
  interim?: boolean;
  /** What Thuna is currently saying, shown while state === 'speaking'. */
  spokenText?: string;
  /** Shown in 'error'. Human, never a code. */
  errorMessage?: string;
  /** e.g. "How to allow the microphone" */
  recoveryAction?: UiAction;
  /** Hides the transcript entirely. Default false. */
  hideTranscript?: boolean;
}
```

⟨contract⟩ `spokenText` ← `EngineResponse.speak`. **Verify against the latest `lib/types.ts`.**

### 5.3 Variants

`compact` (Home — state word + one transcript line) · `expanded` (during an active session — state
word + up to 3 transcript lines + Thuna's current utterance).

### 5.4 States

| State | Renders |
|---|---|
| `idle` | Nothing, or the last final transcript at `--text-secondary` if one exists |
| `listening` | State word + live interim transcript, growing |
| `thinking` | State word + final transcript, frozen |
| `speaking` | Thuna's utterance in `--surface-teal`, plus the elder's last line above it in `--text-secondary` |
| `error` | `errorMessage` + `recoveryAction` |

### 5.5 Accessibility

- Container `aria-live="polite" aria-atomic="false"`.
- The interim transcript is `aria-hidden="true"` while `interim === true` — announcing a
  half-recognised sentence word by word is disorienting. Only the final transcript is announced.
- `spokenText` is `aria-hidden="true"` — Thuna is already speaking it aloud; a screen reader
  reading it simultaneously produces two voices.
- The state word is the panel's only assertive-adjacent content and stays `polite`.

### 5.6 Dimensions (390px)

```
┌──────────────────────────────────────────────────┐
│  ● Listening…                            16px/600│ ← state row, 24px tall
│                                                  │   dot 10px + 8px gap
│  ┌────────────────────────────────────────────┐  │
│  │ "Order my usual dosa"                      │  │ ← transcript, 18px/400
│  │                                            │  │   --surface-2, --radius-md
│  └────────────────────────────────────────────┘  │   16px padding, min-height 64px
└──────────────────────────────────────────────────┘   (2 Malayalam lines at 18px)
   full content width 342px · total min-height 104px
```

| Property | Value |
|---|---|
| Min height | 104px reserved at all times, so the layout does not jump when a transcript appears |
| Transcript block min-height | 64px = 2 × (18px × 1.75) rounded — two Malayalam lines |
| Max transcript lines | 3, then scroll within the block (never truncate with an ellipsis) |
| At 360px | Identical; the transcript block is 288px wide |
| At 430px | Identical; 358px wide |

### 5.7 Copy

> Listening, empty: *(no placeholder text — an empty box is honest; "Say something…" is nagging)*
> Error, no speech detected: > **I didn't hear anything.** Tap the button and try again.
> Error, could not understand: > **I didn't quite catch that.** Could you say it once more?
> Error, no mic permission: > **Thuna can't use the microphone.** [How to allow the microphone]
> Error, network: > **I couldn't reach the internet just now.** [Try again]

Never: "Speech recognition error", "ASR failure", any error code, or "Sorry, I'm just an AI".

---

## 6. GuidanceCard

### 6.1 Purpose

The canonical "what Thuna is telling you right now" surface. Present on almost every screen. It is
the screen's *primary text* and the app's primary `aria-live` region.

### 6.2 Props

```ts
export interface GuidanceCardProps extends BaseProps {
  /** The main line. 24px. This is what Thuna is saying. */
  primary: string;
  /** Optional supporting line. 18px. Never essential information. */
  secondary?: string;
  tone?: Tone;                      // default 'neutral'
  icon?: IconName;                  // always paired with a tone word
  /** 0–2 actions. More than 2 means the screen is asking too much. */
  actions?: UiAction[];
  /** When true the card renders as Thuna's speech (teal surface). */
  fromThuna?: boolean;              // default true
  /** Slow-pace mode: extra spacing + slightly larger primary. */
  pace?: 'normal' | 'slow';
  simulated?: boolean;
}
```

⟨contract⟩ `primary` ← `EngineResponse.speak`; `pace` ← `SessionCtx.pace`.
**Verify both field names against the latest `lib/types.ts`.**

### 6.3 Variants

| `tone` | Surface | Border | Icon | Left rule |
|---|---|---|---|---|
| `neutral` | `--surface-teal` | 1px `--border-teal` | none | none |
| `attention` | `--surface-attention` | 1px `--border-attention` | `clock` | 4px `--amber-500` |
| `success` | `--surface-success` | 1px `--border-success` | `check` | 4px `--green-600` |
| `danger` | Not used here — use `SafetyWarning` | — | — | — |

`fromThuna: false` renders on `--surface-1` with `--border-subtle`, for system messages that are not
Thuna speaking (e.g. "You are offline").

### 6.4 States

`default` · `speaking` (a 3px `--teal-900` left rule appears while the matching TTS plays, so the
elder can see *which* card is being read) · `slow-pace` (padding `--space-8`, primary at
`--text-guidance-lg`).

### 6.5 Accessibility

- `role="status"`, `aria-live="polite"`, `aria-atomic="true"`.
- **The card's text is the announcement.** No other component may hold a competing polite region
  on the same screen.
- When `fromThuna` and TTS is playing, set `aria-live="off"` for the duration and restore after —
  otherwise a screen-reader user hears the line twice, once from Thuna and once from their reader.
- Actions are real buttons in DOM order after the text.

### 6.6 Dimensions (390px)

```
┌────────────────────────────────────────────────┐
│ 24px padding                                   │
│                                                │
│  Masala Dosa, no chutney, from Udupi Cafe,     │ ← 24px/600, lh 34 (Latin)
│  to Home. Total Rs 145.                        │   lh 41 (Malayalam)
│                                                │   min-height 82px (2 ml lines)
│  Shall I place the order?                      │ ← 18px/400, --text-secondary
│                                                │   min-height 64px if present
│  ┌──────────────────────────────────────────┐  │
│  │            Yes, place it                 │  │ ← 64px primary
│  └──────────────────────────────────────────┘  │
│                       12px                     │
│  ┌──────────────────────────────────────────┐  │
│  │                 No                       │  │ ← 52px secondary
│  └──────────────────────────────────────────┘  │
│ 24px padding                                   │
└────────────────────────────────────────────────┘
  342px wide · --radius-md · --elev-1
```

| Property | Value |
|---|---|
| Padding | `--space-6` (24px); `--space-8` (32px) in slow pace |
| Radius | `--radius-md` (16px) |
| Elevation | `--elev-1` |
| Primary text min-height | 82px (two Malayalam lines at 24px × 1.70) |
| Actions | Stacked vertically, always. **Never side-by-side**, at any viewport — at 360px two 150px buttons is a mis-tap generator, and at 430px side-by-side still puts "No" under the right thumb's natural landing point. |
| Gap between actions | `--space-3` (12px) |
| At 360px | 312px wide, padding unchanged |
| At 430px | 382px wide, padding unchanged |

### 6.7 Copy examples

> Neutral: > **Masala Dosa, no chutney, from Udupi Cafe, to Home. Total Rs 145.**
> Secondary: > Shall I place the order?
>
> Attention: > **You still wanted to ask Sree about Saturday.**
> Secondary: > Shall I bring it up now?

---

## 7. TaskChoiceList

### 7.1 Purpose

"Which one?" — restaurants, contacts, dates, delivery slots. Deliberately capped low: a long list is
a cognitive load the voice channel was supposed to remove.

### 7.2 Props

```ts
export interface TaskChoiceListProps extends BaseProps {
  question: string;                 // rendered as the list's accessible name
  options: TaskChoice[];            // 2–4. More than 4 → ask a narrowing question instead.
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Appended as a final row. Default: "None of these". */
  escapeOption?: { id: string; label: string };
  /** Shown under the list. Default: "Or just say it out loud." */
  voiceHint?: string;
}

export interface TaskChoice {
  id: string;
  label: string;                    // "Udupi Cafe"
  meta?: string;                    // "20 minutes · Rs 25 delivery"
  /** Rendered as an --amber-500 chip, e.g. "Your usual" */
  badge?: string;
  icon?: IconName;
  disabled?: boolean;
  disabledReason?: string;
}
```

⟨contract⟩ `options` ← `ScreenState.candidates`. **`candidates` is currently `unknown[]`; GLM must
verify its element shape against the latest release and do the mapping in `lib/client-api.ts`.**

### 7.3 Variants

`plain` (label only) · `with-meta` (label + meta line) · `with-badge` (adds the "Your usual" chip).

### 7.4 States

Per row: `default` · `pressed` · `selected` · `focus-visible` · `disabled` (shows
`disabledReason` in place of `meta`, at `--text-disabled`).

Selected: `--teal-100` fill, 3px `--teal-900` left rule, `check` icon right-aligned, label weight
600 — **four** simultaneous signals, none of them colour alone.

### 7.5 Accessibility

- `role="radiogroup"` with `aria-labelledby` → the question. Rows are `role="radio"` with
  `aria-checked`.
- Arrow keys move between rows; `Space` selects. Roving `tabindex`.
- Each row's accessible name is `label` + `meta` + `badge` concatenated, so a screen-reader user
  hears "Udupi Cafe, 20 minutes, Rs 25 delivery, your usual".
- Numbered rows: each row is prefixed with a visible number **1 2 3**, so the elder can say "the
  second one" and so the presenter can reference them. The number is part of the accessible name.

### 7.6 Dimensions (390px)

```
Which restaurant?                              ← 24px/600 question

┌────────────────────────────────────────────────┐
│ 1  Udupi Cafe                     ┌──────────┐ │ ← 72px min-height row
│    20 minutes · Rs 25 delivery    │Your usual│ │   label 20px/500
│                                   └──────────┘ │   meta  16px/400 --text-secondary
└────────────────────────────────────────────────┘   badge 16px/500 --text-attention
                     12px gap
┌────────────────────────────────────────────────┐
│ 2  Saravana Bhavan                             │
│    35 minutes · Free delivery                  │
└────────────────────────────────────────────────┘
                     12px gap
┌────────────────────────────────────────────────┐
│ 3  None of these                          52px │ ← escape row, no meta
└────────────────────────────────────────────────┘

Or just say it out loud.                       ← 16px/400 --text-secondary
```

| Property | Value |
|---|---|
| Row min-height | 72px with meta; 52px without |
| Row padding | `--space-4` (16px) vertical, `--space-4` horizontal |
| Number column | 32px wide, 20px/600, `--text-teal` |
| Gap between rows | `--space-3` (12px) |
| Radius / elevation | `--radius-md` / `--elev-1` |
| At 360px | Badge moves **below** the meta line rather than right-aligned; row grows to 96px |
| At 430px | Unchanged |
| Above 150% OS text scale | Meta always stacks below label; badge below meta |

### 7.7 Interaction

- Tap selects **and advances** — no separate "Continue" button. An extra confirm tap on a
  non-consequential choice is friction for its own sake.
- **Exception:** if the choice changes a monetary total, selection returns to `TaskSummary` with the
  change highlighted, and confirmation is re-sought (see §8.5).
- Voice equivalents always work: "the second one", "Udupi", "the first".
- Maximum 4 options. If the engine offers more, `lib/client-api.ts` truncates to the top 3 and
  appends "Show me more" as the escape row — never render a scrolling list of 8 restaurants.

---

## 8. TaskSummary

> **Data-driven by design.** One component renders *every* task type — food order, payment, phone
> call, ride, appointment. The differences are data, not code. This directly mirrors the engine's
> skill-registry architecture: `lib/types.ts` keeps `ORDER_FOOD` logic out of the generic engine,
> and this component keeps it out of the generic UI.

### 8.1 Purpose

The read-back. Everything the elder is about to agree to, in one glance, with anything that changed
since the last read-back visibly marked.

### 8.2 Props

```ts
export interface TaskSummaryProps extends BaseProps {
  /** Free-form task identifier. The component has NO switch on this value —
   *  it is used only for the heading icon and the accessible name. */
  taskType: string;                 // 'order_food' | 'send_payment' | 'phone_help' | …
  /** The human title. e.g. "Food order" / "Payment to Priya" */
  title: string;
  /** THE data-driven core. Rendered in array order. No hard-coded fields. */
  rows: SummaryRow[];
  /** Rendered last, emphasised, in --font-numeric. Optional —
   *  a phone-call task has no total and simply omits it. */
  total?: SummaryTotal;
  /** Rows whose id appears here render with the 'changed' treatment. */
  changedRowIds?: string[];
  simulated?: boolean;
  /** e.g. [{ label: 'Change something', kind: 'text' }] */
  actions?: UiAction[];
  pace?: 'normal' | 'slow';
}

export interface SummaryRow {
  id: string;                       // 'item' | 'from' | 'to' | 'when' | 'recipient' | …
  label: string;                    // "From"
  value: string;                    // "Udupi Cafe"
  icon?: IconName;
  /** Rendered in --font-numeric with tabular-nums. */
  numeric?: boolean;
  /** Shows a small "Change" text action on this row. */
  onEdit?: () => void;
}

export interface SummaryTotal {
  label: string;                    // "Total"
  value: string;                    // "Rs 125"
  /** The prior value, shown struck through beside the new one. */
  previousValue?: string;           // "Rs 145"
  /** One line explaining a difference. */
  note?: string;                    // "Rs 25 delivery charge — the restaurant is farther away"
}
```

⟨contract⟩ `rows` ← derived from `ScreenState.fields` (a `Record<string, unknown>`);
`total` ← `ScreenState.total`; the delivery note ← `ScreenState.deliveryFee`.
**All three names must be verified against the latest `lib/types.ts` before binding.** The
field-key → human-label mapping (`item` → "What", `restaurant` → "From") lives in
`lib/client-api.ts` as a per-skill label map, **never** as a `switch` inside this component.

### 8.3 Why it is data-driven — the rule GLM must not break

> `TaskSummary` contains **no conditional logic keyed on `taskType`.** If a new skill needs a new
> row, it supplies a new `SummaryRow`. If it needs a new *presentation*, that is a new prop on
> `SummaryRow` (like `numeric`), available to all skills.

The failure mode this prevents: `{taskType === 'order_food' && <RestaurantRow/>}`. That is how a
generic engine acquires a non-generic UI, and it is the point at which adding the fourth skill
becomes a UI project instead of a data entry.

Worked example — three task types, one component:

| Task | `rows` | `total` |
|---|---|---|
| Food order | What: Plain Dosa, no chutney · From: Udupi Cafe · To: Home | Total: Rs 125 |
| Payment | To: Priya (daughter) · For: Electricity bill | Amount: Rs 1,240 |
| Phone call | Calling: Sree (son) · Number: ••••••3421 · About: Saturday | *(omitted)* |
| Ride | From: Home · To: Guruvayur Temple · When: Saturday, 9:00 am | Estimated: Rs 380 |

### 8.4 States

`default` · `changed` (rows in `changedRowIds` get an `--surface-attention` background, a 3px
`--amber-500` left rule, and a "changed" chip) · `awaiting-confirmation` (the whole card gains a 2px
`--amber-500` border) · `simulated` · `slow-pace`.

**The changed treatment is permanent, not a flash.** `VISUAL_DESIGN_SYSTEM.md` §10.3 row 17: under
reduced motion — and in fact always, on this component — the highlight persists rather than fading,
because an elder who looked away must still be able to see what changed. This matters
enormously in demo screen 6 (Masala → Plain Dosa, Rs 145 → Rs 125).

### 8.5 Confirmation invalidation

> **Any change to a row or to the total invalidates a pending confirmation.**

Per `../companion/COMPANION_DEMO_SCRIPT.md` §7: *"That correction invalidated the confirmation. Appa
agreed to Rs 125 — not to whatever the total happened to become."*

UI consequence: when `changedRowIds` becomes non-empty while `status === 'awaiting_confirmation'`,
the `ConfirmationScreen` must be **re-presented**, and its question re-spoken with the new total.
The confirm button is disabled for **400ms** after a change lands, so a tap already in flight cannot
confirm the new value. This is a real safety property, not a nicety.

### 8.6 Accessibility

- Rendered as a `<dl>`: `<dt>` = label, `<dd>` = value. Semantically exact and reads correctly.
- Changed rows: the "changed" chip is inside the `<dd>` so the change is announced
  ("What, Plain Dosa, changed").
- `total` uses `aria-label="Total: 125 rupees"` — the visible "Rs 125" would otherwise be read as
  "Rs one two five" by some screen readers.
- The card has `aria-labelledby` → its title.
- `previousValue` is wrapped in `<s>` **and** has visually-hidden text "was", so it is never
  mistaken for the current price.

### 8.7 Dimensions (390px)

```
┌────────────────────────────────────────────────┐
│  🍽  Food order              ┌────────────┐    │ ← 20px/600 title
│                              │ SIMULATED  │    │   chip 16px/600
│  ────────────────────────────────────────────  │
│                                                │
│ ┃ What        Plain Dosa, no chutney  changed  │ ← changed row:
│ ┃                                              │   --surface-attention
│  ────────────────────────────────────────────  │   3px --amber-500 left rule
│   From        Udupi Cafe                       │   chip "changed"
│  ────────────────────────────────────────────  │
│   To          Home                             │ ← 56px min-height per row
│  ────────────────────────────────────────────  │   label 16px/500 --text-secondary
│                                                │   value 20px/500 --text-primary
│   Total       R̶s̶ ̶1̶4̶5̶   Rs 125                  │ ← total row 72px
│               24px --font-numeric              │   struck previous + new
│                                                │
│   The delivery charge is Rs 25 less from       │ ← note, 18px/400
│   this restaurant.                             │
└────────────────────────────────────────────────┘
  342px wide · --radius-md · --elev-1 · 24px padding
```

| Property | Value |
|---|---|
| Row min-height | 56px (label + value on one line at 390) |
| Total row | 72px, top border 1px `--border-strong` |
| Label column | 96px fixed at 390/430; at **360px labels stack above values** and rows grow to 76px |
| Divider | 1px `--border-subtle` between rows, none after the last |
| Note | Full width under the total, `--text-secondary`, min-height 2 Malayalam lines |
| Card padding | `--space-6` (24px) |

### 8.8 Copy

> Title: > **Food order**
> Total note (delivery): > The food price is the same. Today there is a Rs 25 delivery charge
> because the restaurant is farther away.
> Change action: > **Change something**

Never "Order summary" (transactional), never "Cart", never "Checkout".

---

## 9. ConfirmationScreen

### 9.1 Purpose

The single most important screen in the product. Nothing consequential happens without an explicit,
in-the-moment yes. This screen exists so that "yes" is unambiguous, unrushed, and reversible right
up to the moment it is given.

### 9.2 Props

```ts
export interface ConfirmationScreenProps extends BaseProps {
  /** The question. Spoken and shown, word for word identical. */
  question: string;                 // "Shall I place the order?"
  /** The full read-back, rendered above the question. */
  summary: React.ReactNode;         // <TaskSummary/>
  onConfirm: () => void;
  onCancel: () => void;
  /** Third path: change something rather than yes/no. */
  onAmend?: () => void;
  confirmLabel?: string;            // default "Yes, place it"
  cancelLabel?: string;             // default "No, not now"
  amendLabel?: string;              // default "Change something"
  /** Blocks confirm for 400ms after a change lands (§8.5). */
  confirmLockedUntil?: number;      // epoch ms
  busy?: boolean;
  simulated?: boolean;
  pace?: 'normal' | 'slow';
}
```

⟨contract⟩ Presented when `ScreenState.status === 'awaiting_confirmation'`;
`onConfirm` submits an affirmative utterance through the same path a spoken "yes" takes.
**Verify `status` and its `'awaiting_confirmation'` member against the latest `lib/types.ts`.**

### 9.3 Variants

`sheet` (default: bottom sheet at `--radius-lg`, over a `--scrim`, content above still visible) ·
`fullscreen` (`ElderShell layout="focus"`, used when the summary is long or the pace is slow).

### 9.4 States

`default` · `locked` (confirm disabled for 400ms after a change; label unchanged, no explanatory
text — a 400ms flicker of "please wait" would be worse than a brief non-response) · `busy`
(confirm shows "Placing your order…", cancel remains enabled) · `simulated`.

### 9.5 Accessibility

| Concern | Requirement |
|---|---|
| Role | `role="dialog" aria-modal="true"`, `aria-labelledby` → the question |
| Focus | Moves to the **question text**, not to the confirm button. Focusing "Yes" invites an accidental `Space` press. |
| Focus trap | Yes, while open. Returns focus to the invoking element on cancel. |
| `Escape` | Cancels. Equivalent to "No, not now". |
| Voice | "yes" / "no" / "wait" always work. The button is an *alternative*, never a requirement. |
| Announcement | The question is announced once. `TaskSummary` is `aria-live="off"` here — the summary is already visible and re-announcing it on every render would be a wall of speech. |
| Button order | Confirm first in DOM and visually top; cancel second; amend third as a text action |

### 9.6 Dimensions (390px, `sheet`)

```
        ░░░░░░ scrim rgba(31,36,33,0.45) ░░░░░░
┌────────────────────────────────────────────────┐ ← --radius-lg top corners
│                    ▬▬▬▬                        │ ← 40×4px grabber --border-strong
│  24px                                          │
│  ┌──────────────────────────────────────────┐  │
│  │  <TaskSummary/>                          │  │
│  └──────────────────────────────────────────┘  │
│                    24px                        │
│  Shall I place the order?                      │ ← 28px/600 --text-guidance-lg
│                                                │   min-height 92px (2 ml lines)
│                    32px                        │
│  ┌──────────────────────────────────────────┐  │
│  │           Yes, place it                  │  │ ← 64px, --teal-900, 20px/600
│  └──────────────────────────────────────────┘  │
│                    12px                        │
│  ┌──────────────────────────────────────────┐  │
│  │           No, not now                    │  │ ← 52px, secondary
│  └──────────────────────────────────────────┘  │
│                    16px                        │
│           Change something                     │ ← text action, 52px hit area
│  24px + --safe-bottom                          │
└────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Sheet max-height | 88dvh; the summary area scrolls, the action block never does |
| Confirm button | 64px tall, full content width, `--teal-900`, 20px/600 |
| Cancel button | 52px, `--teal-100` secondary |
| Buttons | **Always stacked.** Never side-by-side, at any viewport (see §6.6). |
| Gap | `--space-3` (12px) between confirm and cancel |
| Amend | Text action, 52px hit area, `--text-teal` |
| At 360px | Identical proportions; content column 312px |
| At 430px | Identical; buttons 382px wide |

### 9.7 Copy

> Question: > **Shall I place the order?**
> Confirm: > **Yes, place it**
> Cancel: > **No, not now**
> Amend: > **Change something**
> Busy: > **Placing your order…**

Rules:

- The confirm label **names the action** ("Yes, place it", "Yes, call Sree", "Yes, send it") —
  never a bare "Yes", "OK", or "Confirm". If the elder taps it having forgotten what screen they
  are on, the label alone must tell them what they just agreed to.
- The cancel label is **"No, not now"** — not "Cancel", which reads as abandoning everything, and
  not "Dismiss".
- The on-screen question is **word-for-word identical** to the spoken question. Divergence between
  what an elder hears and what they read is a trust failure.

### 9.8 Implementation notes for GLM

1. `confirmLockedUntil` must be honoured on the **handler**, not only in the disabled attribute —
   a queued touch event can fire after re-enable.
2. `onConfirm` must be idempotent and guarded against double-fire.
3. Never auto-confirm on a timeout. Never pre-select the confirm button. Never make cancel harder
   to hit than confirm.
4. The sheet must not close on scrim tap. An accidental background tap must not cancel a task the
   elder spent a minute building. Cancel is explicit: the button or `Escape`.

---

## 10. CompletionReceipt

### 10.1 Purpose

It is done, this is exactly what happened, and here is who was told. Ends the task cleanly so the
elder is never left wondering whether it worked.

### 10.2 Props

```ts
export interface CompletionReceiptProps extends BaseProps {
  title: string;                    // "Your order is placed"
  /** The same rows the elder confirmed. Rendered read-only. */
  summary: React.ReactNode;         // <TaskSummary/> with actions omitted
  timestamp: string;                // pre-formatted, e.g. "Today at 1:20 pm"
  simulated: boolean;               // REQUIRED here, not optional
  /** e.g. "Sree was told you placed an order." Omitted when nobody was told. */
  familyNotice?: string;
  /** Corrections made during the task, shown as a quiet trail. */
  corrections?: string[];
  actions?: UiAction[];             // e.g. "Done", "Tell me again"
}
```

⟨contract⟩ Maps from `SimulatedReceipt` (`simulated`, `summary`, `corrections`, `ts`) and
`Receipt.familyNotified`. **Verify all of these against the latest `lib/types.ts` — `Receipt`,
`Txn`, and `SimulatedReceipt` are separate shapes in the current file and may consolidate.**

### 10.3 Variants

`success` (the norm) · `partial` (something succeeded and something did not — e.g. the order placed
but the family notification failed; renders `attention` tone with both facts stated plainly).

### 10.4 States

`entering` (check mark draws over `--dur-slow`; reduced-motion: appears instantly) · `settled`.

### 10.5 Accessibility

- `role="status" aria-live="polite"`. Announced once on mount.
- The check icon is `aria-hidden`; the word "Done" carries the meaning.
- The `SIMULATED` chip is **not** `aria-hidden` — a screen-reader user must hear it too.
- Focus moves to the receipt heading on mount.

### 10.6 Dimensions (390px)

```
┌────────────────────────────────────────────────┐
│                                                │
│                    ✓                           │ ← 48px check, --green-600
│                                                │   stroke 3px, centred
│         Your order is placed                   │ ← 24px/600, centred
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ SIMULATED                                │  │ ← full-width chip, --surface-2
│  └──────────────────────────────────────────┘  │   16px/600, 44px tall
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ <TaskSummary read-only/>                 │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Today at 1:20 pm                              │ ← 16px/500 --text-secondary
│                                                │
│  ────────────────────────────────────────────  │
│  Sree was told you placed an order.            │ ← 18px/400
│                                                │
│  You changed: Masala Dosa → Plain Dosa         │ ← 16px/400 --text-secondary
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │                 Done                     │  │ ← 64px primary
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
  --surface-success background · --radius-md · 24px padding
```

| Property | Value |
|---|---|
| Check icon | 48px, `--green-600`, stroke 3px |
| Title | `--text-guidance` (24px/600), centred |
| SIMULATED chip | Full-width bar, 44px, `--surface-2`, `--text-secondary` — deliberately prominent |
| Corrections trail | Max 3 lines; beyond that, "and 2 more changes" |
| At 360px | Identical, 312px column |

### 10.7 Copy

> Title: > **Your order is placed**
> Simulated: > **SIMULATED** — this is a demonstration. No real order was placed and no money moved.
> Family: > Sree was told you placed an order.
> No family notice: *(omit the line entirely — never "Nobody was notified", which sounds like a failure)*
> Correction trail: > You changed: Masala Dosa → Plain Dosa
> Action: > **Done**

---

## 11. SafetyWarning

### 11.1 Purpose

The refusal. An elder has been asked for an OTP, a PIN, a card number, or a password. Thuna refuses,
explains why in one sentence, and offers a real person. This screen is the product's credibility.

### 11.2 Props

```ts
export interface SafetyWarningProps extends BaseProps {
  /** The refusal. Short, calm, non-alarming. */
  headline: string;                 // "Please don't share that with anyone."
  /** One sentence of reason. Never a lecture. */
  reason: string;                   // "A real bank will never ask for an OTP."
  /** The human bridge. Almost always present. */
  handoff?: { label: string; personName: string; onSelect: () => void };
  onDismiss: () => void;
  dismissLabel?: string;            // default "I understand"
  /** Optional single line of what to do instead. */
  advice?: string;
}
```

⟨contract⟩ Presented when the route decision is `type: 'risky'` (from `quickCheck()` in
`lib/router.ts`) or `EngineResponse.action === 'refuse'`. **Verify `RouteType`'s `'risky'` member
and `EngineAction`'s `'refuse'` member against the latest `lib/types.ts`.**

### 11.3 The design constraints that are non-negotiable

| Constraint | Reason |
|---|---|
| **Appears instantly. `--dur-instant`. No animation, ever.** | An animated warning reads as theatrical. This one is real. |
| **Never contains an input field of any kind** | The screen that refuses to handle a credential must not be capable of receiving one |
| **Never repeats the credential** | Not in the headline, not in a transcript, not in the DOM. Per `../companion/DIGITAL_SAFETY_POLICY.md` §2, Thuna will never "repeat aloud or type into anything". `VoiceStatePanel`'s transcript is **cleared** when this screen mounts. |
| **The primary action is the human handoff, not dismissal** | The elder's real next step is talking to their son, not tapping OK |
| **Calm, not alarming** | No siren red, no full-bleed red background, no exclamation mark, no shouting. A panicking elder makes worse decisions than a calm one. The tone is a trusted person saying "don't do that" — steady, not shrill. |
| **No blame** | Never "you almost gave away", never "that was dangerous of you". The scammer did this, not the elder. |
| **Nothing is stored beyond "a risk was refused"** | Per `DIGITAL_SAFETY_POLICY.md`; the UI must not offer "see this in your history" |

### 11.4 Variants

`credential` (OTP / PIN / card / password — the primary case) · `secrecy` ("they said not to tell my
son" — the highest-signal fraud indicator; headline changes, handoff emphasis increases).

### 11.5 States

`shown` · `handoff-offered` · `handoff-accepted` (transitions to `FamilyHandoff`) · `dismissed`.

### 11.6 Accessibility

| Concern | Requirement |
|---|---|
| Role | `role="alertdialog" aria-modal="true"` |
| Live region | `aria-live="assertive"` — the **only** assertive region in the product |
| Focus | Moves to the headline on mount. Trapped. |
| `Escape` | Dismisses, equivalent to "I understand". It is never a trap. |
| Colour independence | Shield icon + the words + `--surface-danger` — three signals |
| Contrast | `--text-danger` on `--surface-danger` = 7.6:1, AAA |

### 11.7 Dimensions (390px, `ElderShell layout="focus" surface="danger"`)

```
┌────────────────────────────────────────────────┐
│                                                │ ← --surface-danger full page
│              48px top padding                  │
│                                                │
│                   🛡                            │ ← shield, 48px, --red-700
│                                                │   stroke 3px, centred
│              24px                              │
│                                                │
│   Please don't share that                      │ ← 28px/600 --text-danger
│   with anyone.                                 │   min-height 92px (2 ml lines)
│                                                │
│              16px                              │
│                                                │
│   A real bank will never ask for an OTP —      │ ← 18px/400 --text-primary
│   not even Thuna.                              │   min-height 64px
│                                                │
│              32px                              │
│  ┌──────────────────────────────────────────┐  │
│  │        Ask Sree to call you              │  │ ← 64px, --teal-900 PRIMARY
│  └──────────────────────────────────────────┘  │   (not red — the safe action
│              12px                              │    is not the dangerous one)
│  ┌──────────────────────────────────────────┐  │
│  │           I understand                   │  │ ← 52px secondary
│  └──────────────────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Page background | `--surface-danger` (`#F9E7E5`) — a *tint*, never `--red-700` full-bleed |
| Icon | 48px shield, `--red-700`, stroke 3px |
| Headline | `--text-guidance-lg` (28px/600), `--text-danger` |
| Reason | `--text-body` (18px), `--text-primary` — the reason is not itself alarming |
| **Handoff button is `--teal-900`, not red** | The handoff is the *safe* action. Colouring it red would make the good choice look dangerous. |
| Bottom navigation | **Hidden.** There is one thing to do here. |
| TalkButton | Hidden. This screen is not a conversation turn. |
| At 360px | Identical; headline wraps to 3 lines, reserve 138px |

### 11.8 Copy

> **Credential variant**
> Headline: > **Please don't share that with anyone — not even with me.**
> Reason: > A real bank will never ask for an OTP.
> Handoff: > **Ask Sree to call you**
> Dismiss: > **I understand**

> **Secrecy variant**
> Headline: > **Please don't keep this from your family.**
> Reason: > Anyone who asks you to keep a payment secret is not from your bank.
> Handoff: > **Ask Sree to call you now**
> Dismiss: > **I understand**

Never: "SECURITY ALERT", "⚠️ WARNING", "Fraud detected", "You are being scammed", or any
all-caps line. Never a code. Never a link to "learn more about fraud".

---

## 12. CheckInScreen

> **Data-driven by design.** One component for every proactive contact Thuna initiates: a medicine
> reminder, a returning pending loop, a life-event reminder, a daily brief prompt. The *type* is
> data, never a code branch.

### 12.1 Purpose

The screen an elder sees when **Thuna started the conversation**. Per
`../companion/CHECKIN_CONVERSATION_POLICY.md` §3, it must state **who, why, and how to stop** —
in that order — before anything else.

### 12.2 Props

```ts
export interface CheckInScreenProps extends BaseProps {
  /** Free-form. Used for the icon and the accessible name ONLY.
   *  This component contains no switch on this value. */
  checkInType: string;
  // 'routine_reminder' | 'pending_loop' | 'life_event_reminder'
  // | 'missed_followup' | 'daily_brief' | 'consent_request' | …

  /** WHO — always rendered first. Fixed by policy. */
  identity: string;                 // "Hello Appa, it's Thuna."
  /** WHY — the stated purpose. One sentence, always specific. */
  purpose: string;                  // "Earlier you asked me to remind you about Sree."
  /** HOW TO STOP — always present, always a real control. */
  stopAction: UiAction;             // { label: "Not now", kind: 'secondary' }

  /** What Thuna is asking for. Optional — some check-ins only inform. */
  prompt?: string;                  // "Shall I call him?"
  /** 0–2 affirmative actions. */
  actions?: UiAction[];
  /** Optional context card, e.g. a PendingLoopCard or a small TaskSummary. */
  context?: React.ReactNode;

  icon?: IconName;
  tone?: Tone;                      // default 'attention'
  /** Rendered inline so the elder can simply answer aloud. */
  showTalkButton?: boolean;         // default true
  timeLabel?: string;               // "After dinner, as you asked"
}
```

⟨contract⟩ `checkInType` maps to the proactive-contact taxonomy in
`../companion/PROACTIVE_COMPANION_POLICY.md`; `purpose` must trace to a stored reason, never a
generic greeting; `stopAction` is required by policy, not by the UI.
**Verify the record field names (`PendingLoop` payload, routine ids) against the latest release.**

### 12.3 Why it is data-driven — the rule GLM must not break

> `CheckInScreen` contains **no conditional logic keyed on `checkInType`.** A new proactive contact
> type is a new data object, not a new component and not a new branch.

Four check-in types through the same component:

| `checkInType` | `identity` | `purpose` | `prompt` | `actions` |
|---|---|---|---|---|
| `routine_reminder` | Hello Appa, it's Thuna. | It's nine o'clock — time for your morning medicine. | — | [I've taken it] |
| `pending_loop` | Hello Appa, it's Thuna. | Earlier you asked me to remind you to check with Sree about Saturday. | Shall I call him now? | [Yes, call Sree] |
| `life_event_reminder` | Hello Appa, it's Thuna. | Meera's wedding is on Saturday morning at Guruvayur. | — | [Thank you] |
| `consent_request` | Hello Appa, it's Thuna. | You didn't answer this morning's reminder. | Would you like me to let Sree know when that happens? | [Yes, tell Sree] · [No, keep it between us] |

The `consent_request` row is worth pointing at in the demo: it is the same component asking for
*permission*, and its default is refusal (`../companion/FAMILY_CONSENT_POLICY.md` §2 — consent is
never inferred from silence).

### 12.4 States

`arriving` (fade + 8px rise, `--dur-slow`) · `awaiting-response` · `stopping` (acknowledges
immediately: "Alright." then dismisses in 1200ms) · `responded`.

### 12.5 Accessibility

| Concern | Requirement |
|---|---|
| Role | `role="dialog" aria-modal="false"` — deliberately **not** modal; the elder can navigate away without answering |
| Focus | Moves to the identity line, not to any button |
| Announcement | Identity + purpose + prompt announced together as one `aria-live="polite"` block, in that order |
| The stop control | **Always the last tab stop and always reachable without scrolling.** If the content is tall enough to scroll, the stop action pins to the bottom of the viewport. A stop control below the fold is not a stop control. |
| `Escape` | Equivalent to the stop action |
| Voice | "stop", "not now", "later" all trigger `stopAction` |

### 12.6 Dimensions (390px)

```
┌────────────────────────────────────────────────┐
│  48px top                                      │
│   🕐   After dinner, as you asked               │ ← 16px/500 --text-attention
│                                                │   icon 24px
│  16px                                          │
│   Hello Appa, it's Thuna.                      │ ← 24px/600, min-height 82px
│                                                │
│  8px                                           │
│   Earlier you asked me to remind you to        │ ← 20px/400, min-height 68px
│   check with Sree about Saturday.              │
│                                                │
│  24px                                          │
│   Shall I call him now?                        │ ← 24px/600
│                                                │
│  32px                                          │
│  ┌──────────────────────────────────────────┐  │
│  │            Yes, call Sree                │  │ ← 64px primary
│  └──────────────────────────────────────────┘  │
│  12px                                          │
│  ┌──────────────────────────────────────────┐  │
│  │              Not now                     │  │ ← 52px secondary — the STOP
│  └──────────────────────────────────────────┘  │
│  24px                                          │
│              ╭──────────╮                      │
│              │    ▮     │  64px inline         │ ← inline TalkButton
│              ╰──────────╯                      │
│              Or just answer                    │ ← 16px --text-secondary
└────────────────────────────────────────────────┘
   --surface-attention page tint · nav hidden
```

| Property | Value |
|---|---|
| Page | `--surface-attention` tint, `ElderShell layout="focus"` |
| Identity | `--text-guidance` (24px/600) |
| Purpose | `--text-secondary-lg` (20px/400) |
| Prompt | `--text-guidance` (24px/600) |
| Stop action | 52px, secondary, **always visible without scrolling** |
| Inline TalkButton | 64px (`size="inline"`) |
| At 360px | Identical; purpose may reach 3 lines — reserve 102px |

### 12.7 Copy

> Identity: > **Hello Appa, it's Thuna.**
> Purpose: > Earlier you asked me to remind you to check with Sree about Saturday.
> Stop offer (spoken, first two sentences): > Say 'stop' any time if you'd rather not now.
> Prompt: > **Shall I call him now?**
> Affirmative: > **Yes, call Sree**
> Stop: > **Not now**
> Acknowledgement on stop: > **Alright.** *(and nothing else — no "are you sure?", no re-ask)*

Prohibited copy, per `CHECKIN_CONVERSATION_POLICY.md` §4:

| Never | Why |
|---|---|
| "How are you feeling today?" as a lead-in | A pretext |
| "You really must do this now" | Manufactured urgency; Thuna has no authority |
| "You missed it yesterday too" | Guilt |
| Re-asking after a refusal | Refusal is a complete answer |
| "Are you sure?" after "Not now" | Persistence after refusal |

---

## 13. LifeEventConfirmation

### 13.1 Purpose

"Shall I remember this for you?" — the confirm-before-memory gate. An extracted event (from a
photographed invitation, a document, a spoken sentence) is a **candidate** until the elder says yes.
Nothing is stored before that.

### 13.2 Props

```ts
export interface LifeEventConfirmationProps extends BaseProps {
  /** "It looks like a wedding invitation." */
  intro: string;
  /** The extracted fields. Individually correctable. */
  fields: EventField[];
  /** "Shall I remember this for you?" */
  question: string;
  onConfirm: () => void;
  onReject: () => void;
  onEditField?: (fieldId: string) => void;
  /** Field ids the elder has corrected in this session. */
  correctedFieldIds?: string[];
  /** The reminder schedule that will be created. Shown BEFORE confirming. */
  reminderPreview?: string[];
  /** Thumbnail of the source document, if any. */
  sourcePreview?: { src: string; alt: string };
  /** Explicit: this has not been saved yet. */
  candidateNotice?: string;         // default per §13.7
}
```

⟨contract⟩ `fields` ← the extracted `LifeEvent` payload; the "candidate until confirmed" behaviour
is specified in `../companion/CONFIRM_BEFORE_MEMORY.md`; `reminderPreview` ← the schedule the
declarative policy engine would create (`../companion/REMINDER_POLICY_ENGINE.md`).
**Verify the `LifeEvent` field names against the latest release.**

```ts
export interface EventField {
  id: string;                       // 'what' | 'who' | 'where' | 'when' | 'relation'
  label: string;                    // "When"
  value: string;                    // "Saturday, 8 August, 10:30 in the morning"
  /** Struck-through prior value after a correction. */
  previousValue?: string;
  editable?: boolean;               // default true
}
```

### 13.3 Variants

`from-document` (includes `sourcePreview`) · `from-speech` (no thumbnail) ·
`correction` (one or more `correctedFieldIds` present; the question re-asks: "Is that right?").

### 13.4 States

`candidate` (the default and the important one — a persistent "Not saved yet" notice is visible) ·
`corrected` · `confirmed` (transitions to a success `GuidanceCard` plus the reminder schedule) ·
`rejected` (the candidate is discarded; a brief "I won't remember it, then.").

### 13.5 The correction behaviour that carries demo screens 9–10

When the elder says "it's not Sunday, it's Saturday":

1. **Only the `when` field changes.** Every other field keeps its value **and its provenance**.
2. The changed field shows the previous value struck through beside the new one, permanently.
3. The question changes from "Shall I remember this?" to **"Is that right?"** and is re-spoken.
4. A separate correction ("Meera is my brother's daughter") **adds** a `relation` field rather than
   replacing anything.

This one-field-changes behaviour is the visible proof of
`../companion/MEMORY_CORRECTION_AND_SUPERSESSION.md`, and it is what a judge is watching for.

### 13.6 Dimensions (390px)

```
┌────────────────────────────────────────────────┐
│  ┌────────┐                                    │
│  │ [img]  │  It looks like a wedding           │ ← 20px/500 intro
│  │  96px  │  invitation.                       │   thumbnail 96×96, --radius-sm
│  └────────┘                                    │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  NOT SAVED YET                           │  │ ← 16px/600 --text-attention
│  └──────────────────────────────────────────┘  │   --surface-attention, 44px
│                                                │
│   What      Meera and Arun's wedding    Change │ ← 64px per field row
│   ──────────────────────────────────────────── │   label 16px/500 --text-secondary
│   Who       Meera, your brother's       Change │   value 20px/500
│             daughter                           │   Change = 52px hit area
│   ──────────────────────────────────────────── │
│  ┃When      S̶u̶n̶d̶a̶y̶ ̶9̶ ̶A̶u̶g̶  Saturday,   Change │ ← corrected row:
│  ┃          8 August, 10:30 am    ┌─────────┐ │   --surface-attention
│  ┃                                │ changed │ │   3px --amber-500 left rule
│   ──────────────────────────────────────────── │
│   Where     Guruvayur                   Change │
│                                                │
│  ────────────────────────────────────────────  │
│   I'll remind you:                             │ ← 18px/500
│   • A week before                              │ ← 18px/400, 32px rows
│   • The evening before                         │
│   • On the morning itself                      │
│                                                │
│   Is that right?                               │ ← 24px/600
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │        Yes, remember it                  │  │ ← 64px primary
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │           No, forget it                  │  │ ← 52px secondary
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Thumbnail | 96 × 96px, `--radius-sm`, `object-fit: cover` |
| "NOT SAVED YET" | 44px full-width bar, `--surface-attention`, `--text-attention`, 16px/600 |
| Field row | 64px min; corrected rows 88px (two value lines) |
| "Change" action | 52px hit area, `--text-teal`, 16px/500 — text, never a pencil icon alone |
| Reminder preview | Bulleted, 32px per row, `--text-body` |
| At 360px | Thumbnail drops to 80px; "Change" moves below the value, row grows to 96px |

### 13.7 Accessibility

- Fields as a `<dl>`; corrected fields announce "When, Saturday 8 August 10:30 am, changed from
  Sunday 9 August".
- The "NOT SAVED YET" notice is inside the `aria-labelledby` chain, so a screen-reader user hears
  the candidate status before the fields.
- Focus moves to the intro line on mount, not to "Yes".

### 13.8 Copy

> Intro: > **It looks like a wedding invitation.**
> Candidate notice: > **NOT SAVED YET**
> Question (first ask): > **Shall I remember this for you?**
> Question (after a correction): > **Is that right?**
> Confirm: > **Yes, remember it**
> Reject: > **No, forget it**
> After confirming: > I'll remind you a week before, the evening before, and on the morning itself.
> After rejecting: > **I won't remember it, then.**

---

## 14. DailyBrief

### 14.1 Purpose

"What's coming up." Three items at most, prioritised and deduplicated, ending with a clear full
stop. Per `../companion/DAILY_LIFE_BRIEF.md`: **a favour, not a report.**

### 14.2 Props

```ts
export interface DailyBriefProps extends BaseProps {
  greeting: string;                 // "Good morning, Appa."
  /** MAX 3. The component renders at most 3 and ignores extras. */
  items: BriefItem[];
  /** The explicit ending. Always rendered. */
  closing: string;                  // "That's all."
  /** Shown when items is empty — but see §14.4: usually the brief is skipped. */
  emptyMessage?: string;
  onItemSelect?: (id: string) => void;
  /** "Not today" / "Stop these" — always available, never buried. */
  briefControls?: UiAction[];
}

export interface BriefItem {
  id: string;
  /** "Meera's wedding is on Saturday." */
  text: string;
  /** "Saturday" — rendered as a small leading time chip. */
  timeLabel?: string;
  icon?: IconName;
  tone?: Tone;                      // 'attention' for anything needing the elder's action
}
```

⟨contract⟩ Items are already prioritised and deduplicated upstream
(`../companion/PRIORITY_AND_DEDUP_POLICY.md`). **The UI does no sorting, no filtering, and no
deduplication** — if the same wedding appears twice, that is an upstream bug and must be visible as
one, not hidden by the view.

### 14.3 Variants

`morning` (with greeting) · `on-demand` (elder asked "what's coming up?" — no greeting, straight to
items).

### 14.4 States

`with-items` · `empty`. **Empty is normally not rendered at all** — per `DAILY_LIFE_BRIEF.md` §2,
"nothing to say → say nothing". `emptyMessage` exists only for the on-demand variant, where the
elder asked and deserves an answer:

> "Nothing on the calendar today."

### 14.5 Accessibility

- `<section aria-labelledby>` → the greeting; items as an `<ol>` (order is meaningful — it is the
  priority order).
- Announced as one block, not item by item.
- The closing line is inside the announced block so the ending is audible, not just visual.

### 14.6 Dimensions (390px)

```
Good morning, Appa.                            ← 32px/600 --text-greeting
                                                 min-height 104px (2 ml lines)
      24px
┌────────────────────────────────────────────────┐
│ 📅  Saturday                                    │ ← time chip 16px/500 --text-attention
│     Meera's wedding is on Saturday.            │ ← 20px/400
└────────────────────────────────────────────────┘   80px min-height row
      12px
┌────────────────────────────────────────────────┐
│ ⚡  Tuesday                                     │
│     The electricity bill is due on Tuesday.    │
└────────────────────────────────────────────────┘
      12px
┌────────────────────────────────────────────────┐
│ 🕐  Still open                                  │ ← attention tone: 4px left rule
│     You still wanted to ask Sree about         │
│     Saturday.                                  │
└────────────────────────────────────────────────┘   104px (3 lines)
      24px
That's all.                                    ← 20px/500 --text-secondary
```

| Property | Value |
|---|---|
| Greeting | `--text-greeting` (32px/600) — the largest type in the product |
| Item row | 80px min, 104px with a 2-line text |
| Item text | `--text-secondary-lg` (20px/400) |
| Time chip | 16px/500, above the text, tone-coloured |
| Max items | **3.** Hard cap. |
| Closing | `--text-secondary-lg`, `--text-secondary` |
| At 360px | Greeting may wrap to 2 lines — the 104px reserve already accounts for it |

### 14.7 Copy

> Greeting: > **Good morning, Appa.**
> Items: > Meera's wedding is on Saturday. · The electricity bill is due on Tuesday. · You still
> wanted to ask Sree about Saturday.
> Closing: > **That's all.**
> Controls: > **Not today** · **Stop these**

The closing full stop is load-bearing: it tells the elder the list has ended so they are not waiting
for more. Never end with "…and that's your day!" or any exclamation.

---

## 15. PendingLoopCard

### 15.1 Purpose

An open thread — something said in passing that Thuna is holding. *"Ask Sree if he's coming
Saturday."* It is the visible form of the product's central claim: continuity.

### 15.2 Props

```ts
export interface PendingLoopCardProps extends BaseProps {
  /** "Ask Sree if he's coming on Saturday" */
  what: string;
  /** The elder's own words, quoted, when available. */
  originalWords?: string;           // "Ask Sree if he is coming on Saturday"
  /** The anchor, in the elder's terms — NOT a clock time. */
  anchor: string;                   // "After dinner"
  status: 'open' | 'scheduled' | 'due' | 'done' | 'dropped';
  /** When it was created, human-formatted. "You said this this afternoon." */
  createdLabel?: string;
  actions?: UiAction[];             // "Do it now" · "Change when" · "Forget it"
  onSelect?: () => void;
}
```

⟨contract⟩ Maps from the `PendingLoop` payload defined in `../companion/PENDING_LOOPS.md`.
`anchor` is deliberately **not** a timestamp — "after dinner" and "when my pension arrives" are
valid values and must render verbatim. **Verify the `PendingLoop` field names against the latest
release; the doc is the canonical definition and other docs must not redefine it.**

### 15.3 Variants / status treatments

| `status` | Surface | Left rule | Chip |
|---|---|---|---|
| `open` | `--surface-1` | none | "No time set yet" |
| `scheduled` | `--surface-1` | 3px `--teal-900` | the anchor, e.g. "After dinner" |
| `due` | `--surface-attention` | 4px `--amber-500` | "Now" |
| `done` | `--surface-success` | 3px `--green-600` | "Done" |
| `dropped` | `--surface-2` | none | "Let go" |

`open` is a **valid resting state**, not an error — `PENDING_LOOPS.md` §1 is explicit that a loop
may have no trigger time at all. The UI must never nag the elder to set one.

### 15.4 States

`default` · `pressed` · `expanded` (shows `originalWords` and `createdLabel`).

### 15.5 Accessibility

- `<article>` with `aria-labelledby` → `what`.
- The status chip text is part of the accessible name.
- If `onSelect` is present the whole card is a button; the inner `actions` then become a separate
  row below it, never nested buttons inside a button.

### 15.6 Dimensions (390px)

```
┌────────────────────────────────────────────────┐
│┃ ┌───────────────┐                             │ ← 3px left rule
│┃ │ After dinner  │                             │ ← chip 16px/500
│┃ └───────────────┘                             │
│┃                                               │
│┃  Ask Sree if he's coming on Saturday          │ ← 20px/500, min-height 68px
│┃                                               │
│┃  You said this this afternoon.                │ ← 16px/400 --text-secondary
│┃                                               │
│┃  Do it now          Change when               │ ← two text actions, 52px each
└────────────────────────────────────────────────┘
  342px · --radius-md · --elev-1 · 20px padding · min-height 132px
```

| Property | Value |
|---|---|
| Min-height | 132px; 168px expanded |
| Padding | `--space-4` + `--space-1` = 20px |
| Actions | Inline text actions, 52px hit height, `--space-6` apart. At 360px they **stack**. |

### 15.7 Copy

> What: > **Ask Sree if he's coming on Saturday**
> Anchor chip: > **After dinner**
> Created: > You said this this afternoon.
> Open status: > **No time set yet**
> Actions: > **Do it now** · **Change when** · **Forget it**

Never "Overdue", never "You forgot", never a red treatment for an unfinished loop. An untouched
loop is not a failure — the entire point is that the elder did not have to hold it.

---

## 16. FamilyHandoff

### 16.1 Purpose

The bridge to a real person. Thuna hands off when that is the right answer — and per
`../companion/HUMAN_ATTENTION_BRIDGE.md`, a handoff **resolves**; it is never a failure state and
must never be presented as one.

### 16.2 Props

```ts
export interface FamilyHandoffProps extends BaseProps {
  /** Who. */
  person: { name: string; relation: string; avatarInitials?: string };
  /** Why, in the elder's terms. Shown to the elder AND sent to the person. */
  reason: string;                   // "Appa would like to talk to you."
  /** Exactly what will be sent. Shown BEFORE sending. Nothing else goes. */
  messagePreview: string;
  onSend: () => void;
  onCancel: () => void;
  /** Alternative: call directly instead of messaging. */
  onCallDirect?: () => void;
  status?: 'offering' | 'sending' | 'sent' | 'failed';
  /** "Sree usually replies within the hour." Optional, never a promise. */
  expectation?: string;
  simulated?: boolean;
  /** Consent categories the elder has granted this person. Read-only here. */
  consentSummary?: string;
}
```

⟨contract⟩ `person` ← `Contact` (`id`, `name`, `relation`); the send path is a
`NotificationPayload` via the notification adapter (`../docs/contracts/notification-adapter.ts`).
**Verify `Contact` and the notification payload shape against the latest release.**

### 16.3 The rules that constrain this component

Per `HUMAN_ATTENTION_BRIDGE.md` §6 and `FAMILY_CONSENT_POLICY.md`:

| Rule | UI consequence |
|---|---|
| **The full message is shown before it is sent** | `messagePreview` is mandatory and always visible. No "…" truncation. |
| **The payload carries no attempt counts, no difficulty descriptions, no capability assessment** | There is no "Appa tried 3 times" line. If it is not in `messagePreview`, it is not sent. |
| **A family member cannot initiate a handoff on the elder's behalf** | This component has no inbound variant |
| **A handoff never inherits authority** | No "Sree can now approve orders" affordance exists |
| **A handoff is a resolution, not a failure** | Success copy is warm and final: "Sree knows." — never "Escalated" or "Unresolved" |

### 16.4 States

`offering` · `sending` (button → "Sending…") · `sent` (success card + "Sree knows.") ·
`failed` (plain reason + retry; never blames the elder).

### 16.5 Accessibility

- `messagePreview` is inside a `<blockquote>` with a visually-hidden "The message that will be
  sent:" label, so a screen-reader user hears the framing before the content.
- Focus moves to the person's name on mount.
- The avatar (initials in a circle) is `aria-hidden`; the name carries the meaning.

### 16.6 Dimensions (390px)

```
┌────────────────────────────────────────────────┐
│      ╭──────╮                                  │
│      │  S   │   Sree                           │ ← 56px initials circle
│      ╰──────╯   Your son                       │   --teal-100, --text-teal 24px/600
│                                                │   name 24px/600, relation 18px
│  24px                                          │
│   Appa would like to talk to you.              │ ← 20px/400 reason
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ The message Sree will get:               │  │ ← 16px/500 --text-secondary
│  │                                          │  │
│  │ "Appa asked me to let you know he'd      │  │ ← 18px/400 --text-primary
│  │  like to talk to you about Saturday."    │  │   --surface-2, --radius-md
│  │                                          │  │   16px padding, min 96px
│  │                        ┌────────────┐    │  │
│  │                        │ SIMULATED  │    │  │
│  └──────────────────────────────────────────┘  │
│  24px                                          │
│   Sree usually replies within the hour.        │ ← 16px/400 --text-secondary
│  32px                                          │
│  ┌──────────────────────────────────────────┐  │
│  │            Send to Sree                  │  │ ← 64px primary
│  └──────────────────────────────────────────┘  │
│  12px                                          │
│  ┌──────────────────────────────────────────┐  │
│  │              Not now                     │  │ ← 52px secondary
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Avatar | 56px circle, `--teal-100` fill, initials 24px/600 `--text-teal`. **Initials only — never a photograph, never an illustrated face.** |
| Message preview | `--surface-2`, `--radius-md`, min-height 96px, never truncated |
| At 360px | Avatar 48px; layout otherwise identical |

### 16.7 Copy

> Reason: > **Appa would like to talk to you.**
> Preview label: > The message Sree will get:
> Preview: > "Appa asked me to let you know he'd like to talk to you about Saturday."
> Send: > **Send to Sree**
> Cancel: > **Not now**
> Sent: > **Sree knows.** He'll get in touch.
> Failed: > **I couldn't reach Sree just now.** [Try again] — *(never "Delivery failed", never a
> code, never "Sree did not respond")*

---

## 17. MemoryReview

### 17.1 Purpose

What Thuna remembers, in the elder's own terms, with correction and deletion always one tap away.
This is the screen that makes the memory *the elder's*, not the system's.

### 17.2 Props

```ts
export interface MemoryReviewProps extends BaseProps {
  /** Grouped for scanability. Order is meaningful. */
  groups: MemoryGroup[];
  onCorrect: (itemId: string) => void;
  onForget: (itemId: string) => void;
  /** "Thuna remembers 14 things." Never a database count aesthetic. */
  summaryLine?: string;
  emptyMessage?: string;
}

export interface MemoryGroup {
  id: string;
  title: string;                    // "People" | "Dates coming up" | "What you like"
  items: MemoryItem[];
}

export interface MemoryItem {
  id: string;
  /** In the elder's own framing. "Meera is your brother's daughter." */
  text: string;
  /** Where it came from, plainly. "You told me this on Tuesday." */
  provenance?: string;
  /** If it replaced something. "You corrected this from Sunday." */
  supersedes?: string;
  /** Shown only when the elder is reviewing something Thuna inferred. */
  confidence?: 'certain' | 'unsure';
}
```

⟨contract⟩ Maps from `MemoryRecord` (`../companion/MEMORY_MODEL.md` — envelope: `id`, `category`,
`source`, `evidence`, `confidence`, `consentScope`, `createdAt`, `supersededBy`, `sharingClass`,
`deletionState`). **The UI renders `provenance` as a sentence, never the raw envelope. Verify the
envelope field names against the latest release.**

### 17.3 What the UI must not expose

| Never shown | Why |
|---|---|
| Raw record ids, categories, `sharingClass`, `deletionState` | Database vocabulary, not the elder's |
| A confidence percentage | "84% confident" is meaningless and mildly insulting |
| A timeline / graph / stats view | That is a dashboard; see the prohibition in `VISUAL_DESIGN_SYSTEM.md` §7 |
| Anything a family member has said about the elder | Not the elder's memory |
| A "deleted items" archive | "Forget it" means forgotten |

### 17.4 States

`populated` · `empty` ("Thuna hasn't remembered anything yet.") · `item-correcting` ·
`item-forgetting` (a single confirm: "Forget that Meera is your brother's daughter?" —
one confirmation, never two).

### 17.5 Accessibility

- Groups as `<section>` with `<h2>`; items as a `<ul>`.
- Each item's actions ("Correct this", "Forget it") are real buttons with the item's text in their
  accessible name: "Forget it: Meera is your brother's daughter".
- After a deletion, focus moves to the group heading and a polite announcement confirms:
  "Forgotten."

### 17.6 Dimensions (390px)

```
Thuna remembers 14 things.                     ← 18px/400 --text-secondary

People                                         ← 20px/600 group title, 32px above
┌────────────────────────────────────────────────┐
│  Meera is your brother's daughter.             │ ← 20px/400, min-height 68px
│                                                │
│  You told me this on Tuesday.                  │ ← 16px/400 --text-secondary
│                                                │
│  Correct this            Forget it             │ ← 52px text actions
└────────────────────────────────────────────────┘
                     12px
┌────────────────────────────────────────────────┐
│  Sree is your son.                             │
│  You told me this when we first spoke.         │
│  Correct this            Forget it             │
└────────────────────────────────────────────────┘

Dates coming up                                ← next group
┌────────────────────────────────────────────────┐
│  Meera and Arun's wedding — Saturday           │
│  8 August, 10:30 in the morning, Guruvayur.    │
│                                                │
│  You corrected this from Sunday.               │ ← supersedes line,
│                                                │   --text-attention 16px/400
│  Correct this            Forget it             │
└────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Item card | min-height 148px, `--radius-md`, `--elev-1`, 20px padding |
| Group title | `--text-secondary-lg` (20px/600), `--space-8` above, `--space-4` below |
| Actions | Text actions 52px, `--space-6` apart; at 360px they stack |
| `supersedes` line | `--text-attention` — the one place amber appears in this screen |

### 17.7 Copy

> Summary: > Thuna remembers 14 things.
> Item: > **Meera is your brother's daughter.**
> Provenance: > You told me this on Tuesday.
> Supersedes: > You corrected this from Sunday.
> Actions: > **Correct this** · **Forget it**
> Forget confirmation: > **Forget that Meera is your brother's daughter?** [Yes, forget it] [Keep it]
> After forgetting: > **Forgotten.**
> Empty: > **Thuna hasn't remembered anything yet.** Things you tell me will show up here.

---

## 18. ErrorRecovery

### 18.1 Purpose

Something went wrong and it was not the elder's fault. Say what happened in one plain sentence, give
exactly one obvious next step, and never expose a code.

### 18.2 Props

```ts
export interface ErrorRecoveryProps extends BaseProps {
  /** One plain sentence. Never a code, never a stack, never "an error occurred". */
  message: string;
  /** THE next step. Exactly one primary. */
  primaryAction: UiAction;
  /** At most one alternative. */
  secondaryAction?: UiAction;
  /** Human bridge — offered whenever a person could actually help. */
  handoffAction?: UiAction;
  severity?: 'recoverable' | 'blocked';
  /** What the elder was doing, so they can see nothing was lost. */
  contextLine?: string;             // "Your order is still here, unchanged."
  icon?: IconName;
}
```

⟨contract⟩ Presented on transport failure, TTS/ASR failure, or
`EngineResponse.action === 'handoff'`. **Verify `EngineAction`'s `'handoff'` member against the
latest `lib/types.ts`.**

### 18.3 The copy rules

| Never | Instead |
|---|---|
| "An error occurred (E_TIMEOUT)" | "I couldn't reach the internet just now." |
| "Invalid input" | "I didn't quite catch that." |
| "Request failed with status 500" | "Something went wrong on my side." |
| "You entered the wrong…" | "Let's try that again." |
| "Sorry, I'm just an AI and can't…" | "That's something Sree can help with. Shall I ask him?" |
| Any apology longer than one word | One "Sorry" maximum, and only where it is warranted |

The elder is never blamed, never asked to diagnose, and never shown anything they could not act on.

### 18.4 Variants

`recoverable` (`--surface-attention`, "Try again" primary) · `blocked` (`--surface-2`, the primary
action is the human handoff).

### 18.5 States

`shown` · `retrying` (primary → "Trying again…") · `resolved`.

### 18.6 Accessibility

- `role="alert"` for `blocked`; `role="status"` for `recoverable` — a recoverable hiccup does not
  deserve to interrupt.
- Focus moves to the message.
- Never steals focus while Thuna is mid-utterance; queue until TTS ends.

### 18.7 Dimensions (390px)

```
┌────────────────────────────────────────────────┐
│   ↻                                            │ ← 32px icon --text-attention
│                                                │
│   I couldn't reach the internet just now.      │ ← 24px/600, min-height 82px
│                                                │
│   Your order is still here, unchanged.         │ ← 18px/400 --text-secondary
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │              Try again                   │  │ ← 64px primary
│  └──────────────────────────────────────────┘  │
│  12px                                          │
│           Ask Sree for help                    │ ← 52px text action
└────────────────────────────────────────────────┘
  --surface-attention · --radius-md · 24px padding
```

### 18.8 Copy

> Network: > **I couldn't reach the internet just now.** Your order is still here, unchanged.
> [Try again]
> Speech: > **I didn't quite catch that.** [Say it again]
> Server: > **Something went wrong on my side.** Nothing was sent. [Try again] · [Ask Sree for help]
> Blocked: > **I can't do this one on my own.** Sree can help. [Ask Sree]

The reassurance line ("Nothing was sent", "Your order is still here, unchanged") is required
whenever an error occurs near a consequential action. An elder's first fear after an error is that
money moved. Answer it before they ask.

---

## 19. LoadingState

### 19.1 Purpose

Honest waiting. Nothing else.

### 19.2 Props

```ts
export interface LoadingStateProps extends BaseProps {
  variant?: 'inline' | 'block' | 'skeleton';
  /** "Working…" / "Placing your order…" — always says WHAT is happening. */
  label?: string;
  /** Number of skeleton rows for variant='skeleton'. */
  rows?: number;
  /** Milliseconds before rendering anything. Default 800. */
  delayMs?: number;
  /** After this, append the reassurance line. Default 4000. */
  patienceMs?: number;
}
```

### 19.3 Variants

| Variant | Renders |
|---|---|
| `inline` | 20px non-rotating three-dot indicator + label, inside a button or a row |
| `block` | 32px indicator + label, centred, min-height 120px |
| `skeleton` | `rows` × `--surface-2` blocks at real content dimensions |

### 19.4 The timing rules

| Rule | Value | Why |
|---|---|---|
| Render nothing below | **800ms** | A flash of a spinner is more disorienting than a brief pause |
| Add the reassurance line after | **4000ms** | > "Still working. This sometimes takes a moment." |
| Never show a progress percentage | — | It is always a lie, and a stalled bar is worse than no bar |
| Never show a countdown | — | Creates pressure |
| Never block the TalkButton | — | The elder can always still speak |

### 19.5 Accessibility

- `role="status" aria-live="polite" aria-busy="true"`.
- The label is the announcement; the indicator is `aria-hidden`.
- Skeletons are entirely `aria-hidden` — a screen reader must not read a grid of empty boxes.

### 19.6 Motion

Default: three dots fading sequentially, 1400ms, `--ease-calm` — **not a rotating spinner**. A
rotating spinner at 900ms is the most animated thing on a calm screen and draws the eye
disproportionately. Under `prefers-reduced-motion`: static dots plus the label; if the label alone
is present, that suffices.

### 19.7 Copy

> Generic: > **Working…**
> Specific (always preferred): > **Placing your order…** · **Asking Sree…** · **Reading the invitation…**
> Patience: > Still working. This sometimes takes a moment.

---

## 20. OfflineBanner

### 20.1 Purpose

Connection is gone. Say so once, persistently, in place — and say what still works.

### 20.2 Props

```ts
export interface OfflineBannerProps extends BaseProps {
  online: boolean;
  /** What the elder can still do. */
  message?: string;
  onRetry?: () => void;
  /** Shown briefly when connection returns. */
  showReconnected?: boolean;
}
```

### 20.3 Variants

`offline` (`--surface-attention`) · `reconnected` (`--surface-success`, auto-hides after 3000ms —
the **only** auto-dismissing surface in the product, and only because its message is good news).

### 20.4 States

`hidden` · `offline` · `reconnected`.

### 20.5 The rules

| Rule | Reason |
|---|---|
| **Persistent, never a toast** | An elder who looks away must not miss it. It stays until connection returns. |
| **Pinned below the header, above content — never overlapping** | Content shifts down; nothing is covered |
| **Says what still works** | "You can still see what's coming up." An offline banner that only says "offline" is a dead end |
| **Never blocks the screen** | It is a banner, not a modal |
| **TalkButton goes `disabled` with a reason**, not silently dead | See §4.6 |

### 20.6 Accessibility

- `role="status" aria-live="polite"` — important but not urgent enough for `assertive`.
- The retry button has the accessible name "Try to connect again".
- Reconnected is announced once, then removed from the DOM.

### 20.7 Dimensions (390px)

```
┌────────────────────────────────────────────────────────┐
│  ☁  You're not connected right now.        Try again   │ ← 56px tall
│     You can still see what's coming up.                │   full bleed
└────────────────────────────────────────────────────────┘
   icon 24px    message 18px/500 + 16px/400   action 52px hit
   --surface-attention · 1px --border-attention bottom · 16px/24px padding
```

| Property | Value |
|---|---|
| Height | 56px single-line; 80px with the sub-line |
| Padding | `--space-4` vertical, `--space-6` horizontal |
| Position | Static flex child between header and `<main>` — **not** `position: fixed` |
| At 360px | "Try again" moves below the message; height 104px |
| Motion | Slides down `--dur-base`; reduced-motion: appears instantly |

### 20.8 Copy

> Offline: > **You're not connected right now.** You can still see what's coming up.
> Action: > **Try again**
> Reconnected: > **Connected again.**

Never "Network error", never "You are offline" (blaming phrasing), never an error code.

---

## 21. Component composition map

Which components appear on which screen of the demo sequence.

| Demo screen (`DEMO_SCREEN_SEQUENCE.md`) | Components |
|---|---|
| 1 Home | ElderShell · MobileHeader · DailyBrief(on-demand) · BottomNavigation · TalkButton |
| 2 Listening | + VoiceStatePanel |
| 3 Understanding | + GuidanceCard · LoadingState(inline) |
| 4 Food memory | + TaskSummary |
| 5 Contextual question | GuidanceCard(neutral) · TaskSummary |
| 6 Correction | TaskSummary(`changedRowIds`) · GuidanceCard |
| 7 Confirmation | ConfirmationScreen(sheet) · TaskSummary |
| 8 Completion | CompletionReceipt |
| 9 Remember this | LifeEventConfirmation |
| 10 Date correction | LifeEventConfirmation(`correctedFieldIds`) |
| 11 Reminder / check-in | CheckInScreen · PendingLoopCard · TalkButton(inline) |
| 12 Family handoff | FamilyHandoff |
| 13 Safety warning | SafetyWarning |
| (any) | OfflineBanner · ErrorRecovery · LoadingState · MemoryReview |

---

## 22. Implementation notes for GLM — cross-cutting

1. **`lib/client-api.ts` is the only bridge.** No component imports `lib/types.ts`,
   `lib/engine.ts`, or any skill module. Every ⟨contract⟩ mapping lives there. When Codex renames a
   contract field, exactly one file changes.
2. **Verify every ⟨contract⟩ field name against the latest release before binding.** The names in
   this document reflect `lib/types.ts` as read at authoring time. The highest-risk ones:
   `EngineResponse.speak`, `EngineResponse.action`, `EngineResponse.clearMic`,
   `ScreenState.status`, `ScreenState.candidates`, `ScreenState.total`, `ScreenState.deliveryFee`,
   `SessionCtx.pace`, `SimulatedReceipt.*`, `Receipt.familyNotified`.
3. **`ScreenState.candidates` is `unknown[]`.** Do not spread it into `TaskChoiceList`. Write an
   explicit mapper with a runtime shape guard; an unrecognised candidate shape must render as a
   plain label row, never crash the screen.
4. **`TaskSummary` and `CheckInScreen` must contain zero `switch` statements on their type prop.**
   This is the single most likely place for the architecture to erode. If a reviewer sees
   `taskType === 'order_food'` inside `TaskSummary`, that is a defect.
5. **Every component takes `lang` and sets it on its root node.** The Malayalam line-height
   overrides in `VISUAL_DESIGN_SYSTEM.md` §12 key off `[lang^="ml"]`.
6. **Reserve two Malayalam lines** for every text block, using the `min-height` values stated in
   each §*.6. This is why the layout does not jump when the language toggles mid-demo.
7. **Only one `aria-live="polite"` region speaks at a time** (§0.4). `SafetyWarning` is the only
   `assertive` region in the entire product.
8. **Buttons are never side-by-side**, at any viewport. Always stacked, 12px apart, primary on top.
9. **No component sets a colour that is not a token.** No `#fff`, no `rgba(...)` outside the token
   file.
10. **Test at 360px first.** Every layout listed here has a stated 360px behaviour; if a component
    has no 360 note, it is because the layout is identical, not because it was not checked.
11. **The demo inspector is a separate tree.** Nothing in this document renders debug state,
    fallback status, engine events, or the transcript history. Per
    `../companion/COMPANION_DEMO_SCRIPT.md` §11, fallback status is visible **only** in the Demo
    Inspector, never to the elder.

---

## Related

- `VISUAL_DESIGN_SYSTEM.md` — the tokens every component consumes
- `DEMO_SCREEN_SEQUENCE.md` — how these components sequence for judges
- `../companion/COMPANION_DEMO_SCRIPT.md` — the narrative this UI serves
- `../companion/CHECKIN_CONVERSATION_POLICY.md` — §12's copy rules
- `../companion/DIGITAL_SAFETY_POLICY.md` — §11's constraints
- `../companion/FAMILY_CONSENT_POLICY.md` — §16's constraints
- `../companion/PENDING_LOOPS.md` — §15's canonical record
- `../companion/HUMAN_ATTENTION_BRIDGE.md` — §16's handoff semantics
- `../companion/CONFIRM_BEFORE_MEMORY.md` — §13's candidate gate
- `../companion/DAILY_LIFE_BRIEF.md` — §14's discipline
- `lib/types.ts` — the engine contract `lib/client-api.ts` adapts (READ ONLY)
