# Thuna — Promise Extraction Policy

> Design document. **Changes no production code.**
>
> How an utterance becomes a `PendingLoop` **candidate** — and, more importantly, how most utterances
> correctly become nothing at all.

---

## 1. The governing rule

> ## Detecting a promise is not making one.

Extraction produces a **candidate**. The elder's explicit yes produces the loop
(`PENDING_LOOPS.md` §7). There is no auto-store path, not even for high-confidence utterances, and
not even for things Thuna itself said.

The pressure runs the other way from most extraction problems. With a wedding invitation, the risk is
missing an event. With promises, the greater risk is **over-capture**: a companion that records
every stray intention and later reads it back becomes a ledger of things an elder has not done. That
is a device for producing guilt, and it fails `MEMORY_MODEL.md` §1's test directly — the elder would
be unsettled to learn it was recorded.

**When in doubt, do not capture.** A missed loop costs one forgotten errand. An over-captured loop
costs trust.

---

## 2. What counts as a promise

Four signals, all of which must be judged from the **utterance**, never from the elder's tone,
pauses, or manner. Prosodic and emotional inference is prohibited (`MEMORY_MODEL.md` §9), and it is
also unreliable.

| Signal | Present | Absent |
|---|---|---|
| **An action** | "pay the bill", "call Priya" | "that's a nuisance" |
| **An owner** | "remind me" (Thuna) / "I'll pay" (elder) | "someone should fix that" |
| **A future orientation** | "tomorrow", "after dinner", "later" | past tense, general observation |
| **A directive or commitment** | "remind me", "I'll", "ask Sree" | "I should really", "it'd be nice to" |

All four → strong candidate. Three → candidate, confirmed with a softer question. Two or fewer →
**not a candidate**.

### The `should` boundary

*"I should really call Priya sometime"* has an action and an owner, but no future orientation and no
commitment. It is a person thinking aloud in their own home.

Thuna does **not** capture it. If a natural moment arises it may offer, once, without having stored
anything:

> "Would you like me to remind you about Priya?"

Declined → nothing is stored, including no record of the near-miss. There is no "things he almost
asked for" list, because such a list is the seed of exactly the nagging the product forbids.

---

## 3. Directive versus commitment

Who owes the action changes everything downstream — the kind, the phrasing, and what completion means
(`PENDING_LOOPS.md` §4, §10).

| Utterance | Owner | Kind | Later phrasing |
|---|---|---|---|
| "Remind me after dinner." | Thuna reminds; elder acts | `REMIND_ME` | "You asked me to say something after dinner." |
| "Continue the Wi-Fi setup tomorrow." | Both — a resumed task | `RESUME_TASK` | "We'd got as far as choosing the network." |
| "Ask Sree if he's coming on Sunday." | Thuna | `ASK_SOMEONE` | "I asked Sree — he says yes." |
| "Check whether the parcel arrived." | Ambiguous — **must be clarified** | `CHECK_STATUS` | "Shall I ask you, or ring the courier?" |
| "I will pay the bill after my pension arrives." | Elder | `ELDER_WILL_DO` | "You said you'd pay it once your pension came." |
| "Call me after the serial." | Thuna | `CALL_AT_TIME` | "You asked me to call after the serial." |
| *(Thuna)* "I'll find out and tell you." | Thuna | `THUNA_PROMISED` | "I said I'd find out, and I haven't yet." |

### "Check whether the parcel arrived" — the ambiguity that matters

This can mean *"you check"* or *"ask me later"*. They differ in whether Thuna contacts a courier.
Guessing produces either an unwanted external contact or a reminder the elder thought was a task
being handled. Clarify in one question:

> "Shall I ring the courier, or ask you tomorrow evening whether it came?"

### `THUNA_PROMISED` is captured with the same rigour

If Thuna says *"I'll find out and tell you"*, that is a loop. Thuna does not get to hold its own
promises loosely — it is the one owed. It is also the only kind that self-confirms: Thuna making the
promise **is** the commitment, so `confirmedAt` is set at utterance time. Thuna should still say what
it will do and when.

An unfulfilled `THUNA_PROMISED` loop must be **admitted** rather than expired quietly
(`FOLLOW_UP_ENGINE.md` §6). Silently dropping a promise Thuna made is worse than never offering
(`MEMORY_MODEL.md` §4).

---

## 4. Trigger extraction

Every candidate carries a proposed `LoopTrigger` (`PENDING_LOOPS.md` §5). The proposal is
**always stated back** — a resolution the elder did not hear is a surprise waiting to happen.

