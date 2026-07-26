# Thuna — Mobile State Map

> Design specification. **Changes no production code.**
>
> One map connecting production contracts to screens. This is the file GLM should keep open while
> wiring `lib/client-api.ts`.
>
> ⚠️ **Contract names marked ⚠️ must be verified against the latest production release.** Codex is
> actively implementing the companion runtime and may rename fields. Every ⚠️ name below was read
> from the repository at the time of writing, or is a *proposed* name that does not yet exist.

---

## 1. How to read this

The UI never invents state. Every screen is a rendering of something the engine already returns.

```
utterance ──► engine ──► EngineResult ──► client-api ──► ViewModel ──► screen
                              │
                              └── the UI reads this. It never computes engine state itself.
```

**Rule:** if a screen needs information the engine does not return, that is a contract gap to raise
with Codex — not a value for the UI to derive. A UI that computes its own totals or its own
completion state will eventually disagree with the engine, and the elder will be told something
untrue.

---

## 2. Verified contract surface (read from `lib/types.ts`)

These exist in production **today** and are safe to rely on.

### 2.1 `EngineAction` — 9 values ✅ verified

| Value | Meaning | Screen / view |
|---|---|---|
| `route` | Routing to a skill | Understanding |
| `ask` | Asking for a field | Task screen — instruction |
| `confirm` | Awaiting explicit yes | **ConfirmationScreen** (full-screen) |
| `complete` | Task done | CompletionReceipt |
| `refuse` | Refused (safety/unsupported) | SafetyWarning **or** Unsupported |
| `handoff` | Handing to a human / paused | FamilyHandoff **or** Paused |
| `repeat_slowly` | Repeat at slow pace | Task screen — same step, slow |
| `answer_question` | Contextual answer mid-task | GuidanceCard — answer, task retained |
| `go_back` | Step back | Task screen — previous step |

> `refuse` and `handoff` are each overloaded across two very different screens. Disambiguate:
> `refuse` → SafetyWarning when a risk pattern fired, Unsupported otherwise.
> `handoff` → Paused when `screen.status === 'paused'`, FamilyHandoff when `'handedoff'`.

### 2.2 `ScreenState.status` — 6 values ✅ verified

`idle` · `awaiting_confirmation` · `done` · `refused` · `paused` · `handedoff`

### 2.3 Other verified fields ✅

| Field | Type | UI use |
|---|---|---|
| `EngineResponse.speak` | `string?` | **Must also be shown as text** (hearing support) |
| `EngineResponse.screen` | `ScreenState?` | Drives the view |
| `EngineResponse.skillId` | `string?` | Which task screen |
| `EngineResponse.clearMic` | `boolean?` | Reset mic UI |
| `ScreenState.step` | `string?` | Progress within a task |
| `ScreenState.fields` | `Record<string, unknown>` | TaskSummary rows |
| `ScreenState.deliveryFee` | `number?` | Fee row |
| `ScreenState.total` | `number?` | Total row — **display, never recompute** |
| `SessionCtx.pace` | `'normal' \| 'slow'` | Slow-pace indicator |
| `SessionCtx.awaitingConfirmation` | `boolean` | Confirmation gate |
| `SessionCtx.correctionHistory` | `string[]` | Inspector only — **never elder UI** |
| `SimulatedReceipt.simulated` | `true` | **SIMULATED badge** |
| `EngineEvent[]` | — | Inspector only — **never elder UI** |

### 2.4 Task skills ✅ verified

`ORDER_FOOD`, `PHONE_HELP`, `SEND_PAYMENT` exist in `lib/skills/registry.ts`.
`TRACK_ORDER`, `GENERAL_HELP` are planned — GLM must handle an unknown `skillId` gracefully via the
generic task schema rather than crashing.

---

## 3. Proposed surface — ⚠️ VERIFY ALL OF THIS

None of the following exists in `lib/types.ts` today. It comes from the companion design docs and
Codex may name it differently. **GLM must check the latest release before binding.**

