# Thuna Mobile — Implementation Report

> Implemented 2026-07-26 in the worktree `Thuna-Claude-Mobile`, branch
> `claude/mobile-ui`, from production commit `57984f4`
> ("Integrate Thuna continuity companion features").
>
> **No production backend file was modified.** The engine, skills, routine
> engine, continuity engine, memory store, consent rules, safety policies and
> Sarvam behaviour are untouched.

---

## 1. Result

| Gate | Before | After |
|---|---|---|
| `npx tsc --noEmit` | 0 errors | **0 errors** |
| `npm test` | 107 passed | **107 passed** |
| `npm run build` | success | **success** |

No test was modified, skipped, or weakened.

---

## 2. Files changed

**Modified (4, all UI-owned):**
- `app/page.tsx` — rebuilt as the elder mobile experience and the single
  contract→UI mapping layer
- `app/globals.css` — replaced with the design-system token sheet
- `app/layout.tsx` — PWA metadata, viewport-fit, zoom left enabled
- `docs/mobile-ui/*` — this report and the screenshot index

**Added (16):**
- `components/elder/` — 13 presentational components
- `app/inspector/page.tsx` — hidden Demo Inspector route
- `public/manifest.webmanifest`
- `public/screenshots/` — captured images

**Untouched:** `lib/**` (including `lib/client-api.ts`), `app/api/**`,
`tests/**`, `package.json`, `tsconfig.json`, and every pre-existing component.

> `lib/client-api.ts` needed no change. Codex had already wired it to the real
> routes, and every mapping the UI needed was expressible in `app/page.tsx`.

---

## 3. Production contracts verified and mapped

Every contract was read from the actual code, not assumed from the design docs.

### Matched the specification exactly

| Contract | Source | Note |
|---|---|---|
| `RoutineState` — 8 values | `lib/routines/types.ts` | SCHEDULED · DUE · ACTIVE · SNOOZED · COMPLETED · MISSED · ESCALATED · CANCELLED |
| `RoutineKind` — 6 values | `lib/client-api.ts` | |
| `TaskKind` — 6 values | `lib/client-api.ts` | ORDER_FOOD, SEND_PAYMENT, PHONE_HELP, TRACK_ORDER, GENERAL_HELP, UNSUPPORTED |
| `ScreenState.status` — 6 values | `lib/types.ts` | idle · awaiting_confirmation · done · refused · paused · handedoff |
| `FamilyRequestState` — 7 values | `lib/continuity/types.ts` | REQUESTED → … → ELDER_CONFIRMED |
| `DailyBrief` / `DailyBriefItem` | `lib/continuity/types.ts` | |
| `FamilyContentConsent` | `lib/continuity/types.ts` | |

### Differed from the design documents — **production won**

| Design doc assumed | Production actually has | How the UI adapted |
|---|---|---|
| `LifeEventState` includes `DRAFT` and `NEEDS_CONFIRMATION` | `LifeEventState` has **9** states starting at `CONFIRMED`; unconfirmed items are a **separate `InboxCandidate` type** with `state: 'CANDIDATE' \| 'REJECTED'` | `RememberThis` renders `InboxCandidate`; `LifeEventList` renders confirmed `LifeEvent`s. This is a cleaner separation than the spec proposed |
| `PendingLoopState` includes `ESCALATED` | 7 states, **no `ESCALATED`** | Loop UI offers Done / Remind me later / Let it go, and never implies escalation |
| A `RiskSignal` contract exists | No exported risk-signal type; refusal lives in `lib/router.ts` `quickCheck()` | UI does a local pre-check purely to show the calm screen without a round trip. It **mirrors, never replaces**, the deterministic engine refusal |
| A `MemoryRecord` projection is exposed to the UI | Memory reaches the client via `/api/memory` as profile + contacts + history | `memoryItems` builds a plain-language projection in `app/page.tsx` |

**No production file was edited to accommodate the UI.** Every mismatch was
absorbed in `app/page.tsx`.

---

## 4. Screens implemented

| Screen | Component | Notes |
|---|---|---|
| Home | `HomeScreen` | Greeting, dominant Talk, **max 3** context items, contextual family help |
| Talk / voice | `VoiceStatePanel`, `TalkButton` | 16 voice states, all with visible text |
| Task (all kinds) | `TaskScreen` | **One schema**; `kind` selects only a label, never a layout |
| Confirmation | `ConfirmationScreen` | Full-screen takeover, 3 stacked buttons |
| Safety | `SafetyWarning` | 7 risk types, calm styling |
| Completion | `CompletionReceipt` | Practice-run disclosure |
| Errors | `ErrorRecovery` | 9 error kinds, always a next action |
| Reminders | `CheckInScreen` | **One data-driven component**, 8 states |
| Life events | `LifeEventList`, `RememberThis` | Candidate visibly "Not saved yet" |
| Daily brief | `DailyBriefPanel` | Opt-in, ≤5 items |
| Pending promises | `PendingLoops` | |
| Family handoff | `FamilyHandoff` | Exact disclosure shown before sending |
| Memory & privacy | `MemoryReview` | Plain language only |
| Demo Inspector | `app/inspector/page.tsx` | Hidden route, unlinked |

