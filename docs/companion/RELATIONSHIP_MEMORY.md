# Thuna — Relationship Memory

> Design document. **Changes no production code.**
>
> Extends `MEMORY_MODEL.md` §5. People in the elder's life, their roles, and the per-person scope
> that governs what Thuna may do with each of them.
>
> `ConsentGrant` is defined in `docs/contracts/notification-adapter.ts` and is **not redefined here.**

---

## 1. What §5 established, and what this adds

`MEMORY_MODEL.md` §5 defines the person record:

```
contactId, displayName          "Sree"
relation                        "son"
isTrusted                       elder-designated
channelRefs                     opaque handles, never raw numbers in logs
consentGrants[]                 per-category
```

and one rule that this document builds on entirely:

> **Contact details for calling are distinct from consent to notify. Having someone's number never
> implies permission to message them about the elder.**

The companion layer adds three things §5 did not need:

| Addition | Why |
|---|---|
| **Roles** — a person may be several things at once | `isTrusted` is one bit; the real world is not |
| **Per-person scope** — an explicit statement of what Thuna may do with this person | So the answer to "may I ask Sree about this?" is a lookup, not a judgement |
| **Loop participation** — stories and requests attach to people | Part 4 and Part 5 need people to be first-class |

`isTrusted` is **not** replaced. It remains the elder's designation of someone close. It is now
understood as **necessary but never sufficient**: trust is the precondition; a role or a grant is
what actually authorises anything.

---

## 2. The person record, extended

```
Person {
  contactId
  displayName        "Sree"                    speakable
  relation           "son"                     the elder's word, not a taxonomy
  isTrusted          elder-designated          MEMORY_MODEL.md §5
  channelRefs[]      opaque handles only       never raw addresses in logs
  circleRoles[]      CIRCLE_OF_TRUST.md §2     what they may be asked for
  consentGrants[]    → ConsentStore            what they may be told
  storyScope         who may receive stories   §4
  notes?             elder's own words, short  "usually free after seven"
  addedAt, addedVia
}
```

Envelope per `COMPANION_MEMORY_SCHEMA.md` §2: `category: relationship`, `sharingClass: PRIVATE`,
lifetime until changed.

### `relation` is the elder's word

Not an enum. "Son", "the girl from downstairs", "Priya's husband", "my brother's boy". Thuna stores
what the elder said and says it back. A normalised taxonomy would force the elder's actual social
world through a schema designed by someone who has never met them, and would produce read-backs that
sound like a database.

### The person record is `PRIVATE`

The list of people in an elder's life is theirs. No family member sees it, no family member can query
it, and there is no roster view (`CIRCLE_OF_TRUST.md` §6).

---

## 3. Four separate scopes per person

**The central structural claim of this document.** For any person, four independent questions have
four independent answers:

| Question | Governed by | Defined in | Default |
|---|---|---|---|
| May Thuna **contact** them at all? | `channelRefs` exists | `MEMORY_MODEL.md` §5 | None |
| May Thuna **ask them for help**? | `circleRoles[]` | `CIRCLE_OF_TRUST.md` | Empty |
| May Thuna **tell them about the elder**? | `consentGrants[]` | `notification-adapter.ts` | Off |
| May Thuna **share stories** with them? | `storyScope` + per-story yes | `STORY_CONSENT_AND_PROVENANCE.md` | Per story, never standing |

Granting any one grants none of the others. Concretely, for Sree:

| Sree | Status |
|---|---|
| Contactable | ✅ has a `channelRef` |
| May be asked for `PAYMENT_HELP` | ✅ role granted |
| May be told about `ROUTINE_MISSED` | ❌ no grant — and a payment role does not create one |
| May receive stories | ❌ only per story, only on a fresh yes |

> **Why four and not one.** A single "trusted" flag collapses four genuinely different decisions into
> one, and collapses them in the direction of more access. The elder's real position — *"Sree can
> help me with money, and he does not need to know when I miss a reminder"* — is entirely coherent
> and entirely unrepresentable in a one-bit model.

---

## 4. `storyScope`

A per-person marker of whether the elder ever shares stories with this person:

```
storyScope   NEVER | PER_STORY_ONLY
```

There is deliberately no `ALWAYS`. `PER_STORY_ONLY` means *this person may be proposed as a story
recipient*; it never authorises a share. Every share still needs its own yes
(`STORY_CONSENT_AND_PROVENANCE.md` §2).

`NEVER` means Thuna does not propose them, at all. Useful and quietly important: an elder may have a
child they do not confide in, and Thuna suggesting them repeatedly is a small recurring hurt.

---

## 5. Consent grants live here — but are defined elsewhere

Per `FAMILY_CONSENT_POLICY.md` §11.4, grants live in relationship memory and are purged on profile
reset. Under the ten-category schema they are `category: consent`
(`COMPANION_MEMORY_SCHEMA.md` §3.3), associated with a `Person` and reached through `ConsentStore`.

**This document defines no consent primitives.** `ConsentGrant`, `NotificationCategory`,
`ConsentDecision` and `ConsentStore` are in `docs/contracts/notification-adapter.ts` and are used
exactly as written. The grant/revoke/check/list/purge operations there are the only interface.

What relationship memory contributes is the association: this grant belongs to this person, whom the
elder calls "my son Sree".

---

## 6. Adding, changing, removing people

### Adding

By voice, in the moment it becomes relevant. Never a setup form the elder must complete first.

> **Elder:** "My daughter Meera might know."
> **Thuna:** "Shall I remember Meera? I won't tell her anything unless you ask me to."

The second sentence states the default at the moment of adding, which is what makes it informed.

