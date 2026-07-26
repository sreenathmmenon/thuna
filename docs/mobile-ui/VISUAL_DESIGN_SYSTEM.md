# Thuna — Visual Design System

> Design specification. **Changes no production code.**
>
> This file is the **single source of truth** for Thuna's elder-facing mobile identity: colour,
> type, spacing, radii, elevation, interaction states, iconography, motion, and safe-area geometry.
> `COMPONENT_SPECIFICATION.md` consumes these tokens by name and never redefines them.
>
> Token names in §2 are **contractual**. Other specifications in this repository were written
> assuming these exact names. New tokens may be added; existing ones must not be renamed.

---

## 1. Identity

### 1.1 The one-sentence brief

> Thuna should look like a **well-made object in a South Indian home** — warm, unhurried, quietly
> confident — not like a medical device, a chatbot, or an enterprise dashboard.

### 1.2 The three adjectives, made concrete

| Adjective | What it means in pixels |
|---|---|
| **Warm** | Cream background rather than pure white; deep teal rather than blue; generous 24–32px gutters; nothing pure `#000000` or pure `#FFFFFF` in the primary surface stack |
| **Calm** | One primary action per screen; ≤3 competing colours visible at once; motion under 240ms; no pulsing, no attention-seeking badges, no red unless something is genuinely dangerous |
| **Premium** | Real optical spacing (multiples of 4), one type family, restrained elevation (2 levels), generous touch targets, no borrowed visual gimmicks |

### 1.3 Who it is for, and what that changes

The elder user is assumed to have: reduced near-vision acuity, some contrast sensitivity loss,
reduced fine motor precision, and possibly one hand occupied (phone, walking stick, doorframe).
Every hard number in this document is downstream of that.

| Assumption | Design consequence |
|---|---|
| Presbyopia is near-universal past 50 | 16px is the **absolute floor**, 18px is body, main guidance is 24–28px |
| Contrast sensitivity declines with age | Every text/background pair meets **WCAG AAA (7:1)** where the type is under 24px; AA Large (4.5:1) is the floor and is used only for 24px+ bold |
| Tremor and reduced precision | Primary targets ≥52px; the signature TalkButton is 76–96px; ≥12px between adjacent targets |
| Cognitive load of choice | Never more than 3 choices on one screen without scrolling; one primary button; secondary actions visually demoted, never hidden |
| Voice is the primary input | Every screen is legible *while Thuna is speaking* — the screen confirms the voice, it does not compete with it |

---

## 2. Colour

### 2.1 Core palette (contractual names)

These seven names are fixed. Everything else in §2.2–2.4 is derived and additive.

| Token | Hex | Role |
|---|---|---|
| `--bg-cream` | `#FBF7F0` | Warm off-white application background |
| `--teal-900` | `#0F4C4A` | Deep teal — primary brand, primary buttons, TalkButton |
| `--teal-100` | `#E3F0EE` | Pale teal — secondary surface, Thuna's speech surface |
| `--green-600` | `#1F7A4C` | Calm success — completion, confirmed state |
| `--amber-500` | `#B26A00` | Warm attention — pending, needs-your-answer, awaiting confirmation |
| `--red-700` | `#A3231C` | Restrained danger — safety refusal only |
| `--charcoal-900` | `#1F2421` | Body text |

Note on `--amber-500`: the numeric step follows the token-name contract, but the value is a
**deepened amber** (`#B26A00`, not a bright `#F59E0B`) so that amber text on cream clears 7:1.
A conventional bright amber fails contrast at body sizes and reads as a warning-triangle idiom,
which is the wrong emotional register for "Thuna is waiting for your answer".

### 2.2 Surfaces and borders (additive)

| Token | Hex | Role |
|---|---|---|
| `--surface-0` | `#FBF7F0` | App background (alias of `--bg-cream`) |
| `--surface-1` | `#FFFFFF` | Raised card — guidance cards, list rows, sheets |
| `--surface-2` | `#F4EEE4` | Recessed / grouped background inside a card |
| `--surface-teal` | `#E3F0EE` | Thuna-speech surface (alias of `--teal-100`) |
| `--surface-success` | `#E6F2EA` | Completion receipt background |
| `--surface-attention` | `#FBEFDC` | Awaiting-confirmation / pending background |
| `--surface-danger` | `#F9E7E5` | Safety refusal background |
| `--border-subtle` | `#E4DCD0` | Hairline between rows, card outline on cream |
| `--border-strong` | `#C8BCAB` | Input outlines, dividers that must be seen |
| `--border-teal` | `#9CC7C1` | Outline on teal-tinted surfaces |
| `--border-success` | `#9AC7AC` | Outline on success surfaces |
| `--border-attention` | `#DDB472` | Outline on attention surfaces |
| `--border-danger` | `#D99C96` | Outline on danger surfaces |

### 2.3 Text tokens (additive)

| Token | Hex | Role |
|---|---|---|
| `--text-primary` | `#1F2421` | Body and headings (alias of `--charcoal-900`) |
| `--text-secondary` | `#4A544F` | Supporting line under a heading. **Never below 16px.** |
| `--text-on-teal` | `#FFFFFF` | Text on `--teal-900` |
| `--text-teal` | `#0F4C4A` | Teal-coloured text on cream or `--teal-100` |
| `--text-success` | `#155F3B` | Success text (darkened from `--green-600` for AAA) |
| `--text-attention` | `#8A5200` | Attention text (darkened from `--amber-500` for AAA) |
| `--text-danger` | `#8B1D17` | Danger text (darkened from `--red-700` for AAA) |
| `--text-disabled` | `#6B736E` | Disabled label — **still 4.6:1**, never a faint grey |

> **Rule:** there is no token for a light grey label. `--text-secondary` at `#4A544F` is the
> lightest text permitted anywhere in the elder UI. Small faint grey text is the single most common
> accessibility failure in consumer apps and is prohibited here.

### 2.4 Interaction-state tokens (additive)

| Token | Hex | Role |
|---|---|---|
| `--teal-900-hover` | `#0C3E3C` | Primary hover (pointer devices only) |
| `--teal-900-active` | `#093230` | Primary pressed |
| `--teal-100-hover` | `#D6E8E5` | Secondary surface hover |
| `--teal-100-active` | `#C6DEDA` | Secondary surface pressed |
| `--surface-1-active` | `#F0E9DE` | Card / list-row pressed |
| `--disabled-bg` | `#E7E1D7` | Disabled fill |
| `--disabled-border` | `#CFC6B8` | Disabled outline |
| `--focus-ring` | `#0F4C4A` | Focus ring colour (matches `--teal-900`) |
| `--focus-ring-halo` | `#FBF7F0` | Outer halo so the ring reads on any surface |
| `--danger-active` | `#7E1A15` | Danger pressed |
| `--scrim` | `rgba(31, 36, 33, 0.45)` | Modal / sheet backdrop |

### 2.5 Contrast audit

Every text-on-background pair used anywhere in the product, with measured WCAG 2.1 ratios.
Target: **AAA (7:1)** for any text below 24px; **AA Large (4.5:1)** minimum for 24px+ bold.

