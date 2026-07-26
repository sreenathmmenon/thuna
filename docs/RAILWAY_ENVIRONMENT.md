# Railway Environment Variables — Thuna

Set in the Railway service (never committed). `SARVAM_API_KEY` was sourced from the local `~/.env` without printing the value.

## Required
| Variable | Secret? | Default / value | Notes |
|---|---|---|---|
| `SARVAM_API_KEY` | **secret** | (set) | Sarvam API key. Required for live Saaras/Sarvam/Bulbul calls. |
| `NODE_ENV` | no | `production` | |
| `PORT` | no | (Railway-provided) | Next.js `next start` honors it. |
| `THUNA_DATA_DIR` | no | `/app/data` | Volume mount root for persistent data. |

## Sarvam models / voice (non-secret)
| Variable | Default |
|---|---|
| `SARVAM_CHAT_MODEL` | `sarvam-30b` |
| `BULBUL_VOICE` | `abhilash` |
| `SOURCE_LANG` | `en-IN` |
| `TARGET_LANG` | `hi-IN` |

## Thuna runtime / safety (non-secret)
| Variable | Default | Notes |
|---|---|---|
| `THUNA_DEMO_MODE` | `true` | Labels simulated provider actions clearly. |
| `THUNA_FOOD_ADAPTER` | `mock` | `mock` \| `swiggy`. Set `swiggy` for real account/cart access. |
| `THUNA_ENABLE_REAL_SWIGGY_ORDER` | `false` | Master safety flag; real ordering requires explicit in-the-moment confirmation. |
| `THUNA_SWIGGY_CALLBACK_URL` | derived | Optional explicit OAuth callback. Otherwise uses `https://$RAILWAY_PUBLIC_DOMAIN/api/integrations/swiggy/callback`. |
| `THUNA_DATA_ROOT` | derived | Optional Swiggy-only override. Otherwise uses the Railway volume or `THUNA_DATA_DIR`. |

## Optional (per-file overrides; usually unset)
- `THUNA_MEMORY_PATH`, `THUNA_CONTINUITY_PATH` — override exact data file paths (else under `THUNA_DATA_DIR`).
- `THUNA_TELEGRAM_BOT_TOKEN` (secret), `THUNA_TELEGRAM_CHAT_ID` — enable Telegram family notifications. **Not set** in the current deployment.

## Intentionally disabled / not set
- `THUNA_ENABLE_REAL_SWIGGY_ORDER=false` → real Swiggy ordering is disabled.
- Railway Swiggy OAuth additionally requires the exact public HTTPS callback to be accepted by Swiggy.
- File-backed Swiggy credentials support one connected account and one replica. Multi-user deployment requires a per-user database credential store.
- No telephony (`EXOTEL_*`/`TWILIO_*` are channel types in code, not configured env).
- No `NEXT_PUBLIC_*` secret vars.
