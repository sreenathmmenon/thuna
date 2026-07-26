# Thuna — Accessibility Specification

> Design specification. **Changes no production code.**
>
> Thuna's user is an elder using a phone with presbyopia, possibly a hearing aid, possibly a mild
> tremor, in Malayalam, sometimes one-handed, sometimes while someone is talking at them on another
> line. Accessibility here is not a compliance layer added at the end. It **is** the product.
>
> Everything below is a number GLM can implement and a tester can check. Where a requirement is
> stricter than WCAG, the reason is stated.

---

## 1. Standards floor

| Level | Applies to | Rule |
|---|---|---|
| **WCAG 2.2 AA** | Everything, no exception | Hard floor. A component that cannot meet it does not ship. |
| **WCAG 2.2 AAA for body text contrast** | All text ≥ 16px that carries meaning | 7:1 minimum. Presbyopia plus reduced contrast sensitivity means AA (4.5:1) is legible in a lab and marginal on a sunlit veranda. |
| **WCAG 2.2 AAA target size (44×44 CSS px)** | All interactive elements | Exceeded everywhere — Thuna's floor is 52px for primary controls. |

Two AAA criteria are **deliberately not** claimed: 1.4.9 (images of text) is irrelevant since Thuna
uses none, and 3.1.5 (reading level) is met in spirit by the copy rules in the safety and error
specs, not by a formal grade score for Malayalam.

---

## 2. Touch targets

| Class | Minimum | Used for |
|---|---|---|
| **TalkButton** | 76px, up to 96px | The primary voice control. Largest thing on the screen. |
| **Primary action** | **60px** tall × full width − 48 | `Yes, continue`, `Continue from where we stopped` |
| **Standard action** | **56px** tall × full width − 48 | All other stacked buttons in the package |
| **Absolute floor, primary** | **52px** × 52px | Any tappable thing that carries the main intent |
| **Absolute floor, secondary** | **44px** × 44px | "Say that again", back chevron, banner controls |
| **Icon-only control** | 52×52 hit area minimum, glyph may be 24×24 | Never an icon smaller than its hit area |

### 2.1 Spacing between targets

| Context | Minimum gap | Reason |
|---|---|---|
| Between stacked buttons | **12px** | Below this, a tremor overshoot lands on the neighbour |
| Between a button and any other target | **12px** | Same |
| Between a **destructive/exit** target and its neighbour | **16px** | `Stop` and `Cancel` sit last with the wider gap above them |
| Between adjacent inline text controls | **16px** horizontal | Two 44px targets 4px apart is one 92px target in practice |
| Screen edge to any target | **24px** | Palm contact on the bezel at 390px |

**No two interactive elements are ever horizontally adjacent** in this package. Every button set is
vertically stacked, full width. This costs vertical space and buys immunity to the most common
tremor mis-tap.

### 2.2 Tremor-friendly rules

| Rule | Specification |
|---|---|
| **No drag gestures.** | No swipe-to-delete, no swipe-between-tabs, no pull-to-refresh, no sliders, no long-press menus, no drag-to-reorder. Every action is a discrete tap on a visible target. |
| **No double-tap.** | Single tap only. |
| **No precision targets.** | No 24px close ×, no small chevrons, no tap-outside-to-dismiss. |
| **Forgiving hit zones.** | Hit area extends 8px beyond the visual bounds of any control, provided the 12px inter-target gap is preserved (so hit zones never touch). |
| **Tap debounce.** | 400ms per target after a successful tap. A tremor double-fire must not place two orders. Debounce is per-target, not global. |
| **Touch-move slop.** | A tap registers if the finger moves < 16px between down and up. Default browser slop (~10px) is too tight for a shaking hand. |
| **No time-based interactions.** | No press-and-hold, no "hold to talk". The TalkButton is tap-to-start / tap-to-stop. |
| **Scroll momentum reduced.** | `scroll-behavior: smooth` off for programmatic jumps; no rubber-band overshoot on the confirmation card. |

---

## 3. Contrast — measured, for the actual palette

Ratios below are computed against the **actual** token values in `VISUAL_DESIGN_SYSTEM.md`:
`--bg-cream #FBF7F0`, `--teal-900 #0F4C4A`, `--teal-100 #E3F0EE`, `--green-600 #1F7A4C`,
`--amber-500 #B26A00`, `--red-700 #A3231C`, `--charcoal-900 #1F2421`, `--charcoal-600 #55605A`,
plus the design system's darkened text-only tokens `--text-success #155F3B`,
`--text-attention #8A5200`, `--text-danger #8B1D17`.

