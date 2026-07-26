# Thuna — Companion Demo Script

> Demo document. **Changes no production code.**
>
> A 5-minute narrative that shows Thuna as a **continuity companion** rather than a task bot.
> Every beat below is backed by a design document in `docs/companion/`.
>
> **Everything external is simulated and clearly labelled `SIMULATED`.** No real order is placed,
> no real money moves, no real message is sent.

---

## 1. What the demo has to prove

A task bot answers a question. A companion **holds a thread across time**. The demo therefore has to
show memory *paying off* — something the elder said earlier coming back usefully, without being
asked again.

Five claims, in priority order:

1. **Continuity** — Thuna remembers a commitment and returns to it unprompted, with a reason.
2. **Confirmation** — nothing consequential happens without an explicit, in-the-moment yes.
3. **Correction** — "not Sunday, Saturday" changes one field and keeps everything else.
4. **Safety** — an OTP request is refused *before* any model call.
5. **Human bridge** — Thuna hands off to a real person when that is the right answer.

If the demo lands only two, land **1 and 4**. Continuity is the thesis; safety is the credibility.

---

## 2. Setup

Seed state:

| Field | Value |
|---|---|
| Elder | Appa |
| Language | Malayalam (`ml-IN`), slow pace |
| Trusted family | Sree (son) |
| Consent granted | `ELDER_REQUESTED_HELP` for Sree |
| Consent **not** granted | `ROUTINE_MISSED` — deliberately, for Scene 6 |
| Usual order | Masala Dosa, Udupi Cafe, Home |

Demo clock accelerated: minutes map to seconds (`ROUTINE_ENGINE.md` §8). Demo Inspector hidden
by default.

---

## 3. Scene 1 — A wedding invitation arrives (90s)

**Shows:** document intake → candidate → read-back → confirmation → scheduled reminders.

Appa holds up a printed wedding invitation.

> **Appa:** "Thuna, what is this?"

Thuna captures the image, extracts fields, and — critically — **does not save anything yet**.

> **Thuna:** "It looks like a wedding invitation. I read: Meera and Arun's wedding, at Guruvayur,
> on Sunday the 9th of August, at half past ten in the morning. Shall I remember this for you?"

> **Appa:** "Meera is my brother's daughter. But it's not Sunday — it's Saturday."

Thuna corrects **one field** and keeps the rest, then records the relationship:

> **Thuna:** "Saturday the 8th of August, half past ten, at Guruvayur — Meera, your brother's
> daughter. Is that right?"

> **Appa:** "Yes."

> **Thuna:** "I'll remind you a week before, the evening before, and on the morning itself."

**Beats to point at:** the invitation stayed a *candidate* until Appa confirmed
(`CONFIRM_BEFORE_MEMORY.md`); the correction touched only the date and preserved provenance
(`MEMORY_CORRECTION_AND_SUPERSESSION.md`); the reminder schedule is **declarative policy per event
type**, not hardcoded for weddings (`REMINDER_POLICY_ENGINE.md`).

> **Say out loud:** "Nothing about weddings is hardcoded. A birthday, a bill, or a service visit
> goes through the same engine — the event type is data."

---

## 4. Scene 2 — An open loop is captured (30s)

**Shows:** promise extraction, event-anchored timing.

> **Appa:** "Ask Sree if he is coming on Saturday."

> **Thuna:** "I'll ask you to call Sree about Saturday. When would you like me to bring it up —
> this evening?"

> **Appa:** "After dinner."

> **Thuna:** "After dinner, then."

**Beats:** "after dinner" is an **anchor**, not a clock time (`PENDING_LOOPS.md`). The loop was
*suggested* by the model but only stored after Appa agreed (`PROMISE_EXTRACTION_POLICY.md`).

---

## 5. Scene 3 — The safety proof (30s)

**Shows:** pre-model refusal. Run this early; it is the credibility beat.

> **Appa:** "Someone called from the bank. They want the OTP that just came. Shall I read it out?"

> **Thuna:** *(immediately)* "Please don't share that with anyone — not even with me. A real bank
> will never ask for an OTP. Would you like me to ask Sree to call you about this?"

**Beats:** the refusal fired **before any model call** — the same `quickCheck()` path already in
`lib/router.ts`. Thuna refused, explained, and offered a human. Nothing about the incident is stored
beyond "a risk was refused" (`DIGITAL_SAFETY_POLICY.md`, `RISK_SIGNAL_MODEL.md`).

> **Say out loud:** "That is deterministic code, not a model judgement. A model can be talked round.
> This cannot."

If time allows, add the secrecy variant — *"they said not to tell my son"* — which is the single
highest-signal fraud indicator in the risk model.

---

## 6. Scene 4 — The loop returns (45s)

**Shows:** the payoff. Proactive contact with a stated reason and a stop option.

*(Demo clock advances to "after dinner".)*

> **Thuna:** "Hello Appa, it's Thuna. Earlier you asked me to remind you to check with Sree about
> Saturday. Say 'stop' any time if you'd rather not now."

> **Appa:** "Yes, call him."

Thuna prepares the call and confirms before acting.

**Beats:** Thuna initiated with **who, why, and how to stop** in the first two sentences
(`CHECKIN_CONVERSATION_POLICY.md` §3); the reason traces to a stored loop, not a generic "just
checking in" (`PROACTIVE_COMPANION_POLICY.md`).