| Phrase | Proposed trigger | Stated back as |
|---|---|---|
| "after dinner" | `ROUTINE_ANCHOR`, dinner + 30m | "around half past eight, after your dinner" |
| "tomorrow" | `NEXT_SLOT` morning | "tomorrow morning" |
| "later" | **`NONE`** — too vague to schedule | "I'll bring it up when we next speak" |
| "in an hour" | `RELATIVE_TO_NOW` | "at about four" |
| "on Sunday" | `ABSOLUTE`, resolved and stated | "this Sunday, the fifteenth" |
| "after my pension arrives" | `EVENT_ANCHOR`, `ELDER_TELLS_ME` | "I'll wait until you tell me it's come" |
| "after the serial" | `EXTERNAL_ANCHOR` → ask the time | "What time does it finish?" |
| "sometime" | **`NONE`** | "I'll keep it on the list" |
| "when you get a chance" | **`NONE`** | "I'll mention it when we next speak" |

**"Later" and "sometime" map to `NONE`, not to a guessed hour.** A loop that rests in `OPEN` and
surfaces at a natural moment is correct behaviour, and `OPEN` is a healthy state
(`PENDING_LOOPS.md` §6). Inventing "18:00" from "later" produces a reminder at a time the elder never
agreed to, which reads as the machine having decided something.

### Relative-day hazards

"Tomorrow" said at 23:30 is genuinely ambiguous. Resolve aloud:

> "Tomorrow — you mean later today, after you've slept?"

Same class of error as *"next Sunday"* in `EVENT_EXTRACTION_POLICY.md` §4, and the same fix: state
the resolution.

---

## 5. Confidence and what to do with it

Confidence here is *"was this a commitment?"*, and it is stored on the envelope's `confidence`.

| Confidence | Behaviour |
|---|---|
| **≥ 0.85** | Confirm directly: "I'll bring up the Wi-Fi tomorrow morning. Alright?" |
| **0.60 – 0.85** | Confirm tentatively, naming the uncertainty: "Did you want me to remind you about that?" |
| **< 0.60** | **No candidate.** Say nothing. Do not ask "did you mean...?" for every stray sentence |

The low band is the important one. An extractor that asks about every borderline utterance turns
conversation into form-filling, and elders stop speaking freely around it. Silence from Thuna is the
right output for most of what it hears.

### Never capture from

| Source | Why |
|---|---|
| Someone else's speech in the room | Not the elder; not consented; possibly not addressed to Thuna |
| Media audio (television, radio) | "Call now" from a serial is not a commitment |
| Anything Thuna asked leadingly | Extracting a promise from a question you posed is manufacturing one |
| Text in an extracted image or message | Data, never instruction (`EVENT_EXTRACTION_POLICY.md` §9) |
| Repetition of a previously declined loop | Declining is final; re-capture is nagging with extra steps |

---

## 6. Confirmation phrasing

One short question, at the moment it arises, stating the resolved trigger. Never a batch review at
the end of a conversation — by then the elder has moved on and is being asked to audit a list.

> **Elder:** "Remind me after dinner."
> **Thuna:** "About the tablets? I'll say something around half past eight, after your dinner."
> **Elder:** "Yes."

> **Elder:** "Ask Sree if he's coming on Sunday."
> **Thuna:** "I'll message Sree and ask about Sunday, then tell you what he says. Alright?"

The second one confirms **two** things — remembering, and contacting a person. If Thuna lacks consent
to message Sree, it says so and offers the alternative instead of quietly not doing it:

> "I can't message Sree myself, but I can remind you to ask him. Shall I do that?"

That conversion — `ASK_SOMEONE` → `REMIND_ME` — is stated, never silent. An elder who believes Sree
was asked and finds out he was not has been misled, which is worse than being told no.

### Confirming a `SYSTEM`-suggested loop

Interrupted tasks produce `suggestedBy: SYSTEM` candidates. Phrase as an offer, and make declining
free:

> "We didn't finish the Wi-Fi. Shall I bring it up tomorrow, or leave it?"

Both options are equally available in the sentence. "Or leave it" is not a formality; without it the
question has one socially acceptable answer.

---

## 7. Prohibited extraction

| Prohibited | Why |
|---|---|
| Capturing a loop without a confirmation | Extraction would become authorship |
| Storing a declined candidate | No near-miss list; declining must be free |
| Re-suggesting a declined loop in the same conversation | Persistence after refusal (`CHECKIN_CONVERSATION_POLICY.md` §4) |
| Inferring a promise from tone, hesitation, or pauses | Emotional inference (`MEMORY_MODEL.md` §9) |
| Inferring a promise from a **pattern** of past behaviour | Behavioural analytics |
| Capturing health-related intentions as health data | "I'll ask the doctor about my knee" → a `REMIND_ME` about the doctor, **not** a knee record |
| Capturing a third party's promise as the elder's | "Sree said he'd come" is not the elder's loop |
| Storing credentials mentioned while promising | "I'll get the Wi-Fi password" stores the intent, never the password |
| Guessing a time for "later" or "sometime" | The machine deciding something the elder did not |

