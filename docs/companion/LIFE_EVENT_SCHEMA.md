# Thuna — LifeEvent Schema

> Design document. **Changes no production code.**
>
> This file is the **single definition** of the `LifeEvent` record. Every other document references
> it and none redefine it. If a field is not described here, it does not exist.

---

## 1. Where `LifeEvent` sits

A `LifeEvent` is stored as a **`MemoryRecord`** — the canonical envelope defined elsewhere in the
memory layer. This document defines only the `LifeEvent` payload that the envelope carries.

The envelope (canonical, **do not redefine**) provides:

```
id, category, source, evidence, confidence, consentScope,
createdAt, updatedAt, expiresAt?, supersededBy?, sharingClass, deletionState
```

`sharingClass` ∈ `PRIVATE` | `SHAREABLE_WITH_CONSENT` | `ELDER_INITIATED`.

Mapping rules:

| Envelope field | For a `LifeEvent` |
|---|---|
| `category` | Routine-adjacent: a confirmed life event is a **commitment**, not an episode. Store as the memory layer's commitment/routine category; its *occurrences* are episodic. |
| `source` | Record-level origin: `ELDER_SPEECH`, `IMAGE_INVITATION`, `IMAGE_BILL`, `IMAGE_SLIP`, `TEXT_MESSAGE`, `FAMILY_ENTRY`, `FORWARDED_CONTENT` |
| `evidence` | Pointer to the input artefact (image handle, message handle) — never the raw image bytes in memory |
| `confidence` | **Record-level** confidence. Per-field confidence lives in `fields[]` (§4) and is strictly more important |
| `consentScope` | Who, if anyone, this event may be mentioned to |
| `expiresAt` | Set on archival (§8), not on creation for `CONFIRMED` events |
| `supersededBy` | Used when an event is replaced (postponed wedding → new record) |
| `sharingClass` | Defaults to `PRIVATE` for every type. A wedding is not automatically family news. |
| `deletionState` | Elder-initiated deletion is absolute (`MEMORY_MODEL.md` §6) |

**Record-level `confidence` never gates behaviour on its own.** Extraction decisions are made from
per-field confidence, because "I'm sure about the venue and unsure about the date" is the normal
case, and a single averaged number destroys exactly that information.

---

## 2. The `LifeEvent` payload

```
LifeEvent {
  lifeEventId          string
  type                 LifeEventType            // registry key — see LIFE_EVENTS_ENGINE.md §2
  state                LifeEventState           // §3
  title                string                   // elder-facing, elder's own words where possible
  fields               FieldValue[]             // §4 — the whole substance of the event
  recurrence           RecurrenceRule?          // §6 — only BIRTHDAY / ANNIVERSARY by default
  reminderPlan         ReminderOccurrence[]     // materialised at CONFIRMED; REMINDER_POLICY_ENGINE.md
  offers               OfferKind[]              // §7 — what help Thuna may offer, never performs unasked
  completionRule       ATTENDANCE_ASKED | EXPLICIT_CONFIRMATION | EXTERNAL_VERIFICATION | NONE
  completion           CompletionRecord?        // §5 — how it completed, never inferred
  linkedLoopIds        string[]                 // PendingLoops spawned from this event (PENDING_LOOPS.md)
  linkedRoutineIds     string[]                 // routines spawned from this event (ROUTINE_ENGINE.md)
  readbackCount        number                   // how many times it has been read back unresolved
  snoozeCount          number                   // per current occurrence; bounded
  cancelledReason      ELDER_REJECTED | ELDER_CANCELLED | EVENT_CALLED_OFF | SUPERSEDED | DRAFT_EXPIRED ?
  history              LifeEventTransition[]    // bounded; every state change
}
```

Deliberately **absent**:

- No `priority` / `importance` score. Thuna does not rank an elder's life.
- No `attendanceLikelihood`, `riskScore`, or any predicted field. No inference.
- No `notes` free-text blob — free text is where un-schema'd, unreviewable claims accumulate.
- No `emotionalSignificance`. Prohibited by `MEMORY_MODEL.md` §9.

---

## 3. `LifeEventState`

```
DRAFT | NEEDS_CONFIRMATION | CONFIRMED | UPCOMING | DUE | ACTIVE |
COMPLETED | SNOOZED | MISSED | CANCELLED | ESCALATED
```

Transitions are owned by `LIFE_EVENTS_ENGINE.md` §3–§5 and are not restated here. Two notes that
belong with the schema:

- `DRAFT` and `NEEDS_CONFIRMATION` records are **not** part of "what Thuna remembers about me" when
  the elder asks (`MEMORY_MODEL.md` §6) — they are candidates, and reading back unconfirmed guesses
  as memory would misrepresent what Thuna knows. They *are* listed if the elder asks "what are you
  still asking me about?"
- `DUE`, `ACTIVE`, `SNOOZED` and `MISSED` describe the **current reminder occurrence**, not the event
  as a whole. An event with three reminders passes through them up to three times. `history` records
  each pass.