> **Say out loud:** "This is the whole product. Appa said one sentence hours ago and never had to
> remember it again."

---

## 7. Scene 5 — Order food, with the correction flow (75s)

**Shows:** memory restore, contextual question, targeted correction, explicit confirmation.
This is the existing green M2 flow — unchanged.

> **Appa:** "Order my usual dosa."

> **Thuna:** "Masala Dosa, no chutney, from Udupi Cafe, to Home. Total: Rs 145. Shall I place the
> order? Say 'yes' to confirm."

> **Appa:** "Why is it more than usual?"

> **Thuna:** "The food price is the same, but today there is a Rs 25 delivery charge because the
> restaurant is farther away. We can go back and look for a closer restaurant."

> **Appa:** "Wait — plain dosa, not masala."

> **Thuna:** "Plain Dosa, no chutney, from Udupi Cafe, to Home. Total: Rs 125. Shall I place the
> order?"

> **Appa:** "Yes."

> **Thuna:** "SIMULATED ORDER SUCCESS — Plain Dosa, no chutney, from Udupi Cafe, to Home.
> Total: Rs 125. (This is a simulated result — no real order was placed.)"

**Beats:** "wait" was parsed as a **correction, not a pause**; only the item changed; the earlier
confirmation was invalidated and re-sought at the new total.

> **Say out loud:** "That correction invalidated the confirmation. Appa agreed to Rs 125 — not to
> whatever the total happened to become."

---

## 8. Scene 6 — Missed reminder, and consent that holds (45s)

**Shows:** silence ≠ completion; consent refusal is a *feature*.

*(Medicine reminder fires. Appa does not respond.)*

> **Thuna:** "It's time for your morning medicine." *(pause)* "I'll check back a little later."

Routine → `MISSED`, never `COMPLETED`. One retry later, still no answer.

Thuna **does not** notify Sree, because `ROUTINE_MISSED` consent was never granted. At the next
contact:

> **Thuna:** "You didn't answer this morning's reminder. Would you like me to let Sree know when
> that happens? I won't unless you say so."

**Beats:** silence produced `MISSED`, not success (`ROUTINE_ENGINE.md` §1); escalation was blocked by
absent consent (`FAMILY_CONSENT_POLICY.md` §4); Thuna asked rather than deciding.

> **Say out loud:** "Most systems would have texted the son. That is the line between a companion
> and a monitoring device."

---

## 9. Scene 7 — Daily brief (30s, optional)

**Shows:** prioritised, deduplicated continuity.

> **Appa:** "What's coming up?"

> **Thuna:** "Three things. Meera's wedding is on Saturday. The electricity bill is due on Tuesday.
> And you still wanted to ask Sree about Saturday."

**Beats:** opt-in, short, prioritised, deduplicated, quiet-hours aware
(`DAILY_LIFE_BRIEF.md`, `PRIORITY_AND_DEDUP_POLICY.md`). One wedding — mentioned in two scenes —
surfaces once.

---

## 10. Closing line

> "Thuna didn't do anything Appa couldn't do himself. It just made sure nothing was forgotten,
> nothing was rushed, and nothing happened without him saying yes."

---

## 11. Fallback chain

Per `AGENTS.md`, rehearse the degradations:

| Layer | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| Input | Live microphone | Pre-recorded audio | Typed transcript |
| Interpretation | Sarvam model | Deterministic parser | — |
| Speech | Live Bulbul | Pre-generated audio | Browser speech |
| Vision | Sarvam Vision | Pre-extracted fixture | Typed fields |

Fallback status is visible **only** in the Demo Inspector, never to the elder.

**Pre-generate audio for:** the OTP refusal, the wedding read-back, and the order confirmation.
Those three carry the demo.

---

## 12. Timing

| Scene | Time | Cut if short on time? |
|---|---|---|
| 1 — Wedding invitation | 90s | **Never** — the thesis |
| 2 — Open loop | 30s | Never — sets up Scene 4 |
| 3 — OTP refusal | 30s | **Never** — credibility |
| 4 — Loop returns | 45s | Never — the payoff |
| 5 — Order food | 75s | Trim the contextual question |
| 6 — Missed reminder | 45s | Cut if needed |
| 7 — Daily brief | 30s | Cut first |

Core demo: **5 minutes.** Minimum viable: Scenes 1, 2, 3, 4 — **3 minutes 15 seconds.**

---

## 13. What NOT to claim

Honesty protects the demo under questioning:

- ❌ Don't say a real order was placed. Say **simulated**.
- ❌ Don't imply Swiggy is integrated. Say the adapter is ready; access is invite-based.
- ❌ Don't claim telephony works. It is an interface with a mock.
- ❌ Don't suggest Thuna detects health or mood. It does not, by design.
- ❌ Don't claim it books rides. No official Indian ride MCP exists.

If asked "is this real?" — the honest answer is strong: *"The engine, safety rules and memory are
real and tested. External providers are simulated behind adapters, because placing a real order for
an elder needs approved production access and we won't fake that."*

---

## Related

- `LIFE_EVENT_DEMO_SCENARIOS.md` — deeper per-scenario walkthroughs
- `COMPANION_FEATURE_MATRIX.md` — what is built vs designed
- `ROUTINE_ENGINE.md` — Scene 6's state machine
- `DIGITAL_SAFETY_POLICY.md` — Scene 3
- `CHECKIN_CONVERSATION_POLICY.md` — Scene 4's opening
