# Thuna

Thuna is a multilingual digital companion for elders. It combines patient,
voice-guided help for everyday digital tasks with consent-based reminders,
memory, family handoff, and continuity across unfinished activities.

**Public product:** https://thuna-production.up.railway.app/

The product is designed around a simple rule: language models may understand,
explain, and propose, but deterministic application code owns safety, consent,
state transitions, and external actions.

## The problem

Everyday digital services often assume fast reading, confident navigation, and
familiarity with changing interfaces. Elders may know exactly what they want
while still needing help with multi-step flows, corrections, fees, reminders,
and safety-sensitive prompts.

Thuna lets the elder describe the goal naturally. It interprets that request,
loads a governed task or routine, reads important details back, allows one-field
corrections without losing other choices, and requires explicit confirmation
before any consequential step.

## What the current product release includes

### Voice and language

- Browser push-to-talk capture.
- Saaras v3 speech-to-text through the real Sarvam API.
- Structured intent and entity interpretation through a Sarvam chat model.
- A deterministic parser when model interpretation is unavailable or invalid.
- Bulbul v3 text-to-speech with a browser-speech last resort.
- English and Indian-language-oriented contracts, with configurable source,
  target, voice, and pace settings.
- Prerecorded audio and typed transcript fallbacks for controlled demos.

### Governed digital assistance

- `ORDER_FOOD`: restore a known order, explain the delivery fee, correct an
  item, preserve unrelated choices, invalidate stale confirmation, and require
  deliberate confirmation.
- `SEND_PAYMENT`: simulated payment guidance with recipient mismatch checks and
  no banking credential capture.
- `PHONE_HELP`: step-by-step simulated phone-settings guidance.
- `TRACK_ORDER`: simulated tracking without invented delivery promises.
- General questions, unsupported-request handling, recovery controls, and
  consented family-help requests.
- OTP, PIN, CVV, and banking-secret requests are refused before model
  invocation.

### Continuity companion

- Life events with candidate-to-confirmed lifecycle, source provenance,
  correction, supersession, reminder policy, quiet hours, and completion.
- Pending promises with due-time or contextual triggers, snooze, completion,
  cancellation, consent, and sharing scope.
- Universal “Remember this” classification for tasks, events, routines, bills,
  promises, family requests, questions, and unsupported input.
- Elder read-back and confirmation before candidate facts enter durable memory.
- Daily life briefs that prioritize and deduplicate events, bills, deliveries,
  routines, family commitments, and pending promises.
- Family-attention requests with requested, accepted, scheduled, completed, and
  elder-confirmed states.
- Interruption/resume contracts that preserve confirmed fields and invalidate
  stale confirmations.

### Routines, memory, and family consent

- Deterministic reminder scheduling, in-app check-ins, snooze, retry, completion,
  cancellation, and append-only event history.
- File-backed profile, preferences, contacts, routine, memory, and continuity
  stores.
- Explicit family-notification consent, minimum disclosure, and consent history.
- Optional Telegram notification adapter when credentials are deliberately
  configured.

## Architecture

```text
Browser microphone / prerecorded audio / typed input
  → Saaras v3 speech-to-text
  → Sarvam structured interpretation
  → Zod validation
  → deterministic task, safety, routine, or continuity engine
  → provider-neutral adapter when required
  → response and governed UI state
  → Bulbul v3 text-to-speech
```

The LLM cannot directly mark a task complete, persist extracted facts, place an
order, send a payment, or disclose family content.

## Real and simulated boundaries

| Capability | Current status |
| --- | --- |
| Saaras v3 STT | Real Sarvam API |
| Sarvam structured interpretation | Real API with deterministic fallback |
| Bulbul v3 TTS | Real Sarvam API with controlled fallback |
| Task, safety, routine, memory, and continuity engines | Real product logic |
| Local persistence | Real file-backed storage |
| Swiggy OAuth, addresses, restaurant/menu discovery, and cart | Real MCP integration when `THUNA_FOOD_ADAPTER=swiggy` and authenticated |
| Swiggy order placement | Disabled by default and never used by automated tests |
| Default food workflow | Clearly labelled simulated provider integration |
| Payment and generic tracking actions | Simulated provider integrations |
| Telegram family notification | Optional real adapter with explicit credentials and consent |
| Telephony | Interface-only |
| Vision document extraction, ride provider, family story loop | Documentation or adapter-only |