**If any token hex changes, re-run the whole table.** The contrast script in §12.1 is the gate.

### 3.1 Surface and text pairings

| Foreground | Background | Ratio | AA (4.5) | AAA (7) | Approved for |
|---|---|---|---|---|---|
| `--charcoal-900` | `--bg-cream` | **14.76:1** | ✅ | ✅ | All body text — the default pairing |
| `--charcoal-900` | `--teal-100` | **13.48:1** | ✅ | ✅ | Body text on the confirmation surface |
| `--white` | `--teal-900` | **9.75:1** | ✅ | ✅ | Primary button label (`--text-on-teal`) |
| `--teal-900` | `--bg-cream` | **9.13:1** | ✅ | ✅ | Headings, text-only controls |
| `--bg-cream` | `--teal-900` | **9.13:1** | ✅ | ✅ | Cream label on a filled primary button |
| `--text-danger` | `--bg-cream` | **8.60:1** | ✅ | ✅ | Danger **text**, where any is used |
| `--teal-900` | `--teal-100` | **8.34:1** | ✅ | ✅ | Headings on the confirmation surface |
| `--text-danger` | `--teal-100` | **7.86:1** | ✅ | ✅ | Danger text on the confirmation surface |
| `--text-success` | `--bg-cream` | **7.20:1** | ✅ | ✅ | Success **text** ("Done", receipt line) |
| `--red-700` | `--bg-cream` | **6.99:1** | ✅ | ✖ (0.01 short) | **Marks and icons only** — never text |
| `--text-success` | `--teal-100` | **6.58:1** | ✅ | ✖ | Success text ≥18px on the confirmation surface |
| `--red-700` | `--teal-100` | **6.38:1** | ✅ | ✖ | Marks and icons only |
| `--charcoal-600` | `--bg-cream` | **6.13:1** | ✅ | ✖ | Secondary/meta text ≥18px — **never body** |
| `--text-attention` | `--bg-cream` | **5.98:1** | ✅ | ✖ | Attention text ≥18px |
| `--charcoal-600` | `--teal-100` | **5.60:1** | ✅ | ✖ | Row labels ≥18px on the confirmation card |
| `--text-attention` | `--teal-100` | **5.46:1** | ✅ | ✖ | Attention text ≥18px on confirmation surface |
| `--green-600` | `--bg-cream` | **4.98:1** | ✅ | ✖ | **Icons/ticks only.** For text use `--text-success` |
| `--green-600` | `--teal-100` | **4.55:1** | ✅ (just) | ✖ | **Icons only.** Too close to the floor for text |
| `--amber-500` | `--bg-cream` | **3.97:1** | ✖ | ✖ | **Graphics only** (≥3:1 non-text) — borders, marks, rules |
| `--amber-500` | `--teal-100` | **3.63:1** | ✖ | ✖ | **Graphics only**, and only at ≥3px stroke |
| `--teal-100` | `--bg-cream` | **1.09:1** | ✖ | ✖ | Surface-on-surface. Never a boundary carrier — pair with a 1.5px `--charcoal-600` border |

### 3.2 The consequences, stated as rules

1. **`--amber-500` never carries text.** Not a label, not a heading, not a word — it fails AA on both
   surfaces. It is a 4px left border, a 40px mark, or a 3px underline. Where attention copy is
   needed, use `--text-attention` (5.98:1) at ≥18px, or `--charcoal-900` (14.76:1) for body. This is
   why the safety screens in `SAFETY_AND_CONFIRMATION_SCREENS.md` put the amber in the mark and the
   border and keep every sentence charcoal.
2. **`--green-600` and `--red-700` are icon tokens, not text tokens.** Their text counterparts
   `--text-success` (7.20:1) and `--text-danger` (8.60:1) exist precisely because the base tokens do
   not clear AAA. The resume-screen ticks are a `--green-600` **icon** beside `--charcoal-900` text;
   the safety mark is `--red-700` and the sentence beside it is `--charcoal-900`.
3. **`--charcoal-600` and the darkened text tokens are ≥18px-only.** All clear AA but not AAA, so
   they carry secondary and meta text only. Thuna's floor for meaningful body text is AAA, which
   means `--charcoal-900` on either surface.
