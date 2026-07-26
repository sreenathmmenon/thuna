# Thuna — Quiet Hours and Frequency

> Design document. **Changes no production code.**
>
> The elder's controls over how often Thuna speaks, and when it must not.
>
> These are not preferences the system may weigh against its own goals. They are limits.

---

## 1. Who decides

> ## The elder sets the frequency. Family may suggest. Thuna never decides.

From `COMPANION_PRODUCT_MODEL.md` §4: the elder is the principal; family is a resource the elder may
draw on. Where interests conflict — and on frequency they routinely do, since families generally want
more contact than elders want to receive — **the elder's preference wins**.

Concretely, there is **no code path** by which:

- a family member raises the reminder frequency
- a family member shortens quiet hours
- the system raises frequency because response rates are low
- the system raises frequency because a reminder was missed
- the system raises frequency during a "concerning" pattern — a pattern it must not be computing at
  all (`MEMORY_MODEL.md` §9)

Frequency moves in one direction without the elder: **down**. Thuna may always say less.

---

## 2. Settings

All voice-settable, all persisted, all part of what Thuna reads back when asked *"what do you
remember about me?"* (`MEMORY_MODEL.md` §6).

| Setting | Default | Range | Scope |
|---|---|---|---|
| `quietHours` | 21:00–07:00 | any | Global |
| `maxRemindersPerDay` | **3** | 0–10 | Global, all sources |
| `minGapMinutes` | **90** | 30–360 | Global |
| `slots.morning` | 08:00 | within waking hours | Global |
| `slots.midday` | 12:30 | " | Global |
| `slots.evening` | 18:30 | " | Global |
| `socialContactsPerWeek` | **1** | 0–7 | Requires a standing invitation |
| `loopRideAlongsPerContact` | **1** | 0–1 | |
| `perSourceOverrides` | none | | Per routine / event / type |
| `globalPause` | off | | §6 |

`maxRemindersPerDay: 0` is a **valid setting**, not an error. An elder may want Thuna purely
reactive — available when asked, never initiating. That is a legitimate way to use the product and
must not be treated as a misconfiguration or nudged against.

### Defaults are low on purpose

Three reminders a day is fewer than most product instincts suggest. The reasoning: a companion that
starts chatty has already trained the elder to ignore it, and an ignored reminder is worse than no
reminder — it looks like coverage and provides none. Starting quiet and letting the elder ask for
more keeps every contact meaningful.

---

## 3. Quiet hours

**Absolute.** No `ContactReason` overrides them (`PROACTIVE_COMPANION_POLICY.md` §7). There is no
`OVERRIDE` value in the type, and `ROUTINE_ENGINE.md` §4 already lists `DUE → ACTIVE` inside quiet
hours as a prohibited transition.

| Behaviour | Rule |
|---|---|
| Contact due inside quiet hours | Defer or skip, per the source's `quietHoursPolicy` |
| Deferred contact lands later | **Says it is late**: "This is later than I meant to say it…" |
| Elder speaks to Thuna during quiet hours | Fully available. Quiet hours limit **initiation**, not availability |
| Elder's own requested time inside quiet hours | Surfaced as a conflict at agreement time; elder may override for themselves (§4) |
| Multiple deferred contacts | Merged, not delivered as a burst at 07:00 |

That last row matters. Three reminders deferred overnight must not become three calls at seven in the
morning. They merge into one, up to three spoken items — and if the merge would exceed that, the
lowest-stakes are dropped with the cap announcement of §5.

### Availability versus initiation

Quiet hours never stop Thuna from **answering**. An elder awake at 2am who asks for help gets help.
Restricting availability would be restricting the elder's own agency, which is the opposite of what
this setting is for.

---

## 4. Elder overrides of their own quiet hours

*"Call me after the serial"* at 22:30, with quiet hours from 21:00, is a genuine conflict. The
resolution preserves the distinction that makes quiet hours trustworthy:

> **The elder may override their own quiet hours. Thuna may not.**

Mechanically: the override is recorded **on the source record at agreement time**, never decided by
the scheduler at fire time. This is not a technicality — a scheduler permitted to decide overrides
has, in effect, a discretionary path through quiet hours, and every such path eventually gets used
for something the elder did not intend.

> "That's inside the hours you asked me not to disturb you. Shall I call anyway, just this once, or
>  wait until the morning?"

Rules:

- The override is **per-occurrence** unless the elder says otherwise: *"just this once"* versus
  *"always on Wednesdays"*.
- Thuna states the scope back, exactly as with corrections (`MEMORY_MODEL.md` §8).
- An override never widens for a different contact. Agreeing to a call after the serial does not
  permit a bill reminder at 22:30.
- An override is never inferred from the elder having been awake, or having answered late. That would
  be behavioural inference.

