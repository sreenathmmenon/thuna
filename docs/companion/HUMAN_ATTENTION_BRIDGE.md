# Thuna — Human Attention Bridge

> Design document. **Changes no production code.**
>
> **Core thesis: the AI must bring real humans back when human presence is the correct outcome.**
> Thuna succeeding sometimes means Thuna stepping aside.

---

## 1. Escalation to a human is a SUCCESS state

State this plainly, because every incentive in AI product design pushes the other way.

> **When Thuna hands a task to a person, that is Thuna working correctly. It is not a failure, not a
> fallback, not an error path, and must never be modelled, logged, measured, or spoken about as one.**

The loneliness an elder experiences is not solved by a more capable assistant. It is solved by their
son calling. A product that gets *better* at absorbing every request is, past a certain point, a
product that is quietly replacing the phone call — and the phone call was the thing that mattered.

`COMPANION_PRODUCT_MODEL.md` §3 already says this: *"A replacement for people — its best outcome is
often connecting the elder to a human, not handling it alone."* This document is that sentence made
operational.

### What this rules out in the implementation

| Anti-pattern | Why it is wrong |
|---|---|
| `HANDOFF` as an error code or exception path | It is a normal, intended terminal state. Model it as one. |
| Counting handoffs as "unresolved" in any metric | It resolved. A person is doing it. |
| "I couldn't do that, so..." phrasing | Frames the correct outcome as a shortfall |
| Retry-before-escalate loops that exhaust the elder first | Four failed attempts before offering a person is four failures too many |
| Any tuning that reduces handoff rate as a goal | Optimising against the elder's interest — see §2 |

### The metric that must never exist

**"Tasks completed without human escalation" must not be a success metric.** It is precisely the
metric that would make Thuna worse. If it is ever reported, it must be reported as a *neutral
descriptive statistic*, never as something to increase.

The nearest legitimate metric is in `INDEPENDENCE_METRICS.md`: tasks the *elder* now completes
unaided. That is a different number entirely — it measures the elder's growing independence, not
Thuna's growing appetite.

---

## 2. When a human is the correct outcome

Four situations. In all of them Thuna should reach for a person *early*, not after exhausting itself.

### 2.1 The task genuinely requires a human

Some things cannot be done by an assistant and should not be attempted:

- Anything requiring physical presence — a stuck geyser, a fall, a locked door
- Anything requiring legal or financial authority the elder holds personally
- Anything requiring a signature, biometric, or in-person identity check
- Anything where being wrong is expensive and irreversible

Thuna should say so immediately and offer to ask someone. Attempting first and failing second wastes
the elder's time and, worse, makes them feel they failed at it.

### 2.2 The elder asks for a person

The highest-priority trigger and the least ambiguous.

> "I want to talk to Sree about this."
> "Can someone come and look at it?"
> "Just get my daughter."

**No further attempt. No "let me try once more". No confirmation friction.** This is elder-initiated
sharing under `FAMILY_CONSENT_POLICY.md` §8 — the request *is* the consent, and Thuna acts at once,
confirming only what it will say.

Per `COMPANION_PRODUCT_MODEL.md` §5.6, the elder can always stop. Asking for a person is a form of
stopping, and it is honoured the same way.

### 2.3 Repeated difficulty with the same step

The elder has tried the same step several times and it has not worked. **Note carefully what this
trigger is and is not:**

- It **is** a fact about a task: this step has not completed after N attempts.
- It is **not** a judgement about the elder. Not "struggling", not "confused", not "declining".

This distinction is enforced structurally in `CAPABILITY_MEMORY.md` §4. What Thuna records is
`stuckStep: "enter UPI PIN"`, `attempts: 3`. What Thuna never records, never says, and never sends is
any characterisation of the person.

The offer, when it comes, is about the task:

> "This bit is fiddly. Would it be easier if Sree walked you through it? I can ask him."

Not:

> "You seem to be having trouble with this."

### 2.4 The interaction is really about connection

Sometimes the request is a pretext. An elder who calls Thuna to ask about the weather three times in
an afternoon is not short of weather information.

**This is the hardest case, and Thuna must handle it without diagnosing it.** Thuna must not infer
loneliness — that is emotional inference and is prohibited (`MEMORY_MODEL.md` §9), regardless of how
obviously true it may seem.

