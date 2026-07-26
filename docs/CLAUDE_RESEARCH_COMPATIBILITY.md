# Claude Research Compatibility

## Comparison baseline

Compared Claude's research worktree with the current product release at `b2b88a3`, which contains the supplied release commit `95962fc` plus the terminology-only follow-up commit.

## Exact matches

No Claude TypeScript draft is an exact production-interface match that can be copied into `lib/` unchanged.

The following safety vocabulary and behavior match exactly:

- Routine states: `SCHEDULED`, `DUE`, `ACTIVE`, `SNOOZED`, `COMPLETED`, `MISSED`, `ESCALATED`, and `CANCELLED`.
- Silence is never confirmation or completion.
- Explicit confirmation is required after the latest correction.
- Every deterministic transition produces history.
- OTP, PIN, and CVV refusal occurs before model-directed state changes.
- Simulated external actions remain explicitly labelled.

## Semantic matches with different names

| Claude draft | Current production interface | Compatibility |
|---|---|---|
| `PreparedAction.authoritative` | `ScreenState.fields`, `deliveryFee`, and `total` | Same review-before-confirm purpose; production is deliberately task-specific and synchronous. |
| `ActionConfirmation` / `ConfirmationToken` | `SessionCtx.awaitingConfirmation` plus deterministic `isConfirmation()` | Same explicit-confirmation invariant; draft adds provider revision binding and expiry. |
| `PreparedActionEvent` | `EngineEvent` and routine history | Same append-only audit intent; different lifecycle owners. |
| Draft `NotificationPayload` | `FamilyNotification` | Same factual family-message purpose; production consent is enforced by the memory and routine services. |
| Draft channel session lifecycle | Production `ChannelDelivery` and routine state | Same delivery-versus-completion distinction; production keeps transport intentionally smaller. |
| Draft food `CartSnapshot` | Production food screen and order fields | Same elder-facing order summary; only a provider adapter needs authoritative cart semantics. |

## Incompatible drafts

- `docs/contracts/channel-adapter.ts` has the same `ChannelAdapter` name as production but a different session-oriented method set. Replacing the production interface would break the routine channel implementation.
- `docs/contracts/notification-adapter.ts` has the same `NotificationAdapter` and `NotificationResult` names but incompatible capabilities, consent, send, and audit methods. Production already enforces consent through its memory and routine services.
- `docs/contracts/prepared-action.ts` and `service-capability-adapter.ts` introduce a second cross-capability state machine. They are useful research but are not replacements for `SessionState`, `EngineResult`, governed skills, or the routine engine.
- Grocery, dining, and ride adapters are outside the current product release and must remain documentation-only.
- Claude's expanded companion memory schemas are broader than the persisted production `ThunaMemoryDocument` version 1. Importing them into runtime would be a storage-contract migration and a product redesign.

## Duplicate abstractions

- Confirmation and correction invalidation already belong to the deterministic engine.
- Routine lifecycle, missed-response handling, consented family handoff, channel delivery, and notification results already have production implementations.
- The generic `ServiceCapabilityAdapter` registry overlaps the governed skill registry without adding value to the current food-only provider seam.
- `PreparedActionStore` duplicates the production pattern of a pure transition decision plus one state committer.

## Missing production extension points

Production did not have a provider-neutral food-commerce port. A future provider also needs:

- a fresh authoritative cart read before confirmation and execution;
- confirmation bound to the cart revision and presented total;
- a three-state execution result with mandatory reconciliation metadata for an unknown outcome;
- a configuration boundary that defaults to the simulated provider integration;
- a Swiggy implementation boundary that cannot place a live order without both configuration and explicit user intent.

The current synchronous `SkillHandler.readback()` is not suitable for a live provider fetch. The safe current-release change is therefore an additive adapter seam and mock, without changing the green engine or `ORDER_FOOD` flow.

## Likely merge conflicts

- Additive `docs/integrations/`, `docs/companion/`, `docs/contracts/`, and `experiments/swiggy-mcp/` paths have no production path conflicts.
- `.env.example` has a low-risk additive conflict.
- `lib/adapters/` is new and has no path conflict.
- Directly copying Claude drafts into `lib/types.ts`, `lib/channels/types.ts`, `lib/notifications/types.ts`, or `lib/routines/types.ts` would create semantic and naming conflicts.
- Wiring asynchronous provider reads into `lib/skills/order-food.ts` would conflict with its synchronous contract and risk changing the existing simulated flow, so it is intentionally deferred.