4. **The primary button is white-on-teal at 9.75:1** (or cream-on-teal at 9.13:1 where the design
   system specifies the cream label). Both clear AAA comfortably, which is why the primary is the
   filled variant.
5. **Disabled state is never colour-only.** `Yes, continue` disabled shows `--charcoal-600` on
   `--teal-100` (5.60:1, still readable) **plus** the word "waiting". WCAG exempts disabled controls
   from contrast; Thuna does not take the exemption, because an elder must be able to read what they
   cannot press.
6. **Focus indicator**: 3px `--teal-900` outline with a 2px `--bg-cream` offset ring. Against
   `--bg-cream` that is 9.13:1 and against `--teal-100` 8.34:1 — both far over the 3:1 non-text
   requirement (WCAG 2.2 SC 1.4.11 and 2.4.13).
7. **The one borderline value to watch:** `--red-700` on `--bg-cream` at 6.99:1 misses AAA by 0.01.
   That is harmless while the token is icons-only as specified in rule 2 — but if a future screen
   puts red **text** on cream, it must use `--text-danger`, not `--red-700`.

---

## 4. Text scaling

| Requirement | Specification |
|---|---|
| **Range** | Fully functional from 100% to **200%**. No loss of content, no loss of function, no horizontal scroll. |
| **Beyond 200%** | 200–320% degrades gracefully: layout may become single-column and dense, but every control stays reachable and no text is clipped. |
| **Mechanism** | All type in `rem`, root at 16px, respecting the OS/browser text-size setting. **No `px` font sizes anywhere.** No `user-scalable=no`, no `maximum-scale`. |
| **Containers** | No fixed `height` on any element containing text. Use `min-height` and let content grow. This is the single most common cause of clipped Malayalam. |
| **Truncation** | **No `text-overflow: ellipsis` and no `-webkit-line-clamp` on any label, button, row, heading, or body string** in this package. A truncated confirmation line is a confirmation the elder did not see. |
| **Buttons** | Grow vertically to fit wrapped labels; `min-height: 56px` not `height: 56px`. A 2-line button at 200% is ~112px and that is correct. |
| **The confirmation card** | At 200% the card scrolls internally; the three buttons stay pinned. The total row and the buttons must be reachable without the elder scrolling past the fold to find `Cancel`. |
| **Viewport** | `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` — nothing more. |
| **Reflow** | Meets SC 1.4.10: content readable at 320 CSS px width without 2-D scrolling. 360px is our narrow target, so there is headroom. |
| **Spacing override** | Meets SC 1.4.12: survives line-height 1.5×, paragraph spacing 2×, letter-spacing 0.12em, word-spacing 0.16em with no clipping. |

### 4.1 Large-text behaviour, by screen

| Screen | At 200% |
|---|---|
| Home | Cards stack; the daily brief truncates **by item count, never by character** ("2 more today" as a tappable row) |
| Guidance step | Guidance text may occupy the full viewport; the TalkButton stays pinned above the safe area, never scrolled away |
| `SafetyWarning` | Body scrolls; the three buttons stay pinned. The exit is never below the fold. |
| `ConfirmationScreen` | Card scrolls; buttons pinned; the total row is sticky at the bottom of the card so the amount is always visible while scrolling items |
| `ErrorRecovery` | Heading may take 4 lines; actions stay pinned |
| `OfflineBanner` | Grows from 56px to whatever the wrapped text needs; pushes content down, never overlays |

---

## 5. Screen readers

Target: VoiceOver (iOS) and TalkBack (Android), both in Malayalam and English.

### 5.1 Every interactive element has a label

| Element | `aria-label` (en) | Notes |
|---|---|---|
| TalkButton, idle | "Talk to Thuna" | `role="button"`, `aria-pressed="false"` |
| TalkButton, listening | "Listening. Tap to stop." | `aria-pressed="true"` |
| TalkButton, thinking | "Thuna is thinking" | `aria-disabled="true"` — present but not actionable |
| Primary confirm | "Yes, continue. Place this order for two hundred and three rupees." | Label carries the **amount** — a bare "Yes, continue" is not enough context out of visual order |
| Change | "Change something in this order" | |
| Cancel | "Cancel. Nothing will be ordered." | Outcome stated in the label |
| Safety: I understand | "I understand. Close this and go back to the start." | Says where it goes |
| Safety: Ask my trusted person | "Ask my trusted person. Send Sree a message asking for help." | |
| Safety: Stop this task | "Stop this task and go back to the start." | |
| Say that again | "Say that again. Read this out loud once more." | |
| Error: Try again | "Try again. Repeat the last step." | |
| Error: Type instead | "Type instead of speaking." | |
| Offline banner | (no label — `role="status"`) | Not interactive |
| Back chevron | "Go back to {previous screen name}" | Never bare "Back" |

