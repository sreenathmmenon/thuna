# Thuna — Follow-Up Engine

> Design document. **Changes no production code.**
>
> How a `PendingLoop` comes back later without becoming nagging — and how it is let go when it
> should be.
>
> The engine's whole job is the difference between *remembering* and *reminding*. Remembering is a
> service. Reminding, past a point, is pressure.

---

## 1. The one rule that shapes everything

> ## A companion that never forgets and never lets go is a nag.

Two failures sit either side of this, and both are real:

- **Dropping silently.** Thuna said it would remind, then didn't. Per `MEMORY_MODEL.md` §4, dropping
  a promise silently is *worse than never offering* — it teaches the elder that Thuna cannot be
  relied on for the one thing it claimed to be good at.
- **Asking forever.** The fourth "did you pay that bill?" is not a reminder. It is a small
  accusation, delivered by a machine, about something an adult chose not to do.

The engine's answer: **surface at natural moments, age gracefully, and eventually ask permission to
let go.** Never drop silently, never ask indefinitely.

---

## 2. Two ways a loop returns

| Path | Trigger | Feels like |
|---|---|---|
| **Scheduled** | The loop's own resolved trigger fired (`PENDING_LOOPS.md` §5) | A reminder the elder asked for |
| **Opportunistic** | A natural moment arose while Thuna was already talking | A companion remembering |

Opportunistic surfacing is what makes Thuna feel like it has continuity rather than a queue.
`OPEN` loops — those with no resolvable trigger, "later", "sometime" — return **only**
opportunistically. That is the point of `OPEN` being a healthy resting state: a vague promise should
not generate a scheduled interruption the elder never agreed to a time for.

---

## 3. Natural moments

A natural moment is one where mentioning the loop **costs the elder nothing extra** — Thuna is
already talking, and the conversation has room.

| Moment | Example |
|---|---|
| End of an elder-initiated conversation, after the task succeeded | "Before you go — you'd mentioned the parcel." |
| A scheduled contact that finished early with the elder still engaged | "While I have you — the Wi-Fi we didn't finish." |
| The elder mentions the same subject | "You'd asked me to remind you about that bill." |
| The elder asks what is outstanding | Direct answer, up to three items |
| A related event's reminder is firing | Merged into one utterance (§7) |

**Not natural moments:**

| Not a moment | Why |
|---|---|
| The elder just refused something | Refusal is a complete answer; loops are not a second attempt |
| The elder asked to stop | Stop means stop |
| A conversation that hit the turn cap | They are already trapped; do not extend |
| A distress or confusion response | Offer human help, then end — nothing else |
| The start of a proactive contact | The stated purpose must be the reason for calling, not a pretext (`CHECKIN_CONVERSATION_POLICY.md` §3) |
| Inside quiet hours | No exceptions |
| The elder is mid-task | One thing at a time (`COMPANION_PRODUCT_MODEL.md` §6) |

That fifth row deserves emphasis. Opening a proactive contact for reason X and immediately pivoting
to loops Y and Z is a pretext, and it is the same failure as opening with *"how are you feeling?"*
before a reminder. **A loop may extend a contact that already happened; it may never be the hidden
reason for one.**

### The one-loop rule

**At most one loop per contact**, opportunistic or scheduled. A second loop is not mentioned even if
it is due, even if it is quick. It waits for the next natural moment.

Reasoning: two loops in one conversation converts a companion into a to-do list read-out, and the
elder starts experiencing contact as an audit. One loop reads as *"it remembered"*; three read as
*"it is keeping score"*. The exception is the direct question *"what have I got outstanding?"*, where
the elder asked for the list and gets up to three items.

---

## 4. Ageing

`ageingStage` (`PENDING_LOOPS.md` §3) governs both frequency and phrasing. Loops get **quieter** with
age, not louder — the inverse of what a task manager does, and deliberately so.

| Stage | Age / surfaces | Frequency | Tone |
|---|---|---|---|
| `FRESH` | 0–3 days, `surfaceCount` 0–1 | May fire on its trigger; opportunistic freely | Direct: "You asked me to remind you about the bill." |
| `AGEING` | 3–14 days, `surfaceCount` 2 | Opportunistic only; at most once every 3 days | Softer, no implied expectation: "That bill is still on my list, if it's useful." |
| `STALE` | 14+ days, `surfaceCount` 3 | At most once a week | Offers release: "Shall I keep this on the list, or leave it?" |
| `RELEASE_OFFERED` | After a release offer | Never again unattended | Silent until the elder raises it, or auto-release at 30 days with notice |

