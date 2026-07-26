# Thuna — Life Events Engine

> Design document. **Changes no production code.**
>
> The life events engine is the deterministic state machine behind everything Thuna remembers that
> *happens on a date*: a wedding, a bill, an appointment, a parcel, a renewal.
>
> Its architectural claim is simple and load-bearing: **event types are data, not code.**

---

## 1. The generic claim

> ## A new event type must never require an engine change.

`WEDDING`, `BILL`, `APPOINTMENT`, `DELIVERY` are **rows in a type registry**, not branches in a
switch statement. Adding `PASSPORT_RENEWAL` or `TEMPLE_FESTIVAL` next month must be a data edit —
a new entry declaring its fields, its reminder offsets, and its confirmation phrasing — with **zero**
lines changed in the transition function.

Why this is worth insisting on:

- The real world has an unbounded set of event types. Any engine with per-type branches will grow a
  long tail of half-correct special cases, and the newest ones will be the buggiest.
- The safety invariants (confirm before saving, silence is not completion, provenance on every
  field) must hold *identically* for every type. Per-type code is exactly how one type quietly
  acquires a looser rule.
- A wedding and a water-bill differ in **what they ask** and **when they remind**, not in **how they
  move through states**. That difference is configuration.

### The test for "is this generic?"

If a reviewer can add a working `SERVICE_VISIT` type by editing one registry file and writing no
engine code, the design holds. If they must touch the reducer, it has failed.

---

## 2. Event types are a registry

```
LifeEventTypeSpec {
  type                 WEDDING | BIRTHDAY | ANNIVERSARY | FAMILY_EVENT | RELIGIOUS_EVENT |
                       COMMUNITY_EVENT | BILL | APPOINTMENT | DELIVERY | RENEWAL |
                       SERVICE_VISIT | TRAVEL | CUSTOM
  label                elder-facing noun, in the elder's language ("wedding", "electricity bill")
  requiredFields       field keys that must be present-or-explicitly-unknown before CONFIRMED
  optionalFields       field keys that may be extracted but never blocked on
  reminderPolicyRef    → REMINDER_POLICY_ENGINE.md (declarative offsets)
  completionRule       ATTENDANCE_ASKED | EXPLICIT_CONFIRMATION | EXTERNAL_VERIFICATION | NONE
  offersRef            which help offers are appropriate (map, cab, gift, family help)
  escalationEligible   boolean — most types: false
  defaultSharingClass  PRIVATE | SHAREABLE_WITH_CONSENT   (default PRIVATE)
}
```

`CUSTOM` exists so an elder can say *"remember that the plumber is coming Thursday"* and get the full
engine — reminders, confirmation, follow-up — without anyone having shipped a `PLUMBER` type. It is
the pressure valve that keeps the registry honest.

Illustrative rows (values are configuration, not contract):

| type | requiredFields | completionRule | escalationEligible |
|---|---|---|---|
| `WEDDING` | `date`, `people` | `ATTENDANCE_ASKED` | false |
| `BIRTHDAY` | `date`, `people` | `NONE` | false |
| `ANNIVERSARY` | `date`, `people` | `NONE` | false |
| `FAMILY_EVENT` | `date` | `ATTENDANCE_ASKED` | false |
| `RELIGIOUS_EVENT` | `date` | `NONE` | false |
| `COMMUNITY_EVENT` | `date` | `ATTENDANCE_ASKED` | false |
| `BILL` | `date` (due), `provider`, `amount` | `EXPLICIT_CONFIRMATION` **or** `EXTERNAL_VERIFICATION` | false |
| `APPOINTMENT` | `date`, `time`, `location` | `ATTENDANCE_ASKED` | false |
| `DELIVERY` | `date` (expected) | `EXPLICIT_CONFIRMATION` | false |
| `RENEWAL` | `date` (expiry), `subject` | `EXPLICIT_CONFIRMATION` | false |
| `SERVICE_VISIT` | `date`, `window` | `ATTENDANCE_ASKED` | false |
| `TRAVEL` | `date`, `time` | `NONE` | false |
| `CUSTOM` | `date` | `NONE` | false |