**Rule: no `aria-label` is a bare verb.** "Confirm", "OK", "Back", "Close", "Continue" alone are all
prohibited. Every label says what will happen or where the elder will land. Screen-reader users lose
the surrounding layout that makes a bare verb legible.

**Rule: the visible label is a prefix of the accessible label.** "Yes, continue" is spoken first, so
voice-control users saying "tap Yes continue" match (WCAG SC 2.5.3 Label in Name).

### 5.2 Structure and landmarks

| Requirement | Specification |
|---|---|
| Headings | One `<h1>` per screen: the main guidance or question. Card titles `<h2>`. No level skipping. |
| Landmarks | `<header>`, `<main>`, `<nav>` (bottom nav), `<footer>` where the action group is pinned |
| `SafetyWarning` / `ConfirmationScreen` | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → heading id, `aria-describedby` → body id. Focus trap. Background `aria-hidden="true"`. |
| Confirmation card | `<dl>` for label/value rows, or a `<table>` with row headers for items. **Not** a stack of divs — the association between "Total" and "Rs 203" must survive linearisation. |
| Item rows | Each row is announced as one unit: "Masala Dosa, quantity two, one hundred and twenty rupees" |
| Money | `aria-label` spells the amount in words: `Rs 203` → "two hundred and three rupees". Screen readers read "Rs 203" unreliably. |
| Decorative marks | `aria-hidden="true"` on every icon that has adjacent text |

### 5.3 Live regions

| Region | `aria-live` | Content |
|---|---|---|
| Guidance step text | `polite` | Each new step announced once |
| `OfflineBanner` | `polite` | On state change only. Never repeated while offline. |
| `LoadingState` | `polite` | The activity sentence; the >3s update announces once more |
| Error appearing inline | `assertive` | The heading only, then focus moves to it |
| `SafetyWarning` appearing | `assertive` + focus move | Interrupts; this is the one place assertive is correct |
| UNKNOWN-checking state | `polite` | "Let me check whether that went through." Announced once. Nothing else until resolution. |

`aria-live="assertive"` is used in exactly two places. Anywhere else it interrupts the elder
mid-sentence, which is its own accessibility failure.

### 5.4 Language attributes

`<html lang="ml-IN">` for the Appa persona. Any English fragment inside Malayalam copy (brand names,
"Wi-Fi", "OTP") is wrapped in `<span lang="en">` so the TTS engine switches voice rather than
attempting Malayalam phonology on Latin script. See `MALAYALAM_CONTENT_GUIDE.md` §7.

---

## 6. Focus order and keyboard

Thuna is a phone app, but keyboard access is required for switch-control users, Bluetooth-keyboard
users, and external-switch access — the population that overlaps most with tremor and limited
mobility.

### 6.1 Focus order per screen

| Screen | Order |
|---|---|
| Home | 1 · Greeting/brief heading → 2 · **TalkButton** → 3 · Due-now items → 4 · Coming-soon items → 5 · Bottom nav |
| Guidance step | 1 · Step heading → 2 · **TalkButton** → 3 · "Say that again" → 4 · Type instead → 5 · Stop |
| `SafetyWarning` | 1 · **Heading (focus lands here)** → 2 · Body → 3 · Slot 1 → 4 · Slot 2 → 5 · Slot 3. Trapped. |
| `ConfirmationScreen` | 1 · **Heading** → 2 · Simulated strip (if present) → 3 · Card rows → 4 · Say that again → 5 · Yes, continue → 6 · Change something → 7 · Cancel. Trapped. |
| `ErrorRecovery` | 1 · **Heading** → 2 · Body → 3 · Actions in order |
| Resume | 1 · Heading → 2 · Preserved-items list → 3 · Actions |

**The TalkButton is reachable within two stops on every screen that has one.** It is the primary
interaction and it must not sit at the end of a long list.

**Focus lands on the heading, never on a button**, for every screen in the safety, confirmation, and
error families. Landing on a button lets a reflexive Enter resolve a screen the elder has not read.

