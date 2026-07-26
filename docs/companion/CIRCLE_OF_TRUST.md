# Thuna — Circle of Trust

> Design document. **Changes no production code.**
>
> Who may be asked for what, and who decides. The answer to the last part is always: **the elder.**

---

## 1. What the circle is

The circle of trust is the set of people the elder has said may be asked for help, **and the kind of
help each may be asked for.** It is a membership list with per-person scope, not a contact list.

Three properties define it:

| Property | Meaning |
|---|---|
| **Elder-controlled** | Only the elder adds, removes, or changes scope. Family cannot add themselves or each other. |
| **Scoped per person** | Membership is not general. Sree may be asked about payments; that says nothing about plumbing. |
| **Separate from consent to notify** | Being in the circle is not a `ConsentGrant`. See §5 — this is the most important distinction in the document. |

### Why scope is per-person and not global

Because the real social fact is per-person. An elder may be entirely comfortable asking a neighbour
to check a leaking tap and mortified at the thought of that neighbour knowing about a payment
problem. A single "trusted / not trusted" flag flattens a distinction elders care about a great deal,
and flattening it in the direction of *more* access is exactly the wrong default.

---

## 2. The seven trusted roles

A role is a **kind of help**, not a person and not a relationship. One person may hold several roles;
one role may be held by several people.

| Role | Covers | Typical holder | Sensitivity |
|---|---|---|---|
| `DIGITAL_HELP` | Phones, apps, Wi-Fi, passwords-by-guidance, settings | Son, grandchild | Medium — often embarrassing to ask for |
| `PAYMENT_HELP` | Bills, UPI, bank apps, a transaction that will not go through | Close family only, usually | **High** — see §4 |
| `PHYSICAL_PRESENCE` | Someone comes over; company; a hand with something in the house | Neighbour, nearby family | Medium |
| `TRANSPORT` | A lift to a clinic, temple, station | Family, driver, neighbour | Low–medium |
| `HOUSEHOLD_REPAIR` | Plumber, electrician, appliance service, arranging a tradesperson | Family, building manager, regular vendor | Low |
| `FAMILY_CONVERSATION` | The elder would like to talk to this person | Family | Low, and the most valuable of all |
| `APPOINTMENT_COORDINATION` | Booking, rescheduling, remembering an appointment is on | Family | Medium — **see §4.2** |

### Notes on individual roles

**`FAMILY_CONVERSATION` is the role Thuna should reach for most readily.** It is the lowest-risk
role, the one with the least disclosure attached, and the one whose outcome — the elder talking to
someone who loves them — is the best outcome Thuna can produce. It should be offered as easily as any
other option and never treated as a lesser fallback.

**`PHYSICAL_PRESENCE` deserves an unusually wide circle.** Proximity beats relationship here. The
neighbour two doors down is more useful than the son in another city, and the elder knows this
better than the system does.

**`APPOINTMENT_COORDINATION` is not medical.** It covers *the appointment as a calendar object* —
that it exists, when it is, getting there. It never covers what the appointment is for. See §4.2.

---

## 3. Per-person scope

```
CircleMember {
  contactId          → relationship memory (RELATIONSHIP_MEMORY.md)
  displayName        "Sree"
  relation           "son"
  roles[]            the roles this person may be asked for
  preferredChannel   → operational memory; opaque handle only
  addedAt, addedVia  elder utterance or settings
  notes?             the elder's own words, e.g. "he's usually free after seven"
}
```

Rules:

1. **`roles[]` is empty by default.** Adding someone to the circle grants nothing until a role is
   named. There is no "general" role.
2. **Every role is granted individually**, in the same style as consent categories: one question, one
   grant, no bundling (`FAMILY_CONSENT_POLICY.md` §5).
3. **Roles are removable individually.** Removing `PAYMENT_HELP` from Sree does not remove
   `DIGITAL_HELP`.
4. **`notes` is the elder's phrasing, retained verbatim and short.** It exists so Thuna can be
   practical — *"Sree's usually free after seven, shall I ask him then?"* — and it is `PRIVATE`.

### Adding someone, in conversation

> **Thuna:** "I don't have anyone set up for household repairs. Is there someone you'd ask?"
> **Elder:** "The building manager, Rajan."
> **Thuna:** "I'll remember Rajan for household repairs. Just that — I won't ask him about anything
>  else unless you tell me to."

