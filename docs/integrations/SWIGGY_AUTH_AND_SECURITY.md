# Swiggy MCP — Authentication & Security

> Sources: [Authenticate](https://mcp.swiggy.com/builders/docs/start/authenticate/),
> [Build an agent](https://mcp.swiggy.com/builders/docs/start/developer/build-an-agent/),
> [Access & onboarding](https://mcp.swiggy.com/builders/docs/operate/access/),
> [Power an agent platform](https://mcp.swiggy.com/builders/docs/start/enterprise/),
> [Data & compliance](https://mcp.swiggy.com/builders/docs/operate/data-and-compliance/),
> [Ship to production](https://mcp.swiggy.com/builders/docs/build/ship-to-production/).
> Fetched 2026-07-26.

---

## 1. There is no API key

> "OAuth 2.1 + PKCE - there is no static API key."

Every external caller authenticates as a **specific Swiggy user** via an interactive OAuth flow with
phone + OTP verification performed **by the user, on Swiggy's own consent UI**.

Two consequences that shape the whole integration:

1. **You cannot authenticate a server-to-server job.** No credential can be dropped into `.env` to
   make Thuna order food unattended. A human must complete a browser flow.
2. **The OTP is entered on Swiggy's page, never in Thuna.** This is a fortunate alignment: Thuna's
   first safety invariant is that it never asks for or accepts an OTP. Swiggy's design means Thuna
   never sees one. `quickCheck()` in `lib/router.ts` stays exactly as it is — and if an elder ever
   tries to read an OTP aloud to Thuna during a Swiggy flow, the existing refusal is still correct.

---

## 2. Endpoints (verified)

Base: `https://mcp.swiggy.com`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/auth/authorize` | "Start the flow - user lands on consent UI" |
| `POST` | `/auth/token` | "Exchange authorization code for access token" |
| `POST` | `/auth/register` | Dynamic Client Registration (RFC 7591) |
| `POST` | `/auth/logout` | "Revoke current session" |

Discovery: SDKs with native `authProvider` support "handle PKCE automatically against Swiggy's
`/.well-known/oauth-protected-resource` endpoint."

**Not documented:** whether staging (`mcp-staging.swiggy.com`) uses distinct auth endpoints. Verify
empirically before assuming.

---

## 3. PKCE (verified)

- Code verifier: **32 random bytes, base64url-encoded**.
- Challenge: **SHA-256** of the verifier.
- Authorization URL carries `code_challenge_method=S256`.

Authorization codes are **"120 seconds, single-use."** Short — the callback handler must exchange
immediately, not queue the work.

---

## 4. Scopes and token lifetimes (verified)

| Scope | Grants |
|---|---|
| `mcp:tools` | Call tools |
| `mcp:resources` | Read metadata |
| `mcp:prompts` | Access templates |

> The model is "server-level, not read/write-split."

**This is a significant security fact.** There is **no read-only scope**. Granting `mcp:tools` to
reach `get_addresses` also grants the ability to call `place_food_order`. The protocol offers no way
to request browse-only access.

Therefore **the read-only guarantee must be enforced by Thuna, not by Swiggy.** That is precisely why
`experiments/swiggy-mcp/` implements an allowlist client-side and refuses mutating tool names
regardless of what the token permits. Do not weaken that on the assumption the scope protects you.

| Item | Lifetime |
|---|---|
| Access token | **5 days** |
| User session | **30 days idle, sliding** |
| Authorization code | **120 seconds, single-use** |

On 401: "Re-run the OAuth flow and retry." **"Never retry with the same token."** No refresh-token
rotation flow is documented — the documented recovery is a fresh authorization.

For Thuna this means a stored Swiggy authorization goes stale roughly weekly. An elder-facing product
cannot silently fail; it needs a graceful "I need you to sign in to Swiggy again, shall I ask
your family member to help?" path. Re-authorization is a family-handoff candidate.

---

## 5. Direct vs delegated auth (verified, with a documentation gap)

### Direct developer flow
The default, documented on the authenticate page. One developer, their own Swiggy account, their own
tokens. This is what `experiments/swiggy-mcp/` targets.

### Delegated / platform-operator flow

> "OAuth 2.1 on-behalf-of flow for brokering Swiggy tool calls for thousands or millions of end
> users, with per-user consent and Swiggy holding the PII."
> — [Power an agent platform](https://mcp.swiggy.com/builders/docs/start/enterprise/)

Explicitly aimed at "agent platforms running at scale - voice assistants, in-app agents,
conversational commerce." **Thuna is exactly this category** if it ever serves more than its author.

Requirements captured:
- Apply at `/builders/access/` as a platform operator (user-base size, geographies, surfaces, peak QPS)
- Intro call with the partnerships team
- Architecture review with engineering ("30-60 minutes covering delegated auth specifics")
- Partner contract — **"typically 4+ weeks because commercial terms are negotiated per-partner"**
- Staging access to test delegated auth, then production cutover
- Obligations: "Valid end-user consent per DPDP", "per-user consent and Swiggy holding the PII",
  custom capacity ceilings, honour rate-limit headers, preserve attribution ("no stripping")

Voice-specific note: platforms should focus on "Voice-first response shaping" for TTS and in-car
surfaces — "concise, imperative responses rather than rich card widgets."

> ⚠️ **Documentation gap.** `llms.txt` lists a page "Delegated auth: OAuth 2.1 on-behalf-of flow for
> multi-tenant platforms serving end users", and the authenticate page links to it by name. But
> `https://mcp.swiggy.com/builders/docs/start/delegated-auth/` returned **HTTP 404** on 2026-07-26.
> The grant type, endpoints and parameters for delegated auth are therefore **NOT verifiable**.
> **Codex must not guess them.** Obtain them from Swiggy directly (`builders@swiggy.in`).

**Bearing on Thuna:** the multi-tenant path is a 4+ week commercial process. It is not a hackathon
path. Thuna should assume the direct developer flow (one account, one user) for any near-term work,
and treat delegated auth as a genuine product milestone requiring a signed partnership.

---

## 6. Redirect URI rules (verified)

- **HTTPS required**, except `http://localhost` for local development
- Must **match an allowlist exactly** (exact-match, per the go-live checklist)
- Custom schemes permitted for known clients
- **"No open redirects"**

Go-live checklist: "every URL your OAuth flow might redirect to is allowlisted (exact-match)."

---

## 7. Local development vs production access (verified)

### Local development — no approval needed
The developer quickstart's steps 1–5 operate on `http://localhost` "without needing access approval,
allowing developers to build and test freely."

### Staging — issued during application review
> "Staging access at `mcp-staging.swiggy.com/{server}` - same shape as production, backed by seeded
> data (**no real orders**)."

### Production — invite-based
> "Production access is invite-based today."

Granted only after "staging integration runs green for ≥ 48 hours."

Application (`/builders/access/`) requires: integration name and organization, OAuth redirect URIs
(HTTPS; localhost allowed for dev), target servers, expected volume/QPS, use case, primary contact,
and a demo video link ("Include a video demo for fastest approval").

Approval criteria: a concrete use case with genuine end users; "alignment with Swiggy's consumer
experience"; technical readiness and responsible traffic patterns; security baseline (HTTPS URIs,
minimal PII storage).

Turnaround: developers get staging during review, production after staging validation. Enterprises:
"typically 4+ weeks."

**Rollout requirement:** "traffic ramps 1% → 10% → 50% → 100% over at least 24 hours."

### Recommended posture for Thuna

| Phase | Target | Real orders? |
|---|---|---|
| Now (this package) | `localhost` OAuth → read-only probes | **No** |
| After staging credentials | `mcp-staging.swiggy.com/food` | **No** — seeded data |
| After production approval + ≥48h green staging | `mcp.swiggy.com/food` | Yes, flag-gated |

Thuna should not attempt production until it has a real user base to justify the application.

---

## 8. Token storage (verified requirements)

From the authenticate page:
- **Never** "log tokens to disk in plaintext"
- **Never** "send tokens over non-HTTPS transports"
- Store tokens **"in memory or secure OS storage"**

From data & compliance:
- "TLS 1.2+ everywhere (HSTS enforced)"; AES-256 at rest on persistent stores
- "Hash user identifiers at rest unless legally required otherwise"
- "Log session IDs for debugging, not full request/response bodies in plaintext"

### Rules adopted for this package

1. Tokens live **in memory only** by default in `experiments/swiggy-mcp/`.
2. Optional dev-only file persistence is **opt-in**, written to a gitignored path, mode `0600`,
   and never enabled by default.
3. Every log line passes through a redactor (`src/redact.ts`) that masks tokens, codes, verifiers,
   phone numbers, addresses and coordinates.
4. `.gitignore` blocks `.tokens.json`, `*.token`, `.env` before any run happens.
5. **No token, code or verifier is ever committed.** Verified at commit time.

---

## 9. Privacy / DPDP (verified)

- **Swiggy is the Data Fiduciary.** "The MCP layer exposes only data already covered by" existing
  consent. Consent given at Swiggy signup "doesn't expand through the integration layer."
- **Residency:** AWS Mumbai (`ap-south-1`), failover Singapore. "No user data leaves the
  India/Singapore region boundary." Processing responses outside that boundary requires a signed DPA
  and Standard Contractual Clauses.
- **All tool call content is PII** under DPDP — "identifiers, addresses, cart items, order status."
- Partners may **not** use Swiggy-originated data for "analytics, training, or advertising" without
  explicit user consent.
- "Avoid persisting user PII beyond the current session."
- Honour deletion requests by purging derived data when users delete accounts.
- Swiggy retains audit logs keyed by session ID for **90 days**.

### Direct collisions with Thuna's memory model

Thuna stores a previous food order and preferred address, and
`lib/skills/order-food.ts` restores a `usualOrder` preference. That is one of the
product's central capabilities: the elder says "the usual" and it works.

Under DPDP, a Swiggy-sourced address or order **is PII**, and the guidance is to avoid persisting it
beyond the session. Two things follow:

1. **Never persist Swiggy-derived PII into Thuna's own memory store.** Store a *reference*
   (`addressId`) or, better, re-fetch via `get_addresses` each session. Do not copy the address text.
2. **The simulated `usualOrder` is unaffected.** It is Thuna's own data about a Thuna simulation, not
   Swiggy-originated. It stays exactly as it is.

`docs/companion/MEMORY_MODEL.md` encodes this as the distinction between **elder-owned** memory
(Thuna's, persistable) and **provider-sourced** data (transient, re-fetched, never copied).

---

## 10. Observability (verified)

- "Every tool call is tagged with a session id that flows across Swiggy's services."
- Go-live requires "session id logged on every call."
- Recommended log fields: timestamp, event type, tool name, **user hash (SHA256)**, session ID,
  latency, status.
- Metrics: tool latency p50/p95/p99, success rate, 4xx/5xx rates, OAuth refresh frequency.
- **PII rule:** "Hash user IDs at rest unless you have a specific DPDP-compliant reason."
- Monitor the `_meta.swiggy.deprecation` field for deprecation notices.
- Escalation: `builders@swiggy.in` with failing session IDs and timestamps.

---

## 11. Security checklist for Codex

Before any real Swiggy call from Thuna:

- [ ] No token/code/verifier committed to git
- [ ] Tokens in memory or `0600` gitignored file only; never plaintext logs
- [ ] All logging passes a redactor
- [ ] Redirect URIs HTTPS (or `localhost`), exact-match allowlisted
- [ ] PKCE S256; verifier 32 random bytes; code exchanged within 120 s
- [ ] 401 branch re-runs OAuth, never retries the same token
- [ ] **Client-side allowlist blocks mutating tools** — the scope model will not do this for you (§4)
- [ ] `place_food_order` gated behind `THUNA_ENABLE_REAL_SWIGGY_ORDER=true` **and** explicit user intent
- [ ] Order placement uses check-then-retry, never blind retry
- [ ] Confirmation built from a **freshly fetched** server cart
- [ ] Cart total checked `>= 1000` before placement
- [ ] Swiggy-derived PII not persisted into Thuna memory (§9)
- [ ] Session ID logged per call; user IDs hashed at rest
- [ ] Pre-AI OTP/PIN/CVV refusal (`quickCheck`) still fires first — unchanged