---

## 4. `FieldValue` — provenance on every field

This is the most important structure in the document.

```
FieldValue {
  key            string          // "date", "time", "venue", "people", "amount", "provider", ...
  value          string | number | Date | PersonRef[] | null
  unit           string?         // "INR" for amounts; never inferred
  source         FieldSource     // ELDER_SPEECH | IMAGE_INVITATION | IMAGE_BILL | IMAGE_SLIP |
                                 // TEXT_MESSAGE | FAMILY_ENTRY | FORWARDED_CONTENT | DERIVED
  extractedFrom  string?         // human-readable locus: "the line under the names"
  rawText        string?         // the exact source substring, for readback honesty
  confidence     number          // 0..1, per field
  status         EXTRACTED | CONFIRMED | CORRECTED | UNKNOWN_ASKED | UNKNOWN_ACCEPTED
  correctedFrom  string?         // prior value, on correction
  correctedAt    Date?
}
```

### Why per-field provenance exists

So Thuna can say the sentence that makes it trustworthy:

> "I read this from the invitation — the wedding is on the twelfth, at the Town Hall.
>  Is that right?"

and, after a correction:

> "Saturday the eleventh, then. The Town Hall part is still what I read from the invitation."

A record-level source cannot produce the second sentence. That is the whole argument.

### Correction rule

A correction rewrites **only the corrected field's** `value`, `source`, `confidence`, `status`,
`correctedFrom` and `correctedAt`. Every other `FieldValue` is untouched, including its `source`.
This mirrors `lib/engine.ts`, where *"wait, plain dosa"* changes the item and leaves the restaurant
and address alone, and `MEMORY_MODEL.md` §8's targeted-correction rule.

### `status` values

| Status | Meaning |
|---|---|
| `EXTRACTED` | Model's reading; not yet confirmed by the elder |
| `CONFIRMED` | Elder said yes to this value |
| `CORRECTED` | Elder replaced it; `correctedFrom` holds the prior |
| `UNKNOWN_ASKED` | Extraction failed or was too low-confidence; Thuna asked |
| `UNKNOWN_ACCEPTED` | Elder said "I don't know" / "doesn't matter" — an explicit, valid answer |

`UNKNOWN_ACCEPTED` is a real state, not a failure. An elder who does not know the wedding's exact
time should still get the event saved and a morning-of reminder. Blocking on completeness is a
software preference, not the elder's.

### Common field keys

Keys are **conventions shared across types**, not a per-type schema — which is what lets the same
reminder policy language talk about `date` for a wedding and a bill.

| Key | Types that use it | Notes |
|---|---|---|
| `date` | all | The anchor. Bills use the **due** date; renewals the **expiry** date |
| `time` | most | Often `UNKNOWN_ACCEPTED` |
| `window` | `SERVICE_VISIT`, `DELIVERY` | "between ten and one" |
| `venue` | events | Free-ish text; feeds the map offer |
| `people` | `WEDDING`, `BIRTHDAY`, `ANNIVERSARY`, `FAMILY_EVENT` | `PersonRef[]` → relationship memory |
| `relationship` | as above | "Ammini — your niece" |
| `provider` | `BILL`, `RENEWAL`, `SERVICE_VISIT` | "the electricity board" |
| `amount` | `BILL` | Always with `unit`; never rounded silently |
| `reference` | `BILL`, `DELIVERY` | **Never spoken aloud** unless asked |
| `subject` | `RENEWAL`, `APPOINTMENT` | "the insurance", "the eye doctor" |
| `origin` / `destination` | `TRAVEL` | |

No field key may be invented at extraction time. See `EVENT_EXTRACTION_POLICY.md` §6.

---

## 5. `CompletionRecord`

```
CompletionRecord {
  completedAt    Date
  method         ELDER_CONFIRMED | PROVIDER_VERIFIED | ELDER_DECLINED_TO_SAY
  utterance      string?      // the elder's own words, redacted, for auditability
  verifiedBy     string?      // adapter/provider handle, when PROVIDER_VERIFIED
}
```

There is **no** `INFERRED` method, and there is no `method` derived from time passing, message
delivery, or model output. The absence is the design.

`ELDER_DECLINED_TO_SAY` records that Thuna asked and the elder chose not to answer — which is a
complete and respected answer (`COMPANION_PRODUCT_MODEL.md` §5.5). It closes the event without
claiming the underlying thing happened. It is not `MISSED`, because Thuna did get a response.

---

## 6. `RecurrenceRule`

```
RecurrenceRule {
  kind        ANNUAL | NONE
  anchorDate  Date          // the original date
  spawnAhead  number        // days before the next occurrence a fresh event is materialised
}
```

Only `BIRTHDAY` and `ANNIVERSARY` default to `ANNUAL`. Each year materialises a **new** `LifeEvent`
in `CONFIRMED` (not `DRAFT` — the elder already confirmed the recurring fact), linked to the parent
via the envelope's `supersededBy`/parent linkage. This keeps per-year `history`, `completion` and
`snoozeCount` clean instead of an ever-growing record.