---

## 5. Caps and announced suppression

The daily cap is a single global pool: routines, life events, loops and social contacts compete in
it, because the elder experiences one pool
(`REGULAR_CHECKIN_ENGINE.md` §9).

**Suppression is always announced.** When the cap prevents something being said:

> "There's more than I'd normally mention in a day. Shall I go on?"

or, afterwards:

> "There were a couple of other things — would you like them now?"

Silent suppression is the failure mode to avoid. An elder who was never told a reminder was dropped
believes they had coverage they did not have, and the failure only surfaces when it costs something.
The interruption of asking is much cheaper than that.

### The medicine exception is not an exception

If the cap would drop a `MEDICINE_REMINDER`, the cap is misconfigured. Thuna does not silently
override the cap, and does not silently drop the reminder. It surfaces the conflict as a settings
question:

> "You've asked me to mention at most two things a day, and there's your morning medicine as well.
>  Shall I always mention the medicine, even on busy days?"

The elder's answer is stored as a per-source override. **The elder resolves the conflict; the system
does not resolve it on their behalf** in either direction.

---

## 6. Pause

### Global pause

One utterance, honoured immediately, surviving restart:

| Elder says | Effect |
|---|---|
| "No reminders today" | Pause until tomorrow morning |
| "Stop calling me" | Indefinite pause on all proactive contact |
| "Leave me alone this week" | Pause for a week |
| "Nothing until Monday" | Pause until a stated point |

Properties:

1. **Immediate**, no confirmation gauntlet, no "are you sure?".
2. **Survives restart.** Persisted, checked on every scheduler tick, never cached
   (`REGULAR_CHECKIN_ENGINE.md` §14.5).
3. **No backlog.** Suppressed contacts are **dropped**, not queued. A pause that produces a burst
   afterwards is a delay, and it punishes the elder for having asked.
4. **Easy to lift**, and the lift is stated: *"I'll start reminding you again from tomorrow morning."*
5. **Reactive help is unaffected.** The elder can still ask Thuna for anything.
6. **Thuna does not ask why**, and does not ask again during the pause whether the elder would like
   to resume.

### Scoped pause

| Elder says | Scope |
|---|---|
| "Stop reminding me about this bill" | This source record |
| "Stop asking whether I went places" | This rule, this type |
| "Stop asking me about things I said" | All `PendingLoop` surfacing |
| "No more chats, just the reminders" | `INVITED_SOCIAL_CONVERSATION` only |

Scope is asked only when genuinely ambiguous, in one question, and defaults to the **narrowest**
reading if the elder does not engage — the least destructive interpretation of an ambiguous
instruction.

### On resumption

Thuna does not deliver what was missed unless asked:

> **Appa:** "Did I miss anything?"
>
> **Thuna:** "Your electricity bill was due on Friday, and the parcel still hasn't come.
>  Anything you'd like me to do?"

Up to three items, from the source records, without having called.

---

## 7. Anti-nagging caps

Frequency limits handle the day. These handle the *same thing, repeatedly*, which is what actually
reads as nagging.

| Cap | Value | Applies to |
|---|---|---|
| Retries per occurrence | **1** | All reminders; 0 for social |
| Snoozes per occurrence | **3**, then offer cancel/reschedule | All |
| Loop surfaces before release offer | **3** | `PendingLoop` (`FOLLOW_UP_ENGINE.md` §4) |
| Read-backs of an unconfirmed `DRAFT` | **3**, then drop | `LifeEvent` |
| Same substance within 12 hours | **1** | Cross-engine dedup |
| Clarifying questions per extraction | **2**, then partial save | Extraction |
| Turns per conversation | **5** | `CHECKIN_CONVERSATION_POLICY.md` §6 |
| Re-offer after a refusal | **0** | Everything |

The last row is the strictest and the most important. **Refusal is a complete answer.** After "not
now", there is no second offer in that conversation, no softer rephrasing, and no returning to it
later in the same contact. Persistence after refusal is listed as a prohibited conversational pattern
(`CHECKIN_CONVERSATION_POLICY.md` §4) and this is its numeric expression.

### Repeated caps are a design signal

A routine that repeatedly hits its snooze cap is a badly designed routine, not a stubborn elder
(`CHECKIN_CONVERSATION_POLICY.md` §6). The right response is to offer to change it:

> "This one seems to come at an awkward time. Would a different hour suit you better?"

Never to try harder.

---

## 8. Voice control

No settings screen is required for any of this. Every setting is reachable in one sentence, and every
change is **stated back with its scope**.

