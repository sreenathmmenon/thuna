# Thuna — Memory Retention and Deletion

> Design document. **Changes no production code.**
>
> Extends `MEMORY_MODEL.md` §6 to the ten-category schema. Retention per category, expiry, deletion,
> the right to be forgotten, and the read-back that makes all of it checkable.

---

## 1. The governing test, restated

`MEMORY_MODEL.md` §6:

> **Anything Thuna cannot comfortably read back aloud should not have been stored.**

Retention is the second half of that. **Anything Thuna would be uncomfortable still holding in a
year should have an expiry.** The read-back test catches records that should never have existed;
retention catches records that should have stopped existing.

The practical consequence: an elder who asks *"what do you remember about me?"* twelve months in
should hear a short, sensible answer — not an accumulated history. If the answer keeps growing,
retention is wrong.

---

## 2. Retention by category

Extends `MEMORY_MODEL.md` §6. The original rows are unchanged.

| Category | Default retention | `expiresAt` | Rationale |
|---|---|---|---|
| `profile` | Until changed | — | Stable by nature |
| `operational` | **Session**, or until the handle is invalidated | Required for provider-sourced | DPDP — `MEMORY_MODEL.md` §7 |
| `routine` | Until cancelled | — | Active commitment |
| `episodic` — outcomes | **90 days** | Required | Continuity, not a life history |
| `episodic` — corrections | **30 days** | Required | Near-term help only |
| `relationship` | Until changed | — | Consent records are auditable |
| `capability` — counts | **180-day rolling** | Required | No long tail to draw a trend through |
| `capability` — `stuckSteps` | **30 days** | Required | Difficulty must not accumulate |
| `consent` — active grants | Until revoked | — | The grant is the authority |
| `consent` — revoked grants | Until profile reset | — | Auditable: "what did I once allow?" |
| `pending_loop` — open | Until closed | — | The point is not to forget |
| `pending_loop` — closed | The closing category's retention | On close | Usually 90-day episodic |
| `life_event` | Event date **+ 30 days** | Required | Past events stop being useful quickly |
| `provider_service` / household | Until changed | — | Standing arrangements |
| **Any `CANDIDATE`** | **14 days** | Required | An unconfirmed guess does not improve with age |
| `StoryShare` | **12 months** | Required | Long enough for provenance; not an archive |
| Declined story proposals | **Immediate deletion** | — | `STORY_CONSENT_AND_PROVENANCE.md` §6 |

### The three shortest windows, and why

**`CANDIDATE` — 14 days.** A model-proposed belief that has sat unconfirmed for a fortnight is not
becoming more true. Expiring it prevents a shadow store of unverified assertions accumulating beneath
the confirmed ones.

**`stuckSteps` — 30 days.** The shortest of the capability windows. Difficulty from three months ago
cannot help today and is exactly the residue that would compose into a history of failure
(`CAPABILITY_MEMORY.md` §6).

**Declined story proposals — immediate.** A record of what the elder chose not to share is a record
of precisely what they wanted no record of.

### Retention is enforcement, not housekeeping

Three prohibitions elsewhere in the model are enforced partly by these windows rather than only by
rules:

- The 180-day rolling capability window means there is no series long enough to compute a meaningful
  trend from, backing `CAPABILITY_MEMORY.md` §4.1.
- The 30-day `stuckSteps` window means a failure history cannot form.
- The 14-day candidate window means unconfirmed inference cannot silently become the majority of what
  Thuna "knows".

**Shortening a window is safe. Lengthening one is a safety-relevant change** and should be reviewed
as one.

---

## 3. Expiry

- **Swept on read**, per `MEMORY_MODEL.md` §12.2 — no reliance on a background job.
- **`CANDIDATE` records are swept first.** They are the ones that must not linger, and they are the
  ones most likely to be read into a prompt.
- An expired record is **deleted**, not archived, not flagged, not moved.
- Expiry is silent. Thuna does not announce that it has forgotten something — that would be an
  unprompted reminder of the passage of time and serves nobody.
- **Except for pending loops**, which never expire silently. An open loop either closes or is
  surfaced to the elder (`FAMILY_REQUEST_LIFECYCLE.md` §5). Dropping a promise quietly is worse than
  never having made it (`MEMORY_MODEL.md` §4).

---

## 4. Deletion

