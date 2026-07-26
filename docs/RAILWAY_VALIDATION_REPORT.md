# Railway Validation Report — Thuna

## Locally verified
- `npm ci` — exit 0 (deterministic install).
- `npx tsc --noEmit` — exit 0 (typecheck clean).
- `npm test` (vitest) — **115/115 passing** (10 files; ≥107 as required).
- `npm run build` — exit 0 (`/api/health` route present).
- Local prod server on `PORT=3100`: `GET /api/health` → 200 `{"status":"ok","service":"thuna","release":"local",...}`; `/` → 200.
- Secret scan: no `SARVAM_API_KEY` values in tracked files; no real `.env` tracked (only `.env.example` placeholders); no `NEXT_PUBLIC_*` secrets; token-pattern matches were documentation/variable-name false positives.
- Storage resolver tests: 8/8 pass (mount selection, THUNA_DATA_DIR, fallback, dir creation, path-traversal rejection).
- M2 typed engine flow: restore → no-chutney → contextual delivery-fee answer → plain-dosa correction preserving no-chutney → explicit "yes" → SIMULATED ORDER SUCCESS.

## Railway verified
- Project Thuna linked; service Thuna created; environment production.
- Domain: `https://thuna-production.up.railway.app` (ACTIVE).
- Volume `thuna-volume` mounted at `/app/data` (Ready).
- Variables set (non-secret + `SARVAM_API_KEY`, value not printed).
- Healthcheck path: `/api/health` (configured in `railway.json`).
- (Live Railway `/api/health` 200 to be confirmed once deployment reports Active — see blockers.)

## Live Sarvam
- `SARVAM_API_KEY` is set on the Railway service (sourced from local `~/.env`).
- A full live Saaras → Sarvam → Bulbul voice path requires the real-time voice loop, which is **not yet merged** into this main repository (Claude mobile UI + Codex Swiggy work are separate). The `/api/stt`, `/api/interpret`, `/api/tts` routes exist but the integrated live loop will be exercised after the merge + redeploy.

## Simulated vs real providers
- `THUNA_FOOD_ADAPTER=mock` → simulated food provider.
- `THUNA_ENABLE_REAL_SWIGGY_ORDER=false` → **real Swiggy ordering disabled**. No real order is placed.
- Simulated actions remain clearly labelled ("SIMULATED … no real order was placed").

## Credential-blocked features
- OTP / PIN / CVV requests are refused before any model call (engine `quickCheck` + `/api/*` routes). Verified by tests.
- Silence / vague / "wait" never count as confirmation.

## Persistence
- Runtime data (`thuna-memory.json`, `thuna-continuity.json`) resolves to the Railway volume `/app/data` via `lib/storage.ts`. Stores create the files empty if missing (verified by store constructors).
- Single replica enforced (`railway.json replicas=1`) while file storage is used.
- Post-deploy persistence verification (write → reload → survives restart) to be run after the merge redeploy.

## Mobile
- Mobile-first elder UI (`components/elder/*`) is being finalized by Claude in a separate workstream and is **not yet merged** here. Post-merge redeploy required (see RAILWAY_POST_MERGE_CHECKLIST.md).
