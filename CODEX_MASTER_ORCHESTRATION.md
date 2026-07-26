# THUNA — CODEX MASTER ORCHESTRATION

## Purpose

This is the single authoritative execution plan for completing the full Thuna product from the current repository state.

Repository:

`/Users/sreenath/Code/myAIExps/Sarvam-Buildathon-July26`

The lead Codex agent must read this file, inspect the repository, preserve all green work, split the remaining work into isolated workstreams, run quality gates, merge safely, and produce a final working product.

Do not ask the user to manually paste the individual worker prompts unless the environment cannot create parallel Codex tasks or isolated worktrees.

---

## Current verified baseline — do not redo

GLM 5.2 completed Milestones 1 and 2.

Verified:

- `npx tsc --noEmit` passes.
- `vitest run` passes 15/15.
- `npm run build` passes.
- Generic skill-driven engine exists.
- `ORDER_FOOD` specifics live inside its skill, not the engine.
- Session store is the only state mutator.
- Typed ORDER_FOOD flow works end to end.
- Contextual delivery-fee question works.
- Corrections update only affected fields.
- Explicit confirmation is required.
- OTP/PIN/CVV refusal runs before processing.
- WAIT, REPEAT_SLOWLY, GO_BACK and STOP are tested.
- Simulated completion is clearly labelled.

Important files:

- `COMPLETION_REPORT.md`
- `HANDOFF_STATUS.md`
- `lib/engine.ts`
- `lib/session-store.ts`
- `lib/command-parser.ts`
- `lib/guidance.ts`
- `lib/types.ts`
- `lib/router.ts`
- `lib/sarvam.ts`
- `lib/skills/**`
- `tests/engine.test.ts`
- `tests/m2-flow.test.ts`

Do not rewrite or replace these working foundations unless a failing integration test proves a change is required.

---

## Approved product scope

Thuna is a patient multilingual digital companion for elders.

### On-demand digital help

- Order food.
- Send payment guidance.
- Phone settings help.
- Track an order.
- General digital questions.
- Unsupported-task and family-handoff flow.

### Proactive companion routines

- Medicine reminder.
- Water reminder.
- Bill reminder.
- Family-call reminder.
- Delivery follow-up.
- General check-in.
- Snooze, retry, completion, missed, cancel and escalation states.

### Shared capabilities

- Browser microphone.
- Saaras speech-to-text.
- Sarvam structured interpretation.
- Bulbul spoken response.
- Task and routine registries.
- Persistent session, preference and event history.
- Corrections, interruptions and contextual questions.
- Consent-controlled family notification.
- Safe refusal of OTP/PIN/CVV.
- Optional telephony adapter; telephony is never required for core operation.

### External actions

Food orders, payments, cab actions and similar external-service operations are faithful simulations unless real credentials and approved APIs are already available. They must be visibly labelled simulated.

---

## Non-negotiable safety invariants

1. Never request, store, transmit or log OTP, PIN, CVV or banking credentials.
2. OTP/PIN/CVV refusal must run before any AI call.
3. The model may interpret speech but may never mutate session state directly.
4. The deterministic engine owns all transitions and consequential decisions.
5. WAIT, silence, vague agreement, REPEAT and GO_BACK never count as confirmation.
6. A correction invalidates any stale confirmation affected by that correction.
7. All mock external actions must say `SIMULATED`.
8. Family notification requires explicit elder consent.
9. Medicine routines only remind; they never recommend dosage, alter schedules, diagnose or provide medical advice.
10. No-response is never treated as successful completion.
11. Telephony credentials must not be committed.
12. `.env`, personal audio and secrets must never be committed.

---

## Lead-agent operating mode

### Preferred mode — Codex app with isolated worktrees

Create five isolated workstreams from the current green baseline:

- A — Sarvam voice and interpretation.
- B — Task-skill expansion.
- C — Proactive routines and channels.
- D — Elder-first UI.
- E — Memory and trusted-family context.

Each worker must operate only within its file-ownership boundary.

### Fallback mode — sequential execution

When parallel tasks or worktrees are unavailable, execute A through E sequentially in the same order shown in the merge plan. Commit after every passing stage.

### No uncontrolled loop

For each workstream:

1. Implement.
2. Run the required gates.
3. When gates fail, allow one focused repair attempt by the same worker.
4. If the gates still fail, stop that workstream and record the blocker.
5. Never ask another worker to overwrite the failed worker’s files blindly.

---

## Preflight — lead agent must do this first

1. Read `AGENTS.md`, `HANDOFF_STATUS.md` and `COMPLETION_REPORT.md`.
2. Run:

```bash
git status
npx tsc --noEmit
npm test
npm run build
```

3. Refuse to proceed if the repository has unrelated uncommitted user changes.
4. Create a checkpoint commit/tag when the green GLM work is not already committed:

```bash
git add .
git commit -m "Complete typed Thuna engine and M2 workflow"
git tag thuna-m2-green
```

5. Preserve the current green tests throughout all workstreams.

---

# WORKSTREAM A — REAL SARVAM VOICE AND INTERPRETATION

## Ownership

- `lib/sarvam.ts`
- `lib/voice/**`
- `app/api/stt/**`
- `app/api/interpret/**`
- `app/api/tts/**`
- `tests/voice*`

Do not modify UI, task skills, routine skills or the core engine.

## Deliverables

### STT route

- Accept browser-recorded audio as FormData.
- Reuse the existing working Saaras REST integration.
- Return transcript, latency and typed errors.
- Respect current API input limits.
- Never retain personal audio beyond request processing.

### Structured interpretation route

Input:

- transcript
- active session
- current task/routine
- current step
- confirmed fields
- screen context
- allowed actions

Output:

- the existing `ParsedCommand` contract
- confidence
- latency
- `demoFallback` flag

Requirements:

- Use an available Sarvam chat model.
- Require strict JSON.
- Validate using Zod.
- Retry malformed JSON once.
- Fall back to deterministic parsing after retry failure.
- The model output may not mutate the session.

### TTS route

- Use the existing Bulbul integration.
- Return playable audio.
- Support normal and slow pace.
- Return typed errors and latency.
- Add a local/pre-generated fallback path when practical.

### End-to-end helper

`audio -> transcript -> ParsedCommand -> existing engine -> guidance -> Bulbul audio`

## Gates

- STT fixture passes.
- Valid structured interpretation passes.
- Malformed response falls back deterministically.
- OTP/PIN/CVV is rejected before model invocation.
- TTS success and failure are tested.
- Typecheck, tests and build pass.

Commit:

`Add real Sarvam voice and interpretation pipeline`

---

# WORKSTREAM B — GOVERNED TASK-SKILL LIBRARY

## Ownership

- `lib/skills/**`
- `lib/skills/registry.ts`
- `tests/skills*`

Do not modify the core engine, APIs, routines or UI.

## Deliverables

Preserve the working `ORDER_FOOD` skill.

Complete:

### SEND_PAYMENT

- Priya Menon.
- Priya Stores.
- Priya Nair.
- Semantic wrong-recipient warning.
- Recipient and amount correction.
- Read-back.
- Explicit confirmation.
- `SIMULATED PAYMENT SUCCESS`.
- No OTP/PIN/CVV handling.

### PHONE_HELP

- Increase text size.
- Connect Wi-Fi.
- Send a photo.
- One instruction at a time.
- Repeat, back, wait and stop.
- Clear statement when guidance is simulated.

### TRACK_ORDER

- Processing.
- Shipped.
- Out for delivery.
- Delayed.
- Never invent a delivery promise.

### GENERAL_HELP

Explain:

- UPI.
- CVV.
- Airplane mode.
- Payment pending.
- Location permission.
- QR code.

Do not claim control of an external app.

### UNSUPPORTED / HUMAN HANDOFF

- Explain the limitation.
- Offer consented family help.

## Extensibility requirement

New skills must be registerable through metadata and a common skill contract. The core engine must not gain skill-specific branches.

## Gates

- Tests for every skill.
- Corrections preserve unaffected values.
- Confirmation is explicit.
- Safety rules remain structural.
- Typecheck, tests and build pass.

Commit:

`Expand governed Thuna task skill library`

---

# WORKSTREAM C — PROACTIVE ROUTINES AND CHANNELS

## Ownership

- `lib/routines/**`
- `lib/scheduler/**`
- `lib/notifications/**`
- `lib/channels/**`
- `app/api/routines/**`
- `app/api/notifications/**`
- `tests/routines*`