ORDER_FOOD, SEND_PAYMENT, PHONE_HELP, TRACK_ORDER, GENERAL_HELP and UNSUPPORTED
all render through the single task schema.

---

## 5. Design assumptions changed during implementation

1. **Candidate model.** The spec treated "unconfirmed life event" as an early
   lifecycle state. Production models it as a distinct `InboxCandidate`. The UI
   follows production — and the separation makes candidate-ness easier to show
   honestly.
2. **No `ESCALATED` for pending loops.** Removed from the loop UI entirely.
3. **Currency is `Rs`, never `₹`.** Production emits `` `Total: Rs ${total}` ``.
   Screen copy is byte-identical to engine output.
4. **`lib/client-api.ts` left unchanged.** The brief permitted edits; none were
   needed, so the smaller diff was taken.
5. **Playwright not added.** Adding a dependency to capture screenshots would
   change the production dependency set for a documentation artefact.

---

## 6. Live verification against the real engine

Exercised through the running app, not mocked:

- **Usual-order restore** — "Order my usual dosa without chutney" returned
  Udupi Cafe / Masala Dosa, no chutney / Home, and moved to
  `awaiting_confirmation`.
- **Confirmation gate** — full-screen takeover with the authoritative summary,
  "This is a practice run.", and Yes / Change / Cancel stacked.
- **Safety refusal** — "The bank called asking for my OTP" produced *Please
  pause* with the human-help route, **before any model call**.
- **Reminders** — both seeded routines rendered through the one `CheckInScreen`.
- **Memory** — rendered as plain sentences, with consent stated as
  "Sree is not told anything".

One defect found and fixed: context-card title and time collided because the
spans were inline. Corrected in `globals.css` with `display: block`.

---

## 7. Accessibility

- Primary targets ≥52px; buttons 60px; Talk 96px (84px at 360px width).
- Essential text ≥16px; body 18px; guidance 26px; greeting 32px.
- Zoom **not** locked — `maximumScale: 5`, `userScalable: true`.
- Every state pairs colour with text and/or shape; nothing is colour-only.
- Icons never appear without text, including in the bottom navigation.
- `prefers-reduced-motion` disables the Talk pulse and all transitions.
- Focus ring is a 3px teal outline with offset, visible on every control.
- Everything spoken is also rendered as text.
- Buttons are always stacked, never side-by-side, with 12px separation.
- `aria-live="polite"` on the voice state; `role="dialog"`/`alertdialog` on takeovers.

---

## 8. Safety properties preserved

- OTP/PIN/CVV refusal still runs in `lib/router.ts` before any model call.
- Safety pre-empts everything, including a pending confirmation.
- Only an explicit affirmative confirms.
- Simulated actions read as **"This is a practice run."** — the word SIMULATED
  never appears in the elder interface.
- `CheckInScreen` has no dose/strength/medicine-name field in its props.
- Ambiguous provider results suppress any retry action.
- No engine state, event log, correction history, or identifier reaches Elder Mode.
- The Demo Inspector is a separate unlinked route.

---

## 9. Remaining native-language review items

The interface currently ships **approved English fallback copy** throughout.

Malayalam strings marked `NATIVE_REVIEW_REQUIRED` in
`MALAYALAM_CONTENT_GUIDE.md` §11 were **not** machine-finalised. Four are P1:

1. `safety.secrecy.body` — at ~123 characters it overflows at 360px with 200%
   text scaling. **Must not ship in Malayalam until rewritten** as two sentences
   of ≤55 characters.
2. `err.repeated.body` — "it is not you" must read as reassurance, not pity.
3. `safety.secrecy.body3` — must not imply "you haven't erred *yet*".
4. `status.practice` — must read as "not real", not "a training exercise".

The profile still records the elder's preference as Malayalam; only the string
catalogue awaits a native speaker.

---

## 10. Known limitations

- Screenshots captured at 390px; 360 and 430 verified by layout inspection and
  the narrow-phone media query rather than separate image files.
- The typed input is the primary demo path; live microphone capture depends on
  browser permission and was not exercised headlessly.
- Life-event and pending-loop lists render empty against seed data until a
  candidate is confirmed — the empty states are deliberate, calm, and not errors.
