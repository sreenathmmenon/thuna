# Thuna documentation index

This directory contains the product, architecture, provider, safety, design,
deployment, and validation documentation for the current Thuna release.

## Start here

- [`FEATURE_MATRIX.md`](FEATURE_MATRIX.md) — implemented capabilities and real,
  simulated, disabled, or interface-only boundaries.
- [`RUNBOOK.md`](RUNBOOK.md) — installation, local operation, fallback behavior,
  and recovery.
- [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) — governed product demonstration.
- [`CONTINUITY_COMPANION_INTEGRATION_STATUS.md`](CONTINUITY_COMPANION_INTEGRATION_STATUS.md)
  — life events, pending promises, universal intake, daily brief, consent, and
  interruption/resume status.
- [`PRODUCTION_ELDER_COMPANION.md`](PRODUCTION_ELDER_COMPANION.md) — proactive
  device-alert, no-response, optional phone-call, voice-outcome, and mobile
  reliability boundaries.

## Swiggy Food MCP

- [`SWIGGY_REAL_INTEGRATION.md`](SWIGGY_REAL_INTEGRATION.md) — production MCP
  client and food flow.
- [`SWIGGY_OAUTH_RUNBOOK.md`](SWIGGY_OAUTH_RUNBOOK.md) — OAuth 2.1 with PKCE,
  localhost callback, disconnect, and recovery.
- [`SWIGGY_PROVIDER_BOUNDARY.md`](SWIGGY_PROVIDER_BOUNDARY.md) — security,
  credential storage, confirmation, ambiguity, and placement boundaries.
- [`SWIGGY_LIVE_VALIDATION_REPORT.md`](SWIGGY_LIVE_VALIDATION_REPORT.md) —
  redacted real-provider evidence.
- [`SWIGGY_INTEGRATION_STATUS.md`](SWIGGY_INTEGRATION_STATUS.md) — current
  implementation status.
- [`integrations/`](integrations/) — official-provider research and integration
  design.
- [`contracts/`](contracts/) — research contract drafts; these do not replace
  final runtime contracts.

## Railway

- [`RAILWAY_DEPLOYMENT.md`](RAILWAY_DEPLOYMENT.md) — service, build, volume,
  healthcheck, domain, and operations.
- [`RAILWAY_ENVIRONMENT.md`](RAILWAY_ENVIRONMENT.md) — variables and secret
  classification.
- [`RAILWAY_VALIDATION_REPORT.md`](RAILWAY_VALIDATION_REPORT.md) — deployment
  and quality-gate evidence.
- [`RAILWAY_POST_MERGE_CHECKLIST.md`](RAILWAY_POST_MERGE_CHECKLIST.md) —
  post-deployment verification.

Public product: https://thuna-production.up.railway.app/

## Companion and mobile design

- [`companion/`](companion/) — continuity, consent, memory, quiet hours,
  handoff, and future-provider design.
- [`mobile-ui/`](mobile-ui/) — elder-first mobile interaction and accessibility
  specifications.
- [`LIFE_EVENTS_DEMO_SCRIPT.md`](LIFE_EVENTS_DEMO_SCRIPT.md) — life-event and
  bill-reminder demonstration.

## Status interpretation

Documentation distinguishes:

- **Real** — calls or state handled by the implemented product or an
  authenticated provider.
- **Simulated provider integration** — governed product behavior without a live
  external write.
- **Disabled** — implemented boundary deliberately switched off by a safety
  flag.
- **Interface-only** — contract/design present without runtime provider access.
- **Documentation-only** — research or future design isolated from production.

Do not infer that localhost provider credentials are present on Railway. OAuth
credentials are environment-specific and are never copied through Git.