Do not modify task engine, task skills, voice routes or UI.

## Routine states

- SCHEDULED
- DUE
- ACTIVE
- SNOOZED
- COMPLETED
- MISSED
- ESCALATED
- CANCELLED

## Routine types

- MEDICINE_REMINDER
- WATER_REMINDER
- BILL_REMINDER
- FAMILY_CALL_REMINDER
- DELIVERY_FOLLOW_UP
- GENERAL_CHECK_IN

## Deliverables

- Create routine.
- List routines.
- Trigger due routine.
- Complete.
- Snooze for requested duration.
- Retry once after no response.
- Cancel.
- Preserve history.
- Request family.
- Consent-controlled family notification.
- Accelerated demo clock: minutes may map to seconds in demo mode.
- Notification adapter interface.
- Console/demo notification adapter.
- Email or Telegram adapter only when credentials already exist.
- Channel adapter interface.
- Simulated in-app incoming check-in.
- Exotel/Twilio interface only; real telephony must remain optional.

## Medicine safety

- Reminder only.
- No dose recommendation.
- No schedule changes.
- No diagnosis.
- Silence is not completion.
- Uncertainty may pause and request human help.

## Gates

- Trigger.
- Snooze.
- Second trigger.
- Completion.
- Missed.
- Consent.
- Safety.
- Typecheck, tests and build pass.

Commit:

`Add proactive companion routines and channel adapters`

---

# WORKSTREAM D — COMPLETE ELDER-FIRST UI

## Ownership

- `app/page.tsx`
- `app/globals.css`
- `components/**`
- `lib/client-api.ts`
- `public/**`

Do not modify shared contracts, engine, APIs, skills, routines or Sarvam code.

## Product areas

- Home.
- Talk to Thuna.
- Digital help.
- My routines.
- History.
- Trusted family.
- Settings.
- Demo Inspector.

## Home

- Large Talk button.
- “How can I help?”
- Next scheduled check-in.
- Recent completed task.
- Quick actions:
  - Order food.
  - Payment help.
  - Phone help.
  - Track order.
  - Ask a question.

## Voice experience

- Microphone permission.
- Listening.
- Understanding.
- Speaking.
- Transcript.
- Large current guidance.
- Audio playback.
- Repeat Slowly.
- Wait.
- Go Back.
- Stop.
- Retry.
- Text fallback in Demo Mode.

## Task views

- ORDER_FOOD.
- SEND_PAYMENT.
- PHONE_HELP.
- TRACK_ORDER.
- GENERAL_HELP.
- UNSUPPORTED / HANDOFF.

## Routine views

- Routine list.
- Create reminder.
- Next check-in.
- Incoming in-app check-in.
- Complete.
- Snooze.
- Cancel.
- Missed.
- Request family.
- Routine history.

## Receipts

- `SIMULATED ORDER SUCCESS`.
- `SIMULATED PAYMENT SUCCESS`.
- Routine completed.
- Clear external-action disclaimer.

## Accessibility and design

- Minimum 48px touch targets.
- Large readable typography.
- High contrast.
- One dominant action per screen.
- Respectful, non-childish design.
- Malayalam-ready layout.
- Keyboard and screen-reader labels.
- Responsive mobile-first presentation.

## Demo Inspector

Hidden by default:

- Transcript.
- Intent.
- ParsedCommand.
- Entities.
- Skill/routine.
- Step.
- Session state.
- Safety decision.
- Event history.
- API latency.
- Fallback.
- Reset Demo.

## Integration boundary

Create typed mock adapters first in `lib/client-api.ts`. Keep one isolated layer that the integration stage can switch to real APIs.

## Gates

- UI works with mocks.
- Typecheck and build pass.
- No backend files changed.

Commit:

`Build complete elder-first Thuna product interface`

---

# WORKSTREAM E — MEMORY AND TRUSTED FAMILY

## Ownership

- `lib/memory/**`
- `lib/family/**`
- `app/api/memory/**`
- `app/api/family/**`
- `data/**`
- `tests/memory*`

Do not modify engine, voice, tasks, routines or UI.

## Store

- Elder profile.
- Preferred language.
- Preferred pace.
- Trusted family contacts.
- Notification consent per contact.
- Previous food order.
- Preferred address.
- Frequent payment recipients.
- Task history.
- Routine history.
- Correction history.
- Handoff history.

