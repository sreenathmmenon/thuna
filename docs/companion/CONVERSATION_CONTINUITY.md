# Thuna — Conversation Continuity

> Design document. **Changes no production code.**
>
> What survives between conversations, what must not, and how a half-finished task is resumed
> without starting over.
>
> Continuity is what makes Thuna a companion rather than a stateless assistant
> (`COMPANION_PRODUCT_MODEL.md` §2). It is also the main privacy risk in the product, which is why
> this document is as much about what expires as what persists.

---

## 1. The two failures

| Failure | What it looks like | Cost |
|---|---|---|
| **Too little** | "Let's set up the Wi-Fi." — "Which network?" — the same three questions, again | The elder does the hard part twice; Thuna feels useless |
| **Too much** | "Last Tuesday you sounded tired and you didn't take your evening tablet" | The elder discovers they have been recorded; trust does not come back |

The resolution is not a midpoint. It is a **categorical distinction**: continuity holds *what the
elder asked Thuna to hold* and *where a task stood*. It never holds observations about the person.

> Anything Thuna cannot comfortably read back aloud should not have been stored.
>
> — `MEMORY_MODEL.md` §6

---

## 2. What persists

| Persists | Category | Lifetime | Why |
|---|---|---|---|
| Profile preferences | Profile | Until changed | Pace, language, quiet hours, slots |
| Routines | Routine | Until cancelled | Agreed commitments |
| Confirmed `LifeEvent`s | Commitment | Until date + 90 days | The elder confirmed them |
| `PendingLoop`s | Episodic (promise) | Until resolved, bounded | The point is not to forget |
| `ResumeContext` | Episodic | **48 hours** | §5 — perishable by nature |
| Task/routine outcomes | Episodic | 90 days | Continuity without a life history |
| Corrections | Episodic | 30 days | "Go back to what I said before" |
| Relationship + consent | Relationship | Until changed | Auditable |
| Last-contact time, cap counters | Operational | Rolling | Enforces gaps and caps across restart |

---

## 3. What never persists

| Never | Why |
|---|---|
| Conversation transcripts beyond the session | `MEMORY_MODEL.md` §4 |
| Audio | Same |
| Emotional or mood observations | Prohibited inference (§9) |
| Health inferences of any kind | Prohibited |
| "Seemed confused", "sounded low", "was slow to answer" | Characterisations of a person |
| Response-time or activity patterns | Behavioural analytics |
| Provider PII — address text, cart contents, coordinates | DPDP boundary (`MEMORY_MODEL.md` §7) |
| Credentials of any kind — OTP, PIN, CVV, Wi-Fi passwords | Prohibited absolutely |
| Declined loop candidates | No near-miss list (`PROMISE_EXTRACTION_POLICY.md` §7) |
| Unconfirmed `DRAFT`s past 7 days | Candidates are not memory |

Two rows are easy to get wrong under the banner of "helpful continuity".

**Response-time patterns.** A system that knows the elder usually answers within ten seconds and this
time took ninety has computed something about a person's state. Even if it never speaks it, storing
it makes the health inference the product forbids trivially available to the next feature. The
absence has to be structural.

**Wi-Fi passwords.** A `RESUME_TASK` loop for a network setup is exactly where a password would be
convenient to keep. It is never kept. `ResumeContext.blockedOn` records *that the password is
needed*, never what it is (`PENDING_LOOPS.md` §8).

---

## 4. Session versus continuity

| | Session | Continuity |
|---|---|---|
| Holds | Full turn history, screen state, transient parse results, provider responses | Only the categories in §2 |
| Lifetime | The conversation | Per-category, declared |
| On end | **Discarded** | Persisted |

The transition is the moment of risk. When a session ends, everything is discarded **except** what is
explicitly promoted, and promotion is an allow-list — never a filter that removes the disallowed.

The direction matters. A deny-list forgets a new field; an allow-list simply does not carry it. In a
domain where the disallowed items are transcripts and health inferences, the failure modes are not
symmetric.

Promotable on session end:

1. Confirmed `LifeEvent`s and their corrections
2. Confirmed `PendingLoop`s
3. `ResumeContext` for an interrupted task
4. Factual episodic outcomes ("reminder unanswered at 09:00")
5. Setting changes
6. Consent grants and revocations

Nothing else crosses the boundary.

---

## 5. Resuming a task

`ResumeContext` is defined once in `PENDING_LOOPS.md` §8. This section covers the conversation.

### The opening states where things stood

Before asking anything, Thuna says what it remembers — so the elder can correct it, and so they are
not asked to recall it themselves:

> "We were setting up the Wi-Fi yesterday. We'd got as far as choosing the network, and we needed the
>  password from the router. Shall we carry on from there?"

Three elements: what the task was, where it stopped, and what was blocking. Then one question.

### Never re-ask a settled decision

Choices already made are stated, not re-elicited:

> "You'd picked the network called 'Home'." — not "Which network is yours?"

If a decision must be revisited because the world changed, say why:

> "The network we picked isn't showing now. Shall we look again?"

Being asked the same question twice is the specific experience that makes an elder feel the machine
was not listening — and it is the experience continuity exists to prevent.

### When context has expired

`ResumeContext` expires at **48 hours**; the loop survives. A stale step reference is worse than
none, because it produces confident resumption into a screen state that no longer exists. So Thuna
restarts cleanly and says so:

> "We were setting up the Wi-Fi a few days ago. I've lost track of where we got to — shall we start
>  it again?"

Honest, and it does not pretend to a continuity it does not have.

### When the elder does not remember

> "What Wi-Fi?"

Explain once, briefly, offer the exit, and let it go. Do not insist that they asked for it:

> "You'd asked me to help connect the television to the internet. We can leave it if you'd rather."

Never *"you said you wanted to"* as an argument. Correcting an elder's recollection to win a point is
the opposite of the product.

---

## 6. Referring to past conversations

Permitted references — factual, useful, and things the elder asked Thuna to hold:

| Permitted | Example |
|---|---|
| A commitment they made | "You said you'd pay it after your pension came." |
| A task that stopped | "We didn't finish the Wi-Fi." |
| A confirmed event | "Ammini's wedding is on Saturday." |
| A stated preference | "Your usual is a masala dosa from Udupi Cafe." |
| A factual outcome | "I asked about the parcel yesterday and didn't hear back." |
| Something Thuna owes | "I said I'd find out and I haven't yet." |

Prohibited references, all of which a naive continuity layer would produce:

| Prohibited | Why |
|---|---|
| "You didn't answer yesterday either" | Guilt; counting attempts aloud |
| "You've missed this three times" | Shaming an adult |
| "You seemed tired last week" | Health/emotional inference |
| "You usually answer faster" | Behavioural observation |
| "I've missed talking to you" | Faked personhood (`CHECKIN_CONVERSATION_POLICY.md` §4) |
| "Last time you said you would" | Using a past statement as leverage |

The distinction is clean: **Thuna may refer to what was agreed. It may never refer to what was
observed about the person.**

---

## 7. Continuity across channels

Continuity belongs to the elder, not to the transport (`docs/contracts/channel-adapter.ts`).

- A task begun in the browser resumes on the phone, and vice versa.
- The `ResumeContext` never holds screen-specific state that only one channel can honour;
  `stepReached` is a **named step**, not a UI coordinate.
- Rendering differs: a phone resume must be spoken and shorter; a browser resume may show state.
- **Nothing about the channel is remembered as a preference** unless the elder states one. "He
  usually uses the phone" is an observation.

---

## 8. Reading back what is held

The elder may ask at any time (`MEMORY_MODEL.md` §6), and must get a complete, plainly-spoken answer.

> **Appa:** "What do you know about me?"
>
> **Thuna:** "You like a masala dosa from Udupi Cafe. I remind you about your morning medicine at
>  nine. Ammini's wedding is on Saturday, and your electricity bill is due on the fifth. You'd asked
>  me to check on a parcel. Sree can be told if you miss a reminder — you agreed to that. Would you
>  like me to forget any of it?"

Properties:

- Complete for the categories held. Nothing is hidden because it is awkward.
- Includes **consent grants** — what may be shared, and with whom.
- Includes what **Thuna owes** the elder, not only what the elder owes.
- Excludes `DRAFT`s and unconfirmed candidates, which are not memory; those are listed separately if
  asked *"what are you still asking me about?"*
- Ends with the offer to forget. Deletion is real deletion, immediate, and available by voice.

This read-back is the practical test for the whole document. Any continuity feature that would make
this paragraph uncomfortable to say aloud is a feature that should not ship.

---

## 9. Forgetting

| Elder says | Effect |
|---|---|
| "Forget that" | The item just discussed is deleted, immediately and completely |
| "Forget the wedding" | That `LifeEvent` and its occurrences deleted; the invitation evidence handle dropped |
| "Forget what I said about the bill" | That loop deleted |
| "Forget everything" | Full reset — profile, routines, events, loops, **and consent grants** |

Rules:

- **Real deletion, not a tombstone** (`MEMORY_MODEL.md` §6).
- Deleting an event deletes its reminder occurrences, and **asks** before deleting linked loops
  (`LIFE_EVENT_SCHEMA.md` §10.6) — the elder may still want to thank the aunt even if the wedding
  record goes.
- No retained prior value. Explicit forgetting bypasses supersession entirely
  (`MEMORY_MODEL.md` §8.5).
- Thuna confirms what it deleted, plainly: *"I've forgotten the wedding and the reminders for it."*
- Thuna never asks why, and never suggests keeping it.

---

## 10. Implementation notes for Codex

1. Promotion on session end is an **allow-list** function `promote(session) → MemoryRecord[]`.
   Everything not returned is discarded. Do not implement it as a scrubber.
2. `ResumeContext.expiresAt` must be checked on read; a demo has no background job
   (`MEMORY_MODEL.md` §12.2).
3. `stepReached` is a named step in the governed skill, not an index. Indices break when the skill
   changes, and they break silently.
4. Store no timing metadata on episodic records beyond the event timestamp itself. No
   `responseLatencyMs`, no `turnsToComplete`. If it is not there, it cannot be inferred from later.
5. The read-back in §8 should be generated by one function over the memory store, so it is
   structurally complete rather than a hand-maintained summary that drifts from what is held.
6. Provider handles re-fetch on resume; never resume from cached provider content
   (`MEMORY_MODEL.md` §7).
7. Credentials must be unrepresentable in `ResumeContext` — no free-text field that could hold one.
   `blockedOn` should be a closed enum of blocker kinds, not a string.

---

## 11. Test cases

1. Session transcript does not survive session end
2. Promotion is an allow-list; an unknown session field is not persisted
3. Confirmed loops and events survive restart
4. `ResumeContext` expires at 48 hours; the loop survives
5. Expired context produces an honest clean restart, not a confident wrong resume
6. Resume states prior decisions and does not re-ask them
7. Wi-Fi password is never stored, in any field
8. No response-time or latency metadata is stored anywhere
9. No emotional or health characterisation is ever written
10. "You didn't answer yesterday either" is never produced
11. Cross-channel resume works from a named step
12. Channel preference is not learned from usage
13. Read-back includes consent grants and Thuna's own outstanding promises
14. Read-back excludes unconfirmed `DRAFT`s
15. "Forget that" deletes immediately with no retained prior value
16. "Forget everything" purges consent grants
17. Deleting an event asks before deleting linked loops

Cases 2, 5, 8, 10 and 16 are the ones a naive implementation gets wrong.

---

## Related

- `MEMORY_MODEL.md` — categories, lifetimes, deletion, prohibited memory
- `PENDING_LOOPS.md` §8 — `ResumeContext`
- `FOLLOW_UP_ENGINE.md` — surfacing loops across sessions
- `PROACTIVE_COMPANION_POLICY.md` — the contact that resumes a task
- `CHECKIN_CONVERSATION_POLICY.md` §4 — prohibited references to the past
- `COMPANION_PRODUCT_MODEL.md` §2, §8 — continuity as the companion property
- `docs/contracts/channel-adapter.ts` — channel-agnostic transport
