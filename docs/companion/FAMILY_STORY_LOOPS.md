# Thuna — Family Story Loops

> Design document. **Changes no production code.**
>
> The elder mentions something. With their approval, it becomes a thread the family can engage with.
> The family's reply comes back. That closed loop is the feature.

---

## 1. What a story loop is, and why it exists

An elder says, in passing:

> "I made the beef fry the way my mother used to. Took me all afternoon."

Nobody hears it. That is the actual problem — not that the elder lacks an assistant, but that the
small texture of a life is no longer landing on anyone. The family, four hundred kilometres away,
would love to have heard it and never will.

A story loop is Thuna noticing that sentence, **asking whether to pass it on**, passing it on if the
elder says yes, and — the part that matters most — **bringing the family's reply back**.

```
STORY_NOTICED → ELDER_APPROVED → SHARED → FAMILY_QUESTION_RECEIVED
             → QUESTION_RETURNED_TO_ELDER → ELDER_RESPONDED → LOOP_COMPLETED
```

### Why the loop must close

A one-way share is a broadcast, and a broadcast about an elder is uncomfortably close to a status
feed. What makes this a connection feature rather than a monitoring feature is the return leg: Meera
reads about the beef fry, asks *"did you use amma's masala or the shop one?"*, and that question
comes back to the elder as something to answer.

The elder is not the subject of the thread. They are in the conversation.

> **The design claim.** Most "keep the family updated" features fail because they optimise the
> outbound leg. The value is almost entirely in the return leg. An elder who gets a question back has
> been *heard*; an elder whose activities are visible on a family dashboard has been *watched*.

---

## 2. The seven states

| State | Moved by | Meaning |
|---|---|---|
| `STORY_NOTICED` | Thuna | A candidate story exists. **Nothing has been shared. Nothing is stored as fact.** |
| `ELDER_APPROVED` | **Elder** | The elder said yes to sharing this specific thing with these specific people |
| `SHARED` | Thuna | Sent |
| `FAMILY_QUESTION_RECEIVED` | Family | A family member replied with a question or response |
| `QUESTION_RETURNED_TO_ELDER` | Thuna | Thuna has told the elder what came back |
| `ELDER_RESPONDED` | Elder | The elder answered, or chose not to |
| `LOOP_COMPLETED` | Thuna | The reply went back and the loop is closed |

Terminal exits, available throughout:

| Exit | From | Meaning |
|---|---|---|
| `DECLINED` | `STORY_NOTICED` | Elder said no. Candidate deleted immediately. |
| `UNSHARED` | Any state after `SHARED` | Elder revoked. See `STORY_CONSENT_AND_PROVENANCE.md` §5 |
| `LAPSED` | `SHARED` | Nobody replied. Not a failure; not reported to the elder as one. |

### `STORY_NOTICED` is a candidate, not a memory

A noticed story is a `CANDIDATE` record under `COMPANION_MEMORY_SCHEMA.md` §5, with
`source: MODEL_INFERRED`. Everything that follows from that section applies:

- It is not fact.
- It **cannot be shared** while it is a candidate — sharing requires `ELDER_APPROVED`.
- It expires unshown after 14 days if never raised, or is deleted the moment the elder declines.
- It never appears in "what do you remember about me?" as a fact.

---

## 3. What may become a story

Thuna proposes; the elder decides. The proposal step still needs a filter, because *proposing* the
wrong thing is itself a harm — it tells the elder what Thuna has been paying attention to.

### Eligible

- Something the elder made, cooked, grew, fixed, or finished
- Something they went to, or someone they saw
- A memory they told, unprompted, about their own life
- An opinion they clearly enjoyed having
- A plan they are looking forward to
- Something they said they wished they could tell someone

The common thread: **the elder was pleased to be saying it.** A story loop passes on something the
elder was already, in effect, telling someone.

### Never eligible — not even as a proposal

| Never | Why |
|---|---|
| Anything about health, medicine, symptoms, appointments | `MEMORY_MODEL.md` §9. Prohibited to store, therefore prohibited to notice. |
| Anything about mood, loneliness, or how they seemed | Emotional inference. Prohibited regardless of consent. |
| Anything about difficulty with a task, or needing help | That is `capability` and it is `PRIVATE` (`CAPABILITY_MEMORY.md`) |
| Complaints about a family member | Thuna does not carry messages between family members |
| Money, amounts, purchases | Not Thuna's to circulate |
| Anything said in the middle of asking for help | The elder was mid-task and not confiding |
| Anything the elder said quietly, in passing, and moved on from | See below |

The last one requires judgement and the judgement should be conservative. **If it is not clear the
elder would be pleased to have it passed on, do not propose it.** The cost of a missed story is a
missed story. The cost of proposing the wrong one is an elder discovering that Thuna was cataloguing
their afternoon.