## Rules

- No credentials.
- No medicine dosage.
- No implicit surveillance.
- Record consent changes.
- Redact sensitive values from logs.
- Support profile reset/delete.

## APIs

- Profile get/update.
- Trusted contacts CRUD.
- Notification consent.
- Preferences.
- History.
- Reset/delete.

## Demo seed

- Elder: Appa.
- Language: Malayalam.
- Pace: slow.
- Previous order: Masala Dosa, Udupi Cafe, Home.
- Trusted family: Sree.
- Contacts:
  - Priya Menon.
  - Priya Stores.
  - Priya Nair.

## Gates

- Persistence.
- Consent.
- Reset.
- Typecheck, tests and build pass.

Commit:

`Add governed memory and trusted-family context`

---

# MERGE AND INTEGRATION PLAN

## Merge order

1. Workstream B — task skills.
2. Workstream C — routines.
3. Workstream E — memory.
4. Workstream A — voice.
5. Workstream D — UI.

Run after every merge:

```bash
npx tsc --noEmit
npm test
npm run build
```

Do not merge a branch that fails a gate.

Resolve conflicts by preserving:

- the existing green engine semantics
- the shared contracts
- ownership boundaries
- safety invariants

---

# FINAL INTEGRATION WORKSTREAM

After A-E are merged, the lead agent or one dedicated integration agent performs this work.

## Deliverables

1. Connect `lib/client-api.ts` to real API routes.
2. Confirm microphone audio reaches Saaras.
3. Confirm transcript reaches structured interpretation.
4. Confirm `ParsedCommand` reaches the deterministic engine.
5. Confirm guidance reaches Bulbul and audio plays.
6. Connect:
   - ORDER_FOOD
   - SEND_PAYMENT
   - PHONE_HELP
   - TRACK_ORDER
   - GENERAL_HELP
7. Connect:
   - medicine reminder
   - snooze
   - completion
   - family request
8. Connect memory:
   - previous order
   - contacts
   - pace
   - language
   - consent
9. Keep all external actions visibly simulated.
10. Preserve pre-AI OTP/PIN/CVV refusal.
11. Preserve medicine safety.
12. Require family consent.
13. Recover gracefully from every API error.
14. Add Reset Demo.
15. Remove dead dubbing imports/files only after verifying no imports remain.
16. Preserve every green test.

## Documentation

Create:

- `docs/DEMO_SCRIPT.md`
- `docs/RUNBOOK.md`
- `docs/FEATURE_MATRIX.md`

## End-to-end scenarios

A. Food order with memory, contextual question, correction and confirmation.
B. Wrong-recipient payment prevention.
C. Phone text-size guidance.
D. OTP refusal.
E. Scheduled medicine reminder, snooze and completion.
F. Family handoff with consent.
G. Unsupported request.
H. Reset and repeat.

## Final gates

```bash
npx tsc --noEmit
npm test
npm run build
```

Commit:

`Integrate and release complete Thuna product`

---

# OPTIONAL REAL TELEPHONY

Attempt only after the web product is green and telephony credentials already exist.

- Scheduler initiates outbound call through Exotel/Twilio.
- Provider streams phone audio to the existing voice pipeline.
- Support answer, reminder, snooze, completion, hangup and failure.
- Do not alter business logic.
- Do not make telephony mandatory.
- Do not commit credentials.

---

# STOP CONDITIONS

The lead agent must stop and report rather than silently weakening the product when:

- Baseline tests fail before work begins.
- Required Sarvam credentials are unavailable.
- A workstream fails after one repair attempt.
- A merge would overwrite green engine behaviour.
- An agent attempts to commit secrets.
- Real external integration would require unsafe credentials or prohibited access.
- Remaining time is insufficient for a gated merge.

When blocked, preserve all green work and produce:

- blocker
- files affected
- commands run
- logs
- safest next action

---

# FINAL LEAD-AGENT REPORT

Return:

1. Final feature matrix.
2. Real versus simulated features.
3. Sarvam APIs actually used.
4. Workstreams completed.
5. Workstreams blocked.
6. Typecheck/test/build results.
7. Demo commands.
8. Environment-dependent features.
9. Known risks.
10. Exact Git commits and branches/worktrees.