Note `escalationEligible: false` across the board. A missed wedding is not a welfare signal, and a
life event is not a reason to contact family. Escalation stays where `ROUTINE_ENGINE.md` put it.

---

## 3. Lifecycle

The schema and every field are defined once in `LIFE_EVENT_SCHEMA.md`. This section defines only the
state machine.

```
DRAFT ──► NEEDS_CONFIRMATION ──┬──► CONFIRMED ──► UPCOMING ──► DUE ──► ACTIVE ──┬──► COMPLETED
  │              │             │                     ▲                  │       ├──► SNOOZED ──► DUE
  │              │             └──► CANCELLED        │                  │       ├──► CANCELLED
  │              └──► CANCELLED  (elder says no)     └──────────────────┘       ├──► MISSED
  └──► CANCELLED                                                                └──► ESCALATED*
```

\* `ESCALATED` exists for structural parity with `ROUTINE_ENGINE.md` and is reachable **only** for
types with `escalationEligible: true` **and** prior consent. No type ships with it enabled.

| State | Meaning | Elder-visible |
|---|---|---|
| `DRAFT` | Extracted from an input; not yet shown to the elder | never spoken |
| `NEEDS_CONFIRMATION` | Read back to the elder; awaiting a yes | "Is this right?" |
| `CONFIRMED` | Elder said yes. Now real memory. | "Saved" |
| `UPCOMING` | Confirmed, reminders scheduled, date in the future | "Ammini's wedding, next Sunday" |
| `DUE` | A reminder occurrence has reached its trigger time | transient |
| `ACTIVE` | Thuna is speaking about this event now | "Reminder in progress" |
| `SNOOZED` | Elder asked for later; new trigger set | "I'll mention it again at six" |
| `COMPLETED` | Per the type's `completionRule`, resolved | "You went", "You paid it" |
| `MISSED` | Reminder unanswered, or attendance unknown | "I don't know" |
| `CANCELLED` | Elder rejected, cancelled, or the event was called off | "Cancelled" |
| `ESCALATED` | Family told — consent-gated, effectively unused | "Sree was told" |

### Why `DRAFT` and `NEEDS_CONFIRMATION` are separate states

`DRAFT` is what the extractor produced. `NEEDS_CONFIRMATION` is what Thuna has actually said aloud.
Keeping them apart means an extraction that never got read back cannot be mistaken for one the elder
declined — and it makes "how many candidates did we silently drop?" an answerable question during
review. It also gives the extractor somewhere to put a low-confidence result that is not yet worth
interrupting the elder for (§5 of `EVENT_EXTRACTION_POLICY.md`).

---

## 4. Transitions

### `(input) → DRAFT`
Any input source produces a candidate: speech, invitation image, bill image, appointment slip, text
message, family entry, forwarded content. **Never** written to confirmed memory. A `DRAFT` carries
per-field provenance and confidence from the moment it exists.

### `DRAFT → NEEDS_CONFIRMATION`
When Thuna decides to read it back. Gated by quiet hours if the elder is not already in a
conversation — a wedding invitation photographed at 21:40 waits until morning. The exception is when
the elder is *actively present* and just handed Thuna the input; then the read-back is immediate,
because that is the conversation they started.

### `NEEDS_CONFIRMATION → CONFIRMED`
**Only on explicit confirmation.** Reuse `isConfirmation()` from `lib/command-parser.ts` — the same
function that guards order placement. Silence, "hmm", "okay okay" spoken over Thuna, and "later" are
not a yes.

If the elder corrects a field instead of confirming, this is **not** a rejection: apply the
correction (§6), re-read only what changed, and stay in `NEEDS_CONFIRMATION`.

### `NEEDS_CONFIRMATION → CANCELLED`
Elder says no, "that's not mine", "I already know about that", or "forget it". Immediate, no
argument. The `DRAFT` fields are not retained beyond correction-episodic lifetime.

### `CONFIRMED → UPCOMING`
Automatic. The reminder policy for the type is materialised into concrete occurrences
(`REMINDER_POLICY_ENGINE.md` §3). Materialisation happens at confirmation time so the elder can be
told what to expect: *"I'll mention it a week before, the evening before, and on the morning."*

