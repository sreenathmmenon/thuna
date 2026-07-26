# Thuna — Adaptive Guidance

> Design document. **Changes no production code.**
>
> How much Thuna says depends on how much help is wanted. The elder sets that, always, and can change
> it in one sentence.

---

## 1. Four guidance levels

| Level | Thuna's behaviour | Suits |
|---|---|---|
| `DETAILED` | Every step named, screen elements described, one action per turn, offers to repeat | First time; anything unfamiliar or consequential |
| `STANDARD` | Steps named, less description, still one at a time | The common case |
| `MINIMAL` | Milestones only. "Now the payment screen — tell me when you're there." | A task the elder has done before |
| `ON_DEMAND_ONLY` | Thuna says nothing unless asked. "I'm here if you want me." | A task the elder has fully learned |

The levels differ in **verbosity, not in capability**. Nothing is withheld at `MINIMAL`; the elder
asks and gets the detail immediately, at whatever depth they want, with no friction and no comment.

### `ON_DEMAND_ONLY` is the goal, not the edge case

Most assistant products treat the quiet mode as an unusual preference. Here it is the destination.
An elder who has moved a task to `ON_DEMAND_ONLY` has learned it — and that is the outcome
`INDEPENDENCE_METRICS.md` says Thuna exists to produce.

---

## 2. Guidance level is per task, not per person

**A person does not have a guidance level. A person-and-task pair does.**

The same elder may want `ON_DEMAND_ONLY` for ordering food, `STANDARD` for a video call, and
`DETAILED` for anything involving money. All three at once is not inconsistency; it is a completely
normal and accurate account of how anyone's competence is distributed.

```
GuidancePreference {
  taskType          ORDER_FOOD | VIDEO_CALL | PAY_BILL | ...
  level             DETAILED | STANDARD | MINIMAL | ON_DEMAND_ONLY
  setBy             ELDER_EXPLICIT | THUNA_PROPOSED_ELDER_APPROVED | DEFAULT
  setAt
  lockedByElder     when true, Thuna never proposes a change — §5
}
```

`setBy` has no `THUNA_AUTOMATIC` value. There is no path by which a level changes without the elder
having said so. See §4.

### Defaults

| Situation | Default |
|---|---|
| First time with a task | `DETAILED` |
| No preference recorded | `STANDARD` |
| Anything involving money, or irreversible | `DETAILED`, regardless of history — §6 |
| Elder said "just do it, don't explain" for this task | `ON_DEMAND_ONLY` |

---

## 3. The elder can change it at any time, in one sentence

**Every level change the elder asks for is honoured immediately, without question or friction.**

| The elder says | Effect |
|---|---|
| "You don't need to explain, I know this one" | → `MINIMAL` or `ON_DEMAND_ONLY` for this task |
| "Slower please" / "tell me each step" | → `DETAILED` |
| "Just stay quiet unless I ask" | → `ON_DEMAND_ONLY` |
| "Talk me through it properly this time" | → `DETAILED`, for this occasion or standing — Thuna asks which |
| "Go back to how you were doing it before" | → previous level restored |

Rules:

1. **Immediate**, mid-task if asked mid-task.
2. **Never questioned.** No "are you sure you don't want the details?" That is a friction gate on the
   elder's own competence and reads as doubt.
3. **Never silently reverted.** If the elder set `MINIMAL`, Thuna does not drift back to `STANDARD`
   because a step went slowly.
4. **Reversible without embarrassment.** Going back to `DETAILED` must be as easy and as unremarked
   as leaving it. No "shall I go back to explaining things?" — just do it, plainly.

### Asking for more help must never cost anything

The single most important behaviour in this document. An elder who suspects that asking for detail
will be *noticed* — recorded, mentioned later, reported — will stop asking, and will then do the task
worse and alone.

So: asking for `DETAILED` produces no record beyond the preference itself, no capability entry, no
family notification, and no comment from Thuna. It changes the verbosity and nothing else.

---

## 4. Never silently downgraded in a way that feels like being judged

> **Thuna may propose less guidance. Thuna may never impose it.**

The reasoning is uncomfortable and worth stating: automatic downgrading, however well-intentioned,
means the elder's experience of the product silently changed *because of something Thuna concluded
about them*. Even when the conclusion is favourable — "you've got the hang of this" — the mechanism
is the same one that would make it unfavourable, and the elder can feel it operating.

The elder must be able to trust that Thuna's behaviour changes when *they* say so. That trust is
worth more than the convenience of automatic tuning.

### Proposing a reduction

Allowed, rarely, and always as a question the elder can decline:

> "You've done this a few times now. Shall I stop going through every step, or keep it as it is?"

Rules for the proposal:

1. **At most once per task type.** If declined, never proposed again for that task. Not "not for a
   while" — never.
2. **Never mid-task.** Ask at a natural boundary, after something completed, not while the elder is
   in the middle of something.
3. **Frame around Thuna's talking, not the elder's ability.** "Shall I stop going through every
   step" describes what Thuna does. "You seem to have mastered this" describes the elder, and
   invites the thought that Thuna is assessing them.
4. **Declining is costless and unrecorded** beyond a flag that suppresses re-asking.
5. **Never propose an increase.** Thuna does not offer more guidance based on how a task went —
   see below.

### Thuna never proposes MORE guidance

There is no path where Thuna says *"shall I explain more thoroughly from now on?"*, because there is
no non-insulting way to say it. It necessarily means *I have concluded you need more help than you
are getting*, and that is a judgement about the person.

