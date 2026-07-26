# Thuna — Trusted Person Handoff

> Design document. **Changes no production code.**
>
> Beat 4 of the safety response (`DIGITAL_SAFETY_POLICY.md` §3): routing to a real human when
> Thuna refuses. The refusal protects the elder from the attacker; the handoff protects them from
> being left alone with the problem.

---

## 1. Why the handoff is not optional

A refusal on its own can make things worse. Picture the moment: someone persuasive is on the
phone, there is a story about a blocked account, and the one thing that was helping has just said
no. The elder is now confused, still under pressure, and *less* supported than before. The
attacker is still there; Thuna has stepped back.

> **Every risk refusal ends by naming a specific real person and offering to reach them.**

Not "you should talk to someone". Not "consider consulting your family". A **named person** and a
**concrete offer**:

> "Shall I ring Sree?"

Naming matters. "Talk to your family" is a task the elder must now organise, while under pressure.
"Shall I ring Sree?" is a yes/no question with the work on Thuna's side — the only shape that
actually gets used in the moment it is needed.

---

## 2. Who a trusted person is

From `MEMORY_MODEL.md` §5 (relationship memory):

```
contactId, displayName          "Sree"
relation                        "son"
isTrusted                       ELDER-DESIGNATED
channelRefs                     opaque handles
consentGrants[]                 per-category
```

**`isTrusted` is set by the elder and only by the elder.** A family member cannot mark themselves
trusted, and being in the contact list does not confer it — `FAMILY_CONSENT_POLICY.md` §9.

### Selection when a handoff is offered

1. The person the elder names, if they name one — always wins.
2. Otherwise, the single elder-designated trusted contact.
3. If several exist, **offer at most two by name** and let the elder choose. Reading a list of
   contacts at someone mid-scam is not help.
4. **If none exists, say so honestly** and offer the safe generic route:

   > "I don't have anyone saved to call. If it's about your bank, the safest thing is to ring the
   >  number printed on your card — you'll reach the real bank that way. Would you like help
   >  finding it?"

   Do not invent a helpline number. A wrong number given confidently is
   `CONFIDENT_BLIND_INSTRUCTION` in another costume (`SCREEN_CONTEXT_ASSISTANCE.md` §1).

---

## 3. Consent

**The handoff is offered, never performed unilaterally.** The elder is the principal
(`COMPANION_PRODUCT_MODEL.md` §4), and that does not suspend because a risk was detected. An
elder whose family gets called against their wishes learns that Thuna reports on them, and the
next time something goes wrong they will not say so in front of it. **A safety feature that
suppresses disclosure makes the elder less safe, not more.**

| Situation | What happens |
|---|---|
| Elder says yes | Contact the person. `elderInitiated: true` — the request *is* the consent (`FAMILY_CONSENT_POLICY.md` §8) |
| Elder says no | **Accept immediately.** One neutral restatement of the refusal, then stop |
| Elder is silent | No contact. Silence is never consent — `ROUTINE_ENGINE.md` §1 |
| Elder says "not now" | No contact. Do not re-offer later in the session |
| No consent grant exists for that person | Irrelevant — this is elder-initiated, needs no standing grant |

### Declining

> Elder: *"No, don't call anyone."*
> Thuna: "That's alright. I won't call. I still won't help with that code, though —
>  and if you change your mind, just say."

Note both halves. The handoff is dropped; **the refusal is not.** Declining to call a person does
not unlock the refused action, and Thuna says so plainly rather than letting it seem negotiable.

Then stop. No pressure, no repetition, no "are you sure?" — `CHECKIN_CONVERSATION_POLICY.md` §4.

### Secrecy pressure makes the offer harder, never automatic

`SECRECY_REQUEST` is the signal explicitly designed to make the elder decline this offer
(`RISK_SIGNAL_MODEL.md` §3.2). Thuna may name that dynamic once, plainly:

> "The person asking you to keep this from Sree is the reason I'd like you to speak to him."

**Once.** Then it accepts the answer. Overriding an elder's refusal because "they've been
manipulated into it" is precisely the reasoning every paternalistic system uses, and Thuna does
not get to decide when an adult's no stops counting. The one move available is to say the true
thing clearly, and then respect the answer.

---

## 4. Minimum disclosure

The message to the trusted person is the **smallest thing that gets help moving**.

### What is sent

```
NotificationPayload
  category        ELDER_REQUESTED_HELP        ← always this one
  summary         "Appa asked me to let you know he'd like your help with something on his phone."
  detail          optional, factual, minimal: "It seemed like it might not be genuine."
  occurredAt
  elderInitiated  true
```

### What is never sent

| Never | Why |
|---|---|
| The scam message text | A record of the attack, and of the elder receiving it |
| The caller's number, the link, the QR payload | Same |
| Any credential, even partial | `DIGITAL_SAFETY_POLICY.md` §2 |
| How close the elder came to complying | The single most humiliating sentence Thuna could produce |
| The elder's distress, confusion or hesitation | Emotional inference — not implementable, per `docs/contracts/notification-adapter.ts` |
| Any count or history ("third time this month") | Behavioural analytics — `MEMORY_MODEL.md` §9 |
| A characterisation of the elder's judgement | `COMPANION_PRODUCT_MODEL.md` §5 |

### Why so little

The person on the other end needs exactly one thing: **to ring back and talk to the elder.** Every
additional detail is information the elder did not choose to share, and much of it is information
that shapes how their family sees them. A family member who is told "he nearly gave away his OTP"
now holds a story about their parent's competence — a story the elder never agreed to have told,
and one that tends to become an argument for taking away their independence.

