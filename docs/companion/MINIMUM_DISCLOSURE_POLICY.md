# Thuna — Minimum Disclosure Policy

> Design document. **Changes no production code.**
>
> When Thuna asks a human for help, it discloses **the minimum needed for that human to help.**
> Not the minimum it can get away with — the minimum that actually works. Usually that is one
> sentence.

---

## 1. The principle

> **"Appa needs help with a payment."**
> not
> **"Appa failed three times at a UPI transfer and seemed confused."**

Both sentences get Sree to pick up the phone. Only one of them turns his father into a problem being
reported.

The second sentence is not more honest. It is more *about the elder* — and the extra content buys
nothing operational. Sree does not need to know it was three attempts to help with a payment. He
needs to know his father wants a hand. The rest is disclosure that serves the system's tidiness, not
the elder's need.

### The test

> **Would the elder be comfortable if the helper read this message aloud in front of them?**

If not, it says too much. This is the same test `FAMILY_CONSENT_POLICY.md` §7 applies to
notifications — *if you would hesitate to say it to them, do not send it* — applied to help requests.

### Why this is a separate policy from consent

Consent governs *whether* something may be sent. Minimum disclosure governs *what is in it*. An
elder can consent to a category and still be badly served by a verbose message inside it. The two
gates are independent, and a message must pass both.

---

## 2. What "needed to help" means

A helper needs to know four things at most, and often fewer:

| Element | Include when | Example |
|---|---|---|
| **Who** | Always | "Appa" |
| **What kind of help** | Always | "help with a payment" |
| **When / urgency** | Only if it affects the response | "this evening if you can" |
| **Where** | Only for `PHYSICAL_PRESENCE`, `TRANSPORT`, `HOUSEHOLD_REPAIR` | "at home" |

Everything else is elaboration. If a field does not change what the helper *does*, it does not go in.

### Worked examples

| Role | The whole message |
|---|---|
| `DIGITAL_HELP` | "Appa would like a hand with something on his phone." |
| `PAYMENT_HELP` | "Appa would like some help with a payment." |
| `PHYSICAL_PRESENCE` | "Appa would like someone to drop by when convenient." |
| `TRANSPORT` | "Appa would like a lift on Thursday morning." |
| `HOUSEHOLD_REPAIR` | "Appa needs someone to look at a tap at the house." |
| `FAMILY_CONVERSATION` | "Appa would like a call when you have a moment." |
| `APPOINTMENT_COORDINATION` | "Appa has an appointment on Thursday at eleven and would like a lift." |

Note the register: *"would like"*, not *"needs urgent help with"*. The elder is an adult asking a
favour, not a case being escalated. `COMPANION_PRODUCT_MODEL.md` §5.1 — never imply incapability.

Note also what is absent from every one of them: no duration, no attempt count, no description of
what went wrong, no assessment of the elder.

---

## 3. The elder hears the message before it is sent

**Non-negotiable.** Thuna quotes the exact text, in full, before sending anything.

> "I'll tell Sree you'd like some help with a payment. That's all I'll say. Alright?"

Requirements:

1. **The exact words**, not a paraphrase of them. A summary of a summary is where extra detail
   creeps back in unnoticed.
2. **What will *not* be said**, when the elder might reasonably worry about it. *"That's all I'll
   say"* is short and does a great deal of work.
3. **The elder may edit it.** "Don't say payment, just say I need help with the phone" is honoured
   exactly.
4. **The elder may add to it.** Anything the elder chooses to disclose is fine — this policy
   constrains *Thuna*, not the elder. If the elder says "tell him the bill is overdue", Thuna tells
   him the bill is overdue.

> **Why the elder may add but Thuna may not.** Disclosure about oneself is the elder's to make. The
> harm this policy prevents is Thuna disclosing on the elder's behalf, from information the elder
> did not realise Thuna was holding. When the elder chooses to share, none of that applies.

The sent text is stored verbatim as `FamilyRequest.disclosure`
(`FAMILY_REQUEST_LIFECYCLE.md` §2), so the read-back can quote rather than reconstruct.

---

## 4. Never disclosed

Regardless of consent, regardless of role, regardless of how helpful it would be.

### 4.1 Prohibited outright

These are prohibited memory (`MEMORY_MODEL.md` §9) and are equally prohibited in a request:

- Emotional state — "seemed upset", "sounded low", "was frustrated"
- Health or medical anything — conditions, symptoms, medicine names, dosages, which doctor
- Cognitive characterisation — "confused", "forgetful", "not himself"
- Behavioural observation — "he's been quieter this week", "third time this month"
- Location beyond what the role requires
- Conversation content, quoted or summarised

### 4.2 Prohibited because it is about difficulty, not need

These are technically factual and still must not be sent. They convert a request into a report:

| Never send | Why |
|---|---|
| Attempt counts — "tried three times" | The number is a measure of the elder, dressed as a fact about a task |
| Duration — "spent twenty minutes on it" | Same |
| The specific failing step — "couldn't enter the UPI PIN" | Precise, unnecessary, and humiliating |
| Error text from the app | Belongs to the elder's screen, not the family's inbox |
| Capability memory of any kind | `CAPABILITY_MEMORY.md` is `PRIVATE` and unshareable — §5 |
| Whether the elder has needed help with this before | A history of difficulty is exactly what a companion must not accumulate and transmit |

**This category is the heart of the policy.** The prohibited-outright list in §4.1 is easy — nobody
argues for sending "seemed confused". The difficult one is *"failed three times at a UPI transfer"*,
because it is true, it is factual, it is not an inference, and it feels like it helps. It does not
help enough to be worth what it costs.