### `UPCOMING → DUE`
A reminder occurrence reaches its trigger time. Quiet hours are checked **first**: a `DUE` inside
quiet hours defers or is dropped per the occurrence's `ifQuietHours` policy — never fires.

### `DUE → ACTIVE`
Channel session opens. Requires `consentVerified` and `quietHoursChecked`
(`docs/contracts/channel-adapter.ts`). The session `purpose` is the event's reason string, which is
mandatory — see `PROACTIVE_COMPANION_POLICY.md`.

### `ACTIVE → COMPLETED`
Governed by the type's `completionRule`, and **only** by it:

| `completionRule` | Completes when |
|---|---|
| `ATTENDANCE_ASKED` | Elder explicitly says they attended / it happened |
| `EXPLICIT_CONFIRMATION` | Elder explicitly says the thing is done ("I paid it") |
| `EXTERNAL_VERIFICATION` | A provider/adapter confirms it, **or** the elder does |
| `NONE` | Never completes; the event simply passes its date and archives |

Never on: silence, delivery receipt, the date having passed, or model output.

### `ACTIVE → SNOOZED`
Same rules as `ROUTINE_ENGINE.md` §3: parse a duration if offered, otherwise a default, and **state
the new time aloud**. Snooze count is bounded per occurrence (suggest 3); past the cap Thuna offers
to stop mentioning it rather than looping.

A life-event snooze has one extra rule: **it may not push a reminder past the event itself.** If the
elder snoozes a morning-of wedding reminder by three hours and the wedding is in two, Thuna says so
and offers to drop it instead: *"The wedding starts before that — shall I just leave it?"*

### `ACTIVE → MISSED`
No response in the listen window, or the session ended without resolution. `humanResponded: false`
is the signal. `MISSED` means **"I don't know"** — not "they didn't go", not "it wasn't paid".

### `MISSED → DUE` (retry)
One retry, after a delay, and **only if the retry still lands before the event or due date is
meaningfully past**. Retrying a "your bill is due today" reminder at 23:55 is nagging with no
remaining utility.

### `→ CANCELLED`
Available from every state, always immediate. Also the correct state when the *event itself* is
called off ("the wedding was postponed") — with an offer to create the replacement rather than
mutating the old record, so provenance stays intact.

---

## 5. Prohibited transitions

Encode as assertions. These are the bugs that would matter.

| Forbidden | Why |
|---|---|
| `DRAFT → CONFIRMED` (skipping read-back) | Extraction would become authorship |
| Any `→ CONFIRMED` without `isConfirmation()` | Confirmation must be one function, not two |
| `→ COMPLETED` on silence | Silence is never completion |
| `BILL → COMPLETED` on the due date passing | Time passing is not payment |
| `BILL → COMPLETED` because a reminder was delivered | Delivery ≠ payment |
| `DELIVERY → COMPLETED` on carrier "delivered" status alone, without elder confirmation | The parcel may be at a neighbour's |
| `→ COMPLETED` by model output | The LLM may never complete an event |
| `DUE → ACTIVE` inside quiet hours | Waking an elder is a real harm |
| `→ ESCALATED` without consent **and** `escalationEligible` | Surveillance |
| Any transition without an appended event record | Every transition is auditable |
| Writing a field the type spec does not declare | No invented fields (`EVENT_EXTRACTION_POLICY.md` §6) |

The `BILL` rows deserve emphasis. A system that marks a bill paid because the date passed will,
eventually, tell an elder they have nothing to pay when they do. That is the single most expensive
lie this engine could tell.

---

## 6. Corrections preserve provenance

This mirrors the behaviour already correct in `lib/engine.ts`, where *"wait, plain dosa"* changes the
item and leaves the restaurant and address alone.

> **"Not Sunday — Saturday."**

Rules:

1. **Targeted.** Only `date` changes. `people`, `venue`, `time` and every other field keep their
   original values **and their original provenance**.
2. **Provenance is rewritten only on the corrected field**, to `{ source: ELDER_SPEECH, confidence:
   1.0, correctedFrom: <prior value>, correctedAt }`. The record still knows the venue came from the
   invitation photograph.
