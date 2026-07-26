# Thuna runbook

## Requirements

- Node.js 20 or newer.
- `SARVAM_API_KEY` in a gitignored `.env`.
- A Chromium-class browser for microphone recording.

Optional environment:

- `SARVAM_CHAT_MODEL` defaults to `sarvam-30b`.
- `BULBUL_VOICE` defaults to `shubh`.
- `TARGET_LANG` defaults to `hi-IN`.
- `THUNA_DEMO_MODE=false` disables accelerated routine timing.
- `THUNA_MEMORY_PATH` moves the persistent JSON memory store.
- Telegram variables may enable its optional notification adapter.

Never commit `.env`, personal audio, or provider credentials.

## Install and verify

```bash
npm install
npx tsc --noEmit
npm test
npm run build
```

## Run

```bash
npm run dev
```

Open `http://localhost:3000`. Allow microphone access when prompted. Press the
Talk button once to start recording and again to stop.

## API flow

```text
POST /api/stt
  -> POST /api/session
       -> pre-AI credential refusal
       -> Sarvam structured interpretation
       -> deterministic engine
       -> session-store commit and event append
  -> POST /api/tts
```

`POST /api/session` accepts:

```json
{
  "sessionId": "demo",
  "transcript": "Order my usual dosa without chutney"
}
```

Routine endpoints:

- `GET/POST/DELETE /api/routines`
- `POST /api/routines/trigger`
- `GET/PATCH /api/routines/:id`
- `POST /api/notifications`

Memory and family endpoints:

- `GET /api/memory`
- profile, preferences, history, and reset under `/api/memory/*`
- contacts, consent, and explicit handoff under `/api/family/*`

## Reset and recovery

Use **Reset Demo** in Demo Inspector. It restores the Appa seed, clears routines,
and resets the active deterministic session.

If live voice fails:

1. use the prerecorded demo prompt;
2. use typed Demo Mode;
3. inspect the fallback field in Demo Inspector.

No API error should authorize an external action. Food orders, payments,
tracking, family notifications, and in-app calls remain visibly simulated.

## Production

```bash
npm run build
npm start
```

Do not run `next dev` and `next build` concurrently in the same checkout because
both use `.next`.