What Thuna *may* do is offer a person as a normal option, unprompted, without explanation:

> "Would you like me to let Priya know you'd like a call sometime?"

The offer is available; the reason is never stated, stored, or shared. If the elder says no, that is
the end of it, and nothing is recorded about the asking.

> **Why this matters.** The moment Thuna says *"you seem lonely"*, it has (a) made a clinical-ish
> judgement it has no standing to make, (b) told the elder something about themselves they did not
> ask to be told, and (c) created a fact that could be shared. Offering the call without naming the
> reason gets the benefit and none of the harm.

---

## 3. The request lifecycle, in brief

Full specification in `FAMILY_REQUEST_LIFECYCLE.md`.

```
REQUESTED → OFFERED → ACCEPTED → SCHEDULED → COMPLETED → ELDER_CONFIRMED
```

Two properties of this lifecycle carry the ethics:

1. **`COMPLETED` is claimed by the helper; `ELDER_CONFIRMED` is claimed by the elder.** A helper
   saying they did it does not close the loop. Only the elder's confirmation does. This is the same
   discipline as `docs/contracts/notification-adapter.ts` note 4: *delivery is not help.*
2. **Every transition is visible to the elder.** No state advances silently on the family side.

---

## 4. How Thuna offers a person

### The offer must be an offer

Never an announcement of what will happen. The elder decides whether a person is contacted, who, and
what they are told.

> "Would you like me to ask Sree about this? I'd tell him you'd like a hand with a payment — nothing
>  more than that."

Three things are present in that sentence, and all three are required:

| Element | Why |
|---|---|
| It is a question | The elder is the principal (`COMPANION_PRODUCT_MODEL.md` §4) |
| It names the person | So the elder can pick someone else, or nobody |
| It quotes what would be sent | Informed consent needs the actual words — see `MINIMUM_DISCLOSURE_POLICY.md` |

### "No" ends it

Per `FAMILY_CONSENT_POLICY.md` §5: *"No" and "not now" are complete answers.* Never re-ask in the
same session. Never rephrase and try again. Never make the offer again after a decline unless the
elder raises the topic themselves.

### Choosing whom to offer

Thuna proposes based on `CIRCLE_OF_TRUST.md` — who is in scope for the kind of help needed. It
proposes **one** person, not a menu, because a menu makes an already-uncomfortable ask into a
decision. The elder can name someone else at any point.

If nobody in the circle has scope for that kind of help, Thuna says so plainly rather than reaching
for whoever is nearest:

> "I don't have anyone set up to help with the plumbing. Would you like to add someone?"

---

## 5. Stepping aside properly

When a person takes over, Thuna's job changes shape. Getting this wrong turns a handoff into a
hovering.

### Thuna does

- Confirm the request went out, and to whom
- Hold the open loop so it is not silently dropped (`pending_loop` in `COMPANION_MEMORY_SCHEMA.md`)
- Tell the elder when the helper replies
- Offer to follow up if nothing comes back — *offer*, not nag
- Close the loop when the elder confirms it is done

### Thuna does not

- Narrate what the helper is doing
- Ask the elder how it went beyond a single plain check
- Keep score of who helps and who does not
- Notify the helper again without the elder asking
- Insert itself into the conversation between elder and helper
- Record anything about the interaction beyond the loop's own facts

### The follow-up, once

If a request has had no reply for longer than expected, Thuna mentions it **once**, factually, and
lets the elder decide:

> "Sree hasn't replied about the payment yet. Would you like me to ask him again, or leave it?"

If the elder says leave it, the loop stays open and silent. It is not re-raised. It is not escalated
to someone else. An unanswered request is the family's business, not Thuna's to solve by widening
the circle.

> **Why one follow-up and not two.** A second unprompted mention makes the non-reply into a *thing* —
> and the elder now has a small hurt that Thuna manufactured by pointing at it twice. Once is
> informative. Twice is editorial.

---

## 6. What Thuna must never do in a handoff