Minimum disclosure is not primarily a privacy nicety. It is what keeps a safety event from
becoming evidence in a case against the elder's autonomy.

### The elder hears the message first

Before it is sent, Thuna states exactly what it will say (`FAMILY_CONSENT_POLICY.md` §8):

> "I'll tell Sree you'd like his help with something on your phone. Nothing more than that.
>  Shall I?"

If the elder wants more or less said, that governs. It is their message.

---

## 5. Category and consent mechanics

- **Always `ELDER_REQUESTED_HELP`** — the least sensitive category, defined in
  `docs/contracts/notification-adapter.ts` as elder-initiated.
- **No standing grant required.** The elder's yes in the moment *is* the consent
  (`FAMILY_CONSENT_POLICY.md` §8).
- **Scoped to this message only.** It creates no standing grant, and the next handoff needs a
  fresh yes.
- **Never `ROUTINE_MISSED` or `ACCOUNT_ACTION_NEEDED`.** Reaching for a more informative category
  because a scam feels serious is exactly the drift the typed consent gate exists to prevent.
- **No new category for this.** There is deliberately no `RISK_DETECTED` or `SCAM_ATTEMPT`
  category. Adding one would create a channel whose entire purpose is telling families their
  parent was targeted, and it would be the first thing a well-meaning family asked to have turned
  on by default. Its absence is the design —
  `docs/contracts/notification-adapter.ts`: *adding a value is a safety-relevant change.*

---

## 6. Handoff without notification

Often the best outcome needs no message at all:

- **Help the elder ring the person themselves.** Preferred — the elder speaks directly, Thuna
  sends nothing, and nothing is recorded beyond that a handoff was offered.
- **Suggest the safe route** — the number printed on the card, the branch they know.
- **Suggest waiting.** "Nothing has to happen tonight" is often the whole intervention.
  Delay defeats most fraud, because urgency is the mechanism.

`COMPANION_PRODUCT_MODEL.md` §3: Thuna's best outcome is frequently connecting the elder to a
human, not handling it alone.

---

## 7. What is recorded

```
RiskRefusalRecord                    ← DIGITAL_SAFETY_POLICY.md §6
  signal            e.g. SECRECY_REQUEST
  occurredAt
  handoffOffered    true
  handoffAccepted   true | false
  sharingClass      PRIVATE
  expiresAt         30 days
```

Plus, if a message was actually sent, the ordinary `DeliveryReceipt` audit entry — because
`FAMILY_CONSENT_POLICY.md` §7 requires the elder to be able to ask *"what have you told Sree?"*
and get a complete answer.

**`handoffAccepted: false` is not a flag to act on.** It is not surfaced to family, not counted,
and not used to justify contacting anyone later. It exists so the elder's own audit log is honest.

And Thuna tells the elder when it sends — no silent notification, ever
(`FAMILY_CONSENT_POLICY.md` §4.4):

> "I've told Sree you'd like his help. That's all I said."

---

## 8. Tone

The handoff must not read as an escalation, a report, or a rescue.

| Not this | This |
|---|---|
| "I'm alerting your son." | "Shall I ring Sree?" |
| "This needs to be reported." | "It'd be worth someone looking at this with you." |
| "You nearly got scammed." | "That message is a trick — they're good at it." |
| "Good thing I caught it." | *(say nothing about Thuna's role)* |
| "I'll let him know what happened." | "I'll just say you'd like his help." |

The elder is asking a family member for a hand with something — a completely ordinary thing an
adult does. It is not an incident. `DIGITAL_SAFETY_POLICY.md` §5: never shame, never praise,
never position Thuna as the minder.

---

## 9. Implementation notes for Codex

1. **The handoff offer is part of the refusal template**, not a separate decision. A refusal
   template without a handoff clause should fail review.
2. **Route through the existing `NotificationAdapter`.** `send()` performs the consent check
   internally; do not add a call-site bypass "because it's safety-related". A blocked send is a
   normal outcome (`docs/contracts/notification-adapter.ts` notes 2 and 5).
3. **Hard-code `category: 'ELDER_REQUESTED_HELP'`** on the handoff path. Make the sensitive
   categories unreachable from here.
4. **Summary is templated, not generated.** A model composing this message will add colour, and
   the colour is precisely what §4 forbids.
5. **Reuse `isConfirmation()`** for the elder's yes. Silence is not a yes here either.
6. **Preview before send**, per `FAMILY_CONSENT_POLICY.md` §8 — speak the message, then ask.
7. **No emergency override.** There is no code path that notifies without the elder's yes.
   `FAMILY_CONSENT_POLICY.md` §10.
8. Log `refusalId`, `handoffOffered`, `handoffAccepted`, and the delivery receipt. Never the
   signal content, never the refused message.

---

## Related

- `DIGITAL_SAFETY_POLICY.md` §3, §5, §6 — the response pattern, tone, minimal metadata
- `RISK_SIGNAL_MODEL.md` §3.2 — `SECRECY_REQUEST` and why it targets this offer
- `SCREEN_CONTEXT_ASSISTANCE.md` §4 — the other place Thuna offers a person
- `FAMILY_CONSENT_POLICY.md` §6, §7, §8, §10 — revocation, transparency, elder-initiated sharing
- `docs/contracts/notification-adapter.ts` — `ELDER_REQUESTED_HELP`, consent gate, audit trail
- `MEMORY_MODEL.md` §5, §9, §10 — relationship memory; prohibited memory; `PRIVATE`
- `COMPANION_PRODUCT_MODEL.md` §3, §4 — connecting to a human; the elder is the principal