### The four ways things are deleted

| Trigger | Scope | Speed |
|---|---|---|
| **"Forget that"** | The referenced item | Immediate, total |
| **Targeted delete** — "forget about the purifier" | One record and anything built on it | Immediate |
| **Category clear** — "forget everything about my reminders" | All records in a category | Immediate |
| **Profile reset** | Everything, including grants, circle roles, shares, loops | Immediate |

### Rules

1. **Deletion is real deletion** (`MEMORY_MODEL.md` §6). Not a flag, not a soft delete, not an
   archive. The payload is destroyed.
2. **Deletion is available by voice** and requires no confirmation ceremony beyond a clear
   understanding of what is being deleted:
   > "That's the purifier reminder and the service I have for it. Both?"
3. **Never questioned.** No "are you sure?", no "you might want this later", no friction.
4. **Cascades are stated before they happen**, not discovered after:
   > "If I forget the purifier, the reminder goes too. Alright?"
5. **Deleting a routine deletes its history** (`MEMORY_MODEL.md` §6).
6. **Deleting a person cascades** to roles, grants, open loops and shares
   (`RELATIONSHIP_MEMORY.md` §6).
7. **Deleting an open loop closes it first** as `CANCELLED`, so nothing is left waiting on a reply
   that will never come (`COMPANION_MEMORY_SCHEMA.md` §3.4).

### `deletionState`, and why it is not a tombstone

Per `COMPANION_MEMORY_SCHEMA.md` §2:

| State | Meaning |
|---|---|
| `ACTIVE` | Normal |
| `PENDING_DELETION` | Requested, sweep not yet run. **Already invisible to every read path** — including read-back, sharing, and prompts. |
| `DELETED` | Payload destroyed. Only `id`, `category` and `deletedAt` remain, so correction chains do not dangle. |

`PENDING_DELETION` is a queue marker with a maximum lifetime of one read cycle. It is not a retention
mechanism, and a record in that state is functionally already gone. `DELETED` retains no payload, no
evidence, no summary, and no quote.

> **Why keep even the id.** A supersession chain (`MEMORY_CORRECTION_AND_SUPERSESSION.md`) may point
> at a deleted record. A dangling reference is a bug that surfaces as Thuna behaving strangely about
> something the elder asked it to forget — the worst possible time to have a bug. The stub costs
> nothing and contains nothing.

---

## 5. Right to be forgotten

### Full reset

> "Forget everything about me."

Thuna states what will go, plainly and completely, then does it:

> "That's everything — who you are, your reminders, the people I know about, what I've shared with
>  them, and everything you've asked people for. All of it. Shall I?"

Then:

- All ten categories purged
- All consent grants purged (`FAMILY_CONSENT_POLICY.md` §6)
- All circle roles purged (`CIRCLE_OF_TRUST.md` §9)
- All story shares and replies purged (`STORY_CONSENT_AND_PROVENANCE.md` §5)
- All open loops closed and deleted
- Provider handles purged; provider-side data is the provider's and Thuna says so honestly

### What Thuna cannot delete, and says so

Honesty about the limits, in the same register as the unshare caveat
(`STORY_CONSENT_AND_PROVENANCE.md` §5):

| Cannot delete | What Thuna says |
|---|---|
| Messages family already received | "I can't take back what they've already read." |
| Data held by Swiggy or another provider | "Your Swiggy account is theirs — you'd need to ask them." |
| Anything the elder told a person directly | Not Thuna's, never was |

Never imply a completeness Thuna cannot deliver. An elder relying on a false assurance is worse off
than one told the truth.

### After a reset

Thuna is genuinely fresh. No residual preferences, no "we've met before", no seed from the old
profile. A reset that leaves a trace is not a reset.

---

## 6. "What do you remember about me?"

Required, complete, plainly spoken (`MEMORY_MODEL.md` §6). With ten categories, the ordering matters
— it should sound like a person answering, not a database enumerating.

### Order

1. **Who you are** — profile
2. **What we've agreed** — routines
3. **Who's in your life** — relationships, and what each can be asked
4. **What I tell people** — consent grants and shares
5. **Your home** — household
6. **What's coming up** — life events
7. **What's still open** — pending loops
8. **How much I explain** — capability and guidance, framed as *Thuna's* behaviour

### Worked example