### 6.2 Keyboard rules

| Key | Behaviour |
|---|---|
| `Tab` / `Shift+Tab` | Moves through the order above. Never traps outside a dialog. |
| `Enter` / `Space` | Activates the focused control. Both, on every control. |
| `Escape` | Closes an error inline state (equivalent to `Stop`). **Does nothing** on `SafetyWarning` and `ConfirmationScreen` — those exit only through their own labelled controls. |
| Arrow keys | Not required. No roving tabindex, no custom grid navigation. Everything is in the tab order. |
| Focus visible | Always. `:focus-visible` 3px outline; never `outline: none`. |
| Skip link | "Skip to Talk to Thuna" as the first focusable element on Home |
| No keyboard traps | Except the two intentional modal traps, both of which have labelled exits |

---

## 7. Reduced motion

`prefers-reduced-motion: reduce` is honoured for **every** animation in the package. Vestibular
sensitivity is common in this age group, and a moving screen is also harder to tap accurately.

| Animation | Default | Under reduced motion |
|---|---|---|
| Screen transition | 180ms fade | Instant, no fade |
| `ConfirmationScreen` entry | 220ms slide-up | Instant appearance |
| `SafetyWarning` entry | 160ms fade | Instant appearance |
| TalkButton listening indicator | Pulsing ring, 1.4s | Static 3px `--teal-900` ring, no pulse |
| `LoadingState` | Indeterminate pulse, 1.2s | Static `--teal-100` bar + the activity sentence |
| UNKNOWN-checking indicator | Pulse, 1.2s | Static bar |
| `OfflineBanner` appear | 200ms slide-down | Instant |
| `OfflineBanner` "Back online" dismiss | 200ms fade after 4s | Instant removal after 4s |
| Button press | 80ms scale to 0.98 | Background-colour change only, no scale |
| Success tick on receipt | 300ms draw-on | Fully drawn on arrival |
| Scroll-to-error | Smooth scroll | Instant jump |

**Nothing in Thuna auto-plays, loops, parallaxes, or moves without a user action** — so SC 2.2.2
(pause/stop/hide) is met by construction. The only continuous motion in the app is the two
indeterminate indicators above, and both have static fallbacks.

---

## 8. Hearing support — non-negotiable

> **Every word Thuna speaks exists on screen as text, at full size, at the same time.**

| Rule | Specification |
|---|---|
| No audio-only content | Ever. Not a chime that means something, not a tone that indicates success, not a spoken-only confirmation. |
| Simultaneity | Text is rendered **before or as** speech begins, never after. A screen reader user and a deaf user get the same information at the same moment as a hearing user. |
| Speech is repeatable | "Say that again" (52px) on every screen with spoken content. It re-speaks; it never advances state. |
| Speech is skippable | Tapping any action interrupts speech immediately. Thuna never blocks input while talking. |
| Speech is optional | A global "Show everything, do not speak" setting. With it on, **no functionality is lost** — which is what makes §3.5 of `ERROR_AND_RECOVERY_STATES.md` (TTS failure) a graceful degradation rather than an outage. |
| Sounds | At most one soft single-note chime per event, always accompanied by a visible change. No sound is the sole carrier of any meaning. |
| Haptics | A single short tap on confirmation. Never a pattern, never a buzz, never the only signal. |
| Volume | Speech respects system media volume. Thuna never overrides it, never sets its own gain, never plays at a fixed loudness. |
| Hearing aids | Speech rate defaults to the elder's configured pace (`slow` for Appa). Malayalam TTS at slow pace, 0.85× default rate. |

---

## 9. Colour-blind-safe states

> **Meaning is never carried by colour alone. Every state needs icon + text.**

Roughly 8% of men have a colour vision deficiency, and age-related lens yellowing shifts blue/green
discrimination in almost everyone over 70. Both are assumed present.

| State | Colour | Icon | Text | Never |
|---|---|---|---|---|
| Success / done | `--green-600` | ✓ filled circle | "Done" / "That is ordered." | A green dot alone |
| Attention / pause | `--amber-500` | ◐ pause circle | "Please pause" | An amber triangle alone |
| Irreversible / severe | `--red-700` | ◐ pause circle (same glyph, red) | The refusal sentence | A red bar alone |
| Waiting / in progress | `--teal-900` | ◔ indeterminate | "Checking…" activity sentence | A spinner alone |
| Due now | `--charcoal-900` | ● filled | "Due now" | Bold-only |
| Coming soon | `--charcoal-600` | ○ hollow | "Coming soon" | Grey-only |
| Simulated | `--amber-500` border | (none) | "This is a practice run." | An amber badge reading "SIM" |
| Disabled | `--charcoal-600` | (none) | "waiting" appended to label | Greyed-out only |
| Selected | `--teal-900` | ✓ | (label unchanged) | Fill-colour change only |

