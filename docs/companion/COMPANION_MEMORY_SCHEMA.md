# Thuna — Companion Memory Schema

> Design document. **Changes no production code.**
>
> **`MEMORY_MODEL.md` remains the conceptual foundation.** Its governing principle, its prohibited
> list (§9), its sharing classes (§10), its DPDP boundary (§7) and its correction rules (§8) are all
> still binding and are not restated here except by reference.
>
> This document supersedes **only** the four-category list in `MEMORY_MODEL.md` §1, expanding it to
> **ten**. Nothing else in that document is changed, weakened, or reinterpreted. Where this file and
> `MEMORY_MODEL.md` appear to disagree, `MEMORY_MODEL.md` wins and this file is the bug.

---

## 1. Why ten categories instead of four

The four original categories — profile, routine, episodic, relationship — were correct for a
single-elder reminder assistant. The companion layer added things that do not fit cleanly into any
of them:

| New need | Why it did not fit |
|---|---|
| Household context (who lives there, which neighbour has a key) | Not the elder's personal profile; different sharing rules |
| What the elder can already do unaided | Not episodic (it is a standing fact), not profile (it changes with practice) |
| Consent grants | Were buried inside relationship memory; they need their own lifetime and audit rules |
| Requests for human help awaiting a reply | Not episodic — they are *open*, and openness is the point |
| A wedding next month | Genuinely temporal, genuinely shareable, genuinely not an "event that happened" |
| Provider handles (Swiggy `addressId`) | Was a §7 rule with no home in the category list |

Forcing these into four categories meant either (a) mislabelling them, and thereby giving them the
wrong lifetime and sharing rules, or (b) leaving them out of the memory model and letting them
accumulate somewhere unaudited. Both are worse than adding categories.

**The rule that made the four-category model safe still holds: category determines lifetime,
sharing eligibility and deletion behaviour, so an item can never silently acquire looser rules than
it was created with.** Ten categories, same rule.

---

## 2. The canonical `MemoryRecord` envelope

Every stored item in Thuna's elder-owned memory is a `MemoryRecord`. There is exactly one envelope.
Category-specific payloads live inside it; they do not get their own top-level shape.

```
MemoryRecord {
  id             MemoryRecordId       stable, opaque
  category       MemoryCategory       one of the ten in §3
  source         MemorySource         how this came to be known — §4
  evidence       Evidence             what specifically supports it — §4
  confidence     Confidence           CONFIRMED | PROBABLE | CANDIDATE — §5
  consentScope   ConsentScope         who may see it, under which grant — §6
  createdAt      ISO-8601
  updatedAt      ISO-8601
  expiresAt?     ISO-8601             required for some categories — §7
  supersededBy?  MemoryRecordId       correction chain — MEMORY_CORRECTION_AND_SUPERSESSION.md
  sharingClass   SharingClass         PRIVATE | SHAREABLE_WITH_CONSENT | ELDER_INITIATED
  deletionState  DeletionState        ACTIVE | PENDING_DELETION | DELETED
  payload        <category-specific>
}
```

### `sharingClass` — reused verbatim from `MEMORY_MODEL.md` §10

| Class | Meaning |
|---|---|
| `PRIVATE` | Never leaves Thuna. **No consent unlocks it.** |
| `SHAREABLE_WITH_CONSENT` | May be shared with a named recipient for a granted category |
| `ELDER_INITIATED` | The elder asked for this to be shared, in this moment |

These three values are not extended, renamed, or added to by this document. `PRIVATE` remains
non-unlockable. That is the property the whole consent model rests on.

### Why the envelope carries `source`, `evidence` and `confidence`

Because Thuna's memory is partly model-populated, and a model-populated memory without provenance
is indistinguishable from a hallucination that has been promoted to fact. Every record must be able
to answer *"how do you know that?"* — see §4 and §5.

### Why `deletionState` exists when `MEMORY_MODEL.md` §6 says deletion is real deletion

It still is. `deletionState` is **not** a tombstone that keeps data around.

