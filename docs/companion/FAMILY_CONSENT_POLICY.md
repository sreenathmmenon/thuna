# Thuna — Family Consent Policy

> Design document. **Changes no production code.**
>
> This is the boundary between a companion and a surveillance device. The distinction is
> **consent**, and consent has a specific, checkable structure.

---

## 1. The principle

> **The elder is the principal. Family is a resource the elder may choose to draw on.**

Family and elder interests genuinely diverge here: families usually want more visibility than
elders want to give. A product that resolves that tension in the family's favour — because the
family is often the one who set it up, or pays — has quietly changed who the user is.

Thuna resolves it in the elder's favour, every time.

---

## 2. Four properties of valid consent

Consent that lacks any of these is not consent.

| Property | Meaning |
|---|---|
| **Explicit** | Actively given. Never a default, never inferred from silence or from not objecting |
| **Specific** | For a named recipient AND a named category. Never blanket |
| **Informed** | The elder was told plainly what would be shared, with whom, and when |
| **Revocable** | Withdrawable at any time, by voice, taking effect immediately |

### Specificity, concretely

Consent is a **(recipient × category)** pair. Granting one cell never grants another.

|  | Sree | Priya |
|---|---|---|
| `ELDER_REQUESTED_HELP` | ✅ granted | ✅ granted |
| `TASK_COMPLETED` | ✅ granted | ❌ not granted |
| `ROUTINE_MISSED` | ❌ not granted | ❌ not granted |

Consent to tell Sree an order was placed is **not** consent to tell Sree a medicine was missed, and
is **not** consent to tell Priya anything.

---

## 3. Categories

From `docs/contracts/notification-adapter.ts`:

| Category | Sensitivity | Default |
|---|---|---|
| `ELDER_REQUESTED_HELP` | Low — elder-initiated | Off; trivially granted in the moment |
| `HANDOFF_REQUESTED` | Low — elder-initiated | Off |
| `TASK_COMPLETED` | Medium | Off |
| `ACCOUNT_ACTION_NEEDED` | Medium | Off |
| `ROUTINE_COMPLETED` | Medium-high — feels like being checked up on | Off |
| **`ROUTINE_MISSED`** | **High — see §4** | **Off** |

**Every default is off.** A fresh Thuna shares nothing with anyone.

### Never shareable, regardless of consent

- Emotional state or inference
- Health inference or diagnosis
- Behavioural analytics
- Conversation transcripts
- Location
- Correction history (that the elder needed three attempts is private)

These map to `PRIVATE` in `MEMORY_MODEL.md` §10. **No consent unlocks them.** That is deliberate: an
elder who knows some things can never be shared can afford to be candid with Thuna.

---

## 4. `ROUTINE_MISSED` — the hard case

This is the category families most want and the one that most changes what Thuna is.

"Appa missed his medicine twice" is genuinely useful to a caring family. It is also exactly the
signal that turns a companion into a monitor, and the elder knows it — which changes how they behave
around Thuna. An elder who suspects reports are being filed may simply say "yes, I took it" to avoid
the report. **Surveillance corrupts the very data it collects.**

Requirements, therefore:

1. **A distinct grant.** Never bundled with any other category.
2. **Explained concretely at grant time**, with a real example:
   > "If you don't answer a medicine reminder twice, I'd tell Sree that you didn't answer.
   >  I wouldn't tell him anything about how you seemed or why. Is that alright?"
3. **Facts only.** "Two reminders went unanswered at 9:00 and 9:10." Never "he may be unwell",
   never "he seems to be struggling".
4. **The elder is told when it happens.** No silent reporting — Thuna says it notified Sree.
5. **Revocable mid-routine**, effective immediately.

If the elder hesitates, the answer is no. Hesitation is not consent.

---

## 5. Granting

Consent may be granted:
- **By voice**, in conversation, when the situation arises naturally
- **In settings**, reviewed deliberately

Requirements:
- Plain language. No legalese, no dark patterns, no pre-ticked anything.
- A real example of the message that would be sent.
- **"No" and "not now" are complete answers.** Never re-ask in the same session.
- Never bundle. One question, one grant.
- Recorded with `grantedAt`, `grantedVia`, and optional `expiresAt`.