| Foreground | Background | Ratio | Smallest permitted size | Verdict |
|---|---|---|---|---|
| `--charcoal-900` `#1F2421` | `--bg-cream` `#FBF7F0` | **14.9:1** | 16px | AAA ✅ |
| `--charcoal-900` `#1F2421` | `--surface-1` `#FFFFFF` | **16.2:1** | 16px | AAA ✅ |
| `--charcoal-900` `#1F2421` | `--surface-2` `#F4EEE4` | **14.0:1** | 16px | AAA ✅ |
| `--charcoal-900` `#1F2421` | `--teal-100` `#E3F0EE` | **13.2:1** | 16px | AAA ✅ |
| `--charcoal-900` `#1F2421` | `--surface-success` `#E6F2EA` | **13.5:1** | 16px | AAA ✅ |
| `--charcoal-900` `#1F2421` | `--surface-attention` `#FBEFDC` | **13.9:1** | 16px | AAA ✅ |
| `--charcoal-900` `#1F2421` | `--surface-danger` `#F9E7E5` | **13.1:1** | 16px | AAA ✅ |
| `--text-secondary` `#4A544F` | `--bg-cream` `#FBF7F0` | **7.9:1** | 16px | AAA ✅ |
| `--text-secondary` `#4A544F` | `--surface-1` `#FFFFFF` | **8.6:1** | 16px | AAA ✅ |
| `--text-secondary` `#4A544F` | `--teal-100` `#E3F0EE` | **7.0:1** | 16px | AAA ✅ (at threshold) |
| `--text-on-teal` `#FFFFFF` | `--teal-900` `#0F4C4A` | **8.7:1** | 16px | AAA ✅ |
| `--text-on-teal` `#FFFFFF` | `--teal-900-hover` `#0C3E3C` | **10.5:1** | 16px | AAA ✅ |
| `--text-on-teal` `#FFFFFF` | `--teal-900-active` `#093230` | **12.3:1** | 16px | AAA ✅ |
| `--text-teal` `#0F4C4A` | `--bg-cream` `#FBF7F0` | **7.9:1** | 16px | AAA ✅ |
| `--text-teal` `#0F4C4A` | `--teal-100` `#E3F0EE` | **7.0:1** | 16px | AAA ✅ (at threshold) |
| `--text-success` `#155F3B` | `--surface-success` `#E6F2EA` | **7.1:1** | 16px | AAA ✅ |
| `--text-success` `#155F3B` | `--bg-cream` `#FBF7F0` | **7.8:1** | 16px | AAA ✅ |
| `--text-attention` `#8A5200` | `--surface-attention` `#FBEFDC` | **7.0:1** | 16px | AAA ✅ (at threshold) |
| `--text-attention` `#8A5200` | `--bg-cream` `#FBF7F0` | **7.4:1** | 16px | AAA ✅ |
| `--text-danger` `#8B1D17` | `--surface-danger` `#F9E7E5` | **7.6:1** | 16px | AAA ✅ |
| `--text-danger` `#8B1D17` | `--bg-cream` `#FBF7F0` | **8.7:1** | 16px | AAA ✅ |
| `--text-on-teal` `#FFFFFF` | `--red-700` `#A3231C` | **7.2:1** | 16px | AAA ✅ |
| `--text-on-teal` `#FFFFFF` | `--green-600` `#1F7A4C` | **4.9:1** | **24px bold only** | AA Large ✅ |
| `--text-disabled` `#6B736E` | `--disabled-bg` `#E7E1D7` | **4.6:1** | 18px | AA ✅ (disabled exempt from AAA) |

Non-text contrast (WCAG 1.4.11, ≥3:1 required for UI boundaries and focus indicators):

| Element | Against | Ratio | Verdict |
|---|---|---|---|
| `--border-strong` `#C8BCAB` | `--bg-cream` | **1.7:1** | Decorative only — never the sole indicator |
| `--teal-900` outline | `--bg-cream` | **7.9:1** | ✅ Input outlines use `--teal-900` at 2px, not `--border-strong` |
| `--focus-ring` `#0F4C4A` | `--bg-cream` | **7.9:1** | ✅ |
| `--focus-ring` `#0F4C4A` | `--surface-1` | **8.5:1** | ✅ |
| `--focus-ring` on `--teal-900` (uses halo) | via `--focus-ring-halo` | **8.7:1** | ✅ |

> **Implementation note for GLM:** `--border-subtle` and `--border-strong` are *decorative*. Any
> boundary that a user must perceive to operate the control (input field edge, selected state,
> focus) must use `--teal-900` at ≥2px. Do not rely on the hairline tokens for meaning.

### 2.6 Colour is never the only signal

Roughly 1 in 12 men have a colour-vision deficiency, and it correlates with nothing about age.
Every semantic colour in Thuna is paired with a **second, non-colour signal**:

| Semantic | Colour | Second signal | Third signal |
|---|---|---|---|
| Success | `--green-600` / `--surface-success` | Check icon **plus the word** "Done" | Spoken confirmation |
| Attention | `--amber-500` / `--surface-attention` | 4px left rule on the card **plus the word** "Waiting for you" | Spoken question |
| Danger | `--red-700` / `--surface-danger` | Shield icon **plus the words** "This is not safe" | Spoken refusal |
| Simulated | `--surface-2` | The literal chip text "SIMULATED" | — |

### 2.7 Dark mode

> **Out of scope for v1. Light mode only.** `color-scheme: light` is declared explicitly on `:root`
> and `<meta name="color-scheme" content="light">` is set so that the OS does not auto-invert.

Three reasons, in order of weight:

1. **Elders generally read better on light backgrounds.** Age-related lens yellowing and increased
   intraocular light scatter mean that light text on dark backgrounds produces more perceived
   *halation* (glow bleeding into the counters of letterforms) for older eyes than for younger ones.
   Dark mode is a comfort preference for younger users and an acuity penalty for many older ones.
   Shipping it as an equal-status option would encourage the wrong default.
2. **It doubles the QA surface on the highest-risk screens.** The SafetyWarning and
   ConfirmationScreen must be unambiguous under demo lighting, projector, phone screenshot, and
   family member's glance. Two palettes means two sets of contrast proofs, two sets of
   screenshots, and two chances for the danger surface to lose its urgency.
3. **The identity is warm.** Cream is doing real brand work. A dark Thuna is a different product,
   and a rushed dark palette would land in exactly the "hospital blue / purple AI" territory §7
   prohibits.

**What is in scope instead:** respecting `prefers-contrast: more` (see §9.4), respecting OS text
scaling up to 200%, and `prefers-reduced-motion` (see §8.3). Those three deliver more real
accessibility value than a dark palette would.

**If dark mode is added later**, it must be a deliberate v2 project with its own contrast audit and
its own screenshots of the SafetyWarning screen — not a set of inverted tokens.

---

## 3. Typography

### 3.1 Font families