| Concept | Proposed name | Source doc | Risk |
|---|---|---|---|
| Voice pipeline state | ⚠️ `VoiceState` | `VOICE_INTERACTION_STATES.md` | Likely UI-only — GLM may own it |
| Routine record | ⚠️ `Routine`, `RoutineState` | `ROUTINE_ENGINE.md` | 8 states — high confidence, name may differ |
| Life event | ⚠️ `LifeEvent`, `LifeEventState` | `LIFE_EVENT_SCHEMA.md` | 11 states |
| Pending loop | ⚠️ `PendingLoop`, `LoopState` | `PENDING_LOOPS.md` | 8 states |
| Prepared action | ⚠️ `PreparedAction` | `docs/contracts/prepared-action.ts` | Draft contract |
| Memory item | ⚠️ `MemoryRecord` | `COMPANION_MEMORY_SCHEMA.md` | UI needs a *plain-language projection*, not the record |
| Consent grant | ⚠️ `ConsentGrant` | `notification-adapter.ts` | Draft |
| Daily brief | ⚠️ `DailyBrief`, `BriefItem` | `DAILY_LIFE_BRIEF.md` | May be assembled client-side |
| Risk signal | ⚠️ `RiskSignal` | `RISK_SIGNAL_MODEL.md` | 13 signals |

### Verification procedure for GLM

```bash
# Before writing any binding code:
cat lib/types.ts
ls lib/routines/ lib/life-events/ lib/memory/ lib/loops/ 2>/dev/null
grep -rn "export type\|export interface" lib/ | grep -iE "routine|event|loop|memory|consent|brief"
```

Then fill in §9. **If a name differs, change `lib/client-api.ts` — never the engine.**

---

## 4. Master map — session status → screen

| Session status | `EngineAction` | `screen.status` | View | Primary actions | Safety | Confirm | Error |
|---|---|---|---|---|---|---|---|
| No session | — | `idle` | **Home** | Talk · context items | none | none | none |
| Routing | `route` | `idle` | Understanding | Stop | none | none | none |
| Asking | `ask` | `idle` | Task screen | answer · Stop/Wait/Repeat | none | none | none |
| Answering a question | `answer_question` | `idle` | GuidanceCard + task | continue · Stop/Wait/Repeat | none | none | none |
| Stepping back | `go_back` | `idle` | Task screen (prev) | as above | none | none | none |
| Slow repeat | `repeat_slowly` | `idle` | Task screen (slow) | as above | none | none | none |
| **Awaiting confirmation** | `confirm` | `awaiting_confirmation` | **ConfirmationScreen** | Yes · Change · Cancel | none | **PENDING** | none |
| Done | `complete` | `done` | CompletionReceipt | Home · Talk again | none | consumed | none |
| Refused — risk | `refuse` | `refused` | **SafetyWarning** | Understand · Ask person · Stop | **ACTIVE** | none | none |
| Refused — unsupported | `refuse` | `refused` | Unsupported | Talk again · Ask person | none | none | none |
| Paused | `handoff` | `paused` | Paused | Continue · Stop | none | **void** | none |
| Handed off | `handoff` | `handedoff` | FamilyHandoff | Ask X · Keep private | none | none | none |
| Voice failure | — | any | ErrorRecovery | Try again · Type · Stop | none | preserved | **ACTIVE** |
| Offline | — | any | OfflineBanner + view | Retry · Type | none | **void** | **ACTIVE** |

---

## 5. Confirmation state — the highest-stakes mapping

Confirmation is not a boolean in the UI. It is a small state machine, because an elder must only ever
be held to a *specific* thing they agreed to.

```
NONE ──► PENDING ──► CONFIRMED ──► CONSUMED
           │  ▲          │
           │  └── VOID ◄─┘   (state changed, expired, corrected, channel changed, connection lost)
           └────────────────►
```

| State | Trigger | UI |
|---|---|---|
| `NONE` | Normal guidance | Task screen |
| `PENDING` | `awaitingConfirmation === true` | **Full-screen ConfirmationScreen**, visually distinct |
| `VOID` | Correction, total change, expiry, reconnect, channel change | "This changed while you were deciding" → re-read-back |
| `CONFIRMED` | Explicit yes | Brief acknowledgement |
| `CONSUMED` | Executed | CompletionReceipt |

**Rules the UI must enforce:**

1. Only an explicit affirmative confirms. Silence, timeout, backgrounding and dismissal never do.
2. Any correction voids a pending confirmation — re-render the read-back with the new value.
3. A void confirmation is **never** silently re-shown as valid. Say what changed.
4. ⚠️ For `PreparedAction`, show expiry calmly — never a pressure countdown.
5. After reconnect, a confirmation pending before the drop is **void**. Re-read it back.

> This mirrors the engine: `advanceOrConfirm()` re-derives the read-back after every correction, and
> `isConfirmation()` refuses anything vague. The UI must not be more permissive than the engine.

---

## 6. Safety state

| Safety state | Trigger | UI | Blocking? |
|---|---|---|---|
| `CLEAR` | Normal | none | no |
| `PAUSED_FOR_RISK` | ⚠️ risk signal fired pre-model | **SafetyWarning** | **yes** |
| `REFUSED` | Credential request | SafetyWarning, refusal stated | **yes** |
| `HANDOFF_OFFERED` | After refusal | FamilyHandoff option inline | no |

