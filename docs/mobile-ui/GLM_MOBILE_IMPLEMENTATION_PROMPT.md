# GLM Mobile Implementation Prompt

> **This file is the prompt to hand to GLM.** Copy §2 onward verbatim into a GLM session **after
> Codex has finished** the continuity-companion runtime and the release is green.

---

## 1. Before you paste this

Preconditions — do not start otherwise:

- [ ] Codex's companion work is merged and the release is tagged
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm test` passes
- [ ] `npm run build` exits 0
- [ ] No unrelated uncommitted changes

If any fails, fix that first. Building a UI on a red build produces two problems that look like one.

---

## 2. — PROMPT FOR GLM BEGINS —

You are implementing the complete elder-first mobile experience for **Thuna**, a multilingual voice
companion that helps elders complete everyday digital tasks.

### 2.1 The product goal

> **Thuna must feel easier than calling one's child for help.**

Easier means: fewer decisions, no waiting, no embarrassment, no sense of imposing. Every design
choice below serves that sentence. When in doubt, choose the option that makes the elder feel more
capable, not the one that shows more capability.

The user is **Appa** — an adult, in his seventies, who speaks Malayalam and does not use apps
confidently. He is not a beginner to be taught. He is a competent adult using an unfamiliar tool.

### 2.2 Start here

1. **Start from the latest production release** after Codex finishes. Not an older branch.
2. **Create a separate worktree** — do not work directly on `main`:
   ```bash
   git worktree add ../Thuna-GLM-Mobile -b glm/mobile-ui
   cd ../Thuna-GLM-Mobile
   npm install
   ```
3. **Inspect the current contracts BEFORE writing any code:**
   ```bash
   cat lib/types.ts
   ls lib/ lib/skills/ lib/routines/ lib/memory/ lib/life-events/ 2>/dev/null
   grep -rn "export type\|export interface" lib/ | grep -iE "routine|event|loop|memory|consent|brief|risk"
   npx tsc --noEmit && npm test && npm run build
   ```
   Then fill in the verification table in `docs/mobile-ui/MOBILE_STATE_MAP.md` §9.

   **The design docs were written before Codex finished. Where a documented field name differs from
   the real one, the real one wins** — adapt `lib/client-api.ts`, never the engine.

### 2.3 Files you may edit

**Allowed:**
- `app/page.tsx`
- `app/globals.css`
- `components/**`
- `public/**`
- `lib/client-api.ts`

Additional routes under `app/` (e.g. `app/talk/page.tsx`) are allowed where the information
architecture requires them.

**Do NOT touch without explicit authorisation:**
- `lib/engine.ts`, `lib/session-store.ts`, `lib/command-parser.ts`, `lib/router.ts`
- `lib/skills/**`, `lib/routines/**`, `lib/memory/**`, and other backend modules
- `lib/types.ts`
- `tests/**`
- `package.json` (ask before adding a dependency; prefer none)

**Preserve entirely:** backend, safety logic, memory, routines, and every passing test.

If the UI seems to require an engine change, **stop and report** — it almost always means the logic
belongs in `lib/client-api.ts` instead.

### 2.4 Read the specification

In `docs/mobile-ui/` — read all 20 before coding, in this order:

**Foundations:** `MOBILE_PRODUCT_PRINCIPLES` · `INFORMATION_ARCHITECTURE` · `VISUAL_DESIGN_SYSTEM` ·
`COMPONENT_SPECIFICATION` · `MOBILE_STATE_MAP`

**Screens:** `ELDER_HOME_SCREEN` · `VOICE_INTERACTION_STATES` · `TASK_SCREEN_SYSTEM` ·
`ROUTINE_AND_CHECKIN_SCREENS` · `LIFE_EVENTS_AND_REMEMBER_THIS` · `DAILY_BRIEF_SCREEN` ·
`FAMILY_HANDOFF_SCREEN` · `MEMORY_AND_PRIVACY_SCREEN` · `SAFETY_AND_CONFIRMATION_SCREENS` ·
`ERROR_AND_RECOVERY_STATES`

**Quality:** `ACCESSIBILITY_SPECIFICATION` · `MALAYALAM_CONTENT_GUIDE` ·
`MOBILE_UI_ACCEPTANCE_CHECKLIST` · `DEMO_SCREEN_SEQUENCE`

### 2.5 Product structure — exactly three destinations

**Home · Talk · Reminders.** The central Talk action is dominant.

Family help appears **contextually**, at the moment of need — never as a dense dashboard tab.

**The Demo Inspector is NOT in the elder interface.** Put it behind a separate hidden route
(`/inspector`) or a development-only view. It must never be a nav item and never be reachable by an
elder.

### 2.6 The eighteen rules

1. One screen, one decision.
2. One dominant action per screen.
3. Never show long paragraphs.
4. Never expose raw engine or AI state.
5. Never use icons without text.
6. **Stop, Wait and Repeat stay visible during active tasks.**
7. Essential text never below **16px**.
8. Main guidance **24–28px**.
9. Primary touch targets **≥52px**.
10. Talk button **76–96px**.
11. Confirmation is **visually distinct** from normal guidance.
12. Safety warnings are **calm, not alarming**.
13. Consequential actions require explicit read-back.
14. External actions say **SIMULATED** when applicable.
15. Never shame, rush, or infantilise.
16. Motion is subtle and reduced-motion aware.
17. Meaning never relies on colour alone.
18. Long Malayalam labels wrap to two lines without clipping.

### 2.7 Viewports

Primary **390 × 844**. Also support **360 × 800** (narrowest — everything must fit) and
**430 × 932**.

Account for: safe-area insets (`env(safe-area-inset-*)`), Android browser chrome, iPhone standalone
PWA mode, Malayalam line wrapping, and one-handed thumb reach (primary actions in the lower 60%).

### 2.8 Build order

1. **Design tokens** — `app/globals.css` from `VISUAL_DESIGN_SYSTEM.md`. Get the palette, type scale
   and spacing right before any component.
2. **ElderShell + BottomNavigation** — the frame, safe areas, three destinations.
3. **TalkButton + VoiceStatePanel** — the signature interaction, all 16 voice states.
4. **Home** — greeting, Talk, up to three context items.
5. **Task screen system** — one schema, all task types.
6. **Confirmation + Safety** — full-screen, visually distinct.
7. **Completion + Errors** — every failure offers a next action.
8. **Reminders / CheckInScreen** — one data-driven component, 8 states.
9. **Life events / Remember this** — candidate → confirm flow.
10. **Daily brief · Family handoff · Memory & privacy.**
11. **Accessibility pass** — labels, focus order, contrast, reduced motion, 200% text.
12. **Malayalam pass** — wrapping, line-height, no clipping at 360px.

Commit after each green step. Do not batch.

### 2.9 Mock first, then bind

Build against typed mocks in `lib/client-api.ts` first, so the UI is complete and reviewable before
it depends on live routes. Then switch the mock to the real calls in that one file.

This keeps every engine dependency in a single place — which is exactly where you want it when
Codex renames something.

### 2.10 Verify before finishing

```bash
npx tsc --noEmit
npm test
npm run build
```

All three must pass. **Every pre-existing test must still pass, unmodified.** If a test fails, you
have broken an invariant — fix your code, never the test.

**Capture screenshots at 360, 390 and 430 widths** for: Home, Listening, Task, Confirmation, Safety,
Completion, Reminders, Life event, Family handoff. Save to `public/screenshots/` or attach them to
the report.

Then work through `MOBILE_UI_ACCEPTANCE_CHECKLIST.md` and confirm every line.

### 2.11 Commit

```
Polish Thuna elder-first mobile experience
```

### 2.12 Stop and report if

- A documented contract field does not exist and the correct mapping is unclear
- The UI appears to require an engine, skill, or test change
- A pre-existing test fails and one focused repair attempt does not fix it
- The build breaks in a way you cannot resolve without touching backend files
- The design specification contradicts itself

Report what you found rather than guessing. A wrong guess here reaches a real elder.

### 2.13 When you finish, report

Screens implemented · components built · contract mismatches found and how you mapped them ·
typecheck/test/build results · test count before and after · screenshots captured · acceptance
checklist results · anything you deliberately did not build and why.

## — PROMPT FOR GLM ENDS —

---

## 3. Notes for the human

- The whole package is **UI-only**. It requires no credentials and no external access.
- The riskiest coupling is field naming — §2.2's verification step exists to catch it early.
- If time is short, build order steps 1–7 alone produce a complete, demonstrable elder experience.
- `DEMO_SCREEN_SEQUENCE.md` is the judge-facing path; prioritise those screens.