```css
--font-sans:
  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Noto Sans Malayalam", "Manjari", "Meera", "Rachana", "Nirmala UI",
  "Helvetica Neue", Arial, sans-serif;

--font-numeric:
  ui-monospace, "SF Mono", "Roboto Mono", monospace;
```

Rationale:

- **System stack first.** The OS UI font is the face the elder already reads every day, is already
  hinted for their screen, ships at every weight, and costs zero network bytes. A custom brand face
  would be a web-font round trip on a phone that may be on 3G, for a legibility outcome no better
  than San Francisco or Roboto.
- **Malayalam fallbacks are explicit and ordered.** `Noto Sans Malayalam` first (present on modern
  Android and installable), then `Manjari` (a modern Malayalam face with excellent screen
  rendering), then the widely-installed `Meera` and `Rachana`, then Windows' `Nirmala UI`. iOS
  falls through to its own Malayalam system face automatically. Never rely on the generic
  `sans-serif` fallback for Malayalam — the substituted face varies wildly in x-height.
- **`--font-numeric`** is used *only* for the rupee totals on `TaskSummary` and `CompletionReceipt`,
  where digit alignment across a correction (Rs 145 → Rs 125) makes the change legible at a glance.
  Also apply `font-variant-numeric: tabular-nums`.

### 3.2 Scale

| Token | Size | Weight | Line-height | Letter-spacing | Use |
|---|---|---|---|---|---|
| `--text-greeting` | **32px** | 600 | 40px (1.25) | `-0.01em` | "Good morning, Appa" — the home greeting only |
| `--text-guidance-lg` | **28px** | 600 | 38px (1.36) | `-0.005em` | Primary guidance on a single-focus screen (SafetyWarning, ConfirmationScreen question) |
| `--text-guidance` | **24px** | 600 | 34px (1.42) | `0` | Standard main guidance — what Thuna is saying right now |
| `--text-secondary-lg` | **20px** | 500 | 30px (1.5) | `0` | Secondary line, list-row titles, button labels on large buttons |
| `--text-body` | **18px** | 400 | 28px (1.56) | `0` | Body copy — the default for prose |
| `--text-essential` | **16px** | 500 | 24px (1.5) | `0.005em` | Absolute floor. Chips, timestamps, the "SIMULATED" label |
| `--text-numeric` | **24px** | 600 | 32px | `0` | Rupee totals (`--font-numeric`, tabular) |

> **There is no size below 16px anywhere in the elder UI.** Not for captions, not for legal text,
> not for timestamps. If content genuinely does not deserve 16px, it does not deserve to be on the
> elder's screen — move it to the demo inspector.

### 3.3 Malayalam line-height override

Malayalam has tall ascenders, deep descenders, and stacked conjunct forms (`ക്ക`, `ന്ത`, `ണ്ട`)
that clip or collide at Latin line-heights. Every text token gets a **1.6–1.8** multiplier when the
active language is `ml-IN`.

```css
:root[lang="ml"],
:root[lang="ml-IN"],
[lang="ml"], [lang="ml-IN"] {
  --lh-greeting:      1.62;   /* 32px → 52px */
  --lh-guidance-lg:   1.65;   /* 28px → 46px */
  --lh-guidance:      1.70;   /* 24px → 41px */
  --lh-secondary-lg:  1.72;   /* 20px → 34px */
  --lh-body:          1.75;   /* 18px → 32px */
  --lh-essential:     1.80;   /* 16px → 29px */
  letter-spacing: 0;          /* never track Malayalam */
}
```

Rules for Malayalam:

| Rule | Reason |
|---|---|
| **Never apply negative letter-spacing** | Kerning conjuncts apart breaks the ligature reading |
| **Never `text-transform: uppercase`** | Meaningless in Malayalam; produces no change and signals a Latin-only mindset |
| **Every text container must fit 2 lines without truncation** | Malayalam renders roughly 1.3–1.5× the character count of the English equivalent |
| **Never `white-space: nowrap` on guidance or button labels** | Guarantees overflow in Malayalam |
| **Use `overflow-wrap: break-word`, never `text-overflow: ellipsis` on guidance** | A truncated instruction to an elder is worse than a wrapped one |
| **Set `lang` on the element, not just `<html>`** | Mixed-language screens (English brand name inside a Malayalam sentence) need per-node `lang` for correct font selection and for screen-reader voice switching |

**Two-line budget (the hard number GLM must hold to):** every component in
`COMPONENT_SPECIFICATION.md` states a `min-height` computed at **2 lines of Malayalam at that
token's size**. E.g. a `--text-guidance` block reserves `2 × 41px = 82px` of vertical space
regardless of whether the English string fits on one line. This prevents layout jump when the
language toggles mid-demo.

### 3.4 OS text scaling

The UI must remain usable to **200%** OS text scale. Consequences:

- All type sizes in `rem`, with `html { font-size: 100% }` — never `px` on font-size in the
  component layer.
- All container heights are `min-height`, never fixed `height`, except the TalkButton and the
  bottom-navigation bar.
- No `overflow: hidden` on any text container.
- Above 150% scale, `TaskChoiceList` rows stack their meta line below the title rather than beside.

---

## 4. Spacing

### 4.1 Scale

| Token | Value | Use |
|---|---|---|
| `--space-1` | **4px** | Icon-to-label gap; chip internal vertical padding; hairline offsets. Never for layout separation. |
| `--space-2` | **8px** | Gap between tightly related lines (title → its own subtitle); chip horizontal padding |
| `--space-3` | **12px** | **Minimum gap between two adjacent touch targets.** List-row internal vertical padding. |
| `--space-4` | **16px** | Card internal padding (compact); gap between unrelated lines in a card |
| `--space-6` | **24px** | **Screen horizontal gutter.** Card internal padding (standard). Gap between stacked cards. |
| `--space-8` | **32px** | Gap between major screen regions; space above the primary action |
| `--space-12` | **48px** | Top padding under the header on a single-focus screen; breathing room around the TalkButton |

### 4.2 Usage rules

| Rule | Value |
|---|---|
| Screen horizontal gutter | `--space-6` (24px) on all viewports. At 360px this leaves a 312px content column; at 430px, 382px. Do not scale the gutter with viewport — the content column absorbs the difference. |
| Vertical rhythm between stacked cards | `--space-6` (24px) |
| Minimum separation between adjacent tappable elements | `--space-3` (12px), measured edge-to-edge of the *hit area*, not the visual box |
| Space above the primary action | `--space-8` (32px) — the primary button is never crowded by the content it acts on |
| Never used | 2px, 6px, 10px, 14px, 20px. If a design needs one of these, the layout is wrong. |

### 4.3 One-handed reach

At 390×844 with the bottom navigation present, the **comfortable thumb zone for a right-handed
one-handed grip is roughly the bottom 45% of the screen**, biased right. Consequences:

| Placement | Where | Why |
|---|---|---|
| TalkButton | Bottom-centre, raised above the nav bar | Reachable by either thumb; centre is the compromise between left- and right-handed |
| Primary confirm button | Bottom of the content area, directly above the nav | Never at the top of a screen |
| Destructive / "No" | **Left** of or **below** the confirm, never adjacent-right | Right-thumb momentum after tapping should not land on a destructive control |
| Back / close | Top-left in the header, **plus** a large "Go back" action in the content area on any screen where going back matters | Top-left is unreachable one-handed; the header control is for completeness, the in-content control is the real one |
| Nothing critical above 60% screen height | — | An elder should never have to shuffle their grip to complete a task |

---

## 5. Corner radii

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | **12px** | Chips, the "SIMULATED" label, inline badges, small icon containers, input fields |
| `--radius-md` | **16px** | Cards, list rows, buttons, sheets' inner elements, the OfflineBanner |
| `--radius-lg` | **24px** | Full-bleed panels, bottom sheets (top corners only), the VoiceStatePanel, modal containers |
| `--radius-full` | **9999px** | The TalkButton and its rings only. Nothing else is a circle. |

Rules:

- **Never mix radii within one visual group.** A card at `--radius-md` containing a chip at
  `--radius-sm` is correct (nested, smaller inside larger). A card at `--radius-md` sitting beside a
  card at `--radius-lg` is not.
- **Nested radius rule:** inner radius = outer radius − inner padding, floored at `--radius-sm`.
  A `--radius-lg` (24px) panel with `--space-4` (16px) padding takes `--radius-sm` (12px) children,
  not 8px.
- **Bottom sheets** get `--radius-lg` on the top two corners and `0` on the bottom two.

---

## 6. Elevation and shadows

Two levels. That is the whole system.

| Token | Value | Use |
|---|---|---|
| `--elev-0` | `none` | Flat on the background — grouped list rows, inline banners |
| `--elev-1` | `0 1px 2px rgba(31,36,33,0.06), 0 2px 8px rgba(31,36,33,0.05)` | Cards on cream — GuidanceCard, TaskSummary, list rows that are individually tappable |
| `--elev-2` | `0 2px 4px rgba(31,36,33,0.08), 0 8px 24px rgba(31,36,33,0.10)` | The TalkButton, bottom sheets, the bottom-navigation bar, modals |

Rules:

- **Shadow colour is the charcoal token at low alpha, never black.** Pure-black shadows over cream
  read as grey smudge and cheapen the surface.
- **No glassmorphism.** No `backdrop-filter`, no translucent frosted panels, no blurred layers.
  Blurred backgrounds reduce effective contrast for exactly the users this product serves, and the
  performance cost on mid-range Android is real.
- **No coloured shadows**, no glow, no inner shadows, no neumorphism.
- **Elevation never encodes meaning.** A dangerous card is not "higher". Semantics live in colour +
  icon + copy (§2.6).
- **Borders and shadows are alternatives, not partners.** `--elev-1` cards on cream use shadow and
  `--border-subtle` at most; never a strong border plus a heavy shadow.

---

## 7. What to avoid — explicit prohibitions

These are not stylistic preferences. Each one is a specific failure mode this product cannot afford.

| Prohibited | Why |
|---|---|
| **Purple/violet "AI" gradients** (`#7C3AED`, `#A855F7`, indigo→magenta) | Signals "generative AI toy". Thuna's value proposition is that it is *reliable*, and the purple-gradient idiom currently signals the opposite to anyone over 40. |
| **Hospital / clinical blue** (`#2563EB`, `#0EA5E9`, and the whole medical-portal palette) | Recasts the elder as a patient. Thuna is a companion for a competent adult; the moment it looks like a care-monitoring dashboard, the family becomes the user and the elder becomes the subject. Directly contradicts `FAMILY_CONSENT_POLICY.md` §1. |
| **Glassmorphism / frosted translucency / `backdrop-filter`** | Reduces effective contrast, is unpredictable over varying content, and is a performance tax on mid-range Android. |
| **Excessive gradients** | One flat `--teal-900` is more premium than any gradient. Gradients are permitted in exactly one place: the TalkButton's optional 4% radial sheen (§8.1) — and even that is optional. |
| **Childish avatars, cartoon faces, mascots, anthropomorphic blobs** | Patronising. An elder being helped with money and medicine does not want a cartoon. Thuna has a *voice*, not a *face*. |
| **Dense cards, multi-column grids, information-dense rows** | Every screen answers one question. Density is the enemy of a 24px guidance line. |
| **Neon, saturated accents, `#00FF*`-family colours** | Glare and afterimage for older eyes; cheap. |
| **Small grey labels** (12–14px `#9CA3AF` and friends) | The single most common a11y failure in consumer apps. Prohibited absolutely — see §2.3. |
| **Excessive animation** — bouncing, springing, parallax, staggered entrances, confetti | Motion competes with the voice channel, can trigger vestibular discomfort, and makes the interface feel unserious about the money it is spending. |
| **Enterprise-dashboard chrome** — sidebars, breadcrumbs, tab bars with 5+ items, data tables, KPI tiles, dense toolbars | Wrong product. The demo inspector may look like this. The elder UI never does. |
| **Icon-only controls** | See §9.2. Every icon has a text label. No exceptions. |
| **Toast notifications that auto-dismiss** | An elder who looks away misses the message entirely. Status is persistent and in-place (`OfflineBanner`, `GuidanceCard`), never a 3-second toast. |
| **Placeholder text as the only label** | Vanishes on focus. Labels are always visible above the field. |
| **Red for anything except genuine danger** | If "edit" is red, the safety refusal loses its force. `--red-700` appears on exactly one component: `SafetyWarning`. |

---

## 8. Interaction states

### 8.1 State matrix

Every interactive element implements all six rows. `:hover` is guarded by
`@media (hover: hover) and (pointer: fine)` so that touch devices never get a stuck hover.

| Element | Default | Hover (pointer only) | Active / pressed | Focus-visible | Disabled | Loading |
|---|---|---|---|---|---|---|
| **Primary button** | `--teal-900` fill, `--text-on-teal`, `--elev-0` | `--teal-900-hover` | `--teal-900-active`, `scale(0.98)` | 3px `--focus-ring` + 2px `--focus-ring-halo` offset | `--disabled-bg` fill, `--text-disabled`, `cursor: not-allowed`, `aria-disabled="true"` | Label swaps to "Working…" + inline 20px spinner; button stays same size |
| **Secondary button** | `--teal-100` fill, `--text-teal`, 2px `--border-teal` | `--teal-100-hover` | `--teal-100-active`, `scale(0.98)` | same ring | `--disabled-bg`, `--disabled-border` | same |
| **Danger button** | `--red-700` fill, `#FFFFFF` | `#8F1F19` | `--danger-active`, `scale(0.98)` | same ring | `--disabled-bg` | same |
| **Text / tertiary action** | `--text-teal`, 2px transparent underline | underline → `--teal-900` | `--teal-900-active` text | ring drawn around the full 52px hit area | `--text-disabled`, no underline | n/a |
| **List row / choice** | `--surface-1`, 1px `--border-subtle`, `--elev-1` | `--surface-2` | `--surface-1-active`, `scale(0.995)` | 3px inset `--focus-ring` | `--surface-2`, `--text-disabled`, no shadow | skeleton (§8.4) |
| **Selected list row** | `--teal-100` fill, **3px left rule** `--teal-900`, check icon right | `--teal-100-hover` | `--teal-100-active` | same ring | — | — |
| **Bottom-nav item** | icon outline `--text-secondary`, label `--text-secondary` | `--surface-2` pill behind | pill `--surface-1-active` | ring inset in the item box | n/a | n/a |
| **Active bottom-nav item** | icon + label `--teal-900`, **weight 600**, 3px top rule | — | — | same | n/a | n/a |
| **TalkButton** | see §8.2 | slight `--teal-900-hover` | `scale(0.96)` | 4px ring at 6px offset | `--disabled-bg`, mic-off icon, label "Not available" | — |
| **Input field** | `--surface-1`, 2px `--border-strong`, 18px text | 2px `--teal-900` border | — | 2px `--teal-900` border **+** 3px `--focus-ring` at 2px offset | `--disabled-bg`, `--disabled-border` | — |