> "You're Appa. You like things slow and in Malayalam, and not before seven in the morning.
>
> We've got the morning medicine reminder, and that's all.
>
> I know Sree your son, Meera your daughter, and Rajan the building manager. Sree can be asked about
>  payments and your phone, Rajan about repairs.
>
> I tell Sree when you ask me for help. Nothing else, to anyone.
>
> Lakshmi comes Mondays and Thursdays. The purifier is due a filter in March.
>
> Meera's wedding anniversary is on the fourteenth.
>
> You asked Sree about a payment on Monday — he hasn't replied yet.
>
> And I don't go through the food ordering step by step any more, because you told me you know it.
>
> That's everything."

### Rules for the read-back

1. **Complete.** No truncation, no "and a few other things".
2. **Speakable.** Sentences, not fields. It is spoken aloud to a person about themselves.
3. **No candidates as fact.** An unconfirmed guess appears, if at all, as *"I wasn't sure about this,
   so I haven't written it down"* (`COMPANION_MEMORY_SCHEMA.md` §5).
4. **No adjectives about the elder.** Capability reads back as what Thuna *does* — "I don't go
   through it step by step" — never as what the elder *is*
   (`CAPABILITY_MEMORY.md` §6).
5. **Drillable.** Any line can be expanded: *"what exactly did you tell Sree?"* → verbatim.
6. **Deletable in place.** *"Forget the purifier"* mid-read-back works immediately.
7. **`operational` memory is not read back as content** — "I keep a reference to your address so I
   don't have to ask each time, but I don't keep the address itself."

### If the read-back is uncomfortable

That is the signal. **A read-back that is embarrassing to deliver means something was stored that
should not have been.** The fix is deleting the record and changing what gets stored — never
softening the phrasing so it reads better.

---

## 7. Elder-facing phrasing

**Targeted deletion:**

> "Gone. I won't mention it again."

**Cascade, warned first:**

> "If I forget the purifier, the reminder goes with it. Alright?"

**Category clear:**

> "That's all your reminders — the morning medicine one. Forget all of it?"

**Full reset:**

> "That's everything I know about you. Once it's gone I won't remember any of it. Shall I?"

**Honest limit:**

> "I've forgotten it. I can't take back what Meera's already read, though."

**Read-back, on request:**

> "Shall I go through everything, or just one part?"

**Nothing to report:**

> "Nothing at all — we're starting fresh."

---

## 8. Implementation notes for Codex

1. **Retention is a property of the category**, resolved from one table, not scattered per call site.
   One place to audit.
2. **Sweep on read**, `CANDIDATE` first (`COMPANION_MEMORY_SCHEMA.md` §10.4).
3. **`PENDING_DELETION` is excluded from every read path** — read-back, sharing, prompt construction,
   guidance selection. Exclude at the store, not at each caller.
4. **`DELETED` retains id, category and `deletedAt` only.** No payload, no evidence, no quote. Assert
   in tests by field, not by string inspection.
5. **Deletion cascades are one operation** per §4.6–4.7, not a checklist. A partial cascade is a
   record the elder believes is gone.
6. **`getMemoryForElder()` returns speakable prose in §6's order**, and is the single implementation
   used by both the spoken path and any settings view, so the two cannot diverge
   (`MEMORY_MODEL.md` §12.3).
7. **Profile reset purges grants, circle roles, shares, loops and household memory** — everything, in
   one transaction.
8. **Lengthening any retention window requires review as a safety change.** §2.
9. Test: expiry is real deletion; `PENDING_DELETION` invisible everywhere; cascade completeness;
   reset leaves nothing; read-back contains no candidate-as-fact and no adjective about the elder.

---

## Related

- `MEMORY_MODEL.md` §6 — the foundation this extends
- `COMPANION_MEMORY_SCHEMA.md` §2, §5, §7 — envelope, `deletionState`, candidates, lifetimes
- `MEMORY_CORRECTION_AND_SUPERSESSION.md` — why deleted records keep an id stub
- `CAPABILITY_MEMORY.md` §6 — short windows as structural enforcement
- `STORY_CONSENT_AND_PROVENANCE.md` §5, §6 — unshare, and declined-proposal deletion
- `RELATIONSHIP_MEMORY.md` §6 — person removal cascade
- `FAMILY_CONSENT_POLICY.md` §6 — reset purges grants