| Elder says | Effect | Thuna says |
|---|---|---|
| "Don't talk to me before nine" | `slots.morning` = 09:00 | "I'll wait until nine in the mornings." |
| "Don't disturb me after eight" | `quietHours.from` = 20:00 | "Nothing after eight in the evening." |
| "Too many reminders" | `maxRemindersPerDay`− | "I'll cut it down to two a day." |
| "Only tell me the important things" | Drops advance notices, keeps day-of | "Just on the day, then." |
| "Remind me more about the bills" | Per-source override, that type only | "For bills only, or everything?" |
| "Stop the chats" | `socialContactsPerWeek` = 0 | "No more Sunday hellos. Reminders stay." |
| "No reminders today" | Global pause | "Nothing until tomorrow morning." |
| "Go back to how it was" | Revert last change | "Back to three a day." |

Two properties make this workable:

- **Scope is stated, and asked when ambiguous** — this-source versus this-type versus global is
  exactly the distinction `MEMORY_MODEL.md` §8 says a stateless system gets wrong.
- **"Go back to how it was" works**, because settings changes are supersessions with a retained
  prior value (`MEMORY_MODEL.md` §8.2), just like any other correction.

---

## 9. What is never adjusted automatically

| Never | Why |
|---|---|
| Raise frequency after missed reminders | Escalating on silence is pressure |
| Raise frequency on a family request | Family suggests; the elder decides |
| Shift timing to improve response rates | Behavioural experimentation on a person |
| Infer a better hour from when the elder answers | Behavioural analytics (`MEMORY_MODEL.md` §9) |
| Shorten quiet hours for an "important" reminder | No reminder is that important |
| Lower frequency on inferred illness or low mood | Health inference — and it drops agreed reminders |
| A/B test contact frequency | Experimenting on an elder's day without consent |

The last one is worth naming explicitly because it is normal practice elsewhere and would be a
straightforward product decision to make. Varying an elder's reminder schedule to learn what
produces more responses is running an experiment on a person who did not agree to be in one, in a
domain where the "metric" is whether they take medicine.

If Thuna believes a different time would suit better, it **asks**:

> "Would the morning be easier than the evening for this?"

---

## 10. Implementation notes for Codex

1. Settings live in profile memory (`MEMORY_MODEL.md` §2) and are read by the one scheduler. No
   engine keeps its own copy — a cached frequency setting is a change the elder made that did not
   take effect.
2. Pause state is persisted and checked on every tick, never cached.
3. Suppression must produce an announcement record so §5 is enforceable. Simplest safe design: a
   suppressed contact enqueues a "there was more" note attached to the next contact, and dropping the
   note requires the same explicit path as any other drop.
4. Every setting change is a supersession with a retained prior value, so "go back to how it was"
   works with no bespoke undo stack.
5. `maxRemindersPerDay: 0` must be handled as valid throughout. Test it — a division or a `|| 3`
   default will silently defeat it.
6. Scope resolution ("this one or all of them?") belongs in the guidance layer with a deterministic
   default to the narrowest scope. Do not let the model choose the scope silently.
7. There is no admin, family, or support path that writes these settings. If one exists in a future
   family app, it must write a **suggestion** the elder approves, mirroring
   `FAMILY_SUGGESTED_ELDER_APPROVED` in `MEMORY_MODEL.md` §3.

---

## 11. Test cases

1. `maxRemindersPerDay: 0` results in zero proactive contacts and no errors
2. Quiet hours are never overridden by any `ContactReason`
3. Deferred contacts merge; no 07:00 burst
4. Deferred contact says it is late
5. Elder remains able to initiate during quiet hours
6. Elder's own override is per-occurrence unless stated otherwise
7. An override for one contact does not widen to another
8. Global pause is immediate and survives restart
9. Pause produces no backlog burst on resumption
10. "Did I miss anything?" answers from source records, three items max
11. Cap suppression is announced
12. Medicine/cap conflict surfaces as a settings question, resolved by the elder
13. Refusal is never followed by a re-offer in the same conversation
14. Frequency never rises without an explicit elder instruction
15. Timing is never adjusted from observed response times
16. Family cannot write any setting
17. "Go back to how it was" restores the prior value
18. Ambiguous scope defaults to the narrowest

Cases 1, 2, 9, 14 and 15 are the ones a naive implementation gets wrong.

---

## Related

- `REGULAR_CHECKIN_ENGINE.md` — the scheduler that reads these settings
- `PROACTIVE_COMPANION_POLICY.md` — per-contact quiet hours, stop and retry specs
- `ROUTINE_ENGINE.md` §7 — the original quiet-hours and control rules
- `REMINDER_POLICY_ENGINE.md` §6, §7 — deferral and cap arbitration
- `FOLLOW_UP_ENGINE.md` §4 — loop surfacing caps
- `MEMORY_MODEL.md` §2, §8, §9 — settings storage, supersession, prohibited inference
- `COMPANION_PRODUCT_MODEL.md` §4 — the elder is the principal