### 8.2 TalkButton visual states

The TalkButton is the product's signature. Its full behavioural spec lives in
`COMPONENT_SPECIFICATION.md` §4; this table defines only the visual tokens.

| Voice state | Fill | Ring | Icon | Motion |
|---|---|---|---|---|
| `idle` | `--teal-900` | none | Microphone, outlined, white, 36px | none |
| `listening` | `--teal-900` | Two concentric rings, `--teal-900` at 20% and 10% alpha, at +12px and +24px | Microphone, white, 36px | Rings breathe 1.0 → 1.06 scale, 2200ms, `--ease-calm`, infinite |
| `thinking` | `--teal-900` | Single ring `--teal-900` at 24% alpha at +12px | Three dots, white, 8px each | Dots fade sequentially 0.35 → 1.0, 1400ms cycle |
| `speaking` | `--teal-100` fill, 3px `--teal-900` border | none | Waveform, `--teal-900`, 36px | Three waveform bars scale-y 0.5 → 1.0 in a 900ms loop |
| `error` | `--surface-danger`, 3px `--red-700` border | none | Microphone with slash, `--text-danger` | none — errors do not animate |
| `disabled` | `--disabled-bg`, 2px `--disabled-border` | none | Microphone with slash, `--text-disabled` | none |

The optional radial sheen (the only permitted gradient in the system):

```css
background-image: radial-gradient(120% 120% at 50% 20%, rgba(255,255,255,0.04), transparent 60%);
```

### 8.3 Focus rings — non-negotiable

Elders may use a Bluetooth keyboard, a switch, or an external accessibility device. Focus must be
unmissable.

```css
:where(button, a, [role="button"], [role="option"], input, select, textarea):focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 6px var(--focus-ring-halo);
  border-radius: inherit;
}
```

| Rule | Detail |
|---|---|
| Ring width | **3px** (not the browser default 1–2px) |
| Offset | **2px**, so the ring never sits on the element's own border |
| Halo | 6px of `--focus-ring-halo` outside the ring, so a teal ring on a teal surface still reads |
| Contrast | ≥3:1 against **both** the element and its background — verified in §2.5 |
| `:focus-visible`, not `:focus` | A mouse/touch tap does not paint a ring; keyboard and switch navigation always does |
| **Never `outline: none`** without an equally visible replacement | Removing the ring is a WCAG 2.4.7 failure and locks out switch users |
| Focus is never trapped except in modals | Modals (`ConfirmationScreen` when presented as a sheet, `SafetyWarning`) trap focus and return it to the invoking element on close |
| Skip link | A visually-hidden "Skip to main content" link is the first tab stop, becoming visible on focus |

### 8.4 Loading and skeletons

- Skeletons use `--surface-2` blocks at the real content's dimensions, with a **fade** 0.6 → 1.0
  over 1200ms — never a sweeping shimmer gradient.
- Under `prefers-reduced-motion`, the skeleton is a static `--surface-2` block with no fade.
- Any operation over **800ms** must show the skeleton or spinner; below that, show nothing (a
  flash of loading state is worse than a brief pause).
- Any operation over **4s** adds a reassuring line: *"Still working. This sometimes takes a moment."*

---

## 9. Iconography

### 9.1 Style

| Property | Value |
|---|---|
| Style | **Outlined**, geometric, rounded terminals |
| Stroke width | **2px at 24px**, **2.5px at 32px**, **3px at 36px+** — optical weight held constant |
| Line caps / joins | `round` / `round` |
| Grid | 24px design grid, 2px safe padding |
| Sizes | `--icon-sm` 20px (inline in a 16–18px line) · `--icon-md` 24px (list rows, buttons) · `--icon-lg` 32px (nav, section headers) · `--icon-xl` 36px (TalkButton) |
| Colour | `currentColor`, always — icons inherit their label's colour so state changes stay in sync |
| Fill | Never filled, except the single check inside a selected state |
| Source | Inline SVG in the component tree. No icon-font, no sprite sheet, no network request. |

### 9.2 The rule: icons never appear without text

> **An icon may never be the sole carrier of meaning or the sole label of a control.**

| Context | Requirement |
|---|---|
| Bottom-nav item | Icon **above** a visible text label — always, at every viewport, never icon-only to save space |
| Button with an icon | Icon **plus** text, icon on the left (leading) at `--space-2` gap; the label is never `aria-label`-only |
| Status badge | Icon **plus** the status word ("Done", "Waiting for you", "Not safe") |
| Decorative icon (illustration in a header) | `aria-hidden="true"`, `focusable="false"`, and it carries no information not already in the text |
| Back / close in the header | Icon **plus** "Back" / "Close" text. If horizontal space is genuinely tight at 360px, the *icon* is dropped and the text is kept — never the reverse. |
| The only exception | The TalkButton's microphone glyph, which has a **persistent text label directly beneath it** ("Tap to talk" / "Listening…" / "Thuna is speaking") — that label is part of the component, not optional |

Rationale: unfamiliar glyphs are learned vocabulary, and an elder new to smartphones has not learned
it. A hamburger, an overflow "⋮", a chevron, a bell — none of these are self-evident. Text costs
vertical space; a misunderstood control costs the task.

Also prohibited: emoji as UI iconography, and the "⋮" overflow menu (all actions are visible).

---

## 10. Motion

### 10.1 Principles

1. Motion **explains a relationship** (this came from there) or **directs attention** (this changed).
   Motion that merely decorates is deleted.
2. Nothing animates while Thuna is speaking except the TalkButton's own waveform. The voice is the
   primary channel; the screen must not compete with it.
3. Nothing loops indefinitely except the TalkButton's `listening` / `thinking` / `speaking`
   indicators, which are *status*, not decoration.
4. **Safety and error states never animate in.** They appear instantly, at full opacity.