**Verification method:** render every state screen in greyscale. If two states are indistinguishable
in greyscale, the design has failed and needs the icon or the word, not a different hue.

Note the amber and red marks are the **same glyph**. The severity difference is deliberately carried
by the words, not the shape — matching `SAFETY_AND_CONFIRMATION_SCREENS.md` §A2, where red is
"irreversible" rather than "worse", and where colour-blind users lose nothing because the sentence
carries the whole message.

---

## 10. Timeouts

WCAG SC 2.2.1 permits timeouts with warnings and extensions. Thuna is stricter.

| Rule | Specification |
|---|---|
| **No auto-dismiss on anything consequential.** | `SafetyWarning`, `ConfirmationScreen`, `ErrorRecovery`, the change screen, the receipt, and the UNKNOWN state persist until the elder acts. Indefinitely. |
| **No countdown display, anywhere.** | No seconds, no ticking, no shrinking bar, no colour drift. `SAFETY_AND_CONFIRMATION_SCREENS.md` §B5 gives the full reasoning: a pressure timer is the exact mechanic of the fraud we defend against. |
| **Expiry never destroys the screen.** | When `expiresAt` passes on a confirmation, the screen stays and Thuna re-reads state. The elder never loses their place because time passed. |
| **Auto-dismiss is permitted for exactly one thing** | The "Back online" strip, 4 seconds. It carries no decision and no unique information. |
| **No idle logout.** | Thuna does not sign the elder out for inactivity. |
| **Speech is not a timeout.** | The mic does not close on a silence timer while the elder is mid-sentence. Voice capture ends on a tap or on 3s of confirmed silence **after** speech, never on 3s of silence before it. |
| **No "your session will expire in…" dialog.** | The state at expiry is handled by re-reading, not by warning. |

---

## 11. Malayalam-specific accessibility

Detail in `MALAYALAM_CONTENT_GUIDE.md`; the accessibility-binding numbers:

| Requirement | Value |
|---|---|
| Line-height for Malayalam text | **1.7** (Latin 1.5). Malayalam's stacked conjuncts and above/below marks are clipped at 1.5. |
| Minimum Malayalam body size | **18px** — Malayalam's distinguishing detail sits in smaller strokes than Latin's; 16px Latin ≈ 18px Malayalam for equivalent legibility |
| Line clamping | **Prohibited.** No fixed height, no ellipsis, no `line-clamp` on any Malayalam string. |
| Label wrapping | 2 lines expected and allowed on every button. Buttons use `min-height`. |
| `lang` attributes | `lang="ml-IN"` on the root; `lang="en"` on embedded Latin fragments |
| Font fallback | If Noto Sans Malayalam fails to load, the system Malayalam font renders — never a tofu box. Explicit fallback chain, never `sans-serif` alone. |

---

## 12. Testing checklist for GLM

Runnable, in order. Each item is pass/fail with no judgement call.

### 12.1 Automated

- [ ] `axe-core` on every screen at 390×844: **zero** violations at `serious` or `critical`.
- [ ] Contrast script over the token table in §3: every approved pairing matches the ratio listed;
      any deviation from the assumed hex values re-runs the whole table.
- [ ] Lint: **zero** occurrences of `outline: none`, `user-scalable=no`, `maximum-scale`,
      `text-overflow: ellipsis`, `-webkit-line-clamp`, `height:` on a text container, or a `px` font size.
- [ ] Every `<button>`, `<a>`, and `role="button"` has an accessible name. Zero exceptions.
- [ ] No accessible name is in the bare-verb list: `OK`, `Confirm`, `Back`, `Close`, `Continue`,
      `Yes`, `No`, `Submit`, `Done`.
- [ ] Every rendered string appears in the copy table; **zero** model-generated strings on safety,
      confirmation, or error screens.
- [ ] Forbidden-phrase snapshot across all copy: `you should`, `you almost`, `be careful`,
      `well done`, `invalid`, `failed to`, `error`, `oops`, `something went wrong`, `alert`, and
      any digit followed by `:`.

