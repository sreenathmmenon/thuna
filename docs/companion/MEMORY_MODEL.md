# Thuna — Memory Model

> Design document for Codex Workstream E. **Changes no production code.**
>
> Governing principle: **memory serves the elder's convenience, not the system's knowledge.**
> If the elder would be pleased Thuna remembered it, it belongs here. If they would be unsettled to
> learn it was recorded, it does not — regardless of how useful it would be.

---

## 1. Four categories

| Category | Holds | Lifetime | Shareable by default |
|---|---|---|---|
| **Profile** | Who the elder is; stable preferences | Until changed or deleted | Some (with consent) |
| **Routine** | Agreed recurring commitments | Until cancelled | Some (with consent) |
| **Episodic** | What happened, and when | Bounded — expires | Rarely |
| **Relationship** | People in the elder's life, and consent | Until changed | The consent record itself governs sharing |

Every stored item declares its category. Category determines lifetime, sharing eligibility and
deletion behaviour — so an item cannot silently acquire looser rules than it was created with.

---

## 2. Profile memory

Who the elder is and how they like to be helped. Slow-changing, high-value, low-risk.

```
elderId, displayName            "Appa"
preferredLanguage               ml-IN
preferredPace                   slow
preferredVoice                  (Bulbul speaker)
quietHours                      { from: "21:00", to: "07:00" }
maxRemindersPerDay              elder-controlled
addressRefs                     PROVIDER HANDLES ONLY — see §7
usualOrder                      Thuna's own simulated preference (safe)
frequentRecipients              payment contacts (names + handles, never credentials)
```

**Never in profile memory:** OTP, PIN, CVV, card or bank details, passwords, government IDs,
medical conditions, diagnoses, medicine names paired with dosage.

> **Medicine nuance.** A routine may say "your morning medicine". It must **not** store a drug name
> with a dose ("Metformin 500mg twice daily"). That is a medical record, and holding it invites
> exactly the dosage advice Thuna is forbidden to give. See §9.

---

## 3. Routine memory

Agreed recurring commitments. Full model in `ROUTINE_ENGINE.md`.

```
routineId, type                 MEDICINE_REMINDER | WATER_REMINDER | ...
label                           "morning medicine"  (elder's own words)
schedule                        time(s), days, timezone
state                           SCHEDULED | DUE | ACTIVE | SNOOZED | COMPLETED | MISSED | ESCALATED | CANCELLED
createdBy                       ELDER | FAMILY_SUGGESTED_ELDER_APPROVED
consentToNotifyOnMiss           per-recipient; default FALSE
history                         bounded log of occurrences
```

**`createdBy` matters.** A routine a family member suggested and the elder approved is legitimate.
A routine imposed without approval is not, and must not exist. There is no
`FAMILY_IMPOSED` value by design.

---

## 4. Episodic memory

What actually happened. The most useful category for continuity and the most sensitive.

```
eventId, ts
type                            task_completed | routine_missed | correction_made |
                                question_asked | handoff_requested | promise_made
summary                         factual, non-diagnostic
referenceId                     task/routine it relates to
expiresAt                       REQUIRED — see §6
```

Rules:

- **Factual only.** "Reminder unanswered at 09:00" — never "seemed confused", "sounded low".
- **No transcripts** retained beyond the session. Conversation audio and text are transient.
- **No inference.** Store what occurred, never what it might mean about the person.
- **Bounded.** Every episodic item carries an expiry.

### Pending promises

A distinguished episodic type, because it is the one thing an elder most notices being dropped:

```
promiseId, madeAt
description                     "call Priya about the water bill"
madeBy                          ELDER | THUNA
status                          PENDING | FULFILLED | ABANDONED
```

**Unfinished follow-ups must survive session boundaries.** If Thuna said "I'll remind you about
that later", the promise persists until fulfilled or explicitly abandoned. Dropping it silently is
worse than never offering. Promises may outlive normal episodic expiry — but Thuna should surface
long-pending ones rather than hoard them: *"You mentioned calling Priya last week — still want to?"*

---

## 5. Relationship memory

People, and what may be shared with each.

```
contactId, displayName          "Sree"
relation                        "son"
isTrusted                       elder-designated
channelRefs                     opaque handles, never raw numbers in logs
consentGrants[]                 per-category (see FAMILY_CONSENT_POLICY.md)
```

Contact details for *calling* (e.g. a payment recipient, a family member) are distinct from
**consent to notify**. Having someone's number never implies permission to message them about
the elder.

---

## 6. Expiry and deletion

### Default lifetimes

| Category | Default | Rationale |
|---|---|---|
| Profile | Until changed | Stable by nature |
| Routine | Until cancelled | Active commitment |
| Episodic — task/routine outcomes | **90 days** | Enough for continuity, not a life history |
| Episodic — corrections | **30 days** | Improves near-term help; no long-term value |
| Episodic — pending promises | Until resolved | The point is not to forget |
| Relationship | Until changed | Consent records are auditable |
| Provider-sourced PII | **Session only** | DPDP: avoid persisting beyond the session |