### Prohibited grant flows

- Family granting consent on the elder's behalf
- Consent as a precondition for using a feature ("allow this to enable reminders")
- Consent buried in onboarding the elder cannot meaningfully refuse
- Re-asking until the elder relents
- Inferring consent from "I suppose so" or silence

---

## 6. Revoking

**Revocation must be at least as easy as granting.** In practice, easier.

- By voice: *"stop telling Sree about my reminders"* → immediate.
- Never questioned, never friction-gated, never "are you sure? Sree finds this helpful."
- Takes effect at once, including for a routine already in flight.
- Confirmed plainly: *"I won't tell Sree about that any more."*
- **Full profile reset purges all grants.**

---

## 7. Transparency

The elder can ask at any time:

> "What do you tell my family?"

and must receive a complete, plainly-spoken answer:

> "I tell Sree when you ask me to get help, and when an order is placed.
>  I don't tell anyone about your reminders. You can change any of that."

Also required:
- **A log of everything sent**, readable aloud ("what have you told Sree?").
- **Notification at the time of sending**, not only in a log.
- Nothing sent that the elder would be surprised to learn was sent. *If you would hesitate to say
  it to them, do not send it.*

---

## 8. Elder-initiated sharing

The safest and most valuable case: the elder asks.

> "Tell Sree I need help with this."

- Requires no prior grant — the request *is* the consent.
- Still scoped to that message only; it does not create a standing grant.
- Thuna confirms what it will say **before** sending:
  > "I'll tell Sree you'd like help with your food order. Shall I?"
- Recorded as `elderInitiated: true`.

---

## 9. Family-side boundaries

Family members may:
- Receive notifications the elder has consented to
- **Suggest** a routine, which the elder then approves or declines
- Help set up Thuna, with the elder present

Family members may **not**:
- Grant consent on the elder's behalf
- See anything not consented to
- Create routines the elder has not approved
- Silence, override, or reconfigure the elder's quiet hours and frequency settings
- Access memory, history, or transcripts
- Turn off the elder's ability to revoke

**If a family member asks Thuna to do any of these, Thuna declines and tells the elder it was
asked.** That last clause matters: a quiet request to expand monitoring is exactly the thing the
elder needs to know about.

---

## 10. Escalation without consent

When a routine reaches a state where family notification *would* help but no consent exists, Thuna:

1. **Does not notify.** No exceptions.
2. Offers the elder the choice at the next contact:
   > "You didn't answer this morning's reminder. Would you like me to let Sree know when that
   >  happens? I won't unless you say so."
3. Records the routine as `MISSED`, not `ESCALATED`.

### Emergencies

Thuna is **not** an emergency system and must not present itself as one. It cannot detect a medical
emergency, and any attempt to infer one would be exactly the health inference this document
prohibits.

Where an elder explicitly asks for urgent help, Thuna treats that as elder-initiated sharing (§8) and
acts at once. Where it cannot help, it says so plainly and points to real emergency services rather
than improvising.

This limitation should be stated during setup, honestly, so no family relies on Thuna for something
it cannot do.

---

## 11. Implementation notes

1. **The gate lives in `send()`**, not at call sites (`docs/contracts/notification-adapter.ts`).
   Call sites multiply; the adapter is one place.
2. **A blocked send is a normal result**, not an error. Never a fallback path that sends anyway.
3. **Default deny.** Absence of a grant means no. Never "not found → allow".
4. Grants live in relationship memory (`MEMORY_MODEL.md` §5) and are purged on profile reset.
5. Every send is audit-logged: recipient, category, timestamp, governing grant.
6. Test the **negative** cases hardest: no grant → blocked; revoked → blocked; wrong category →
   blocked; wrong recipient → blocked; family attempting to self-grant → refused.

---

## Related

- `docs/contracts/notification-adapter.ts` — enforcement point
- `ROUTINE_ENGINE.md` §3 — the `ESCALATED` gate
- `MEMORY_MODEL.md` §5, §10 — grants and sharing classes
- `COMPANION_PRODUCT_MODEL.md` §4 — the elder as principal
