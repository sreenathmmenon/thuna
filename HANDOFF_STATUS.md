# Thuna — Build Status & Handoff (for planning)

> This is a historical milestone record. For the current complete product implementation, see `docs/FEATURE_MATRIX.md` and `docs/RUNBOOK.md`.
>
> Paste this to your planning assistant (ChatGPT/Codex/GLM). It is self-contained.

## Project

**Thuna** — a patient multilingual **voice companion that helps elders complete everyday digital tasks** (order food, send a UPI payment, change a phone setting) by speaking in their own language. It guides one step at a time, catches mistakes, requires explicit confirmation before risky actions, and refuses sensitive requests (OTP/PIN/CVV).

**Sarvam hackathon category:** **Voice Experience** (uses Saaras STT + Bulbul TTS + Sarvam chat directly — no category-misfit risk).

**Location:** `/Users/sreenath/Code/myAIExps/Sarvam-Buildathon-July26`
**Stack:** Next.js 14 (App Router) + TypeScript. Deps installed. Typechecks clean (`tsc --noEmit` exit 0).
**Secrets:** `SARVAM_API_KEY` lives in `~/.env`; the project `.env` is a symlink to it (gitignored). Key verified reachable.

## Architecture (target, from the approved brief)

Dynamic Sarvam language intelligence **above** a governed, deterministic Task Skill Registry:
```
Elder speaks → Saaras STT → Intent Router (classify: task | question | risky | unsupported)
  → load matching Task Skill (fields, steps, safety rules, completion)
  → Sarvam chat generates contextual next instruction using current screen + workflow state
  → deterministic app rules approve / block / pause the next transition
  → Bulbul TTS speaks guidance → UI updates
```
Skills: ORDER_FOOD (hero), PHONE_HELP (secondary), SEND_PAYMENT, (TRACK_ORDER, GENERAL_HELP later).

## What is DONE (verified working)

- **Project runs + typechecks clean.** `npm run dev` boots (placeholder page).
- **`lib/sarvam.ts`** — real, working REST calls to Sarvam:
  - `speechToText(audioPath)` → `POST /speech-to-text` (Saaras v3, multipart)
  - `translate(text, src, tgt)` → `POST /translate` (Sarvam-Translate)
  - `synthesize(text, lang, voice, out)` → `POST /text-to-speech` (Bulbul v3, ≤2500 chars/req, base64 audios)
  - Auth header: `api-subscription-key`.
- **`lib/types.ts`** — frozen data shapes: `TaskSkill` (steps + safety rules), `SessionCtx`, `EngineResponse`, `RouteDecision`.
- **`lib/skills/`** — 3 skill definitions written:
  - `order-food.ts` (ORDER_FOOD: steps ask_item→ask_restaurant→confirm_address→readback→place; safety: readback-before-place, refuse OTP/PIN/CVV)
  - `phone-help.ts` (PHONE_HELP: one-step-at-a-time; refuse destructive resets)
  - `send-payment.ts` (SEND_PAYMENT: mismatch-catch + OTP refusal + readback)
  - `registry.ts` — `getSkill(id)`, `listSkills()`
- **`lib/router.ts`** — Intent Router skeleton. Two things actually work now:
  - **OTP/PIN/CVV refusal** fires immediately, before any LLM call (`quickCheck`).
  - Recovery detection (`wait` / `repeat slowly` / `i cannot find` → `isRecovery`).
  - `routeIntent()` uses an injected `askLLM` to classify into a skill — to be implemented.
- **`lib/env.ts`, `lib/paths.ts`** — config + file paths.
- **`app/page.tsx`** — placeholder ("Thuna — building…").

## What is NOT done yet (honest)

- ❌ **No voice loop** — the app does not yet listen or speak. (mic → Saaras → router → engine → Bulbul not wired.)
- ❌ **No skill execution engine** — only skill *definitions* exist; the state machine that drives a skill step-by-step (with correction, contextual QA, readback gate, recovery) is not built.
- ❌ **No real UI** — placeholder only. The elder-facing Talk button + screen state + calm UX not built.
- ❌ **No streaming** — `lib/sarvam.ts` is REST only (clips ≤30s for STT, ≤2500 chars for TTS). No Saaras streaming STT / Bulbul WebSocket TTS yet.
- ❌ **No artifacts** — receipt, ledger, family notification (Resend/Telegram) not built.
- ❌ **No test cases** — the 3 cases (clean / correction-recovery / safe-refusal) not written.
- ⚠️ Stale leftovers from an earlier (abandoned) dubbing idea: `scripts/m1-smoke.mjs`, `data/glossary.json`, `lib/ffmpeg.ts` — to delete.

## Hard constraints (do not violate)

- **No Sarvam dubbing API exists** — dubbing is portal-only. That's why we chose Voice Experience (uses the speech APIs directly). Do not pivot to dubbing.
- **No real UPI / Swiggy / banking APIs** during the build (forbidden). Flows are **simulated** and the app owns the success state. Never imply real money moved.
- **Browser mic only**, no telephony (handbook fast path).
- **One hero workflow deep** (ORDER_FOOD) + one short secondary (PHONE_HELP) + one safety proof (OTP refusal). Do NOT build many shallow workflows.
- **Safety is structural**: readback-before-act, wrong-recipient mismatch catch, OTP refusal, recovery — these are the rubric score-earners, protect them.

## Sarvam API facts (exact, for planning)

- Base: `https://api.sarvam.ai`. Auth: header `api-subscription-key: <KEY>` (env `SARVAM_API_KEY`).
- STT: `POST /speech-to-text`, multipart (`model=saaras:v3`, `mode=transcribe`, `file=@audio.wav`), ≤30s, 16kHz mono wav ideal. Returns `{transcript, language_code}` (no timestamps).
- Translate: `POST /translate`, JSON (`input`, `source_language_code`|`auto`, `target_language_code`, `speaker_gender`). Returns `{translatedText}`.
- TTS: `POST /text-to-speech`, JSON (`text`, `model=bulbul:v3`, `speaker`, `target_language_code`, `speech_sample_rate`). **≤2500 chars/req → must chunk.** Returns `{audios:[base64 wav]}`.
- Chat: `POST /v1/chat/completions`, `model=sarvam-30b` (fast) or `sarvam-105b` (flagship).
- Streaming STT + WebSocket TTS exist (docs) — needed for real-time voice (to build).

## Suggested parallel split (3 assistants)

- **Track A (core):** intent router LLM classifier + skill execution engine + real-time voice loop. Files: `lib/router.ts`, `lib/engine.ts` (new), `lib/voice-loop.ts` (new), `app/api/voice/route.ts` (new).
- **Track B (streaming + tests + data):** Saaras streaming STT + Bulbul WebSocket TTS wrappers; the 3 test cases; `data/contacts.json` + `data/ledger.json`. Files: `lib/sarvam-stream.ts` (new), `scripts/test-cases.mjs`, data.
- **Track C (UI + artifacts):** elder UI (Talk button, screen state), receipt/ledger/family-notify, judge-facing demo inspector. Files: `app/page.tsx` (rebuild), `app/components/*`, `lib/artifacts.ts`, `lib/notify.ts`.
- Decouple: A goes REST-first (ugly) for M1; B's streaming drops in at M3–M4; C builds against a mocked `EngineResponse`.

## Next single action

Clean stale leftovers, then build the **M1 ugly voice loop**: browser mic → Saaras REST → `routeIntent` (OTP refusal must fire) → ORDER_FOOD step prompts → Bulbul REST → one clean food order (mock). Acceptance: "order my usual dosa" walks the steps; "can I share my OTP" is refused.