### Deletion

- **Elder-initiated deletion is absolute** and must be available by voice: *"forget that"*.
- **Full profile reset** must be available and must purge consent grants too.
- Deletion is **real deletion**, not a tombstone flag.
- Deleting a routine deletes its history.
- The elder may ask **"what do you remember about me?"** and must get a complete, plainly-spoken
  answer. Anything Thuna cannot comfortably read back aloud should not have been stored.

That last test is the most practical one in this document.

---

## 7. Provider-sourced data (the DPDP boundary)

**A hard rule with an important carve-out.**

Under DPDP, Swiggy is the Data Fiduciary and all Swiggy tool-call content — identifiers, addresses,
cart items, order status — is PII. Official guidance: *"Avoid persisting user PII beyond the current
session."*

Therefore:

| Data | Rule |
|---|---|
| Swiggy `addressId` | ✅ Store — opaque handle |
| Swiggy address **text** | ❌ Never persist. Re-fetch via `get_addresses` |
| Restaurant / item ids | ✅ Store |
| Real order history | ❌ Never mirror. Query the provider |
| Real cart contents | ❌ Never cache. Server-authoritative |
| Coordinates | ❌ Never persist |

**Carve-out:** Thuna's simulated `usualOrder` in `lib/skills/order-food.ts` is **unaffected**. It is
Thuna's own data about a Thuna simulation — not Swiggy-originated — and stays exactly as it is.

The distinction that matters:

- **Elder-owned memory** — Thuna's own record of the elder's preferences. Persistable.
- **Provider-sourced data** — belongs to the provider's user relationship. Transient; re-fetched;
  referenced by handle only.

---

## 8. Correction and supersession

Elders correct things. Memory must handle correction as a first-class operation, matching the
engine's existing behaviour where "wait, plain dosa" updates only the item.

### Rules

1. **Correction is targeted.** Correcting the item does not clear the restaurant or address.
2. **Supersession, not deletion.** A corrected value replaces the active one; the prior value is
   retained briefly (30 days, correction-episodic) so "no, go back to what I said before" works.
3. **Most recent wins.** Never merge or average conflicting statements.
4. **Corrections invalidate dependent confirmations.** Already true in the engine; extends to
   memory-derived readbacks.
5. **Explicit forgetting is immediate and total** — no retained prior value.

### Conflict

When new information contradicts stored memory, **ask** — do not silently overwrite, and do not
silently keep the old value:

> "I have your usual as Masala Dosa from Udupi Cafe. Should I change that to Plain Dosa from now on,
> or just for today?"

This distinguishes a one-off from a preference change, which is exactly the distinction a
stateless system gets wrong.

---

## 9. Prohibited memory

Never stored, under any circumstance, regardless of consent:

- OTP, PIN, CVV, passwords, card/bank details
- Government identifiers
- **Medicine dosages, schedules-as-medical-fact, conditions, diagnoses**
- Emotional-state inference or history
- Health inference of any kind
- Behavioural analytics ("less active this week")
- Location traces
- Conversation transcripts beyond the session

The medical exclusions are what keep Thuna a reminder rather than a health app. Storing a dosage
creates an implicit claim of correctness that Thuna cannot honour, and invites a question
("should I take two?") it must refuse.

---

## 10. Private vs shareable

Every item carries a sharing classification. **Default is PRIVATE.**

| Class | Meaning | Example |
|---|---|---|
| `PRIVATE` | Never leaves Thuna. No consent can unlock it. | Correction history, episodic detail |
| `SHAREABLE_WITH_CONSENT` | May be shared with a specific recipient, for a granted category | Routine missed, task completed |
| `ELDER_INITIATED` | Elder asked for it to be shared, now | "Tell Sree I need help" |

**`PRIVATE` is not consent-unlockable.** Some things stay in the room regardless — that is what
makes the rest of the consent model trustworthy. An elder who knows *some* things can never be
shared can be candid with Thuna.

---

## 11. Storage & logging

- Redact PII from all logs (same redactor discipline as `experiments/swiggy-mcp/src/redact.ts`).
- Hash identifiers at rest.
- Never log tokens, credentials, or full request/response bodies in plaintext.
- Persist locally to `data/` for the demo; encryption at rest is required before any real deployment.
- `.env`, personal audio and secrets are never committed.

---

## 12. Implementation notes for Codex

1. Every record carries `category`, `sharingClass`, `createdAt`, `expiresAt?`, `supersededBy?`.
2. Expiry needs a sweep on read — do not rely on a background job in a demo.
3. `getMemoryForElder()` should return something directly speakable, so §6's read-back-aloud test is
   cheap to satisfy.
4. Provider handles and elder-owned memory should be **separate stores**, so the DPDP boundary is
   structural rather than a convention someone must remember.
5. Seed data (per orchestration doc): Appa, Malayalam, slow pace, usual order Masala Dosa / Udupi
   Cafe / Home, trusted family Sree, contacts Priya Menon / Priya Stores / Priya Nair.
6. Consent grants belong in relationship memory and are purged on profile reset.