### 12.2 Measured by hand

- [ ] Every interactive element's rendered box ≥ 52×52 (primary) or ≥ 44×44 (secondary). Measure in
      DevTools; do not trust the CSS.
- [ ] Gap between every adjacent pair of targets ≥ 12px; ≥ 16px above `Stop` / `Cancel`.
- [ ] No two interactive elements horizontally adjacent anywhere in the package.
- [ ] At 200% text on 360×800: no horizontal scrollbar, no clipped glyph, no truncated label, on
      **every** screen.
- [ ] At 200% text: `Cancel` reachable on the confirmation screen without hunting.
- [ ] Every screen rendered at 360, 390, and 430 wide. Safe-area insets respected at each.

### 12.3 Behavioural

- [ ] VoiceOver (iOS), Malayalam voice: complete a full order end-to-end using only the screen
      reader. Every step announced, nothing silent, focus never lost.
- [ ] TalkBack (Android), Malayalam voice: same run.
- [ ] Keyboard only: complete a full order. Tab order matches §6.1 on every screen.
- [ ] Keyboard only: confirm the `SafetyWarning` cannot be dismissed with `Escape` or `Tab`-away,
      and that all three of its actions are reachable.
- [ ] Focus lands on the **heading** for `SafetyWarning`, `ConfirmationScreen`, and `ErrorRecovery`.
      Never on a button.
- [ ] `prefers-reduced-motion: reduce` set at OS level: zero moving pixels anywhere except the two
      permitted static-fallback indicators, which must be static.
- [ ] Screenshot every state screen and convert to greyscale: every state distinguishable by icon
      and text alone.
- [ ] Deuteranopia and protanopia simulation on every state screen: no meaning lost.
- [ ] System volume at zero, screen reader off: complete a full order. Nothing is missed.
- [ ] Speech disabled in settings: complete a full order. No functionality lost.
- [ ] Tremor simulation — tap 20 times with deliberate 10–14px drift: no mis-activation of a
      neighbouring control, no double-submit.
- [ ] Tap `Yes, continue` twice within 200ms: exactly **one** order is placed.
- [ ] Leave a confirmation screen open for 10 minutes: no dismissal, no countdown appeared, and
      the re-read path fires correctly.
- [ ] Kill the network mid-confirmation: `OfflineBanner` pushes layout down; no content covered.
- [ ] With Noto Sans Malayalam blocked in DevTools: no tofu boxes; fallback font renders.

### 12.4 The one-handed check

- [ ] On 390×844 held in the right hand, thumb pivoting from the bottom-right: TalkButton, and the
      primary action on every screen, are reachable without shifting grip. Anything above 60% screen
      height is informational only — never the sole path to an action.

---

## 13. Implementation notes for GLM

1. **`rem` everywhere, root 16px.** One `px` font size anywhere breaks the whole 200% story.
2. **`min-height`, never `height`,** on anything containing text. This single rule prevents most
   Malayalam clipping and most 200%-scaling failures.
3. **The 12px inter-target gap is a layout invariant**, not a style preference. Encode it in the
   stack component so no screen can accidentally violate it.
4. **Debounce is per-target and lives in the button component**, not at each call site. A call site
   that forgets it is a double-charge.
5. **Focus management is centralised** — one hook that moves focus to the heading on mount for
   dialog-class screens, and restores it on unmount.
6. **Never `aria-hidden` a focusable element.** If it should not be reachable, remove it.
7. **Test with the real Malayalam strings, not Lorem Ipsum.** Latin placeholder text hides every
   Malayalam layout bug in this document. The longest-string test in
   `MALAYALAM_CONTENT_GUIDE.md` §10 is the gate.
8. **Accessibility tests run in CI on every screen**, not once before launch. §12.1 is fully
   automatable and should fail the build.

---

## Related

- `docs/mobile-ui/SAFETY_AND_CONFIRMATION_SCREENS.md` — the takeover screens whose focus, contrast, and timeout behaviour this file constrains
- `docs/mobile-ui/ERROR_AND_RECOVERY_STATES.md` — live regions, reduced-motion fallbacks, offline banner layout
- `docs/mobile-ui/MALAYALAM_CONTENT_GUIDE.md` — font stack, line-height, wrapping, longest-string test
- `VISUAL_DESIGN_SYSTEM.md` — the token hex values this file's ratios depend on
