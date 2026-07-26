# Mobile UI Acceptance Checklist

> Verification document. **Changes no production code.**
>
> Run this before declaring the mobile experience done. Every line is objectively checkable —
> if a line needs an opinion to answer, it is written wrong.
>
> **A single unchecked box in §2 or §7 blocks release.**

---

## 1. How to use this

Work top to bottom on a real device or an accurate emulator at all three widths. Record a result for
every line: ✅ pass · ❌ fail · N/A with a reason.

**Do not mark a line ✅ because it "should" work.** Check it.

---

## 2. Blocking — release stops if any of these fail

| # | Check | How to verify |
|---|---|---|
| 2.1 | **Home is not crowded** | Home shows greeting + Talk + **at most 3** context items. Count them |
| 2.2 | **Talk is immediately visible** | Talk button visible without scrolling at 360×800 |
| 2.3 | **Stop and Repeat always available** | During every active task state, both are on screen. Walk a full task |
| 2.4 | **Confirmations visually distinct** | Confirmation is unmistakably different from normal guidance — not just a button colour |
| 2.5 | **Malayalam does not clip** | Every label in `ml-IN` renders fully. No ellipsis, no cut descenders, no overflow |
| 2.6 | **360px width works** | Every screen usable at 360×800. Nothing overlaps, nothing needs horizontal scroll |
| 2.7 | **390×844 works** | Primary viewport. Every screen correct |
| 2.8 | **430×932 works** | Nothing stretched, orphaned, or awkwardly centred |
| 2.9 | **Microphone denial recoverable** | Deny mic permission. A clear path forward exists (type instead), not a dead end |
| 2.10 | **Network failure recoverable** | Go offline mid-task. "Continue from where we stopped" works; progress preserved |
| 2.11 | **Every primary target ≥52px** | Measure. Talk button 76–96px |
| 2.12 | **No essential text <16px** | Inspect computed styles. Nothing an elder must read is smaller |
| 2.13 | **Reduced motion works** | Enable `prefers-reduced-motion`. No animation is required to understand state |
| 2.14 | **Screen-reader labels exist** | Every interactive element announces meaningfully. No "button" with no name |
| 2.15 | **No debug data in elder UI** | No engine state, `correctionHistory`, event log, JSON, confidence score, or ID anywhere |
| 2.16 | **Simulated actions clearly labelled** | Completion of a simulated external action says SIMULATED, visibly |
| 2.17 | **Tests and build green** | `npx tsc --noEmit` · `npm test` · `npm run build` all exit 0 |

---

## 3. Product structure

- [ ] Exactly three primary destinations: Home, Talk, Reminders
- [ ] Talk is visually dominant and centrally placed
- [ ] Family help appears contextually, never as a dashboard tab
- [ ] Demo Inspector is on a separate hidden route, not a nav item
- [ ] An elder cannot reach the inspector by ordinary navigation
- [ ] Never more than 2 taps from Home
- [ ] Bottom navigation respects safe-area insets
- [ ] Every nav item has an icon **and** a text label

---

## 4. The eighteen rules

- [ ] 1 — One screen, one decision
- [ ] 2 — One dominant action per screen
- [ ] 3 — No long paragraphs anywhere
- [ ] 4 — No raw engine or AI state exposed
- [ ] 5 — No icon appears without text
- [ ] 6 — Stop, Wait, Repeat visible during active tasks
- [ ] 7 — Essential text ≥16px
- [ ] 8 — Main guidance 24–28px
- [ ] 9 — Primary touch targets ≥52px
- [ ] 10 — Talk button 76–96px
- [ ] 11 — Confirmation visually distinct
- [ ] 12 — Safety warnings calm, not alarming
- [ ] 13 — Consequential actions have explicit read-back
- [ ] 14 — External actions say SIMULATED when applicable
- [ ] 15 — Nothing shames, rushes, or infantilises
- [ ] 16 — Motion subtle and reduced-motion aware
- [ ] 17 — Meaning never relies on colour alone
- [ ] 18 — Malayalam wraps to two lines without clipping

---

## 5. Voice states

All 16 implemented, each with visible text (not audio alone):

- [ ] idle · [ ] requesting mic permission · [ ] listening · [ ] understanding
- [ ] speaking · [ ] waiting for action · [ ] paused · [ ] interrupted
- [ ] reconnecting · [ ] mic denied · [ ] STT failure · [ ] TTS failure
- [ ] network failure · [ ] unsupported request · [ ] human handoff · [ ] completed

- [ ] Everything spoken is also shown as text
- [ ] No state uses technical language
- [ ] No state blames the elder
- [ ] Every failure state offers a concrete next action

---

## 6. Screens

- [ ] Home matches `ELDER_HOME_SCREEN.md`, including the empty state
- [ ] One task-screen schema serves all task types (not per-task layouts)
- [ ] ORDER_FOOD hero flow works: restore usual → contextual question → correction → confirm → SIMULATED completion
- [ ] A correction re-renders the read-back and **voids** any pending confirmation
- [ ] One data-driven CheckInScreen serves all routine types
- [ ] All 8 routine states render; MISSED never looks like success and carries no blame
- [ ] Life event stays a visible **candidate** until confirmed
- [ ] One field can be corrected without re-entering the rest
- [ ] Daily brief is opt-in (default off), ≤5 items, deduplicated
- [ ] Family handoff shows the exact message before sending
- [ ] Declining a handoff has equal visual weight to accepting
- [ ] Memory screen uses plain language — no categories, JSON, or scores
- [ ] Every memory item supports edit, remove, and "who can see this"