The elder can ask for more at any time (§3), instantly and without comment. That is the only route,
and it is the right one because it is the elder's own assessment rather than Thuna's.

**Exception, and it is not really one:** within a single task, when a step has not completed, Thuna
may offer more detail *for that step*:

> "Shall I go through that bit again more slowly?"

That is help in the moment about one step, not a change to a standing level, and nothing is stored.

---

## 5. `lockedByElder`

If the elder says *"stop changing how you explain things"* or declines a proposal firmly, the
preference is locked. Thuna never proposes a change for that task again, at any level, for any
reason. The elder can still change it themselves at any time.

A lock is a complete answer, honoured permanently, and never re-litigated.

---

## 6. Guidance level never overrides safety

Verbosity changes. Confirmation discipline does not.

Regardless of level, and regardless of how many times the elder has done it before:

| Always, at every level |
|---|
| **Explicit confirmation before anything consequential** (`COMPANION_PRODUCT_MODEL.md` §6) |
| **Full read-back before payment, ordering, or anything irreversible** |
| **Recovery always available** — wait / repeat slowly / go back / stop |
| **One step at a time for consequential steps** |
| **No autonomous action.** `ON_DEMAND_ONLY` means Thuna is quiet, not that it acts alone |

`ON_DEMAND_ONLY` is the level most likely to be misread as "just handle it". It is not. Thuna still
never takes an irreversible action without an in-the-moment yes. A silent assistant is not an
autonomous one.

> Concretely: at `ON_DEMAND_ONLY`, ordering food still gets *"Masala dosa from Udupi Cafe, ninety
> rupees, to home. Shall I place it?"* — because the confirmation is not guidance, it is the gate.

---

## 7. What adaptive guidance may read

Guidance selection may read `capability` memory (`CAPABILITY_MEMORY.md`) — specifically, whether this
task has been completed unaided. That is the only permitted input beyond the elder's stated
preference.

| May inform guidance | May never inform guidance |
|---|---|
| The elder's stated preference for this task | Anything about the elder's health |
| Whether this task was completed unaided before | Any cognitive or emotional assessment |
| Whether this is the first time | Age |
| Whether the task is consequential or irreversible | Time of day as a proxy for alertness |
| Whether the elder asked for more or less, this session | Speed, pauses, or hesitation in speech |
| | Trends across tasks — "generally needs more help lately" |

The right-hand column is prohibited under `MEMORY_MODEL.md` §9 and cannot be stored, so it cannot be
read. It is listed anyway because each entry is a plausible-sounding feature request, and each one
would turn adaptive guidance into a cognitive assessment engine.

**No cross-task generalisation.** Competence at one task says nothing about another, and treating it
as if it did is precisely the inference this product refuses to make.

---

## 8. Elder-facing phrasing

**Proposing less, at a boundary:**

> "You've done this a few times now. Shall I stop going through every step, or keep it as it is?"

**Elder declines:**

> "Right, I'll keep explaining."

*(And never asks again.)*

**Elder asks for less, mid-task:**

> **Elder:** "You don't need to tell me all that."
> **Thuna:** "Right. Tell me when you're at the payment screen."

**Elder asks for more:**

> **Elder:** "Slower, please."
> **Thuna:** "Of course. Tap the orange button at the bottom right — the one that says 'Pay'."

*(No comment on the change. No "no problem at all!". Just the help.)*

**Elder asks for more, standing:**

> **Elder:** "Go through it properly from now on."
> **Thuna:** "I will."

**At `ON_DEMAND_ONLY`:**

> "I'm here if you want me."

**Confirmation at `ON_DEMAND_ONLY` — unchanged:**

> "Masala dosa from Udupi Cafe, ninety rupees, to home. Shall I place it?"

**Locking:**

> **Elder:** "Stop asking me about this."
> **Thuna:** "I won't bring it up again."

---

## 9. Implementation notes for Codex

1. **`GuidancePreference` is keyed on `(elderId, taskType)`.** No global level field on the profile.
   If one exists, per-task preference will eventually be collapsed into it.
2. **`setBy` has no automatic value.** The setter should be unable to express a level change with no
   elder involvement. §2.
3. **Guidance level is a rendering parameter, not a control-flow parameter.** It selects how much
   the engine says at each step. It must not remove steps, skip confirmations, or shorten a
   read-back. §6.
4. **Confirmation gates are outside the guidance system entirely** — they are not verbosity and must
   not be reachable from a verbosity setting. Structural, not conventional.
5. **The downgrade proposal is rate-limited to once per task type, ever**, with a persistent
   `proposalDeclined` flag. §4.
6. **There is no upgrade proposal path.** Do not implement one. §4.
7. **Do not log guidance changes as events** beyond updating the preference. An audit trail of "asked
   for more help" is behavioural data about the elder (`MEMORY_MODEL.md` §9).
8. Test: level change honoured mid-task; confirmation still fires at `ON_DEMAND_ONLY`; declined
   proposal never repeats; no code path changes level without an elder utterance; no cross-task
   generalisation.

---

## Related

- `CAPABILITY_MEMORY.md` — the only memory guidance may read, and its hard limits
- `INDEPENDENCE_METRICS.md` — why less guidance over time is the goal
- `COMPANION_PRODUCT_MODEL.md` §5, §6 — dignity constraints; interaction shape
- `MEMORY_MODEL.md` §9 — the inference prohibitions that bound §7
- `HUMAN_ATTENTION_BRIDGE.md` §2.3 — offering a person, without characterising the elder
