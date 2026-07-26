# Swiggy MCP — Proof of Connection

A **standalone, read-only** probe that proves Thuna can authenticate to Swiggy MCP, discover its
tools, and read real data — **without placing an order**.

- Imports **no** Thuna production code. Nothing here can affect the engine, skills, or UI.
- **Places no orders.** There is no code path from `npm run probe` to `place_food_order`.
- Ships with `THUNA_ENABLE_REAL_SWIGGY_ORDER=false`.

---

## Why this exists separately

Thuna's `ORDER_FOOD` skill is deliberately simulated (see `AGENTS.md`). Wiring a real commerce API
into the engine before the connection is proven would mean debugging OAuth, transport, tool schemas
and Thuna's state machine simultaneously — with real money as the failure mode.

This experiment isolates the risk: prove the connection out-of-tree first, then hand Codex a verified
picture of what the real responses actually look like.

---

## Safety model

Three independent layers, any one of which prevents an accidental order:

**1. Client-side allowlist (`src/safety.ts`).**
Swiggy's OAuth scopes are "server-level, not read/write-split" — there is **no read-only scope**. A
token that can call `get_addresses` can also call `place_food_order`. So the read-only guarantee is
enforced in our own client, by tool name, *before* any network call. Unknown tool names **fail
closed**.

**2. Double gate on order placement.**
`THUNA_ENABLE_REAL_SWIGGY_ORDER=true` alone is **not sufficient**. The code also requires an explicit
per-run order intent. A stray env var left in a shell must never be enough to spend an elder's money.
`src/probe.ts` never signals that intent — it is structurally incapable of ordering.

**3. Redacted logging (`src/redact.ts`).**
Every payload printed passes through a redactor that masks tokens, PKCE verifiers, secrets, phone
numbers, emails, addresses and coordinates. Under DPDP all tool-call content is PII.

The probe's final step deliberately *attempts* `place_food_order` and asserts it is refused. If the
gate ever fails, the probe exits non-zero.

---

## Requirements

- **Node ≥ 22.6** (uses `--experimental-strip-types` to run TypeScript directly).
- A Swiggy account with saved addresses (for meaningful `get_addresses` output).
- **Swiggy MCP access.** Production is invite-based; staging is issued during application review.
  Apply: <https://mcp.swiggy.com/builders/access/>

Without access, the probe still runs — it will fail at connect and print exactly which prerequisite
is missing. Unit tests need no credentials at all.

---

## Commands

```bash
cd experiments/swiggy-mcp
npm install                       # installs @modelcontextprotocol/sdk

cp .env.example .env              # then edit .env

npm run typecheck                 # tsc --noEmit
npm test                          # 30 safety/redaction/PKCE tests — NO credentials needed

npm run auth                      # interactive OAuth (browser; phone + OTP on Swiggy's page)
npm run probe                     # full read-only probe
```

Targeted probes:

```bash
npm run probe:discover            # tool discovery only
npm run probe:addresses           # get_addresses only
npm run probe:restaurants         # + search_restaurants
npm run probe:menu                # + search_menu
npm run probe:cart                # + get_food_cart (authoritative cart read)
```

Env-loading note: the scripts read `process.env` directly and do not auto-load `.env`. Either export
the vars, or prefix with a loader:

```bash
set -a && source .env && set +a && npm run probe
# or, on Node 22+:
node --env-file=.env --experimental-strip-types src/probe.ts
```

---

## What the probe does

| Step | Tool | Arguments | Class |
|---|---|---|---|
| 1 | *(discovery)* `listTools` | — | proves auth + transport |
| 2 | `get_addresses` | *(none)* | read |
| 3 | `search_restaurants` | `addressId`, `query` | read |
| 4 | `search_menu` | `addressId`, `query` | read (optional) |
| 5 | `get_food_cart` | `addressId` | read (optional) |
| 6 | `place_food_order` | — | **asserted BLOCKED** |

Steps 2–5 are the officially documented argument names, verified against
<https://mcp.swiggy.com/builders/docs/reference/food/>. No argument here is guessed.

---

## Interpreting failures

| Symptom | Meaning | Fix |
|---|---|---|
| `Cannot find module '@modelcontextprotocol/sdk/...'` | SDK not installed | `npm install` |
| Connect fails, 401 / `-32001` | Not authorised, or token expired (5-day life) | `npm run auth` |
| Connect fails, 403 / not enrolled | No production access | Apply, or use staging |
| `get_addresses` returns `success: false` | Domain failure — **terminal, do not retry** | Read `error.message` |
| Everything blocked | Working as designed | The gate is doing its job |

**Do not "fix" a blocked call by loosening the gate.** That is the one change in this directory that
could cause real harm.

---

## Token handling

- Default: **memory only.** The token dies with the process.
- Optional: set `SWIGGY_TOKEN_FILE=.tokens.json` to cache it. Written mode `0600`, and `.tokens.json`
  is gitignored.
- The PKCE code verifier is **never** persisted (single-use, 120-second window).
- **Never commit a token, code, or verifier.** `.gitignore` blocks the usual paths; check `git diff`
  before committing regardless.

---

## File map

```
experiments/swiggy-mcp/
  package.json        isolated deps (@modelcontextprotocol/sdk only)
  tsconfig.json       strict, standalone
  .env.example        documented environment variables
  .gitignore          blocks .env, .tokens.json, probe output
  src/
    config.ts         env parsing, server URL resolution, redirect-URI validation
    redact.ts         PII/secret redaction for all logging
    safety.ts         tool allowlist, order gate, Rs 1000 cart cap
    oauth-provider.ts OAuth 2.1 + PKCE skeleton, TokenStore
    client.ts         gated MCP client, error taxonomy, retry policy
    auth-cli.ts       interactive OAuth helper
    probe.ts          the read-only probe
  tests/
    safety.test.ts    30 tests, no network or credentials required
```

---

## Status

- ✅ `typecheck` — clean
- ✅ `test` — 30/30 pass
- ⏳ Live probe — run only with approved Swiggy MCP access. See the production
  status in `../../docs/SWIGGY_LIVE_VALIDATION_REPORT.md`.

The unit tests verify every safety property that does not need a network. The live probe is the
remaining unknown, and it is blocked on credentials rather than on code.

---

## References

- [Developer quickstart](https://mcp.swiggy.com/builders/docs/start/developer/)
- [Authenticate](https://mcp.swiggy.com/builders/docs/start/authenticate/)
- [Build an agent](https://mcp.swiggy.com/builders/docs/start/developer/build-an-agent/)
- [Food tool reference](https://mcp.swiggy.com/builders/docs/reference/food/)
- [Error codes](https://mcp.swiggy.com/builders/docs/reference/errors/)
- [Ship to production](https://mcp.swiggy.com/builders/docs/build/ship-to-production/)

Project-side analysis: `docs/integrations/SWIGGY_MCP_RESEARCH.md`,
`SWIGGY_FOOD_FLOW.md`, `SWIGGY_AUTH_AND_SECURITY.md`.