---

## 7. Safety and confirmation — blocking

| # | Check |
|---|---|
| 7.1 | OTP/PIN/CVV request produces a calm pause screen and a refusal |
| 7.2 | Safety warnings use calm styling — no alarm, no flashing, no scare imagery |
| 7.3 | No safety copy shames the elder |
| 7.4 | Safety pre-empts a pending confirmation |
| 7.5 | Confirmation is full-screen and shows the authoritative summary |
| 7.6 | Confirmation shows recipient/address, items, fees, total |
| 7.7 | Real vs SIMULATED status is visible on confirmation |
| 7.8 | Expiry shown calmly where relevant — not a pressure countdown |
| 7.9 | A changed total voids the confirmation and re-reads it back |
| 7.10 | Silence, timeout, or backgrounding **never** confirms |
| 7.11 | Three buttons present: Yes continue · Change something · Cancel |
| 7.12 | Cancel is always available and never penalised |

---

## 8. Errors

- [ ] No status code, stack trace, or engine identifier is ever shown
- [ ] Every error offers at least one concrete next action
- [ ] Mic denied → type instead
- [ ] STT failure → "I could not hear that clearly" + Try again / Type / Stop
- [ ] TTS failure → continues silently with text, not a hard failure
- [ ] Offline → banner + preserved progress
- [ ] Interrupted → "Continue from where we stopped"
- [ ] Ambiguous provider result → "Let me check", nothing definitive claimed
- [ ] Third consecutive failure → offers a human
- [ ] No error blames the elder

---

## 9. Accessibility

- [ ] Contrast meets WCAG AA minimum; body text AAA where achievable
- [ ] Text scales to 200% without loss of function
- [ ] Focus order is logical; Talk reachable early
- [ ] Focus indicators clearly visible
- [ ] Full keyboard operation possible
- [ ] All spoken content available as text
- [ ] Every state distinguishable without colour (icon + text)
- [ ] Targets generously spaced (tremor-friendly); no drag-only gestures
- [ ] No auto-dismiss on anything consequential
- [ ] Screen-reader pass completed on Home, Talk, Confirmation, Safety

---

## 10. Malayalam

- [ ] Malayalam font loads with a correct fallback
- [ ] Line-height accommodates Malayalam (≈1.6–1.8)
- [ ] No fixed heights on text containers
- [ ] No `text-overflow: ellipsis` on labels that may wrap
- [ ] Longest string fits in ≤2 lines at 360px
- [ ] Mixed Malayalam/English renders cleanly
- [ ] Tone is respectful and adult
- [ ] Untranslated or uncertain strings flagged for native review

---

## 11. Code quality

- [ ] Only permitted files changed (`app/page.tsx`, `app/globals.css`, `components/**`, `public/**`, `lib/client-api.ts`, plus required `app/` routes)
- [ ] No backend, engine, skill, routine, memory or test file modified
- [ ] `lib/types.ts` unchanged
- [ ] All engine↔UI translation confined to `lib/client-api.ts`
- [ ] Components take UI-shaped props, not engine types
- [ ] No new dependency added without authorisation
- [ ] `MOBILE_STATE_MAP.md` §9 verification table filled in
- [ ] Contract mismatches handled in `client-api.ts`, not the engine

---

## 12. Screenshots

Captured at **360**, **390**, and **430** widths:

- [ ] Home · [ ] Listening · [ ] Task in progress · [ ] Confirmation
- [ ] Safety warning · [ ] Completion · [ ] Reminders · [ ] Life event · [ ] Family handoff

---

## 13. The dignity review

Read every string in the built UI aloud, as if to a parent. Then answer:

- [ ] Would I be comfortable speaking every line of this to my own father?
- [ ] Does anything imply he is incapable, slow, or forgetful?
- [ ] Does anything rush him?
- [ ] Does anything praise him for an ordinary act?
- [ ] Does any failure read as his fault rather than Thuna's?
- [ ] Would he feel this is a tool for adults?

**Any "no" is a copy bug.** Fix it before release — this is the product.

---

## 14. Sign-off

| Gate | Result |
|---|---|
| §2 blocking (17) | ___ / 17 |
| §7 safety blocking (12) | ___ / 12 |
| Typecheck / tests / build | ___ |
| Test count before → after | ___ → ___ |
| Screenshots | ___ / 27 |
| Dignity review | ___ / 6 |

**Release only when §2 and §7 are complete and the test count has not decreased.**

---

## Related

`GLM_MOBILE_IMPLEMENTATION_PROMPT.md` · `MOBILE_STATE_MAP.md` · `ACCESSIBILITY_SPECIFICATION.md` ·
`MALAYALAM_CONTENT_GUIDE.md` · `MOBILE_PRODUCT_PRINCIPLES.md`
