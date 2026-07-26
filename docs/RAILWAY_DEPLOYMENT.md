# Railway Deployment — Thuna

**Repository:** `/Users/sreenath/Code/myAIExps/Sarvam-Buildathon-July26`

## Project / service selection
- **Project:** Thuna (ID `c8089927-59b5-4192-91b8-693331c1c7c4`)
- **Environment:** production (ID `11cce2db-2bba-4430-80d9-91d0e39e7daa`)
- **Service:** Thuna (ID `3491e9ae-5931-493d-9777-b5ac545e3ccc`), region US West
- Linked via `railway link -p Thuna`; service created by first `railway up`.

## Build
- **Builder:** Dockerfile (Nixpacks' default build could not run reliably — `npm ci` EBUSY on `node_modules/.cache` cache mount + Node 20.18.1 below vite's required 20.19.0). The Dockerfile uses `node:22-bookworm-slim`, multi-stage (build with dev deps → runtime with prod deps).
- **Build command** (inside Dockerfile): `npm ci` → `npm run build`.
- `railway.json` sets `build.builder = DOCKERFILE`.

## Start command
- `npm run start` (= `next start`). Next.js 14 binds to `0.0.0.0:$PORT` (Railway provides `PORT`). No hardcoded port.

## Persistent volume
- **Volume:** `thuna-volume`, mount path **`/app/data`**, attached to service Thuna.
- All Thuna persistent data resolves through `lib/storage.ts` (`dataRoot()` priority: `RAILWAY_VOLUME_MOUNT_PATH` → `THUNA_DATA_DIR` → `<cwd>/data`). `THUNA_DATA_DIR=/app/data` is set as a Railway variable.
- **Single replica required** while file-backed storage is used (`railway.json` `deploy.replicas = 1`). Do not horizontally scale until storage moves to a transactional database.

## Healthcheck
- Path: `/api/health` → `GET` returns `{status, service, release, timestamp}`, no external calls. Timeout 180s.

## Domain
- Public: `https://thuna-production.up.railway.app` (Railway-provided service domain).

## Deploy / operations
- Deploy (local dir): `railway up -y -d`
- Status: `railway status`
- Logs: `railway logs`
- Redeploy latest: `railway redeploy`
- Restart: `railway service restart`
- Rollback: use the Railway dashboard (Deployments → previous → Redeploy).