3. **The rest of the record's `source` is untouched.** Thuna must still be able to say *"the venue I
   read from the invitation"* after a date correction. Overwriting whole-record provenance on any
   correction destroys exactly the sentence that makes the readback trustworthy.
4. **Supersession, not deletion** (`MEMORY_MODEL.md` §8). The prior value is retained for the
   correction-episodic window so *"no, go back to what I said before"* works.
5. **A correction invalidates dependent confirmations.** If reminders were already materialised, they
   are recomputed from the new date and the elder is told: *"I've moved the reminders to match."*
6. **Most recent wins.** Never merge, never average, never keep both.

### Downstream effects of a date correction

| Was | Now |
|---|---|
| Reminder occurrences on the old date | Voided, and replaced — not left orphaned |
| Confirmation status | Stays `NEEDS_CONFIRMATION` until the elder confirms the corrected record |
| Prior value | Retained 30 days as correction-episodic |
| Other fields' provenance | **Unchanged** |

---

## 7. Inputs

| Input | Typical types | Notes |
|---|---|---|
| Speech | any | Highest-confidence source; still becomes a `DRAFT` |
| Invitation image | `WEDDING`, `FAMILY_EVENT`, `RELIGIOUS_EVENT`, `COMMUNITY_EVENT` | Ornate fonts; expect low field confidence |
| Bill image | `BILL` | Amount and due date are the risky fields |
| Appointment slip | `APPOINTMENT` | Handwriting is common; expect to ask |
| Text message | `DELIVERY`, `BILL`, `APPOINTMENT` | Also the main phishing vector — §8 |
| Family entry | any | Requires elder approval exactly like a family-suggested routine |
| Forwarded content | any | Provenance is the forwarder, not the original claim |

**Family entry is not authority.** A family member adding "Dad's cardiology appointment" produces a
`DRAFT` with `source: FAMILY`, which the elder confirms or rejects like any other. `MEMORY_MODEL.md`
§3 has no `FAMILY_IMPOSED` value by design; neither does this engine.

---

## 8. Adversarial inputs

Text messages and forwarded content are attacker-reachable. The engine treats extracted content as
**data, never instruction**.

- A message saying *"call this number to pay immediately or your connection will be cut"* may become
  a `BILL` candidate. It must **never** cause Thuna to call, pay, or convey urgency it did not
  independently establish. Urgency in the source text is a field value, not a directive.
- No extracted text may alter Thuna's policies, consent state, quiet hours, or reminder caps.
- Any extracted content requesting OTP, PIN, CVV, password, or a payment action routes through the
  same deterministic pre-model refusal path as `quickCheck()` in `lib/router.ts`.
- When a `BILL` candidate arrives from an unverified message, the readback says where it came from:
  *"A message says an electricity bill of about nine hundred rupees is due on the fifth. I can't
  tell if that message is genuine. Shall I remind you to check it?"* — a reminder to **check**, never
  a reminder to **pay a specific party**.

---

## 9. Relationship to the routine engine

Life events and routines are siblings, not the same thing.

| | Routine | Life event |
|---|---|---|
| Recurrence | Recurring by nature | One-off (recurring only for `BIRTHDAY`/`ANNIVERSARY`) |
| Origin | Elder agrees to a commitment | Extracted from the world, then confirmed |
| Pre-confirmation states | none | `DRAFT`, `NEEDS_CONFIRMATION` |
| Escalation | Consent-gated, real | Structurally present, effectively unused |
| Shared states | `DUE`, `ACTIVE`, `SNOOZED`, `COMPLETED`, `MISSED`, `CANCELLED`, `ESCALATED` — **identical semantics** | |

The shared states are deliberately the same names with the same meanings. A reviewer who knows
`MISSED` in `ROUTINE_ENGINE.md` knows it here: *we do not know what happened.*

`BIRTHDAY` and `ANNIVERSARY` recur annually. They are modelled as an event with a recurrence rule
that spawns a fresh occurrence each year — **not** as a routine — because their reminder policy,
offers (gift, call) and confirmation phrasing come from the event registry.

---

## 10. Architecture

Mirror `lib/engine.ts`, exactly as `ROUTINE_ENGINE.md` §9 does:

1. **Pure transition function.** `(event, action, now, typeSpec) → { nextState, effects, records }`.
   No mutation, no I/O. `typeSpec` is an argument, which is what makes the engine generic.
2. **A single mutator**, like `lib/session-store.ts`.
3. **Model proposes; engine decides.** Extraction, field parsing and phrasing are the model's;
   `CONFIRMED`, `COMPLETED` and every other state are the engine's.
4. **Every transition appends an event record** — `life_event_drafted`, `life_event_readback`,
   `life_event_confirmed`, `life_event_corrected`, `life_event_reminder_scheduled`,
   `life_event_triggered`, `life_event_snoozed`, `life_event_completed`, `life_event_missed`,
   `life_event_cancelled`.
5. **Channel-agnostic.** The engine never knows if it is speaking via browser or phone.
6. **Type specs live in data** — one registry module, ideally loadable from JSON, so "add a type"
   is provably not "change the engine".

---

## 11. Implementation notes for Codex

1. Put the type registry in its own module with **no imports from the engine**. If the engine imports
   the registry and the registry imports nothing, the generic property is structurally enforced.
2. Write one parameterised test suite that runs the *entire* lifecycle for **every** registered type.
   A new type that breaks an invariant should fail tests without anyone writing a test for it.
3. Reuse `isConfirmation()` and `recoveryType()` from `lib/command-parser.ts`. Do not write a second,
   looser confirmation parser for events — that divergence is how "okay okay" becomes a yes.
4. Store events in elder-owned memory (`MEMORY_MODEL.md` §7), never in the provider-handle store.
   An invitation is the elder's, not a provider's.
5. `DRAFT` records need an expiry. A candidate never read back should not linger indefinitely;
   suggest 7 days, then drop with an event record.
6. Field-level provenance means the storage shape is `{ value, source, confidence, extractedFrom,
   correctedFrom?, correctedAt? }` per field — not a single record-level `source`. Get this right at
   the start; retrofitting it is painful.
7. Quiet-hours checks belong in the scheduler, not in each type. One check, one place.
8. Never speak IDs (`CHECKIN_CONVERSATION_POLICY.md` §7). Event ids, bill reference numbers and
   order ids stay unspoken unless the elder asks for a reference number specifically.

---

## 12. Test cases

1. A new type added to the registry alone completes the full lifecycle with no engine change
2. Extraction produces `DRAFT`, never `CONFIRMED`
3. `NEEDS_CONFIRMATION` + silence → stays `NEEDS_CONFIRMATION`, never confirms
4. `NEEDS_CONFIRMATION` + "hmm" → not confirmation
5. "Not Sunday, Saturday" changes only `date`; venue provenance intact
6. Correction re-materialises reminders and voids the old ones
7. Correction keeps the record in `NEEDS_CONFIRMATION`
8. `BILL` does not complete when the due date passes
9. `BILL` does not complete on reminder delivery
10. `DELIVERY` does not complete on carrier status alone
11. Model output cannot force `COMPLETED` for any type
12. `DUE` inside quiet hours defers, never fires
13. Snooze past the event start is refused with an offer to drop
14. Family-entered event requires elder confirmation
15. Text-message-sourced bill produces a *check* reminder, not a *pay* reminder
16. Extracted text containing instructions does not alter policy or trigger actions
17. Cancel honoured immediately from every state
18. Every transition appends an event record
19. `DRAFT` expiry drops the candidate and records why

Cases 1, 5, 8, 10 and 16 are the ones a naive implementation gets wrong.

---

## Related

- `LIFE_EVENT_SCHEMA.md` — the `LifeEvent` record, defined once
- `REMINDER_POLICY_ENGINE.md` — declarative reminder offsets per type
- `EVENT_EXTRACTION_POLICY.md` — how inputs become `DRAFT`s
- `LIFE_EVENT_DEMO_SCENARIOS.md` — end-to-end walkthroughs
- `ROUTINE_ENGINE.md` — the sibling state machine whose states this reuses
- `MEMORY_MODEL.md` §8 — correction and supersession
- `PROACTIVE_COMPANION_POLICY.md` — what a reminder occurrence must define before it may speak
- `QUIET_HOURS_AND_FREQUENCY.md` — deferral and caps