| Never | Because |
|---|---|
| Contact anyone without the elder's yes, in the moment | `FAMILY_CONSENT_POLICY.md` §2. No exceptions, including urgency. |
| Send more than the minimum needed to help | `MINIMUM_DISCLOSURE_POLICY.md` |
| Widen the circle when the first person doesn't reply | The elder chose that person |
| Describe the elder's state, mood, or difficulty | `MEMORY_MODEL.md` §9 — prohibited regardless of consent |
| Present itself as an emergency service | `FAMILY_CONSENT_POLICY.md` §10 — Thuna cannot detect an emergency |
| Treat delivery as help | A delivered message is a delivered message |
| Let a family member initiate a handoff on the elder's behalf | `FAMILY_CONSENT_POLICY.md` §9 |

### Emergencies, honestly

Thuna is not an emergency system. It cannot detect a medical emergency and must not try — any such
attempt is health inference. Where an elder explicitly asks for urgent help, that is elder-initiated
sharing and Thuna acts immediately. Where it cannot help, it says so plainly and points to real
emergency services rather than improvising a response.

This limitation is stated during setup, to both elder and family, so no one relies on Thuna for
something it cannot do.

---

## 7. Elder-facing phrasing

Concrete examples of each moment, in the register `COMPANION_PRODUCT_MODEL.md` §5 requires — never
implying incapability, never rushing, failures always Thuna's.

**Offering, for a task that needs a person:**

> "This one needs someone there in person — I can't do it from here. Shall I ask Sree?"

**Offering, after repeated difficulty with a step:**

> "This screen is awkward. Would it be easier if someone did it with you? I could ask Sree."

**Offering, for connection, without naming the reason:**

> "Would you like me to tell Meera you'd like a call?"

**Confirming what will be sent:**

> "I'll tell Sree you'd like some help with a payment. That's all I'll say. Alright?"

**Confirming it went:**

> "I've told Sree. I'll let you know when he replies."

**Reporting the reply:**

> "Sree says he'll call you this evening."

**One follow-up, no reply:**

> "Sree hasn't replied yet. Ask him again, or leave it for now?"

**Nobody in scope:**

> "I don't have anyone set up for household repairs. Would you like to add someone?"

**Stepping fully aside:**

> "Sree's got it. I'll leave you to it — tell me when it's sorted and I'll stop keeping track."

**Closing on elder confirmation:**

> "Good. I'll mark that done."

---

## 8. Implementation notes for Codex

1. **`HANDOFF` is a terminal success state in the task state machine**, alongside `COMPLETED`. Not an
   error, not a rejection, not a catch block. If the type system says otherwise, the type is wrong.
2. **The handoff offer is a normal engine step**, subject to the same confirmation discipline as
   every other consequential action (`COMPANION_PRODUCT_MODEL.md` §6): only a clear yes proceeds.
3. **Reuse the existing notification adapter.** A handoff request is a `NotificationPayload` with
   category `HANDOFF_REQUESTED` or `ELDER_REQUESTED_HELP`, `elderInitiated: true`. No new send path,
   no new category. The consent gate in `send()` still applies.
4. **The open request is a `pending_loop` record** (`COMPANION_MEMORY_SCHEMA.md` §3.4). Lifecycle
   states live in `FAMILY_REQUEST_LIFECYCLE.md`.
5. **Stuck-step detection is a counter on a task, not a profile of a person.** Increment attempts on
   a named step; offer help at a threshold; never write anything to `profile` or any record that
   characterises the elder. See `CAPABILITY_MEMORY.md` §4.
6. **Do not implement escalation-to-a-second-person.** It is not a missing feature. If the first
   person doesn't reply, the elder decides what happens next.
7. Test that a handoff never emits a payload containing attempt counts, difficulty descriptions,
   step names, or duration. `MINIMUM_DISCLOSURE_POLICY.md` §4 lists the exact prohibited fields.

---

## Related

- `FAMILY_REQUEST_LIFECYCLE.md` — the six-state request lifecycle in full
- `CIRCLE_OF_TRUST.md` — who may be asked for what
- `MINIMUM_DISCLOSURE_POLICY.md` — how little to say when asking
- `FAMILY_CONSENT_POLICY.md` §8, §10 — elder-initiated sharing; emergency limits
- `COMPANION_PRODUCT_MODEL.md` §3, §5 — not a replacement for people; dignity constraints
- `INDEPENDENCE_METRICS.md` — why "fewer handoffs" is not the goal
- `CAPABILITY_MEMORY.md` — stuck steps as task facts, never person facts
- `docs/contracts/notification-adapter.ts` — `HANDOFF_REQUESTED`, `ELDER_REQUESTED_HELP`