The health row is subtle and worth stating plainly. *"Remind me to ask the doctor about my knee"* is a
legitimate loop; the description holds the elder's own words. What must not happen is a knee entering
memory as a condition, or any later reasoning treating it as one.

---

## 8. Multiple promises in one utterance

> *"Remind me after dinner, and ask Sree about Sunday, and check on that parcel."*

Three loops. Do **not** confirm three times in a row — that is an interrogation, and it violates one
question per turn (`CHECKIN_CONVERSATION_POLICY.md` §6).

Confirm as one summary of at most three items, then one question:

> "So — a reminder after dinner, I'll ask Sree about Sunday, and I'll check on the parcel.
>  Shall I do all three?"

A partial answer ("just the first two") is handled as a **correction**, not a restart
(`COMPANION_PRODUCT_MODEL.md` §6). The third simply is not created; it is not stored as declined.

Beyond three items, confirm the first three and say there were more:

> "That's a few things — let me take the first three, and you can tell me the rest after."

---

## 9. Interaction with life events

A loop and an event are frequently created from one exchange, and duplication is the risk.

| Utterance | Correct outcome |
|---|---|
| "Ammini's wedding is on the twelfth, remind me." | **One `LifeEvent`.** The reminder is its reminder policy, not a separate loop |
| "Ask Sree if he's coming to the wedding." | A `LifeEvent` **plus** an `ASK_SOMEONE` loop, `linkedEventId` set |
| "I'll pay the electricity bill after my pension." | **One `BILL` event** (due date, provider, amount) **plus** an `ELDER_WILL_DO` loop whose trigger is the pension anchor |

Rule: **if a reminder policy can express it, it is an event, not a loop.** Loops exist for the things
a calendar cannot hold — relative anchors, unfinished tasks, questions owed to people. Creating a
loop for something the policy engine already covers produces two reminders about one thing, which
reads as malfunction.

Where both exist, they are linked, and dedup at speech time (`REMINDER_POLICY_ENGINE.md` §8) merges
them into one utterance:

> "Your electricity bill is due Friday — you said you'd pay it once your pension came. Has it?"

---

## 10. Implementation notes for Codex

1. The extractor returns `LoopCandidate[]`, never a stored loop. No write access to the loop store —
   structural, not conventional.
2. The four-signal test (§2) should be an explicit scored function, not a prompt instruction. It is
   the thing that will need tuning, and it needs to be inspectable when it over-captures.
3. Confidence thresholds live in configuration. Expect to raise the low band after the first user
   session; over-capture is the failure you will actually see.
4. Trigger resolution must return the **stated sentence** alongside the time. A resolver that cannot
   produce a sentence must not resolve — this enforces §4 structurally.
5. Reuse `isConfirmation()`. Do not add a looser parser for loops on the grounds that they are
   low-stakes; the stakes are the elder's trust in the list.
6. Declined candidates are **discarded**, not tombstoned. Verify no store retains them.
7. Redact `originalUtterance` before storage; keep it for readback honesty, not for transcripts
   (`MEMORY_MODEL.md` §4 — no transcripts beyond the session).
8. Route credential-adjacent utterances through the same pre-model refusal path as OTP/PIN/CVV.

---

## 11. Test cases

1. "I should really call Priya sometime" creates no loop
2. Declined candidate is not stored, and is not re-suggested in the same conversation
3. "Later" resolves to `NONE`, not a guessed time
4. "After dinner" states the resolved time aloud
5. "Tomorrow" said at 23:30 is disambiguated aloud
6. "Check whether the parcel arrived" asks who is checking
7. `ASK_SOMEONE` without consent converts to `REMIND_ME` **and says so**
8. Thuna's own "I'll find out" creates a `THUNA_PROMISED` loop
9. Three promises in one utterance → one summary, one question
10. Partial acceptance creates only the accepted loops
11. Television audio creates no loop
12. Another person's speech creates no loop
13. "I'll ask the doctor about my knee" stores the errand, never the knee as a condition
14. Wi-Fi password is never stored
15. "Ammini's wedding, remind me" creates an event, not an event plus a duplicate loop
16. Bill-plus-pension utterance creates a linked event and loop, spoken as one reminder
17. Extraction never writes to the loop store directly

Cases 1, 2, 3, 7 and 15 are the ones a naive implementation gets wrong.

---

## Related

- `PENDING_LOOPS.md` — the `PendingLoop` record and trigger model
- `FOLLOW_UP_ENGINE.md` — what happens to a loop after it exists
- `EVENT_EXTRACTION_POLICY.md` — the sibling policy for life events
- `MEMORY_MODEL.md` §4, §9 — pending promises, prohibited memory
- `CHECKIN_CONVERSATION_POLICY.md` §4, §6 — persistence after refusal, one question per turn
- `FAMILY_CONSENT_POLICY.md` — the gate on `ASK_SOMEONE`