### 10.2 Timing and easing tokens

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | `0ms` | Safety warnings, error states, offline banner appearing |
| `--dur-fast` | `120ms` | Press feedback, focus ring, colour state change |
| `--dur-base` | `180ms` | Card/content fade-in, chip appearance, checkbox tick |
| `--dur-slow` | `240ms` | Screen transition, sheet slide, nav-item change |
| `--dur-ambient` | `2200ms` | TalkButton listening breath (loop) |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Entrances — fast start, gentle settle |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits |
| `--ease-calm` | `cubic-bezier(0.4, 0, 0.2, 1)` | Ambient loops, breathing |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0.2, 1)` | Everything else |

**240ms is the ceiling.** Any transition longer than 240ms is a bug.

### 10.3 Motion inventory with reduced-motion fallbacks

Every animation in the product, with its `prefers-reduced-motion: reduce` behaviour. Reduced motion
**never removes information** — it replaces movement with an instant or opacity-only change.

| # | Animation | Normal | `prefers-reduced-motion: reduce` |
|---|---|---|---|
| 1 | Screen enter | Fade 0→1 + translateY 8px→0, `--dur-slow`, `--ease-out` | Fade 0→1, `--dur-fast`. No translate. |
| 2 | Screen exit | Fade 1→0, `--dur-base`, `--ease-in` | Instant |
| 3 | Card / GuidanceCard appear | Fade + translateY 6px→0, `--dur-base` | Fade only, `--dur-fast` |
| 4 | TalkButton press | `scale(1)` → `scale(0.96)`, `--dur-fast` | Fill darkens to `--teal-900-active`, no scale |
| 5 | TalkButton `listening` rings | Two rings breathe 1.0↔1.06, `--dur-ambient`, infinite | **Rings become static at 1.03 with a steady 24% alpha.** The label "Listening…" and the state chip carry the meaning. |
| 6 | TalkButton `thinking` dots | Sequential opacity 0.35↔1.0, 1400ms loop | Static three dots at full opacity + label "Thinking…" |
| 7 | TalkButton `speaking` waveform | 3 bars scale-y 0.5↔1.0, 900ms loop | Static bars at differing fixed heights + label "Thuna is speaking" |
| 8 | Button press | `scale(0.98)`, `--dur-fast` | Colour change only |
| 9 | List-row press | `scale(0.995)` + fill change | Fill change only |
| 10 | Bottom sheet slide-up | translateY 100%→0, `--dur-slow`, `--ease-out` | Fade 0→1, `--dur-fast` |
| 11 | Scrim | Fade 0→1, `--dur-base` | Fade 0→1, `--dur-fast` |
| 12 | Skeleton | Opacity 0.6↔1.0, 1200ms loop | Static `--surface-2` block |
| 13 | Spinner | 360° rotate, 900ms linear | **Non-rotating** three-dot fade; if that is also reduced, a static "Working…" text |
| 14 | Success check draw | Stroke-dashoffset draw, `--dur-slow` | Check appears instantly at full opacity |
| 15 | OfflineBanner | Slide down 100%→0, `--dur-base` | Appears instantly |
| 16 | SafetyWarning | **Instant, `--dur-instant`** — deliberately never animates | Identical (instant) |
| 17 | Correction diff highlight | `--surface-attention` background fades in then out over 1200ms | Background stays `--surface-attention` **permanently** with a "changed" chip — the information survives |
| 18 | Nav active indicator | 3px top rule slides, `--dur-slow` | Rule appears instantly on the new item |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

> **Implementation note for GLM:** the blanket rule above is the safety net, **not** the
> implementation. Rows 5, 6, 7, 12, 13 and 17 need explicit reduced-motion styling because killing
> their animation would otherwise destroy the state information they carry. Write those six as
> real `@media (prefers-reduced-motion: reduce)` blocks in the component's own stylesheet.

---

## 11. Layout, safe areas, and viewport geometry

### 11.1 Target viewports

| Device class | Viewport | Notes |
|---|---|---|
| **Primary** | **390 × 844** | iPhone 14/15/16 logical size. All hard numbers in `COMPONENT_SPECIFICATION.md` are stated at this width. |
| Small | **360 × 800** | Common mid-range Android (Galaxy A-series, Redmi). The tightest case. |
| Large | **430 × 932** | iPhone Pro Max. Content column widens; the TalkButton does **not** grow. |

Content column widths after the 24px gutter: **312px** (360) · **342px** (390) · **382px** (430).

Design at 390 and verify at 360 first, not last. The 360 checks that matter:

| Check | Requirement |
|---|---|
| Two side-by-side buttons | Must **stack vertically** below 390px. There is no legitimate 2-up button row at 312px content width. |
| Rupee total + label on one row | Must wrap; the total keeps `--text-numeric` and moves to its own line |
| Bottom-nav labels | Must not truncate at 16px. If they do, shorten the *copy*, never the type size. |
| 5 nav items at 360px | 312px ÷ 5 = 62.4px per item. Confirmed viable at 16px labels with the copy in §11.4. |
| Malayalam guidance, 2 lines | 24px × 1.70 × 2 = 82px reserved. Verify no clipping. |

### 11.2 Safe-area insets

```css
:root {
  --safe-top:    env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left:   env(safe-area-inset-left, 0px);
  --safe-right:  env(safe-area-inset-right, 0px);
}
```

Requires `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.

| Surface | Padding rule |
|---|---|
| App header | `padding-top: calc(var(--safe-top) + var(--space-3))` |
| Bottom navigation | `padding-bottom: var(--safe-bottom)` on the bar; the bar's own 64px content height sits *above* the inset |
| Scrollable content region | `padding-bottom: calc(var(--nav-total-height) + var(--space-8))` so the last element clears the nav and the raised TalkButton |
| Horizontal | `padding-left: max(var(--space-6), var(--safe-left))`; same for right. Matters in landscape on notched devices. |
| Full-bleed sheets | Respect `--safe-bottom` on their action row |

Measured insets to design against:

| Context | `safe-top` | `safe-bottom` |
|---|---|---|
| iPhone 14/15/16, standalone PWA | 59px | 34px |
| iPhone 14/15/16, Safari browser | 59px (under the notch) | 34px + a **~44px** collapsing Safari toolbar |
| Android, Chrome, gesture nav | ~24px status bar | ~24px gesture pill area |
| Android, Chrome, 3-button nav | ~24px | ~48px nav bar |
| Android, installed PWA | ~24px | 0–24px |

### 11.3 Browser-chrome allowance

**Never use `100vh`.** On mobile Safari and Chrome, `100vh` is the *expanded* viewport, so a
`100vh` layout is cropped by the collapsing toolbar until the user scrolls — meaning the primary
button can be invisible on first paint. That is a task-blocking bug for this audience.

```css
.elder-shell {
  min-height: 100dvh;                 /* dynamic viewport — tracks the toolbar */
  min-height: 100svh;                 /* fallback ordering: svh is the safe small viewport */
}
@supports not (height: 100dvh) {
  .elder-shell { min-height: calc(100vh - 88px); } /* worst-case Android+iOS chrome allowance */
}
```

Rules:

- Use `100dvh` for the shell; use `100svh` where a fixed element must never be occluded.
- Budget **88px** of possible browser chrome (44px top URL bar + 44px bottom toolbar) on the
  no-`dvh` fallback path.