### 4.3 Amounts and recipients in payment help

Never included by default:

- The amount
- Who was being paid
- Which app or bank
- That a transfer failed, or how

*"Appa would like some help with a payment"* is the entire message. If the elder wants Sree to know
it is the electricity bill, the elder tells him — §3.4.

---

## 5. Mapping to the existing consent categories

This policy adds no categories. It constrains the content of the ones in
`docs/contracts/notification-adapter.ts`.

| `NotificationCategory` | Used for | Disclosure ceiling |
|---|---|---|
| `ELDER_REQUESTED_HELP` | Most help requests | Who + kind of help. Nothing about difficulty. |
| `HANDOFF_REQUESTED` | The elder asked for a person instead of Thuna | Who + that a person is wanted. **Never why.** |
| `TASK_COMPLETED` | A task the elder chose to do finished | The task, factually. Not how it went. |
| `ACCOUNT_ACTION_NEEDED` | Re-authorisation and similar | The technical fact only |
| `ROUTINE_COMPLETED` | A routine was marked done | The routine and the time |
| `ROUTINE_MISSED` | **High sensitivity** — `FAMILY_CONSENT_POLICY.md` §4 | "Two reminders went unanswered at 9:00 and 9:10." Nothing else, ever. |

Note there is **no category for difficulty**, no category for capability, and no category for
progress. Their absence is the enforcement: a payload has to have a category, and none of the six
can carry *"he tried three times"*. `NotificationCategory` is not to be extended to make room for it
— adding a value there is a safety-relevant change (contract, `NotificationCategory` docstring).

### `HANDOFF_REQUESTED` — never why

> "Appa asked whether someone could help with this instead."

Not *"Appa asked for a person because he couldn't complete the form"*. The reason for wanting a
human is the elder's, and it is frequently the most exposing part of the whole interaction.

---

## 6. Progressive disclosure

The helper may reasonably want more. The answer is not to send more up front, and not to let Thuna
fill in the gap.

**The helper asks the elder.** That conversation is between them, Thuna is not in it, and Thuna does
not supply either side with material for it.

If a helper replies to Thuna asking *"what's actually wrong?"*:

1. Thuna does not answer from memory. Not partially, not vaguely.
2. Thuna tells the elder they asked, and offers:
   > "Sree's asking what the trouble is. Would you like me to tell him anything, or would you rather
   >  tell him yourself?"
3. Only what the elder dictates is sent, in the elder's own framing.

> **Why Thuna never answers directly.** The moment Thuna answers a helper's follow-up question from
> its own memory, it has become an information service *about* the elder, queryable by family. That
> is the same boundary `FAMILY_STORY_LOOPS.md` §6 draws for stories: family can respond to what was
> shared; family cannot query. Help requests get the identical rule, for the identical reason.

---

## 7. Elder-facing phrasing

**Quoting before sending:**

> "I'll say: 'Appa would like some help with a payment.' Nothing about what it's for. Shall I send
>  it?"

**Elder edits it:**

> **Elder:** "Don't say payment."
> **Thuna:** "Then I'll just say you'd like a hand with something. Alright?"

**Elder wants more said:**

> **Elder:** "Tell him it's the electricity bill and it's due tomorrow."
> **Thuna:** "I'll say: 'Appa would like help with the electricity bill, due tomorrow.' Send it?"

**Helper asks for detail:**

> "Sree's asking what the trouble is. Shall I tell him anything, or would you rather say yourself?"

**Reading back what was sent:**

> "I told Sree, word for word: 'Appa would like some help with a payment.' That was all."

**Declining to elaborate, to the helper:**

> "Appa will tell you the details himself."

---

## 8. Implementation notes for Codex

1. **`disclosure` is a bounded, templated string**, not model-generated free text. One template per
   role (§2), with slots only for who, kind, when, where. A model may not compose the outbound
   sentence — that is where extra detail would enter.
2. **Store the sent text verbatim** on the `FamilyRequest` record so read-back quotes it.
3. **`NotificationPayload.detail` is empty for help requests unless the elder dictated it.** Default
   `undefined`, never auto-populated from task state.
4. **The composer has no access to `capability` memory.** Enforce structurally — the function that
   builds a payload should not be able to reach that store at all, so the §4.2 rule is not a review
   comment.
5. **Assert prohibited-token checks in tests**, not just in review: no payload for a help request may
   contain attempt counts, step names, durations, error strings, or amounts. Fail the test on the
   presence of the field, not on a string match.
6. **No inbound query API for helpers.** §6. Absent, not gated.
7. **Do not extend `NotificationCategory`.** If a requirement seems to need a new one, it is a
   product-level ethics decision, not an enum change (contract docstring).
8. Test the read-back: what Thuna says it sent must be byte-identical to what was sent.

---

## Related

- `HUMAN_ATTENTION_BRIDGE.md` — when to ask a person at all
- `CIRCLE_OF_TRUST.md` §4 — high-sensitivity roles; the medical boundary
- `FAMILY_REQUEST_LIFECYCLE.md` §2, §3 — where `disclosure` lives and how it is sent
- `FAMILY_CONSENT_POLICY.md` §3, §4, §7 — categories, `ROUTINE_MISSED`, transparency
- `CAPABILITY_MEMORY.md` — why capability data can never appear in a disclosure
- `FAMILY_STORY_LOOPS.md` §6 — the same respond-don't-query boundary, for stories
- `docs/contracts/notification-adapter.ts` — `NotificationCategory`, `NotificationPayload`