The last sentence is doing real work: it makes the scope audible at the moment of granting, which is
what makes the grant informed.

### Removing someone

Removal is by voice, immediate, and unquestioned — the same standard as consent revocation
(`FAMILY_CONSENT_POLICY.md` §6).

> **Elder:** "Don't ask Rajan about anything."
> **Thuna:** "Alright. I've taken Rajan off. I won't ask him for anything."

Never *"are you sure? He's been helpful."* Never a friction gate. Never a confirmation loop.

---

## 4. High-sensitivity roles

### 4.1 `PAYMENT_HELP`

The role most likely to be abused and most likely to embarrass, so it gets extra structure.

1. **Granted separately and explicitly.** Never bundled with `DIGITAL_HELP`, even though the two
   overlap in practice. "Help me with my phone" and "help me with my money" are different asks.
2. **The disclosure is minimal and fixed.** *"Appa would like some help with a payment."* Never the
   amount, never the recipient, never the failure, never the number of attempts
   (`MINIMUM_DISCLOSURE_POLICY.md` §4).
3. **Thuna never shares a credential, and never asks anyone to.** OTP, PIN, CVV and passwords are
   prohibited memory (`MEMORY_MODEL.md` §9) and are equally prohibited in a request for help. Thuna
   asks a person to *help the elder do it*, never to do it for them with the elder's credentials.
4. **The elder may hold this role empty.** Many elders would rather nobody be able to be asked about
   money, and that is a complete and respected answer.

> **Why the fixed minimal disclosure.** "Appa failed three times at a UPI transfer" tells the helper
> something true and turns the elder into a problem being reported. "Appa would like help with a
> payment" gets the same person to the same place with the elder's standing intact. The second
> version is not less honest — it is less *about* the elder.

### 4.2 `APPOINTMENT_COORDINATION` and the medical boundary

Appointments are the place where Thuna is most likely to slide into being a health app, so the
boundary is drawn hard:

| May be shared with an appointment coordinator | May never be shared |
|---|---|
| That an appointment exists | What it is for |
| Date and time | Which doctor, which department, which clinic |
| That transport is needed | Any symptom, condition, or reason |
| That the elder would like company | Any medicine name or dosage |

> "Appa has an appointment on Thursday at eleven and would like a lift."

That is the whole message. If the elder wants their daughter to know it is the cardiologist, the
elder tells her. Thuna does not, because Thuna storing "cardiologist" is storing a medical fact
(`MEMORY_MODEL.md` §9) and sharing it is sharing one.

---

## 5. Circle membership is not consent to notify

**The single most important boundary in this document.**

| | Circle of trust | `ConsentGrant` |
|---|---|---|
| Governs | Who Thuna may *ask for help*, at the elder's request | What Thuna may *tell someone*, about the elder |
| Direction | Elder-initiated, outbound ask | Notification about the elder |
| Defined in | This document | `docs/contracts/notification-adapter.ts` |
| Default | Empty | Off, per recipient × category |
| Triggered by | The elder saying yes to an offer, now | A standing grant |

Being in the circle for `PAYMENT_HELP` does **not** mean Sree gets told when a payment fails. It
means that *if the elder asks for help with a payment*, Sree is someone Thuna may propose.

Concretely:

- Circle membership creates **no** standing information flow. Nothing is sent because someone is in
  the circle.
- Every actual message still passes the consent gate in `send()`
  (`FAMILY_CONSENT_POLICY.md` §11.1). Circle membership is not a grant and never satisfies that gate
  on its own.
- A help request the elder asks for in the moment is **elder-initiated sharing**
  (`FAMILY_CONSENT_POLICY.md` §8) — the request is the consent, scoped to that one message, creating
  no standing grant.

> **Why keep them separate when it would be simpler to merge them.** Merging is exactly how a
> companion becomes a monitor. "You said Sree could help with payments, so I told him the payment
> failed" is a sentence that follows logically from a merged model and is a betrayal in the elder's
> actual experience. Two structures, two decisions, two revocations.

---

## 6. What family may and may not do

Extends `FAMILY_CONSENT_POLICY.md` §9 to the circle specifically.

A circle member **may**:

- Be asked for help, when the elder says yes to an offer
- Respond, decline, or not respond
- Suggest to the elder that they be added for something — **to the elder, not to Thuna**
- Help set up Thuna, with the elder present