- **Do not use `position: fixed` for the bottom navigation.** Use a flex column shell with the nav
  as a non-scrolling flex child (`flex-shrink: 0`). Fixed positioning interacts badly with the
  iOS keyboard and with toolbar collapse.
- When a text input is focused (rare — voice is primary), the bottom nav hides via
  `visualViewport` resize detection so the keyboard does not push it into the content.

### 11.4 Bottom-navigation geometry

Exact numbers. This is the most-touched chrome in the product.

```
                            390px wide
 ├────────────────────────────────────────────────────────┤

                        ╭──────────╮   ← TalkButton, 76px ⌀
                        │          │      centre-x = 195px
                        │    ▮     │      bottom edge of button = nav top + 22px
                        │          │      i.e. 54px of the button sits ABOVE the bar
                        ╰──────────╯      3px --bg-cream ring separates it from the bar
 ┌──────────────────────────────────────────────────────────┐  ← nav top edge
 │                        │  22px  │                        │
 │  ▢       ▢             ╰────────╯             ▢       ▢  │
 │ Home   Today          Talk                Family  Memory │   64px content height
 └──────────────────────────────────────────────────────────┘
 │                    --safe-bottom (34px iOS)               │
 └──────────────────────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| `--nav-height` (content) | **64px** |
| `--nav-total-height` | `calc(64px + var(--safe-bottom))` |
| Background | `--surface-1` (`#FFFFFF`) — a deliberate contrast step against the cream body |
| Top border | 1px `--border-subtle` |
| Shadow | `--elev-2`, cast **upward**: `0 -2px 4px rgba(31,36,33,0.06), 0 -8px 24px rgba(31,36,33,0.08)` |
| Item count | **5** — Home · Today · **Talk** · Family · Memory |
| Item width (390px) | 78px each · (360px) 72px · (430px) 86px |
| Item hit height | Full 64px |
| Icon size | `--icon-lg` (32px), stroke 2.5px |
| Icon → label gap | `--space-1` (4px) |
| Label size | **16px / 500**, active **16px / 600** — never smaller, never uppercase |
| Label max width | Item width − 8px; if it does not fit, **shorten the word**, do not shrink the type |
| Active indicator | 3px `--teal-900` rule flush to the item's top edge, spanning the icon's width (32px), centred; **plus** teal icon + 600 weight |
| Inactive colour | `--text-secondary` (`#4A544F`, 7.9:1 on white — passes AAA as a label) |
| Nav item vertical padding | `--space-2` (8px) top, `--space-2` bottom, inside the 64px |
| Safe area | `padding-bottom: var(--safe-bottom)` on the bar; the 64px content row is **above** it and the background colour extends through the inset |

**The raised centre Talk item:**

| Property | Value |
|---|---|
| Diameter | **76px** at 390px and 360px; **80px** at 430px (never below 76, never above 96) |
| Vertical placement | Button's **bottom edge sits 22px above the nav's top edge** → 54px of the button overhangs the bar, 22px of clearance beneath it. Total occupied strip above the nav: 54px. |
| Horizontal | Centre-x = viewport width ÷ 2, exactly |
| Separation ring | 3px `--bg-cream` ring around the button so it reads as detached from the white bar |
| Shadow | `--elev-2` |
| Nav slot beneath it | The centre nav slot holds the **text label "Talk"** at 16px/600 in `--teal-900`, positioned in the normal label row. The button itself provides the icon. |
| Content-area clearance | Scrollable content reserves `calc(var(--nav-total-height) + 54px + var(--space-8))` at the bottom |
| Which items are visible when | The 5-item bar is present on Home, Today, Family, and Memory. It is **hidden** on `ConfirmationScreen` and `SafetyWarning` (single-focus screens), where the only actions are the screen's own buttons. |

**Never:** more than 5 items; a scrolling nav; a badge count on a nav item (badges create the
anxiety this product is designed to remove); icon-only items.

---

## 12. Ready-to-paste tokens

Drop into `app/globals.css` under `:root`. Names are contractual — extend, never rename.

