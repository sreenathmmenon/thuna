# Thuna — Story Consent and Provenance

> Design document. **Changes no production code.**
>
> Every shared story is approved individually, recorded exactly, and revocable at any time.
> **There is no blanket sharing grant, by design.**

---

## 1. Three requirements

| Requirement | Meaning |
|---|---|
| **Per-story approval** | Each story is a separate yes, for named recipients. Never standing. |
| **Provenance** | Thuna knows and can state exactly what was shared, with whom, when, and in whose words |
| **Revocation** | The elder can unshare, at any time, without explanation |

These are the same four consent properties from `FAMILY_CONSENT_POLICY.md` §2 — explicit, specific,
informed, revocable — applied to content rather than to categories. This document does not define a
second consent model; it applies the existing one to a case the category model does not cover.

---

## 2. Why per-story and not a standing grant

The `ConsentGrant` model in `docs/contracts/notification-adapter.ts` is a **(recipient × category)**
pair: a standing permission to send a *class* of message. That is right for `TASK_COMPLETED`, where
every instance is equivalent and predictable — the elder granting it knows what will be sent, because
every one is the same shape.

Stories are not like that. Two stories in the same "category" can be entirely different in how
exposing they are:

> "I made the beef fry the way my mother used to."
> "I was going through Amma's things this afternoon."

An elder happy for the first to reach the whole family may want the second to reach nobody, or only
one daughter. A standing "share my day with Meera" grant cannot distinguish them, which means it
either over-shares or is never granted. Both outcomes are bad, and the over-sharing one is bad in a
way the elder only discovers afterwards.

> **The general rule.** Category consent works when instances are interchangeable. Content consent is
> required when they are not. Stories are content, so story sharing is per-item.

### What this rules out

- No "share everything with Sree" setting
- No "family updates: on" toggle
- No auto-share by story type, topic, or recipient
- No "you usually say yes to this sort of thing" heuristic
- No **remembered preference that acts as consent** — Thuna may notice the elder often shares cooking
  with Meera and use that to *choose whom to propose*; it never uses it to skip the ask

That last distinction is the one an implementation is most likely to get wrong. A preference may
shape the **proposal**. It may never substitute for the **approval**.

---

## 3. The approval record

Written only on an elder's yes. It is a `CONFIRMED` record with `source: ELDER_CONFIRMED`
(`COMPANION_MEMORY_SCHEMA.md` §4).

```
StoryShare {
  storyId
  sharedText        VERBATIM — the exact words sent, not a summary
  authoredBy        THUNA_PROPOSED_ELDER_APPROVED | ELDER_DICTATED
  recipientIds[]    exactly who. Never a group alias resolved later
  approvedAt
  approvedVia       spoken | settings
  originEvidence    Evidence — what the elder said that prompted this (COMPANION_MEMORY_SCHEMA.md §4)
  sentAt
  state             per FAMILY_STORY_LOOPS.md §2
  revokedAt?
  replies[]         { recipientId, receivedAt, text, returnedToElderAt? }
}
```

### Field notes

**`sharedText` is verbatim.** Stored as sent, not regenerated. If Thuna has to reconstruct what it
said, the read-back drifts from the truth, and a read-back that drifts is worse than none — the elder
is being told something inaccurate about their own disclosures.

**`authoredBy` distinguishes two genuinely different things.** `ELDER_DICTATED` means the elder chose
the words; `THUNA_PROPOSED_ELDER_APPROVED` means Thuna drafted and the elder assented. Both are
legitimate. The distinction matters when the elder later asks *"why did you say it like that?"* —
there is a truthful answer. There is deliberately **no** `THUNA_AUTHORED` value: nothing is ever sent
that the elder has not approved word for word.

**`recipientIds` is resolved at approval time.** If the elder says "the children", Thuna resolves it
aloud before sending:

> "That's Sree and Meera. Both of them?"

Never store an unresolved group alias — group membership can change later, and a grant that silently
expands its own audience is not specific consent.

**`originEvidence`** holds the short phrase that prompted the story, bounded per
`COMPANION_MEMORY_SCHEMA.md` §4. It is `PRIVATE`, never shared, and exists so that provenance can
answer *"where did that come from?"* It is not a transcript and is deleted with the record.

---

## 4. Provenance — a full and honest answer

The elder may ask at any time:

> "What have you told the family?"

and must receive a complete, plainly-spoken answer, per `FAMILY_CONSENT_POLICY.md` §7.

> "Three things this month. I told Meera you made beef fry the way your mother used to. I told Sree
>  and Meera that you'd finished the balcony pots. And last week I told Meera about the temple trip.
>  That's everything."

Requirements:

1. **Complete.** Everything shared, no truncation, no "and some others".
2. **Verbatim on request.** *"What exactly did you say to Meera?"* → the stored `sharedText`, word
   for word.
3. **Per recipient on request.** *"What does Sree know?"* → the list for Sree.
4. **Includes replies.** What came back is part of the record.
5. **Includes revocations.** *"I told her that on Tuesday and took it back on Wednesday."*

### There is no hidden sharing to have provenance about

Because every share required a yes, the provenance answer can never contain a surprise. If it can,
something is broken. This is the practical form of `FAMILY_CONSENT_POLICY.md` §7's rule: *nothing
sent that the elder would be surprised to learn was sent.*

---

## 5. Revocation and "unshare"

**Revocation is at least as easy as approval.** In practice easier
(`FAMILY_CONSENT_POLICY.md` §6).

> "Don't tell Meera about that."
> "Take that back."
> "I shouldn't have said that."

### What unsharing does