Safety **pre-empts everything**, including a pending confirmation. It renders over the current view
and cannot be dismissed by tapping outside. ✅ `quickCheck()` in `lib/router.ts` fires before any
model call — the UI must not add a path that reaches a model first.

---

## 7. Error state

| Error | Detect | UI | Progress kept? |
|---|---|---|---|
| Mic denied | Permission API | Mic-denied recovery | yes |
| STT failure | ⚠️ STT route error | "I could not hear that clearly" | yes |
| TTS failure | ⚠️ TTS route error | Text-only, continue silently | yes |
| Offline | `navigator.onLine` | OfflineBanner | yes |
| Interrupted mid-task | Request failure | "Continue from where we stopped" | yes |
| Provider `UNKNOWN` | ⚠️ `PlacementStatus` | "Let me check whether that went through" | yes |
| Session expired | ⚠️ session TTL | Fresh start, offer restore | partial |
| Repeated failure (3×) | client counter | Offer a human | yes |

**Never** show a status code, stack trace, or engine identifier. **Always** offer a next action.

The `UNKNOWN` case deserves care: the elder must be told Thuna is *checking*, and nothing definitive
until reconciliation returns. Saying "it failed" when it succeeded produces a duplicate order.

---

## 8. Screen inventory

| Screen | Route | Spec |
|---|---|---|
| Home | `/` | `ELDER_HOME_SCREEN.md` |
| Talk | `/talk` | `VOICE_INTERACTION_STATES.md` |
| Reminders | `/reminders` | `ROUTINE_AND_CHECKIN_SCREENS.md` |
| Task | inline on `/talk` | `TASK_SCREEN_SYSTEM.md` |
| Confirmation | full-screen overlay | `SAFETY_AND_CONFIRMATION_SCREENS.md` |
| Safety | full-screen overlay | `SAFETY_AND_CONFIRMATION_SCREENS.md` |
| Completion | inline | `TASK_SCREEN_SYSTEM.md` |
| Life event | `/remember` | `LIFE_EVENTS_AND_REMEMBER_THIS.md` |
| Daily brief | `/brief` | `DAILY_BRIEF_SCREEN.md` |
| Family handoff | modal | `FAMILY_HANDOFF_SCREEN.md` |
| Memory & privacy | `/memory` | `MEMORY_AND_PRIVACY_SCREEN.md` |
| Error recovery | inline | `ERROR_AND_RECOVERY_STATES.md` |
| **Demo Inspector** | `/inspector` | **hidden — never elder-facing** |

---

## 9. Verification table — GLM fills this in

| Assumed | Actual (verify) | OK? | Fix |
|---|---|---|---|
| `EngineAction` 9 values | | | |
| `ScreenState.status` 6 values | | | |
| `EngineResponse.speak/screen/skillId/clearMic` | | | |
| `ScreenState.total` / `deliveryFee` | | | |
| `SessionCtx.pace` / `awaitingConfirmation` | | | |
| `SimulatedReceipt.simulated` | | | |
| ⚠️ Routine type + 8 states | | | |
| ⚠️ LifeEvent type + states | | | |
| ⚠️ PendingLoop type | | | |
| ⚠️ PreparedAction | | | |
| ⚠️ Memory projection | | | |
| ⚠️ Daily brief | | | |
| ⚠️ Risk signal | | | |
| ⚠️ Voice route shapes | | | |

**If a row fails, adapt `lib/client-api.ts`. Never change the engine to fit the UI.**

---

## 10. Implementation notes for GLM

1. **One adapter layer.** All engine→UI translation lives in `lib/client-api.ts`. Components receive
   UI-shaped props and never import engine types directly. When Codex renames a field, one file changes.
2. **Never derive engine state.** Do not compute totals, completion, or confirmation validity.
3. **`speak` is also text.** Everything spoken must be visible — hearing support is non-negotiable.
4. **Inspector data never leaks.** `correctionHistory` and `EngineEvent[]` are debug-only.
5. **Unknown `skillId` degrades gracefully** to the generic task schema.
6. **Void confirmations loudly.** Silent revalidation is the dangerous failure here.

---

## Related

- `COMPONENT_SPECIFICATION.md` · `VOICE_INTERACTION_STATES.md` · `TASK_SCREEN_SYSTEM.md`
- `SAFETY_AND_CONFIRMATION_SCREENS.md` · `ERROR_AND_RECOVERY_STATES.md`
- `GLM_MOBILE_IMPLEMENTATION_PROMPT.md`