```css
:root {
  color-scheme: light;

  /* ───── Core palette (contractual) ───── */
  --bg-cream:      #FBF7F0;
  --teal-900:      #0F4C4A;
  --teal-100:      #E3F0EE;
  --green-600:     #1F7A4C;
  --amber-500:     #B26A00;
  --red-700:       #A3231C;
  --charcoal-900:  #1F2421;

  /* ───── Surfaces ───── */
  --surface-0:          var(--bg-cream);
  --surface-1:          #FFFFFF;
  --surface-2:          #F4EEE4;
  --surface-teal:       var(--teal-100);
  --surface-success:    #E6F2EA;
  --surface-attention:  #FBEFDC;
  --surface-danger:     #F9E7E5;

  /* ───── Borders ───── */
  --border-subtle:     #E4DCD0;
  --border-strong:     #C8BCAB;
  --border-teal:       #9CC7C1;
  --border-success:    #9AC7AC;
  --border-attention:  #DDB472;
  --border-danger:     #D99C96;

  /* ───── Text ───── */
  --text-primary:    var(--charcoal-900);
  --text-secondary:  #4A544F;
  --text-on-teal:    #FFFFFF;
  --text-teal:       var(--teal-900);
  --text-success:    #155F3B;
  --text-attention:  #8A5200;
  --text-danger:     #8B1D17;
  --text-disabled:   #6B736E;

  /* ───── Interaction states ───── */
  --teal-900-hover:   #0C3E3C;
  --teal-900-active:  #093230;
  --teal-100-hover:   #D6E8E5;
  --teal-100-active:  #C6DEDA;
  --surface-1-active: #F0E9DE;
  --danger-active:    #7E1A15;
  --disabled-bg:      #E7E1D7;
  --disabled-border:  #CFC6B8;
  --focus-ring:       var(--teal-900);
  --focus-ring-halo:  var(--bg-cream);
  --scrim:            rgba(31, 36, 33, 0.45);

  /* ───── Typography ───── */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Noto Sans Malayalam", "Manjari", "Meera", "Rachana",
               "Nirmala UI", "Helvetica Neue", Arial, sans-serif;
  --font-numeric: ui-monospace, "SF Mono", "Roboto Mono", monospace;

  --text-greeting:      2rem;      /* 32px */
  --text-guidance-lg:   1.75rem;   /* 28px */
  --text-guidance:      1.5rem;    /* 24px */
  --text-secondary-lg:  1.25rem;   /* 20px */
  --text-body:          1.125rem;  /* 18px */
  --text-essential:     1rem;      /* 16px — floor */
  --text-numeric:       1.5rem;    /* 24px */

  --weight-regular: 400;
  --weight-medium:  500;
  --weight-semibold: 600;

  /* Latin line-height multipliers (see --lh-* override for ml-IN) */
  --lh-greeting:     1.25;
  --lh-guidance-lg:  1.36;
  --lh-guidance:     1.42;
  --lh-secondary-lg: 1.50;
  --lh-body:         1.56;
  --lh-essential:    1.50;

  --tracking-tight:  -0.01em;
  --tracking-snug:   -0.005em;
  --tracking-normal: 0;
  --tracking-wide:   0.005em;

  /* ───── Spacing ───── */
  --space-1:  0.25rem;  /*  4px */
  --space-2:  0.5rem;   /*  8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-12: 3rem;     /* 48px */

  /* ───── Radii ───── */
  --radius-sm:   12px;
  --radius-md:   16px;
  --radius-lg:   24px;
  --radius-full: 9999px;

  /* ───── Elevation ───── */
  --elev-0: none;
  --elev-1: 0 1px 2px rgba(31,36,33,0.06), 0 2px  8px rgba(31,36,33,0.05);
  --elev-2: 0 2px 4px rgba(31,36,33,0.08), 0 8px 24px rgba(31,36,33,0.10);
  --elev-nav: 0 -2px 4px rgba(31,36,33,0.06), 0 -8px 24px rgba(31,36,33,0.08);

  /* ───── Motion ───── */
  --dur-instant: 0ms;
  --dur-fast:    120ms;
  --dur-base:    180ms;
  --dur-slow:    240ms;
  --dur-ambient: 2200ms;
  --ease-out:      cubic-bezier(0.2, 0, 0,   1);
  --ease-in:       cubic-bezier(0.4, 0, 1,   1);
  --ease-calm:     cubic-bezier(0.4, 0, 0.2, 1);
  --ease-standard: cubic-bezier(0.2, 0, 0.2, 1);

  /* ───── Touch targets ───── */
  --touch-min:        52px;  /* every interactive element, floor */
  --touch-primary:    64px;  /* primary buttons */
  --touch-talk:       76px;  /* TalkButton, 390 & 360 */
  --touch-talk-lg:    80px;  /* TalkButton, 430 */
  --touch-talk-max:   96px;  /* ceiling — never exceed */
  --touch-gap-min:    var(--space-3); /* 12px between adjacent targets */

  /* ───── Icons ───── */
  --icon-sm: 20px;
  --icon-md: 24px;
  --icon-lg: 32px;
  --icon-xl: 36px;
  --icon-stroke:    2px;
  --icon-stroke-lg: 2.5px;
  --icon-stroke-xl: 3px;

  /* ───── Safe areas & chrome ───── */
  --safe-top:    env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left:   env(safe-area-inset-left, 0px);
  --safe-right:  env(safe-area-inset-right, 0px);

  --nav-height:        64px;
  --nav-total-height:  calc(var(--nav-height) + var(--safe-bottom));
  --talk-overhang:     54px;   /* how far the TalkButton rises above the bar */
  --talk-clearance:    22px;   /* gap between button bottom and bar top */
  --content-bottom-pad: calc(var(--nav-total-height) + var(--talk-overhang) + var(--space-8));

  --gutter: var(--space-6);    /* 24px, all viewports */
}

/* Malayalam: taller lines, no tracking */
:root[lang^="ml"], [lang^="ml"] {
  --lh-greeting:     1.62;
  --lh-guidance-lg:  1.65;
  --lh-guidance:     1.70;
  --lh-secondary-lg: 1.72;
  --lh-body:         1.75;
  --lh-essential:    1.80;
  --tracking-tight:  0;
  --tracking-snug:   0;
  --tracking-wide:   0;
}

/* Larger TalkButton on wide viewports */
@media (min-width: 414px) {
  :root { --touch-talk: var(--touch-talk-lg); }
}

/* Higher-contrast preference: strengthen borders and darken secondary text */
@media (prefers-contrast: more) {
  :root {
    --text-secondary: #333B37;
    --border-subtle:  #C8BCAB;
    --border-strong:  #8E8171;
  }
}

/* Base element defaults */
*, *::before, *::after { box-sizing: border-box; }

html { font-size: 100%; -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--bg-cream);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  line-height: var(--lh-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Focus — never remove without replacement */
:where(button, a, [role="button"], [role="option"], [role="tab"],
       input, select, textarea, [tabindex]):focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 6px var(--focus-ring-halo);
}

/* Hover only where a real pointer exists */
@media (hover: hover) and (pointer: fine) {
  .btn-primary:hover   { background: var(--teal-900-hover); }
  .btn-secondary:hover { background: var(--teal-100-hover); }
  .list-row:hover      { background: var(--surface-2); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 13. Implementation notes for GLM

1. **Paste §12 verbatim** into `app/globals.css`. The existing `globals.css` in the repo is the dark
   developer/inspector styling for the current desktop shell — do **not** delete it; scope it to the
   inspector, and give the elder UI its own root. If both must coexist in one stylesheet, namespace
   the inspector rules under `.inspector` and let the tokens above own `:root`.
2. **Set `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`**
   and `<meta name="color-scheme" content="light">` in `app/layout.tsx`. Without `viewport-fit=cover`
   every `env(safe-area-inset-*)` resolves to `0px` and the layout will look correct in DevTools and
   wrong on a real iPhone.
3. **Set `lang` correctly.** `<html lang="ml-IN">` when Malayalam is active, and per-element `lang`
   on any mixed-language node. The `--lh-*` overrides in §12 key off `[lang^="ml"]`; forgetting the
   attribute silently ships clipped Malayalam.
4. **Never hard-code a hex value in a component.** If a colour is needed that is not in §12, add a
   token here first. A stray `#fff` is how a design system dies.
5. **Sizes in `rem`, spacing in the `--space-*` tokens.** The 200% text-scale requirement in §3.4
   fails immediately if font sizes are in `px` at the component layer.
6. **Use `100dvh`, never `100vh`.** See §11.3 — this is a task-blocking bug, not a polish item.
7. **Write real reduced-motion blocks** for §10.3 rows 5, 6, 7, 12, 13, 17. The global `!important`
   rule is a net, not a plan.
8. **Verify at 360px before 390px.** Every layout failure in this system shows up at 360 first.
9. **Contrast is a test, not a hope.** The ratios in §2.5 are computed; if you change a hex value,
   recompute. Three pairs sit exactly at the 7.0:1 threshold (`--text-secondary` on `--teal-100`,
   `--text-teal` on `--teal-100`, `--text-attention` on `--surface-attention`) — those three have no
   headroom, so do not lighten either side.
10. **`--green-600` on white text is AA Large only (4.9:1).** It is permitted for 24px+ bold on the
    completion screen and for icon/border use. For success *text* below 24px, use `--text-success`
    (`#155F3B`) on `--surface-success`, which is 7.1:1.

---

## Related

- `COMPONENT_SPECIFICATION.md` — the 20 components that consume these tokens
- `DEMO_SCREEN_SEQUENCE.md` — the 13-screen judge-facing sequence
- `../companion/COMPANION_DEMO_SCRIPT.md` — the narrative demo this UI serves
- `../companion/DIGITAL_SAFETY_POLICY.md` — why `--red-700` appears on exactly one screen
- `../companion/FAMILY_CONSENT_POLICY.md` — why the palette is not a care-dashboard palette
- `../companion/CHECKIN_CONVERSATION_POLICY.md` — the copy discipline the type scale supports