## Swiggy Food MCP integration

Thuna integrates with the official Streamable HTTP MCP endpoint:
`https://mcp.swiggy.com/food`.

The implemented flow is:

```text
Thuna request
  → Sarvam interpretation
  → FoodCommerceAdapter
  → Swiggy OAuth 2.1 with PKCE
  → get_addresses
  → search_restaurants / get_restaurant_menu
  → update_food_cart
  → authoritative get_food_cart
  → exact cart read-back
  → explicit Thuna confirmation
```

Live localhost validation received real responses for `get_addresses`,
`search_restaurants`, `get_restaurant_menu`, `update_food_cart`, and
`get_food_cart`. Address details, phone information, OAuth material, and tokens
were excluded from reports.

`THUNA_ENABLE_REAL_SWIGGY_ORDER=false` is the safe default. In that mode Thuna
may authenticate, discover, and prepare a real cart, but stops after:

> Real Swiggy cart prepared. Order placement is disabled for this test.

The Railway deployment contains the Swiggy runtime and persistent credential
store boundary, but each deployment environment must complete its own Swiggy
OAuth connection. A localhost OAuth session is not copied to Railway.

## Safety invariants

1. Never ask for or store an OTP, PIN, CVV, or banking credential.
2. Credential-sharing requests are refused before model invocation.
3. Silence, waiting, going back, or vague agreement never confirms.
4. Corrections update only affected fields and invalidate stale confirmation.
5. Extracted facts remain candidates until elder read-back and confirmation.
6. Medicine routines are reminders only and never provide diagnosis or dosage.
7. Family disclosure requires consent or an explicit elder request.
8. External actions are labelled accurately as real, simulated, or disabled.
9. The LLM cannot directly commit workflow state.
10. Every governed transition is appended to history.

## Technology

- Next.js 14 and React 18
- TypeScript
- Zod runtime validation
- Vitest
- Sarvam APIs and `sarvamai`
- Model Context Protocol TypeScript SDK
- Railway with a persistent volume

## Run locally

Requirements:

- Node.js 20 or newer
- npm
- A Sarvam API key
- A Chromium-class browser for microphone testing

```bash
git clone git@github.com:sreenathmmenon/thuna.git
cd thuna
npm install
cp .env.example .env
```

Set `SARVAM_API_KEY` in the gitignored `.env`, then run:

```bash
npx tsc --noEmit
npm test
npm run build
npm run dev
```

Open http://localhost:3000.

### Safe default provider mode

```bash
THUNA_FOOD_ADAPTER=mock \
THUNA_ENABLE_REAL_SWIGGY_ORDER=false \
npm run dev
```

### Authenticated localhost Swiggy mode

```bash
THUNA_FOOD_ADAPTER=swiggy \
THUNA_ENABLE_REAL_SWIGGY_ORDER=false \
THUNA_SWIGGY_CALLBACK_URL=http://localhost:3000/api/integrations/swiggy/callback \
THUNA_DATA_ROOT="$PWD/data" \
npm run dev -- --port 3000
```

Choose **Connect Swiggy** and complete phone/OTP entry only on Swiggy’s
authorization page. Never paste an OTP, access token, or refresh token into a
terminal, log, fixture, screenshot, issue, or commit.

Opt-in live validation, using an existing local authenticated session:

```bash
THUNA_RUN_LIVE_SWIGGY=true \
THUNA_FOOD_ADAPTER=swiggy \
THUNA_ENABLE_REAL_SWIGGY_ORDER=false \
npm run validate:swiggy
```