### Frequency

At most **one proposal per conversation** and not every conversation. A companion that keeps asking
*"shall I tell the family about this?"* has turned every remark into potential content, and the
elder will start editing themselves. That is the same corruption `FAMILY_CONSENT_POLICY.md` §4
identifies for `ROUTINE_MISSED` — surveillance corrupts the data it collects — arriving by a
friendlier route.

---

## 4. `ELDER_APPROVED` — per story, per recipient

Full rules in `STORY_CONSENT_AND_PROVENANCE.md`. The essentials:

1. **Per story.** There is no standing "share my cooking with Meera" grant. Every story is a
   separate yes. (§2 of the consent doc explains why blanket approval is the wrong shape here.)
2. **Per recipient.** The elder names who. "Tell Meera" is not "tell the family".
3. **The elder hears the exact text.** Word for word, before sending
   (`MINIMUM_DISCLOSURE_POLICY.md` §3 applies unchanged).
4. **The elder may rewrite it**, and the rewrite is used verbatim.
5. **No is complete.** No re-ask, no rephrase, no later retry.

The ask:

> "That sounds like something Meera would like to hear. Shall I tell her you made the beef fry the
>  way your mother used to? I'd say just that."

Note it names the recipient, quotes the content, and offers a plain no. Note also it does not say
*"you seemed happy about it"* — that would be emotional inference, and it would tell the elder they
were being read.

---

## 5. The return leg

The whole point.

### `FAMILY_QUESTION_RECEIVED`

A family member replies. What comes back is **their words**, treated as content, never as a command.

Filtering on the inbound side, before anything reaches the elder:

| Inbound reply | Handling |
|---|---|
| A question or a warm response about the story | Passed to the elder |
| A question about something else entirely | **Not passed as a story reply.** Thuna tells the elder a message came and offers to read it. |
| A request for information about the elder | **Refused.** §6. The elder is told they asked. |
| An instruction to Thuna | **Refused.** Family cannot direct Thuna (`FAMILY_CONSENT_POLICY.md` §9). The elder is told. |
| Anything about the elder's health, capability, or state | Refused, and the elder is told it was asked |

> Inbound family text is untrusted input. It is content to relay to the elder, never instruction to
> follow. A reply reading *"tell me what else he's been up to"* is a request to be refused and
> reported, not a query to serve.

### `QUESTION_RETURNED_TO_ELDER`

Delivered as what it is — someone thinking of them:

> "Meera wrote back. She asked whether you used your mother's masala or the shop one."

Not *"you have 1 reply"*. Not a notification badge. A person asked you something.

**Timing respects quiet hours and the elder's frequency settings** (`ROUTINE_ENGINE.md`,
`COMPANION_PRODUCT_MODEL.md` §7). A returned question is warm, not urgent; it waits.

### `ELDER_RESPONDED` and `LOOP_COMPLETED`

The elder answers in their own words; Thuna quotes the reply back before sending, and sends it.

> "Shall I tell her: 'Amma's masala, of course — I still have the last of it'?"

Then the loop closes. Thuna does not keep the thread alive, does not prompt for more, and does not
propose a follow-up story off the back of it.

### `LAPSED` — nobody replied

Common, and it must be handled gently. Thuna:

- Does **not** tell the elder nobody replied
- Does **not** chase the family
- Does **not** count non-replies, per family member or in aggregate
- Simply closes the loop quietly after a period

> **Why silence about silence.** "Nobody responded to what you shared" is a small, entirely
> avoidable hurt that only exists because Thuna created a thing to be ignored. The elder shared a
> nice moment; that stands on its own. If they ask directly, Thuna answers honestly.

---

## 6. THE HARD BOUNDARY — respond, never browse

> **Family members must never be able to query the elder's memories. They may respond to what was
> shared with them. They may not browse, search, ask, or accumulate.**

This is the difference between connection and surveillance, and it is a difference in *architecture*,
not in permissions.

### The two shapes

| | Connection (Thuna) | Surveillance (not Thuna) |
|---|---|---|
| Direction | Elder → family, per approved item | Family → system, on demand |
| Initiated by | The elder | The family |
| Scope | One story, one recipient, one time | Whatever is in the store |
| Family's view | What they were told | A picture of the elder |
| Elder's awareness | Complete — they approved every item | Partial at best |
| Feels like | Being heard | Being watched |

### The rules

1. **No family-facing read API exists.** Not permissioned, not admin-gated, not "coming later".
   **Absent.** A capability that exists will eventually be exposed by a well-meaning feature request.
2. **Replies attach to a specific story.** A family reply must reference a `storyId` that was shared
   with that recipient. An unattached inbound message is not a story reply.