- `ACTIVE` — the normal state.
- `PENDING_DELETION` — the elder has asked for deletion and the sweep has not yet run. The record is
  already invisible to every read path, including read-back and sharing. It is a queue marker, not a
  retention mechanism.
- `DELETED` — the payload is gone. What remains is `id`, `category` and `deletedAt`, so a correction
  chain that pointed at this record does not dangle. **No payload, no evidence, no summary.**

If the elder says "forget that", the payload is destroyed. `deletionState` exists so that destruction
is observably complete rather than a hope about a background job. See
`MEMORY_RETENTION_AND_DELETION.md` §5.

---

## 3. The ten categories

| # | Category | Holds | Default lifetime | Default sharingClass |
|---|---|---|---|---|
| 1 | `profile` | Who the elder is; stable preferences | Until changed | `SHAREABLE_WITH_CONSENT` (selected fields only) |
| 2 | `operational` | Handles Thuna needs to function — provider ids, channel refs, device refs | Session or until invalidated | `PRIVATE` |
| 3 | `routine` | Agreed recurring commitments | Until cancelled | `SHAREABLE_WITH_CONSENT` |
| 4 | `episodic` | What happened, and when | Bounded — expires | `PRIVATE` unless explicitly classed otherwise |
| 5 | `relationship` | People, roles, per-person scope | Until changed | `PRIVATE` (the record); grants govern sharing |
| 6 | `capability` | What the elder has completed unaided, per task | Rolling window | `PRIVATE` — **never shareable** |
| 7 | `consent` | Consent grants and their history | Until revoked; audit until reset | `PRIVATE` |
| 8 | `pending_loop` | Open requests and shared stories awaiting a return | Until closed | Varies — see below |
| 9 | `life_event` | Dated things in the elder's life that matter to them | Until past + grace | `SHAREABLE_WITH_CONSENT` |
| 10 | `provider_service` | Household and personal services, appliances, vendors | Until changed | Mixed — see `HOUSEHOLD_MEMORY.md` |

### Mapping to the original four

| `MEMORY_MODEL.md` §1 | Becomes |
|---|---|
| Profile | `profile` — unchanged, plus `operational` split out of it (§7 handles were living here) |
| Routine | `routine` — unchanged |
| Episodic | `episodic` — unchanged, minus pending promises which are now `pending_loop` |
| Relationship | `relationship` — unchanged, minus consent grants which are now `consent` |

**Nothing is reclassified into a looser regime by this split.** Every extraction moved data into a
category with rules *at least as strict* as the one it left:

- `operational` left `profile` and became `PRIVATE` (it was already governed by §7's transience).
- `consent` left `relationship` and gained an explicit audit lifetime.
- `pending_loop` left `episodic` and kept "until resolved", which §6 already granted promises.

### 3.1 `operational`

Provider handles, channel refs, device identifiers. The structural home for `MEMORY_MODEL.md` §7's
DPDP boundary: `addressId` yes, address text no.

Per §7 of the foundation doc, operational memory should be a **separate store** from elder-owned
memory, so the boundary is structural rather than a convention. Giving it a category name does not
weaken that — the category exists so that reads, deletion and read-back all know it is there.

### 3.2 `capability`

Task-completion facts only. `CAPABILITY_MEMORY.md` defines this category in full, including the hard
prohibition that makes it safe: **it records what was completed, never what that means about the
person.** It is `PRIVATE` and there is no consent that changes that.

### 3.3 `consent`

`ConsentGrant` is defined in `docs/contracts/notification-adapter.ts` and is **not redefined here**.
This category is where grants are stored and where `ConsentStore` reads and writes. The contract's
`grant` / `revoke` / `check` / `listGrants` / `purge` operations are the only interface; this
document adds no new consent primitives.

### 3.4 `pending_loop` and `life_event` — schema placement only

These two categories sit in the envelope like any other, but **their lifecycles and state machines
are defined elsewhere and are not owned by this document**:

- `pending_loop` → **`PENDING_LOOPS.md`**
- `life_event` → **`LIFE_EVENT_SCHEMA.md`**

What this document fixes is only their envelope treatment:

| Field | `pending_loop` | `life_event` |
|---|---|---|
| `expiresAt` | Not set while open. Set on close, to the closing category's retention. | Event date + grace period |
| `sharingClass` | Inherits from what created it. A help request the elder initiated is `ELDER_INITIATED`; a story loop is `SHAREABLE_WITH_CONSENT` scoped to who it was shared with. | `SHAREABLE_WITH_CONSENT` |
| Deletion | Deleting an open loop closes it as `ABANDONED` first, so nothing is left waiting on a reply that will never come | Normal |

Do not infer loop states or event states from this table. Read the owning documents.

### 3.5 `provider_service`

Recurring services and serviceable things: the LPG vendor, the water purifier that needs a filter,
the plumber the family has used for years. Household-scoped entries are detailed in
`HOUSEHOLD_MEMORY.md`.

---

## 4. `source` and `evidence`

Every record records how it came to be known. This is the single most important addition to the
envelope, because it is what allows a wrong memory to be traced rather than merely overwritten.

### `MemorySource`

| Value | Meaning | May become `CONFIRMED` without asking? |
|---|---|---|
| `ELDER_STATED` | The elder said it, in their own words | Yes |
| `ELDER_CONFIRMED` | Thuna proposed it and the elder agreed | Yes |
| `SYSTEM_OBSERVED` | Deterministic code recorded a fact about its own operation | Yes |
| `PROVIDER_RETURNED` | A provider API returned it | Yes, as fact-about-the-provider only |
| `FAMILY_SUGGESTED` | A family member offered it | **No** — needs elder approval |
| `MODEL_INFERRED` | A model proposed it from conversation | **No** — never, see §5 |

### `Evidence`

```
Evidence {
  kind        UTTERANCE | SYSTEM_EVENT | PROVIDER_RESPONSE | FAMILY_INPUT | DERIVED
  at          ISO-8601
  reference?  id of the routine, task, loop or grant this came from
  quote?      the elder's own short phrase, when kind = UTTERANCE
}
```

`quote` is deliberately narrow: a **short phrase in the elder's own words**, retained so a read-back
can say *"you told me you don't like being called before eight"* rather than *"quiet hours: 08:00"*.
It is not a transcript, is bounded to the phrase, and inherits the record's expiry. Retaining
conversation transcripts remains prohibited (`MEMORY_MODEL.md` §9); a stored phrase attached to a
stored fact is not a transcript, and the distinction must be enforced by length and by the fact that
unattached utterances are never stored at all.

---

## 5. Model-generated assumptions must never become permanent truth automatically

This is the central safety rule of the schema.

> **Model proposes. Elder confirms. Deterministic code stores.**

A model listening to conversation will produce plausible, useful, and sometimes wrong beliefs about
the elder. If those beliefs are written straight to memory, three things follow, all bad:

1. The wrong belief becomes indistinguishable from something the elder actually said.
2. It gets read back to the elder as fact, which is disorienting in a way that specifically
   undermines an elder's trust in their own recollection.
3. It can be *shared* — and a shared model inference about an elder is the exact failure this whole
   product is designed around.

### The three-state lifecycle

```
CANDIDATE  →  (elder confirms)  →  CONFIRMED
    │
    └────────  (elder declines / never asked / expires)  →  discarded
```

| Confidence | Meaning | May be read back? | May be acted on? | May be shared? |
|---|---|---|---|---|
| `CANDIDATE` | A model proposed it. Not yet true. | Only as a **question** | No | **No** |
| `PROBABLE` | Repeated consistent observation by deterministic code; still unconfirmed | Only as a question | Only for low-stakes defaults | **No** |
| `CONFIRMED` | The elder stated or agreed to it | Yes, as fact | Yes | Per `sharingClass` |

Rules:

1. **A `MODEL_INFERRED` record is created as `CANDIDATE` and can only leave that state through an
   elder confirmation.** No other path exists. Not time, not repetition, not a second inference.
2. **Candidates expire.** Default 14 days. An unconfirmed guess that has been sitting for two weeks
   is not improving with age.
3. **Candidates are never shared, never escalated, never used to trigger a routine, and never
   included in "what do you remember about me?" as fact** — they may appear as *"I wasn't sure
   about this, so I haven't written it down"*.
4. **Confirmation does not erase provenance.** A confirmed record keeps `source: MODEL_INFERRED` and
   gains `Evidence` of the confirmation. Knowing that a fact began as a guess remains useful when it
   later turns out to be wrong.
5. **Confidence never upgrades silently.** There is no code path from `CANDIDATE` to `CONFIRMED`
   that does not pass through an elder utterance.

### Asking well

Confirmation is a conversation, and a badly-phrased confirmation is its own harm — it can read as
Thuna having been watching.

Good:

> "You've mentioned Tuesday mornings a couple of times for the vegetable shopping. Should I remember
>  that, or is it different each week?"

Bad — presents the guess as established fact:

> "I've noted that you shop for vegetables on Tuesday mornings."

Bad — reveals accumulated observation, which feels like being monitored:

> "I've noticed you've done this three times now on a Tuesday."

The pattern: **propose lightly, offer the "no" first-class, never recite the evidence trail.**

### What can never be a candidate at all

Some inferences are not "unconfirmed" — they are prohibited, and must not be generated even as a
candidate to be asked about. Per `MEMORY_MODEL.md` §9, no record of any confidence may hold health,
medical, emotional, cognitive or behavioural inference. A `CANDIDATE` holding *"seems to be finding
this harder lately"* is not a question awaiting an answer; it is a prohibited record that has not
been written yet. The generation step must refuse it, not the storage step.

---

## 6. `consentScope`

```
ConsentScope {
  visibility        ELDER_ONLY | SPECIFIC_RECIPIENTS | HOUSEHOLD
  recipientIds[]    RecipientId[]        when SPECIFIC_RECIPIENTS
  categoryRef?      NotificationCategory  the grant that would govern sharing
  grantedVia?       reference to the ConsentGrant record
}
```

`NotificationCategory`, `ConsentGrant` and `ConsentStore` are defined in
`docs/contracts/notification-adapter.ts` and are used as-is.

Rules:

1. **Default is `ELDER_ONLY`.** A record created without an explicit scope is elder-only. Absence of
   scope is never "unscoped, therefore shareable".
2. `consentScope` is a **ceiling, not a permission**. It says who *could* be told, if a matching
   `ConsentGrant` exists at send time. The grant is still checked in `send()`
   (`FAMILY_CONSENT_POLICY.md` §11). Two locks, and the record-level one cannot open the other.
3. `sharingClass: PRIVATE` overrides any `consentScope`. If they conflict, nothing is shared and the
   conflict is a bug to be fixed, not a decision to be made at runtime.
4. `HOUSEHOLD` visibility is defined in `HOUSEHOLD_MEMORY.md` and applies only to household facts,
   never to personal ones.

---

## 7. Lifetime by category

Extends `MEMORY_MODEL.md` §6. The four original rows are unchanged.

| Category | Default lifetime | `expiresAt` required? |
|---|---|---|
| `profile` | Until changed | No |
| `operational` | Session, or until the handle is invalidated | Yes, for anything provider-sourced |
| `routine` | Until cancelled | No |
| `episodic` — outcomes | 90 days | **Yes** |
| `episodic` — corrections | 30 days | **Yes** |
| `relationship` | Until changed | No |
| `capability` | 180-day rolling window | **Yes** |
| `consent` | Until revoked; revoked grants retained for audit until profile reset | No |
| `pending_loop` | Until closed, then the closing category's retention | On close |
| `life_event` | Event date + 30 days | **Yes** |
| `provider_service` | Until changed | No |
| Any `CANDIDATE` | 14 days | **Yes** |

Full deletion semantics: `MEMORY_RETENTION_AND_DELETION.md`.

---

## 8. What the schema still forbids

Unchanged from `MEMORY_MODEL.md` §9, restated because a bigger schema is a bigger temptation. **No
record, in any category, at any confidence, under any consent, may hold:**

- OTP, PIN, CVV, passwords, card or bank details
- Government identifiers
- Medicine dosages, conditions, diagnoses
- Emotional-state inference or history
- Health inference of any kind
- Cognitive assessment of any kind
- Behavioural analytics
- Location traces
- Conversation transcripts beyond the session

Adding a category never adds a place for these to live. If a proposed record does not fit any of the
ten categories, the correct response is to **not store it**, not to add an eleventh.

---

## 9. The read-back test still governs

`MEMORY_MODEL.md` §6: the elder may ask **"what do you remember about me?"** and must get a
complete, plainly-spoken answer.

With ten categories this is harder and more important. The test is unchanged: **anything Thuna
cannot comfortably read back aloud should not have been stored.** Applied to the new categories:

| Category | Read-back sounds like |
|---|---|
| `capability` | "You've set up the Wi-Fi yourself before, so I don't walk you through it any more." |
| `household` (via `provider_service`) | "Lakshmi comes on Mondays and Thursdays." |
| `life_event` | "Meera's wedding is on the 14th." |
| `pending_loop` | "You asked Sree about the payment — he hasn't replied yet." |
| `consent` | "I tell Sree when you ask me to get help. Nothing else, to anyone." |

If a category's read-back sentence would be uncomfortable to say to the elder's face, the category is
wrong.

---

## 10. Implementation notes for Codex

1. **One envelope type, one store interface.** `MemoryRecord<TPayload>` with a discriminated union on
   `category`. Resist per-category tables; the uniform envelope is what makes retention, deletion and
   read-back implementable once rather than ten times.
2. **`writeConfirmed()` and `proposeCandidate()` are separate functions.** The model-facing path
   cannot reach `writeConfirmed()`. This is the §5 rule expressed as an API surface rather than a
   review comment.
3. **Default `sharingClass` to `PRIVATE` and `consentScope.visibility` to `ELDER_ONLY` in the
   constructor**, so an omitted field fails closed.
4. **Sweep expiry on read**, per `MEMORY_MODEL.md` §12.2. With ten categories and candidate expiry,
   a read-time sweep is doing more work — still prefer it to a background job in a demo, but sweep
   `CANDIDATE` records first since they are the ones that must not linger.
5. **Keep `operational` in a physically separate store** from the other nine, per `MEMORY_MODEL.md`
   §12.4. The DPDP boundary should be a different file, not a different field value.
6. `getMemoryForElder()` returns something directly speakable and must group by category in the
   order a person would say it: who you are, what we've agreed, who's in your life, what's coming
   up, what's still open.
7. Test that a `CANDIDATE` cannot be returned by any sharing path, any notification composer, or any
   routine trigger. That is one test per exit point, and it is worth writing every one.

---

## Related

- `MEMORY_MODEL.md` — the foundation. Categories §1 (superseded here), everything else binding
- `HOUSEHOLD_MEMORY.md` — the household category and `HOUSEHOLD` visibility
- `RELATIONSHIP_MEMORY.md` — people, roles, per-person scope
- `CAPABILITY_MEMORY.md` — the capability category and its hard prohibition
- `MEMORY_RETENTION_AND_DELETION.md` — retention, expiry, deletion, read-back
- `MEMORY_CORRECTION_AND_SUPERSESSION.md` — `supersededBy` chains and conflict resolution
- `LIFE_EVENT_SCHEMA.md` — `life_event` lifecycle (not defined here)
- `PENDING_LOOPS.md` — `pending_loop` lifecycle (not defined here)
- `FAMILY_CONSENT_POLICY.md` — the consent model this schema references
- `docs/contracts/notification-adapter.ts` — `ConsentGrant`, `NotificationCategory`, `ConsentStore`