The validator never places an order and redacts personal information.

## Railway deployment

Public URL: https://thuna-production.up.railway.app/

The service uses the repository Dockerfile, Node.js 22, one Railway replica, and
the `thuna-volume` persistent volume mounted at `/app/data`.

Required and important variables are documented in
[`docs/RAILWAY_ENVIRONMENT.md`](docs/RAILWAY_ENVIRONMENT.md). At minimum:

```text
SARVAM_API_KEY=<secret>
THUNA_FOOD_ADAPTER=mock|swiggy
THUNA_ENABLE_REAL_SWIGGY_ORDER=false
THUNA_DATA_DIR=/app/data
```

Railway derives the Swiggy callback from `RAILWAY_PUBLIC_DOMAIN` unless
`THUNA_SWIGGY_CALLBACK_URL` is explicitly configured. The exact public callback
is:

```text
https://thuna-production.up.railway.app/api/integrations/swiggy/callback
```

The current file-backed credential model is appropriate for a single-account
demo deployment. Multi-user production use requires per-user encrypted database
storage.

## API routes

- `POST /api/stt`
- `POST /api/interpret`
- `POST /api/tts`
- `POST /api/session`
- `GET|POST /api/integrations/swiggy`
- `GET /api/integrations/swiggy/callback`
- `GET|POST /api/routines`
- `POST /api/routines/trigger`
- `GET|PATCH /api/routines/[id]`
- `GET|POST /api/continuity`
- Memory endpoints under `/api/memory/*`
- Family consent and request endpoints under `/api/family/*`
- `GET /api/health`

## Validation status

The committed integration baseline passed:

- `npx tsc --noEmit`
- `npm test`: 126/126 tests
- `npm run build`
- Live Railway `/` and `/api/health`: HTTP 200
- Live localhost Swiggy OAuth and read/cart calls
- Secret and personal-data review
- No real Swiggy order attempted

Physical browser microphone behavior depends on browser codec, selected input,
permission, and operating-system audio settings. The most recent recording
session did not establish a reliable physical-microphone run; use the documented
prerecorded or typed fallback when rehearsing rather than representing that path
as verified.

## Repository structure

```text
app/                         Next.js pages and API routes
components/                  Elder UI, task, routine, safety, and continuity views
lib/                         Engines, Sarvam adapters, storage, consent, and sessions
lib/adapters/                Provider-neutral commerce boundaries
lib/integrations/swiggy/     OAuth, MCP client, mapping, credential store, runtime
tests/                       Unit and integration tests
scripts/                     Opt-in validation scripts
docs/                        Product, architecture, operations, and provider documentation
experiments/swiggy-mcp/      Isolated provider experiment; excluded from runtime
data/                        Local runtime state; private credentials are gitignored
```

## Documentation

Start with [`docs/README.md`](docs/README.md). Key references include:

- [Feature matrix](docs/FEATURE_MATRIX.md)
- [Runbook](docs/RUNBOOK.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Continuity companion status](docs/CONTINUITY_COMPANION_INTEGRATION_STATUS.md)
- [Real Swiggy integration](docs/SWIGGY_REAL_INTEGRATION.md)
- [Swiggy OAuth runbook](docs/SWIGGY_OAUTH_RUNBOOK.md)
- [Swiggy provider boundary](docs/SWIGGY_PROVIDER_BOUNDARY.md)
- [Swiggy live validation report](docs/SWIGGY_LIVE_VALIDATION_REPORT.md)
- [Railway deployment](docs/RAILWAY_DEPLOYMENT.md)
- [Railway environment](docs/RAILWAY_ENVIRONMENT.md)

## Credential and privacy policy

- `.env` and token files are gitignored.
- Swiggy credentials are server-side only and stored with restrictive
  permissions.
- OAuth tokens are never returned to the browser.
- Logs and validation reports redact tokens and personal identifiers.
- No automated test calls live Swiggy.
- No automated test places an order.