**Adding a person grants nothing.** A new `Person` has no roles, no grants, and `storyScope`
defaulting to `PER_STORY_ONLY` — which, per §4, still authorises nothing.

### Changing

`relation`, `displayName` and `notes` are corrected like any other memory
(`MEMORY_CORRECTION_AND_SUPERSESSION.md`). Roles and grants are changed only by explicit grant or
revocation, never by correction — correcting a name must never touch permissions.

### Removing

> "Take Rajan off. I don't want him involved."

Immediate and total:

- All `circleRoles` removed
- All `consentGrants` revoked via `ConsentStore.revoke()`
- `storyScope` → `NEVER`
- Open requests to them → `WITHDRAWN` (`FAMILY_REQUEST_LIFECYCLE.md` §2)
- Shared stories → unshared (`STORY_CONSENT_AND_PROVENANCE.md` §5), with the honest caveat about
  what they have already seen
- The `Person` record deleted, if the elder wants it gone entirely

Never questioned, never friction-gated, never *"are you sure? He's been helpful."*
(`FAMILY_CONSENT_POLICY.md` §6.)

### Estrangement

An elder may want a person kept in memory but entirely disconnected — a child they are not speaking
to, whose name still comes up.

Supported: `circleRoles` empty, no grants, `storyScope: NEVER`. Thuna remembers who they are, never
proposes them, and never mentions them unprompted. **And it stores no reason**, because the reason
would be an emotional or relational inference (`MEMORY_MODEL.md` §9).

> **Elder:** "Don't ever suggest telling Ravi anything."
> **Thuna:** "I won't."

No follow-up question. No "is everything alright?". The elder said what they wanted; wanting to know
why is Thuna's curiosity, not the elder's need.

---

## 7. What is never stored about a person

Prohibited in relationship memory, per `MEMORY_MODEL.md` §9 and by extension of its logic to third
parties:

- Health, medical, or emotional information about **anyone**, elder or not
- The elder's feelings about them
- Relationship quality, closeness ratings, or estrangement reasons
- **Responsiveness, reliability, or helpfulness metrics** (`FAMILY_REQUEST_LIFECYCLE.md` §4)
- Frequency of contact, or trends in it
- Anything the person themselves has not consented to Thuna holding, beyond a name and a handle
- Location

### Two of these deserve their reasoning

**Responsiveness metrics.** Counting how often Sree replies produces a number that would eventually
be used, and using it would mean Thuna sorting the elder's children into the good one and the other
one. It also profiles a person who never consented to being measured by their father's assistant.

**Contact frequency.** "You haven't spoken to Meera in three weeks" is behavioural analytics about
the elder and a guilt trip about the family, in one sentence. A `FAMILY_CALL_REMINDER` routine
(`COMPANION_PRODUCT_MODEL.md` §9) is a fine thing to have — but it fires on the schedule the elder
agreed, never on a gap Thuna measured.

---

## 8. Elder-facing phrasing

**Adding:**

> "Shall I remember Meera? I won't tell her anything unless you ask."

**Reading back one person:**

> "Sree, your son. I can ask him about payments and your phone. I don't tell him anything on my own.
>  You've shared two things with him."

**Reading back everyone:**

> "Sree, Meera, Priya, and Rajan the building manager. Shall I go through what each of them can be
>  asked about?"

**Refusing to substitute:**

> "You haven't told me Meera helps with repairs. Shall I ask her anyway?"

**Removing:**

> "Rajan's off. I won't ask him anything or tell him anything."

**Estrangement, honoured without inquiry:**

> "I won't suggest Ravi."

**Family self-service attempt:**

> "Sree asked me to add himself for your reminders. I told him that's yours to decide. Would you
>  like to?"

---

## 9. Implementation notes for Codex

1. **`Person` holds references, not grants.** `consentGrants` resolves through `ConsentStore`; it is
   not a copied array that can drift from the authoritative store.
2. **The four scopes (§3) are four independent checks.** No helper function answers "is this person
   allowed" in general. If one exists, it will be reused in the wrong place.
3. **`isTrusted` authorises nothing on its own.** It must never appear in a permission check. Assert
   this — it is exactly the shortcut a later change would take.
4. **`relation` is a free string**, stored as the elder said it, and read back verbatim.
5. **Removing a person cascades**: roles, grants, open loops, shares. Implement as one operation, not
   a checklist someone must remember. §6.
6. **No responsiveness, frequency, or contact-count fields on `Person`.** Structurally absent. §7.
7. **`channelRefs` are opaque handles**, redacted from logs per `MEMORY_MODEL.md` §11.
8. **Profile reset purges people and grants** (`FAMILY_CONSENT_POLICY.md` §6).
9. Test: adding a person grants nothing; `isTrusted` alone never authorises; correcting a name leaves
   permissions untouched; removal cascades completely; no contact-frequency data exists.

---

## Related

- `MEMORY_MODEL.md` §5, §9, §10 — the foundation this extends; prohibitions; sharing classes
- `CIRCLE_OF_TRUST.md` — `circleRoles` and what they authorise
- `STORY_CONSENT_AND_PROVENANCE.md` — `storyScope` and per-story approval
- `FAMILY_REQUEST_LIFECYCLE.md` §4 — why no responsiveness data is kept
- `HOUSEHOLD_MEMORY.md` — household members who are also people Thuna knows
- `COMPANION_MEMORY_SCHEMA.md` §3.3 — the `consent` category
- `FAMILY_CONSENT_POLICY.md` — the consent model in full
- `docs/contracts/notification-adapter.ts` — `ConsentGrant`, `ConsentStore`, `TrustedRecipient`
