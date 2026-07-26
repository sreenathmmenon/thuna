# Continuity Companion Integration Status

## Release scope

This release adds credential-free continuity capabilities to the full Thuna product without
changing the existing task engine, session contracts, memory document, routine lifecycle, or
provider behavior.

The implementation is additive:

- `lib/continuity/` owns candidate intake, life events, pending promises, reminders, daily briefs,
  consent history, family-attention requests, and interruption/resume contracts.
- `data/thuna-continuity.json` is a separate versioned store. Existing memory is not migrated.
- `/api/continuity` exposes deterministic operations to the product UI.
- `ContinuityView` adds mobile controls for remembering, reviewing, correcting, confirming, and
  completing continuity records.

## Claude contracts adapted

| Claude design | Production adaptation |
|---|---|
| `LifeEvent` candidate and lifecycle | Unconfirmed facts live in transient `InboxCandidate` records. Only elder-confirmed records enter the additive `LifeEvent` store. |
| Field provenance and correction | Every candidate field carries source, confidence, status, and correction metadata. Confirmed corrections create a superseding record and cancel stale reminders. |
| Declarative reminder policy | Event types map to data-driven reminder rules; wedding and bill schedules are included. Quiet hours are applied when reminders are materialized. |
| `PendingLoop` | Implemented as a separate registry with stated triggers, due time, snooze, completion, cancellation, sharing scope, and append-only history. |
| Universal inbox | Deterministically classifies task, life event, routine, bill, pending promise, family request, question, and unsupported input. |
| Confirmation before memory | Reuses production `isConfirmation()`. Silence, uncertainty, and vague responses do not persist or complete records. |
| Daily life brief | Aggregates confirmed life events, bills, deliveries, routines, family commitments, family requests, and pending promises; deduplicates, prioritizes, caps output, and respects quiet hours. |
| Family request lifecycle | Implements `REQUESTED → OFFERED → ACCEPTED → SCHEDULED → COMPLETED → ELDER_CONFIRMED`. |
| Interruption and resume | Preserves confirmed fields, the pending question, and next safe step; web-to-phone resume requires a fresh read-back and invalidates stale confirmation. |
| Document intake seam | A credential-free `DocumentInputAdapter` interface is present; no media transport or extraction provider is invoked. |

## Production interfaces preserved

- `lib/engine.ts`, `lib/command-parser.ts`, `lib/router.ts`, and `lib/session-store.ts` are unchanged.
- The production channel adapter is unchanged. Phone continuity is contract-level only.
- The production notification adapter remains the single notification port. It received optional,
  backward-compatible category, contact, approval, and minimum-disclosure fields.
- A family-content offer also passes through the existing trusted-contact consent service, so both
  the standing notification grant and the new per-category grant must be present.
- The routine service remains the source for existing proactive routines and is read by the daily
  brief through its public `list()` method.
- The existing version-1 memory document and APIs are unchanged.
- All external task actions remain simulated.

## Drafts retained as documentation, not runtime contracts

- The draft `ChannelAdapter` is incompatible with the existing in-app routine channel and would
  duplicate its name and lifecycle.
- The draft `NotificationAdapter` duplicates production consent and delivery abstractions. Its
  category and minimum-disclosure reasoning were adapted additively instead.
- The draft `PreparedAction` and generic service-capability registry overlap the governed task
  engine and were not introduced.
- The draft life-event storage port was not copied into runtime. Its lifecycle, query, provenance,
  and scheduling semantics were adapted to production naming and storage style.
- The draft universal `MemoryRecord` envelope would require a destructive migration of working
  memory. Continuity data therefore uses a separate additive versioned store.
- Calendar, grocery, dining, ride, and external provider adapters remain documentation-only.

## Safety behavior

- Candidate facts are never durable before elder confirmation.
- Correcting one field preserves every other confirmed field.
- Confirmed corrections supersede the old event and invalidate its reminders.
- Silence never marks a bill paid, a promise complete, or a family follow-up elder-confirmed.
- Family content uses `CONSENTED_FAMILY_CONTENT`, per-contact explicit consent, minimum disclosure,
  and append-only consent history.
- Scheduled daily briefs are off by default. Quiet-hours briefs defer; an elder-requested
  on-demand brief remains available.
- Family attention reuses the existing demo notification adapter and remains simulated in this
  release.

## Documentation-only or adapter-only capabilities

- Sarvam Vision document/image extraction
- Live Swiggy MCP transport
- Exotel or Twilio outbound calling
- Ride-provider access
- Family story loops
- Adaptive guidance

No provider credentials or live provider calls were added in this release.

## Validation

- `npx tsc --noEmit`: passed
- `npm test`: 107/107 passed across 9 test files
- `npm run build`: passed; `/api/continuity` is included as a dynamic production route
- Existing tests preserved: 83/83
- New continuity tests: 24/24
- Terminology scan: passed
- Credential and private-key pattern scan: passed