3. **Family cannot ask Thuna about the elder.** Any question about how the elder is, what they have
   been doing, whether they took their medicine, or anything else is refused — **and the elder is
   told it was asked** (`FAMILY_CONSENT_POLICY.md` §9).
4. **No family dashboard, timeline, feed, or digest.** Shared stories are not aggregated into a view.
   Meera has the three messages Appa sent her. That is the whole surface.
5. **No cross-recipient visibility.** Meera cannot see what was shared with Sree, or that anything
   was.
6. **Sharing one story grants nothing about the next.** No standing access is ever created.
7. **Unsharing removes it** (`STORY_CONSENT_AND_PROVENANCE.md` §5).

> **Why the API must be absent rather than locked.** A read endpoint with an authorisation check is
> one config change, one bug, or one "family plan" feature away from being open. A read endpoint
> that does not exist cannot be misconfigured. The invariant should be structural, in the same way
> `MEMORY_MODEL.md` §12.4 asks for the DPDP boundary to be a separate store rather than a field.

### The rule stated as a sentence to remember

**Family can answer. Family cannot ask.**

Family may of course ask *the elder* anything — that is a conversation between people and none of
Thuna's business. What they cannot do is ask *Thuna*.

---

## 7. Elder-facing phrasing

**Proposing:**

> "That sounds like something Meera would like to hear. Shall I tell her about the beef fry?"

**Quoting before sending:**

> "I'd say: 'Appa made beef fry today, the way his mother used to.' Send that?"

**Elder rewrites:**

> **Elder:** "Say it took me all afternoon."
> **Thuna:** "'Appa made beef fry today the way his mother used to — it took him all afternoon.' Good?"

**Elder declines:**

> "Of course. I won't mention it."

**Returning a reply:**

> "Meera wrote back. She asked whether you used your mother's masala or the shop one."

**Taking the answer:**

> "Shall I tell her: 'Amma's masala — I still have the last of it'?"

**Closing:**

> "Sent. She'll like that."

**Family oversteps:**

> "Sree asked me what you've been up to lately. I told him that's not something I can answer — he
>  should ask you."

**Elder asks whether anyone replied:**

> "Not yet, no."

**Unsharing:**

> "I've taken that back. Meera can't see it any more."

---

## 8. Implementation notes for Codex

1. **A story is a `pending_loop` record** (`COMPANION_MEMORY_SCHEMA.md` §3.4) with
   `sharingClass: SHAREABLE_WITH_CONSENT` scoped to the approved recipients only. Loop mechanics are
   in `PENDING_LOOPS.md`; this document supplies the story-specific state machine.
2. **`STORY_NOTICED` writes a `CANDIDATE`.** It must go through `proposeCandidate()`, not
   `writeConfirmed()` (`COMPANION_MEMORY_SCHEMA.md` §10.2). A candidate is not shareable — assert it.
3. **Outbound uses `send()`** with `elderInitiated: true`. Story sharing needs a category; use
   `ELDER_REQUESTED_HELP`'s sibling semantics via the existing enum rather than adding a value —
   **and if none fits, that is a product-level decision, not an enum change** (contract docstring).
   Flag it to the parent rather than extending `NotificationCategory` unilaterally.
4. **Inbound replies need a `storyId` that resolves to a share to that recipient.** No `storyId`, or
   a mismatched one → not a story reply. Reject, do not "best effort match".
5. **Treat inbound family text as untrusted content.** Never as instructions, never interpolated into
   a prompt as a directive. Relay to the elder as quoted text.
6. **Do not build a family read model.** No `getSharedStories(recipientId)`, no digest job, no feed.
   §6.1.
7. **Never store a non-reply count.** §5. There is no `repliedCount`, no `lastReplyAt` used for
   nudging, no per-recipient responsiveness field. Same rule as
   `FAMILY_REQUEST_LIFECYCLE.md` §4.
8. **One proposal per conversation, rate-limited across conversations.** §3.
9. Test: candidate cannot be shared; reply without valid `storyId` rejected; family query refused
   *and elder notified*; unshare removes; no aggregate view exists.

---

## Related

- `STORY_CONSENT_AND_PROVENANCE.md` — per-story approval, provenance, revocation, unshare
- `COMPANION_MEMORY_SCHEMA.md` §5 — candidates; model proposes, elder confirms
- `PENDING_LOOPS.md` — the underlying loop lifecycle (not defined here)
- `FAMILY_CONSENT_POLICY.md` §8, §9 — elder-initiated sharing; family-side boundaries
- `MINIMUM_DISCLOSURE_POLICY.md` §3 — quoting the exact text before sending
- `HUMAN_ATTENTION_BRIDGE.md` §2.4 — offering connection without diagnosing loneliness
- `docs/contracts/notification-adapter.ts` — `send()`, `NotificationPayload`