| Action | Guaranteed? |
|---|---|
| Removes the story from Thuna's shared record | **Yes** |
| Prevents any further reply from being accepted | **Yes** |
| Removes it from all provenance read-backs as *active* | **Yes** (it appears as revoked, then is deleted) |
| Prevents it being re-proposed | **Yes** |
| Deletes replies already received | **Yes**, if the elder asks to forget the whole thread |
| Sends a retraction to the recipient | **Only if the elder asks** — see below |
| **Removes it from the recipient's memory or phone** | **No — and Thuna says so honestly** |

### Honesty about the limit

Thuna must not imply it can unring a bell:

> "I've taken that back — I won't mention it again and I've removed it from my side. I can't undo
>  Meera having read it. Would you like me to tell her to disregard it?"

Three parts, all necessary: what was actually done, what cannot be done, and an offer of the only
real remedy. Pretending an unshare is complete would be a small lie about something the elder is
relying on, which is exactly the sort of lie that destroys a trust model.

**No explanation is ever requested.** Not "are you sure?", not "Meera enjoyed that one". Revocation
is unquestioned, immediate, and confirmed plainly.

### Blanket revocation

> "Don't tell the family anything any more."

→ All pending proposals dropped, all open loops closed, story proposals switched off entirely until
the elder re-enables them. Confirmed plainly:

> "I won't share anything with anyone. I'll stop offering, too."

The second sentence matters: continuing to *ask* after a blanket no is a way of not accepting it.

### Profile reset

Purges all `StoryShare` records, all replies, and all pending proposals — consistent with
`FAMILY_CONSENT_POLICY.md` §6 and `MEMORY_MODEL.md` §6.

---

## 6. Retention

| Item | Retention | Rationale |
|---|---|---|
| `StoryShare` (active) | 12 months, then expires | Long enough to answer "what have you told them?"; not a permanent archive |
| `sharedText` | With the record | Provenance needs the exact words |
| `originEvidence` | With the record; `PRIVATE` | Never shared, never read back to family |
| Replies | With the record | Part of the loop |
| `CANDIDATE` (proposed, not yet approved) | 14 days | `COMPANION_MEMORY_SCHEMA.md` §5 |
| Declined proposals | **Deleted immediately** | See below |
| Revoked shares | 30 days as revoked, then deleted | So "what did you take back?" works briefly |

### Declined proposals are deleted at once

If the elder says no, the candidate is destroyed immediately — no record that it was proposed, no
record that it was declined, no "the elder tends to decline cooking stories" signal.

> **Why not keep it to avoid re-proposing?** Because a stored list of things the elder chose not to
> share is a record of exactly what they wanted no record of. The re-proposal problem is solved by
> the frequency limit (`FAMILY_STORY_LOOPS.md` §3) and by not re-raising a topic in the same
> conversation — not by remembering refusals.

---

## 7. Elder-facing phrasing

**Approving:**

> "Shall I tell Meera you made the beef fry the way your mother used to? Just that."

**Resolving a group:**

> "'The children' — that's Sree and Meera. Both?"

**Provenance, general:**

> "Three things this month. Beef fry to Meera, the balcony pots to Sree and Meera, and the temple
>  trip to Meera. That's all of it."

**Provenance, verbatim:**

> "Word for word, I said: 'Appa made beef fry today, the way his mother used to.'"

**Provenance, per recipient:**

> "Sree knows about the balcony pots. Nothing else."

**Unsharing, with the honest limit:**

> "I've taken that back. She can't see it from me any more — though I can't undo her having read it.
>  Shall I tell her to pay it no mind?"

**Blanket revocation:**

> "I won't share anything with anyone. And I'll stop asking."

**Declining a proposal:**

> "Of course."

*(Nothing more. No "are you sure?", no acknowledgement that a record was made — because none was.)*

---

## 8. Implementation notes for Codex

1. **`StoryShare` is written only on an elder yes.** There is no code path that creates one from a
   preference, a default, or a repeated pattern. `writeConfirmed()` only
   (`COMPANION_MEMORY_SCHEMA.md` §10.2).
2. **`sharedText` is stored, not regenerated.** Assert byte-equality between what `send()` was given
   and what read-back returns.
3. **Resolve `recipientIds` at approval time.** No group aliases persisted. A stored alias is a grant
   that can silently widen.
4. **No `autoShare`, `defaultRecipients`, or `shareCategory` field.** Their absence is the
   enforcement of §2. If one appears in a schema review, it is the feature this document exists to
   prevent.
5. **Unshare is a real deletion path**, not a visibility flag — `MEMORY_MODEL.md` §6, deletion is
   real deletion. Reply acceptance for that `storyId` must fail after revocation.
6. **Declined candidates are deleted synchronously**, not swept later. §6.
7. **Do not store declination signals** in any form — no counter, no topic preference, no
   `lastDeclinedAt`.
8. **Provenance read-back must be one function**, used by both the spoken path and any settings view,
   so the two cannot diverge. `MEMORY_MODEL.md` §12.3.
9. Test: no share without approval; alias never persisted; revoked story rejects replies; declined
   candidate leaves no trace; verbatim read-back matches sent text exactly.

---

## Related

- `FAMILY_STORY_LOOPS.md` — the seven-state loop and the respond-don't-browse boundary
- `FAMILY_CONSENT_POLICY.md` §2, §6, §7, §8 — consent properties, revocation, transparency
- `COMPANION_MEMORY_SCHEMA.md` §4, §5 — source, evidence, candidates
- `MEMORY_RETENTION_AND_DELETION.md` — deletion mechanics and read-back
- `MINIMUM_DISCLOSURE_POLICY.md` §3 — quoting exact text before sending
- `docs/contracts/notification-adapter.ts` — `ConsentGrant` (category consent, contrasted in §2)