Progression is driven by **`surfaceCount` and elapsed time**, never by the elder's response content.
A loop does not become urgent because it was ignored. Escalating tone in response to non-response is
precisely how a reminder becomes pressure, and it is the mechanism `CHECKIN_CONVERSATION_POLICY.md`
§4 bans as guilt and manufactured urgency.

### Phrasing shifts with age

The words matter more than the schedule here.

| Stage | Says | Never says |
|---|---|---|
| `FRESH` | "You asked me to remind you about the bill." | — |
| `AGEING` | "The bill's still on my list, if that's useful." | "You still haven't paid the bill." |
| `STALE` | "This has been on the list a while — keep it, or leave it?" | "This is the fourth time I've mentioned it." |

Counting attempts aloud is shaming. Thuna knows the count; it never uses it as an argument.

---

## 5. Abandonment with dignity

Letting go is a designed feature, not a garbage-collection detail.

### The release offer

At `STALE` with `surfaceCount` 3:

> "The electricity bill has been on my list for a couple of weeks. Would you like me to keep it, or
>  shall I take it off?"

Properties that make this respectful:

1. **Both options are equally available in the sentence.** "Or shall I take it off" is not an
   afterthought; without it, keeping is the only socially easy answer.
2. **No reason is requested.** Thuna does not ask why it was not done. That question has no good
   answer and no legitimate use.
3. **No count, no history, no comparison.** Not "this is the fourth time", not "like last month's".
4. **Either answer is fine and neither is commented on.** Keep → back to `AGEING` with a reset
   `surfaceCount`. Release → `CANCELLED`, `ELDER_RELEASED`.
5. **Released is not failed.** `LoopCompletion.method: ELDER_RELEASED` closes the loop without
   claiming the underlying thing happened, and without recording that it did not.

### Auto-release

If the release offer itself goes unanswered, the loop is auto-released after a further 30 days —
**with notice**, at the next natural moment:

> "I've taken that bill off my list. You can put it back any time."

Silent auto-release is prohibited. The elder's picture of what Thuna is holding must match what Thuna
is holding; otherwise the list is not trustworthy in either direction.

### What is never done at abandonment

| Never | Why |
|---|---|
| Escalate to family | An unfulfilled personal promise is not a welfare signal |
| Record the loop as failed | Nothing failed; a plan changed |
| Add it to a "things not done" summary | That artefact should not exist |
| Ask why | Not Thuna's business, and no good answer exists |
| Retain the description past the archive window | 90 days, like other episodic outcomes |

---

## 6. Loops Thuna owes

`THUNA_PROMISED` loops are held to a **stricter** standard than the elder's own, and it is the one
asymmetry in this document.

- Thuna may not release its own promise unilaterally. It either delivers, or it **admits** it could
  not:

> "I said I'd find out when the office opens, and I couldn't. Would you like me to try again, or
>  shall I leave it?"

- Failure is Thuna's and is stated as Thuna's (`COMPANION_PRODUCT_MODEL.md` §5.3). Never "you didn't
  give me enough to go on."
- No ageing to silence. A `THUNA_PROMISED` loop that goes stale is surfaced and admitted, not aged
  out. The point of the asymmetry: the elder should never wonder whether Thuna quietly forgot. They
  should always be told.
- Delivery requires the elder to have been **told** (`PENDING_LOOPS.md` §10). Asking Sree and
  getting an answer does not complete the loop; relaying it does.

---

## 7. Merging

Loops share the global reminder cap and the three-item speech limit
(`QUIET_HOURS_AND_FREQUENCY.md`). When a loop and an event reminder coincide, they are **merged into
one utterance**, not delivered twice:

> "Your electricity bill is due Friday — you said you'd pay it once your pension came. Has it come?"

That sentence is one contact, one event reminder, one `ELDER_WILL_DO` loop, and it reads as a person
remembering rather than two systems firing. Merging happens at speech time, per
`REMINDER_POLICY_ENGINE.md` §8, and the loop's `surfaceCount` still increments — a merged mention is
a mention.

Merge rules:

- Only merge loops and reminders about **the same subject**. Two unrelated things in one sentence is
  a list, not a merge.
- At most three items spoken (`CHECKIN_CONVERSATION_POLICY.md` §6).
- The **event's** purpose remains the stated reason for the contact. The loop rides along; it does
  not redefine why Thuna called.

---

## 8. Responses

