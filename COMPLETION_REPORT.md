# Thuna — Session Completion Report

> Accurate, verified status of everything done in this session. Hand to GLM/Codex/Claude for continuity.

## 1. Project identity & decision

- **Project:** Thuna — a patient multilingual **voice companion that helps elders complete everyday digital tasks** (order food, send a payment, change a phone setting) by speaking in their own language. It guides one step at a time, catches mistakes, requires explicit confirmation before risky actions, and refuses sensitive requests (OTP/PIN/CVV).
- **Sarvam hackathon category:** **Voice Experience** (uses Saaras STT + Bulbul TTS + Sarvam chat directly). Chosen after a mentor flagged that Sarvam has **no public dubbing API** (dubbing is portal-only) — so a composed-dubbing build risked being reclassified out of the Dubbing category. Thuna uses the speech APIs directly → no category-misfit risk.
- **Live code folder:** `/Users/sreenath/Code/myAIExps/Sarvam-Buildathon-July26`
- **Docs-only folder (old):** `/Users/sreenath/Code/myAIExps/Sarvam-Buildathon-2026` — holds planning `.md` files + the captured handbook. No code.

## 2. What was built & verified THIS session

### Environment / setup (verified)
- Next.js 14 (App Router) + TypeScript. Deps installed.
- `.env` is a symlink → `~/.env`; `SARVAM_API_KEY` reachable (never copied into the project, gitignored).
- `sarvamai@1.1.7` (official Sarvam SDK) installed as a dependency.
- Stale dubbing leftovers removed (`scripts/m1-smoke.mjs`, `data/glossary.json`, `lib/ffmpeg.ts`).

### Milestone 1 + Milestone 2 — DONE & GREEN
The typed engine path is implemented and fully passing:
- `npx tsc --noEmit` → **exit 0**
- `npx vitest run` → **15/15 tests pass** (2 files)
- `npm run build` → **exit 0**