Anything more elaborate — monthly bills, quarterly renewals — is deliberately **out of scope** here.
A recurring bill is a routine (`BILL_REMINDER` in `ROUTINE_ENGINE.md` §5) that spawns a fresh
`BILL` life event when a new bill actually arrives. Modelling recurrence twice is how the two
engines drift apart.

---

## 7. `OfferKind`

What Thuna may **offer**. Offers are proposals; none is ever performed without an in-the-moment yes.

```
MAP_DIRECTIONS | ARRANGE_RIDE | GIFT_HELP | FAMILY_HELP | CALL_PROVIDER |
CALL_FAMILY | SET_FOLLOW_UP | HUMAN_HANDOFF
```

| Offer | Constraint |
|---|---|
| `MAP_DIRECTIONS` | Reads a route aloud; speaks no coordinates |
| `ARRANGE_RIDE` | Goes through the ride adapter's own confirmation; never books silently |
| `GIFT_HELP` | Suggestion and ordering assistance only; never purchases unasked |
| `FAMILY_HELP` | *Offering* to contact family still requires consent to actually contact them (`FAMILY_CONSENT_POLICY.md`) |
| `CALL_PROVIDER` | Connects; never negotiates or transacts on the elder's behalf |
| `CALL_FAMILY` | Elder-initiated only |
| `SET_FOLLOW_UP` | Creates a `PendingLoop` (`PENDING_LOOPS.md`) — itself confirmed before storage |
| `HUMAN_HANDOFF` | Always available; never a last resort |

Max three offers spoken in a turn (`CHECKIN_CONVERSATION_POLICY.md` §6). If the type spec lists more,
speak the three most useful and mention the rest only if asked.

---

## 8. Lifetime and archival

| Situation | Lifetime |
|---|---|
| `DRAFT` never read back | 7 days, then dropped with an event record |
| `NEEDS_CONFIRMATION` unresolved | Read back at most 3 times, then dropped with dignity (`FOLLOW_UP_ENGINE.md` §5) |
| `CONFIRMED` / `UPCOMING` | Until the event date + archive window |
| `COMPLETED` / `MISSED` / `CANCELLED` | Archived; `expiresAt` = date + 90 days, matching episodic outcomes in `MEMORY_MODEL.md` §6 |
| Recurring (`ANNUAL`) parent | Until cancelled |
| Correction history | 30 days (`MEMORY_MODEL.md` §6) |

The 90-day archive matters for the natural follow-up — *"Did you go to Ammini's wedding? How was it?"*
— which is only possible if the record survives the date. It should not survive into a life history.

---

## 9. Sharing

Default `sharingClass` is **`PRIVATE`** for every type, including weddings and birthdays.

This is not over-caution. A wedding an elder chose not to mention to their son is exactly the kind of
thing a "helpful" system would surface and should not. Sharing requires either a consent grant for
the relevant category or an elder-initiated request (`ELDER_INITIATED`), per
`FAMILY_CONSENT_POLICY.md`.

`BILL` events are `PRIVATE` and stay that way. Financial detail is the last thing that should leak
into a family channel by default.

---

## 10. Implementation notes for Codex

1. Model `fields` as an **array of `FieldValue`**, not a plain object. A `{ date: "2026-08-12" }`
   shape has nowhere to put provenance, and every attempt to bolt it on later ends in a parallel
   `fieldSources` map that drifts.
2. `applyCorrection(event, key, newValue, source)` should be a pure function returning a new event,
   with an assertion that exactly one `FieldValue` differs. Test that assertion.
3. Store `rawText` redacted. It is there for readback honesty, not for retaining message contents.
4. Never persist image bytes. `evidence` is a handle; the image itself is transient
   (`MEMORY_MODEL.md` §7 discipline).
5. `history` must be bounded — cap occurrences, drop oldest, keep the confirm/complete/cancel
   transitions preferentially since those are the auditable ones.
6. `linkedLoopIds` and `linkedRoutineIds` are one-directional from the event. Cancelling an event
   should **ask** before cancelling its loops, not cascade silently — the elder may still want to
   thank the aunt even if the wedding is off.
7. Serialise `LifeEventType` as a string, not an enum, so registry additions do not require a type
   migration.

---

## Related

- `LIFE_EVENTS_ENGINE.md` — states, transitions, the generic-type argument
- `REMINDER_POLICY_ENGINE.md` — `ReminderOccurrence` and how `reminderPlan` is built
- `EVENT_EXTRACTION_POLICY.md` — how `FieldValue.confidence` is set and acted on
- `PENDING_LOOPS.md` — `PendingLoop`, referenced by `linkedLoopIds`
- `MEMORY_MODEL.md` §8, §10 — correction, supersession, sharing classes
- `FAMILY_CONSENT_POLICY.md` — the consent gate on any sharing