| Response | Effect |
|---|---|
| "Yes, I did it" | `COMPLETED`, `ELDER_CONFIRMED`. Brief acknowledgement, then end |
| "Not yet" | Stays open. `surfaceCount`++. **No comment**, no "shall I remind you again?" unless asked |
| "Drop it" / "leave it" | `CANCELLED`, `ELDER_RELEASED`, immediate, no confirmation gauntlet |
| "Remind me tomorrow" | `SNOOZED` → new trigger, stated aloud |
| "What was that about?" | Read back `originalUtterance` honestly: "You said you'd pay it after your pension" |
| Silence | Loop unchanged, `surfaceCount`++, ages normally. **Never completes** |
| "Stop asking me about things" | Global loop pause (`QUIET_HOURS_AND_FREQUENCY.md` §6) |

"Not yet" deserves its own note. The correct behaviour is a plain acknowledgement and nothing else:

> "Alright."

Not "shall I remind you again tomorrow?", which converts a factual answer into a negotiation, and not
"no problem!", which implies there might have been one.

---

## 9. The outstanding-list question

When the elder asks *"what was I supposed to do?"* or *"what have you got for me?"*, they have
invited the list. Different rules apply.

- Up to **three** items, then "and a couple of others" (`CHECKIN_CONVERSATION_POLICY.md` §6).
- Ordered by **imminence**, not by age. What is happening soonest is what is useful.
- Include `THUNA_PROMISED` loops — what Thuna owes them is part of the answer, and omitting it would
  make the list flattering rather than accurate.
- Exclude `RELEASE_OFFERED` loops unless asked for everything.
- **No tone of accountability.** "Here's what's on the list" — never "here's what you still haven't
  done."
- Offer to clear: "Any of those you'd like me to drop?"

This also satisfies `MEMORY_MODEL.md` §6's read-back-aloud test: whatever Thuna holds must be
comfortably speakable. A loop list that would be uncomfortable to read aloud contains something that
should not have been captured.

---

## 10. Implementation notes for Codex

1. Ageing is a pure function of `(surfaceCount, createdAt, lastSurfacedAt, now)`. No response content
   as input. Assert this in a test — it is the rule most likely to be "improved" into a
   responsiveness heuristic.
2. The one-loop-per-contact cap belongs in the contact composer, not in each caller. One place.
3. `surfaceCount` increments on **spoken** mentions only, including merged ones. Not on scheduling,
   not on suppression by cap or dedup.
4. Opportunistic surfacing needs an explicit natural-moment predicate with the §3 exclusions encoded.
   Do not leave it to prompt wording — "use judgement" here becomes "mention it whenever" in
   practice.
5. Phrasing per ageing stage lives in the guidance layer as templates, keyed by stage. The model may
   translate and pace; it must not choose the register.
6. Auto-release must enqueue a **notice**, and the loop is not fully closed until the notice is
   delivered. Otherwise a crash produces exactly the silent drop this document forbids.
7. `THUNA_PROMISED` loops need a separate sweep that never auto-releases. Simplest safe
   implementation: exclude the kind from the auto-release query entirely.

---

## 11. Test cases

1. `OPEN` loops never generate a scheduled interruption
2. At most one loop surfaces per contact
3. A loop never opens a proactive contact by itself
4. Ageing tone softens; it never escalates
5. Attempt counts are never spoken
6. `surfaceCount` 3 → release offer, not a fourth ask
7. Release offer presents both options in one sentence
8. Release does not record the thing as not done
9. Auto-release delivers a notice; unnotified auto-release cannot occur
10. `THUNA_PROMISED` is never auto-released; it is admitted
11. Silence never completes a loop
12. "Not yet" gets acknowledgement only — no re-offer
13. "Drop it" is honoured immediately, no confirmation gauntlet
14. A loop is not surfaced after a refusal, a stop, or a distress response
15. A loop is not surfaced inside quiet hours
16. Merged loop + event reminder is one utterance and increments `surfaceCount`
17. Outstanding-list answer includes `THUNA_PROMISED` loops
18. Outstanding-list answer caps at three spoken items
19. Ageing does not depend on response content

Cases 3, 5, 9, 10 and 19 are the ones a naive implementation gets wrong.

---

## Related

- `PENDING_LOOPS.md` — the record, states, and bounds
- `PROMISE_EXTRACTION_POLICY.md` — how loops come to exist
- `PROACTIVE_COMPANION_POLICY.md` — the contact these surface inside
- `QUIET_HOURS_AND_FREQUENCY.md` — caps, pause, and the loop-specific pause
- `CONVERSATION_CONTINUITY.md` — resuming `RESUME_TASK` loops
- `CHECKIN_CONVERSATION_POLICY.md` §4, §5 — prohibited patterns, response handling
- `MEMORY_MODEL.md` §4 — why silent dropping is the worse failure