**Files created (new):**
- `lib/engine.ts` — the **generic, skill-driven execution engine**. Pure: returns a proposed next state (`nextCtx`, `nextScreen`, `events`); **never mutates the store** (the model never directly mutates session state).
- `lib/session-store.ts` — in-memory sessions; the **only mutator** (`commit` applies the engine's proposed state + appends event history). Exposes `process()`, `setPreference()`, `getHistory()`, `reset()`.
- `lib/command-parser.ts` — generic parsing: `isConfirmation` (silence/vague/wait **never** count as confirmation), `isContextualQuestion`, `recoveryType` (wait/repeat_slowly/go_back/stop), `routeByText` (typed-mode keyword routing, no LLM).
- `lib/guidance.ts` — `stepPrompt`, `readback`, `answerContextual`, `buildScreen`, `simulateReceipt` (delegates to the skill handler; engine stays generic).
- `tests/engine.test.ts` — 14 unit tests across the 7 required cases.
- `tests/m2-flow.test.ts` — the full 10-step M2 flow + event-history assertions.

**Files modified:**
- `lib/types.ts` — added `SkillHandler`, `ParsedCommand` (patch-based), `EngineEvent`, `SessionState`, `EngineResult`, `SimulatedReceipt`; `handler?` on `TaskSkill`; `awaitingConfirmation` on `SessionCtx`; `deliveryFee`/`total` on `ScreenState`; `go_back` action.
- `lib/skills/order-food.ts` — added a `handler` with `restorePreference`, `parseCommand` (item-name change + customisation include/exclude), `answerContextual` (delivery-fee reasoning from screen context), `readback`, `buildScreen`. **No ORDER_FOOD logic lives in the engine** — all of it is in the skill handler, so the engine is reusable across skills.
- `package.json` — added `test` script + `vitest` devDep.

### The 10-step M2 flow — actual outputs (from the passing test)
```
1: Masala Dosa, no chutney from Udupi Cafe, to Home. Total: Rs 145 Shall I place the order? Say "yes" to confirm.
   (routed to ORDER_FOOD; previous order restored — Udupi Cafe / Masala Dosa / Home; "no chutney" applied; awaiting confirmation)
2: The food price is the same, but today there is a Rs 25 delivery charge because the restaurant is farther away. We can go back and look for a closer restaurant.
   (contextual question answered from screen context — delivery fee Rs 25)
4: Plain Dosa, no chutney from Udupi Cafe, to Home. Total: Rs 125 Shall I place the order? Say "yes" to confirm.
   ("Wait, plain dosa, not masala dosa" parsed as a correction, NOT a pause; only the item changed; restaurant/address/no-chutney preserved)
9: SIMULATED ORDER SUCCESS — Plain Dosa, no chutney from Udupi Cafe, to Home. Total: Rs 125. (This is a simulated result — no real order was placed.)
```
- Step 10: `action = complete`; `screen.status = done`; clearly labelled simulated. ✅

### Safety & recovery — all verified by tests
- **OTP/PIN/CVV refusal** fires before any processing or model call (action `refuse`).
- **Silence / vague / "wait" never count as confirmation** — only a clear "yes" completes.
- **Simulated actions are clearly labelled** ("SIMULATED… no real order was placed").
- **WAIT** pauses (status `paused`); **REPEAT_SLOWLY** sets slow pace; **GO_BACK** decrements step; **STOP** hands off (status `handedoff`).
- **Event history** recorded: `start_skill`, `restore_preference`, `contextual_question`, `correction`, `confirmation`, `complete`.

## 3. Architecture (as built)

```
utterance → quickCheck (OTP/PIN/CVV refuse)  →  [active skill] parseCommand (correction?) → recovery → contextual Q&A → confirmation gate → step advance
                                        →  [no skill] routeByText → start → restorePreference → re-parse for corrections → advanceOrConfirm
engine is PURE (returns proposed next state); session-store is the ONLY mutator; ORDER_FOOD specifics live in the skill handler, not the engine.
```

## 4. What is NOT done (honest — out of M1/M2 scope)

- ❌ **No voice loop** — no mic, no Saaras streaming STT, no Bulbul streaming/WebSocket TTS. (M1/M2 are the **typed** engine path; `lib/sarvam.ts` has real REST calls but they're unused by the engine.)
- ❌ **No real UI** — `app/page.tsx` is a static placeholder ("Thuna — building…").
- ❌ **No streaming wrappers** — `sarvamai` SDK is installed (supports `speechToTextStreaming` / `textToSpeechStreaming`) but not wired.
- ❌ **No artifacts** — receipt/ledger/family-notification (Resend/Telegram) not built (only a `SimulatedReceipt` value object exists in-engine).
- ❌ **LLM router not wired** — `router.routeIntent` exists (injectable `askLLM`) but the engine uses the deterministic `routeByText` for typed mode.
- ❌ **M3+ not started** (instructed not to).

## 5. Hard constraints (still in force)

- No Sarvam dubbing API (portal-only) → stay in Voice Experience.
- No real UPI/Swiggy/banking APIs → flows are **simulated** and clearly labelled; never imply real money moved.
- Browser mic only, no telephony.
- One hero workflow deep (ORDER_FOOD) + one secondary (PHONE_HELP) + safety proof (OTP refusal) — not many shallow workflows.
- Safety is structural: readback-before-act, mismatch catch, OTP refusal, recovery — the rubric score-earners.

## 6. Exact Sarvam API facts (for the next build steps)

- Base `https://api.sarvam.ai`; auth header `api-subscription-key` (env `SARVAM_API_KEY`).
- STT `POST /speech-to-text` multipart (`model=saaras:v3`, `mode=transcribe`, `file`), ≤30s, 16kHz mono wav; returns `{transcript, language_code}` (no timestamps).
- Translate `POST /translate` JSON → `{translatedText}`.
- TTS `POST /text-to-speech` JSON (`model=bulbul:v3`, `speaker`, `target_language_code`, `speech_sample_rate`), **≤2500 chars/req**, returns `{audios:[base64 wav]}`.
- Chat `POST /v1/chat/completions` (`sarvam-30b` fast / `sarvam-105b` flagship).
- SDK `sarvamai` (npm) supports streaming: `speechToTextStreaming`, `textToSpeechStreaming`, `textToSpeech.convertStream`.

## 7. Current code tree (code only)
```
Sarvam-Buildathon-July26/
  .env → ~/.env  | .env.example | .gitignore
  package.json (next, react, dotenv, sarvamai; devDep vitest)
  tsconfig.json, next.config.mjs, next-env.d.ts
  app/        layout.tsx, globals.css, page.tsx (placeholder)
  lib/        env.ts, paths.ts, sarvam.ts (REST, unused by engine),
              types.ts, router.ts, command-parser.ts, guidance.ts,
              engine.ts, session-store.ts
  lib/skills/ order-food.ts (hero, with handler), phone-help.ts, send-payment.ts, registry.ts
  tests/      engine.test.ts, m2-flow.test.ts
```

## 8. Bottom line

M1 + M2 are **complete and verified** (typecheck 0, 15/15 tests, build 0). The typed execution engine is generic + skill-driven, safety-first, pure/non-mutating, with a working ORDER_FOOD skill handler. The real-time voice layer, UI, streaming, and artifacts are the remaining work (M3+), per the agreed plan.