A circle member **may not**:

- Add themselves to the circle, or add anyone else
- Add or remove a role for themselves or another member
- See the circle list, or who else is in it, or in what roles
- Ask Thuna what help the elder has requested from others
- Ask Thuna anything about the elder's memory, routines, or history
- Be told they were considered and not chosen

**If a family member asks Thuna to do any of these, Thuna declines and tells the elder it was
asked** (`FAMILY_CONSENT_POLICY.md` §9). A quiet request to expand access is precisely the thing the
elder needs to know about.

### The circle list is private

Members do not know who else is in the circle. There is no family-facing roster. The elder's
network is the elder's business, and a visible roster invites exactly the comparison —
*"why did he ask Priya and not me"* — that makes asking for help harder next time.

---

## 7. Choosing whom to propose

When help is needed, Thuna proposes **one** person. Selection is deterministic, in this order:

1. **The elder named someone** — use them, no further logic. Even if they hold no matching role; in
   that case Thuna asks whether to add the role.
2. **Exactly one member holds the role** — propose them.
3. **Several hold the role** — prefer, in order:
   a. whoever the elder asked for this role most recently,
   b. whoever the elder's `notes` suggest is available now,
   c. the first added.
4. **Nobody holds the role** — say so plainly and offer to add someone. Never substitute a member
   from an adjacent role.

Rule 4 is the one that matters. If nobody holds `HOUSEHOLD_REPAIR`, Thuna does not quietly ask the
person who holds `DIGITAL_HELP` on the grounds that they are family and would probably help. That
substitution is Thuna making a social decision on the elder's behalf.

**No round-robin, no load balancing, no fairness heuristics.** Thuna does not manage the family's
distribution of care. It asks who the elder wants asked.

---

## 8. Elder-facing phrasing

**Reading back the circle** — required, on request, plainly:

> "For help with your phone, Sree. For a lift, Sree or Meera. For repairs, Rajan the building
>  manager. Nobody for payments — you haven't set anyone up for that."

**Granting a role:**

> "Should I remember Meera for lifts? That means if you need to get somewhere, I'd offer to ask her.
>  It doesn't mean I'd tell her anything else."

**Declining to substitute:**

> "I don't have anyone set up for repairs. I could ask Sree, but you haven't told me he'd help with
>  that — would you like me to?"

**When a family member oversteps:**

> "Sree asked me to add himself for payments. I said I couldn't — that's yours to decide. Would you
>  like to?"

**Removing:**

> "Alright. I won't ask Rajan for anything."

---

## 9. Implementation notes for Codex

1. **`CircleMember.roles[]` is a set, checked at offer time.** No wildcard role, no `ALL`, no
   implicit inheritance between roles. `PAYMENT_HELP` is never implied by `DIGITAL_HELP`.
2. **Circle membership lives in `relationship` memory** (`COMPANION_MEMORY_SCHEMA.md` §3,
   `RELATIONSHIP_MEMORY.md`) and is `PRIVATE`.
3. **Keep `CircleMember.roles` and `ConsentGrant` in separate stores.** Same reasoning as the DPDP
   split in `MEMORY_MODEL.md` §12.4 — a boundary that matters should be structural, so that a future
   change cannot blur it by accident.
4. **Profile reset purges circle membership**, as it purges grants (`FAMILY_CONSENT_POLICY.md` §6).
5. **There is no family-facing read API for the circle.** Not gated, not permissioned — absent.
6. Test the negative cases: role not held → not proposed; adjacent role → not substituted; family
   self-add → refused *and elder informed*; circle membership alone → `send()` still blocks.
7. Selection (§7) must be deterministic and unit-testable. No model call chooses who gets asked.

---

## Related

- `HUMAN_ATTENTION_BRIDGE.md` — when a human is the correct outcome
- `FAMILY_REQUEST_LIFECYCLE.md` — what happens after someone is asked
- `MINIMUM_DISCLOSURE_POLICY.md` — how little to tell them
- `RELATIONSHIP_MEMORY.md` — the underlying people records
- `FAMILY_CONSENT_POLICY.md` §8, §9 — elder-initiated sharing; family-side boundaries
- `docs/contracts/notification-adapter.ts` — `ConsentGrant`, `TrustedRecipient`
