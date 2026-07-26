# Thuna — Regular Check-in Engine

> Design document. **Changes no production code.**
>
> The scheduler that decides, for a given moment, **whether Thuna speaks at all** and, if so, which
> single contact it makes.
>
> `PROACTIVE_COMPANION_POLICY.md` defines what a contact must contain. This defines how candidate
> contacts from four different engines become **one** decision.

---

## 1. Why one engine

Routines, life events, pending loops and social invitations each produce their own due occurrences.
If each delivered independently, an ordinary Friday could produce a medicine reminder at 09:00, a
bill reminder at 09:02, a wedding reminder at 09:05 and a parcel follow-up at 09:10 — four calls,
each individually justified, collectively an assault.

The elder experiences **one relationship**, not four subsystems. So there is one scheduler, one cap,
one quiet-hours check, one dedup, and one composed contact per slot.

> ## The right amount of Thuna is the least that helps.
>
> — `COMPANION_PRODUCT_MODEL.md` §10

---

## 2. The pipeline

Runs on a tick. Every stage can only **remove or merge** candidates — never add one.

```
1. COLLECT      due occurrences from all four sources
2. VALIDATE     drop any that cannot form a valid ProactiveContact
3. QUIET HOURS  defer or skip — no overrides exist
4. PAUSE        drop everything if a global or scoped pause is active
5. DEDUP        suppress repeats of substance already said
6. MERGE        combine same-slot, same-subject items into one contact
7. CAP          arbitrate against the elder's daily cap
8. LOOP RIDE    attach at most one PendingLoop to the surviving contact
9. COMPOSE      build the single ProactiveContact
10. DELIVER     open the session with a purpose
```

That stages only subtract is the property worth protecting. A stage that could add a candidate —
"while we're calling anyway, also mention…" — is how a bounded system becomes chatty, and it is
exactly what stage 8 constrains rather than permits.

---

## 3. Stage 1 — Collect

| Source | Produces | Reason |
|---|---|---|
| `ROUTINE_ENGINE` | Routines in `DUE` | `MEDICINE_REMINDER`, `FAMILY_CALL_REMINDER`, … |
| `REMINDER_POLICY_ENGINE` | Materialised occurrences in `DUE` | `LIFE_EVENT_REMINDER`, `BILL_DUE`, `DELIVERY_FOLLOW_UP` |
| `PENDING_LOOPS` | Loops in `DUE` with an agreed trigger | `CONTINUE_UNFINISHED_TASK`, `RESUME_DIGITAL_TASK`, `RETURN_FAMILY_ANSWER` |
| Standing social invitation | Cadence reached | `INVITED_SOCIAL_CONVERSATION` |

Loops in `OPEN` are **not** collected. They have no agreed time, so they cannot justify an
interruption (`FOLLOW_UP_ENGINE.md` §2). They become eligible only at stage 8, as ride-alongs.

---

## 4. Stage 2 — Validate

Each candidate must form a valid `ProactiveContact` (`PROACTIVE_COMPANION_POLICY.md` §1). Drop, with
a logged reason, any that:

- has no `reasonSentence`, `sourceRef`, or `stopOption`
- has no `agreedBy` / `agreedAt` — i.e. fails the *agreed* test
- involves a third party without the required consent
- refers to a source record that has since been cancelled or completed
- is a life-event reminder for an event now in `CANCELLED`

The stale-source check matters more than it looks. Between materialisation and firing, the elder may
have cancelled the event, paid the bill, or released the loop. Firing a reminder for something
already resolved is the most obviously broken thing a companion can do.

---

## 5. Stage 3 — Quiet hours

Applied to every candidate identically, with the source's own `quietHoursPolicy`
(`REMINDER_POLICY_ENGINE.md` §6):

| Policy | Effect |
|---|---|
| `DEFER_NEXT_SLOT` | Requeue for the next allowed slot |
| `DEFER_TO_MORNING` | Requeue for the morning slot |
| `SKIP` | Drop; the reminder has lost meaning |

**No override exists.** Not for bills, not for medicine, not for a wedding starting in an hour.
Waking an elder is a real harm and nothing in this engine outweighs it
(`ROUTINE_ENGINE.md` §4). An elder-recorded override of their own quiet hours is honoured, but it
lives on the source record from agreement time — the scheduler never decides to override
(`PROACTIVE_COMPANION_POLICY.md` §7).

A deferred contact **says it is late** when it lands, so the elder is not misled about timing.

---

## 6. Stage 4 — Pause

A global pause ("no reminders today", "stop calling me") drops **everything**, immediately, and
survives restart (`QUIET_HOURS_AND_FREQUENCY.md` §6).

Scoped pauses drop their scope only: this source, this kind, all social.

Nothing is queued up for after the pause and delivered in a burst. Contacts suppressed by a pause
are **dropped**, not deferred. A pause that produces a backlog is not a pause; it is a delay, and it
punishes the elder for having asked.

The one exception is the elder asking on resumption: *"did I miss anything?"* — answered from the
source records, up to three items, without having called.

---

## 7. Stage 5 — Dedup

`dedupKey` per `REMINDER_POLICY_ENGINE.md` §8, plus a scheduler-level rule:

**The same substance is not said twice within 12 hours**, regardless of which engine produced it. If
a bill's `dueDay` reminder fired this morning and an `ELDER_WILL_DO` loop about the same bill comes
due this evening, the evening contact is suppressed — or merged, if the wording genuinely adds
something ("has your pension come?").

Conservative by design: **when in doubt, suppress.** Saying a thing twice reads as malfunction;
saying it once when scheduled twice reads as competence.

---

## 8. Stage 6 — Merge

Same slot, related subject → one contact.

- Maximum **three** items spoken (`CHECKIN_CONVERSATION_POLICY.md` §6).
- The merged contact takes the **highest-stakes** reason as its stated purpose. A medicine reminder
  merged with a wedding reminder opens with the medicine.
- Merged items each keep their own `completionRule`. Acknowledging a merged contact does not
  complete the bill inside it — that still needs `EXPLICIT_CONFIRMATION`.
- Merging never produces a compound question. One question per turn, still:

> "Good morning Appa. It's nine o'clock — time for your morning medicine. Ammini's wedding is today
>  as well, and your parcel was due yesterday. Have you had your tablet?"

Three items, one question. The other two are stated, not interrogated; if the elder wants to talk
about the parcel they will.

---

## 9. Stage 7 — Cap

One global `maxRemindersPerDay` across all sources (`MEMORY_MODEL.md` §2). Arbitration per
`PROACTIVE_COMPANION_POLICY.md` §12:

1. Merge first (stage 6) — merging is nearly always better than dropping.
2. Drop `optional` rules.
3. Drop advance notices before day-of contacts.
4. Drop `INVITED_SOCIAL_CONVERSATION` before any task-bearing contact.
5. Never drop `MEDICINE_REMINDER` silently — if the cap would drop one, the cap is misconfigured;
   surface it to the elder as a settings question rather than quietly failing:
   *"You've asked me to remind you at most twice a day, and there's a medicine reminder as well.
   Shall I still mention the medicine?"*

Cap-bound suppression is **announced**, never silent. An elder who was never told something was
dropped learns not to rely on Thuna, which costs more than the interruption saved.

---

## 10. Stage 8 — Loop ride-along

At most **one** `PendingLoop` attaches to the surviving contact, and only if:

- the contact is already happening for its own reason
- the moment is natural (`FOLLOW_UP_ENGINE.md` §3) — not after a refusal, not at the turn cap
- the loop is not `RELEASE_OFFERED`
- the loop's ageing stage permits surfacing today

The loop **never** becomes the contact's stated purpose. The reason for calling remains the reason
for calling; the loop rides along at the end:

> "…Before you go — you'd mentioned the parcel."

If no contact survives to stage 9, the loop does not surface. It waits.

---

## 11. Slots, not a continuous clock

Contacts land in **named slots** (`REMINDER_POLICY_ENGINE.md` §4), not at arbitrary minutes.

| Slot | Default | Elder-editable |
|---|---|---|
| `MORNING` | 08:00 | yes |
| `MIDDAY` | 12:30 | yes |
| `EVENING` | 18:30 | yes |

Exceptions that may land off-slot: `AT_TIME` contacts (a medicine at 09:00, an appointment two hours
before), and elder-requested times ("call me after the serial").

Why slots: an elder can learn *"Thuna talks to me in the morning and the evening"*, and a predictable
companion is a controllable one. Contacts scattered across the day cannot be anticipated, and
anything that cannot be anticipated cannot really be consented to in advance.

**Minimum gap between contacts: 90 minutes**, regardless of cap. Two contacts twenty minutes apart is
the felt experience of being pestered even if the daily count is small.

---

## 12. Frequency defaults

Deliberately low. Elders raise them if they want more; a system that starts chatty has already
trained the elder to ignore it.

| Setting | Default | Notes |
|---|---|---|
| `maxRemindersPerDay` | **3** | Global, all sources |
| Minimum gap | **90 minutes** | Hard |
| Quiet hours | **21:00–07:00** | Per `ROUTINE_ENGINE.md` §7 |
| Social contacts per week | **1** | Only with a standing invitation |
| Loop ride-alongs per contact | **1** | |
| Retries | **1** | 0 for social |

---

## 13. What the engine never does

| Never | Why |
|---|---|
| Contact because it has been quiet a while | Engagement optimisation |
| Contact to deliver a tip, feature, or offer | Thuna is not a channel to the elder |
| Contact on a family member's behalf without elder agreement | Family may suggest; only the elder agrees |
| Contact more often after non-response | Escalating on silence is pressure |
| Contact **less** on the assumption the elder is unwell | Health inference — and it drops agreed reminders |
| Batch suppressed contacts into a burst after a pause | Punishes the elder for pausing |
| Vary timing to "optimise response rates" | Behavioural experimentation on a person |
| Infer a good time from observed activity | Behavioural analytics (`MEMORY_MODEL.md` §9) |

The last row bears on a genuinely tempting feature. "He always answers at ten, so call at ten" is
learned behaviour modelling — it requires holding an activity profile the memory model prohibits, and
it makes the elder's timing legible to a system in a way they never agreed to. If a better time
exists, **ask**: *"Would the morning suit you better?"*

---

## 14. Implementation notes for Codex

1. One pure function: `schedule(candidates, profile, state, now) → ProactiveContact | null`.
   `null` is the common and correct answer; make sure the caller handles it as a normal outcome.
2. Stages are ordered and each **only subtracts or merges**. Assert candidate count is
   non-increasing through stages 2–7 — a cheap test that catches the chatty-drift bug.
3. Every drop is logged with a reason: `dropped_quiet_hours`, `dropped_pause`, `dropped_dedup`,
   `dropped_cap`, `dropped_stale_source`. These logs are how you discover the elder is being
   over- or under-served, and there is no other way to find out.
4. The 90-minute gap needs `lastContactAt` persisted; it must survive restart or a crash produces a
   double contact.
5. Pause state persists to `data/` and is checked at stage 4 on **every** tick, not cached.
6. The demo clock compresses slots and gaps by the same factor (`ROUTINE_ENGINE.md` §8). Same rules,
   same stages — never a demo-only path.
7. Reuse the routine scheduler's occurrence store rather than building a parallel one for events. The
   states are already identical by design.

---

## 15. Test cases

1. Four due candidates in one slot produce **one** contact
2. Candidate count never increases through the pipeline
3. Stale source (event cancelled after materialisation) is dropped
4. Quiet hours defers or skips; nothing fires inside them
5. Deferred contact says it is late when it lands
6. Global pause drops everything and produces no backlog burst
7. Same substance is not said twice within 12 hours
8. Merged contact asks exactly one question
9. Merged contact does not complete its constituent items on a single acknowledgement
10. Cap-bound suppression is announced
11. Cap conflict with a medicine reminder surfaces as a settings question
12. At most one loop rides along
13. A loop does not surface when no contact survives
14. Minimum 90-minute gap is respected across restart
15. Non-response never increases frequency
16. Timing is never adjusted from observed activity
17. Every drop is logged with a reason

Cases 1, 2, 6, 15 and 16 are the ones a naive implementation gets wrong.

---

## Related

- `PROACTIVE_COMPANION_POLICY.md` — what a contact must contain
- `QUIET_HOURS_AND_FREQUENCY.md` — the settings this engine reads
- `REMINDER_POLICY_ENGINE.md` — materialisation, slots, dedup keys
- `FOLLOW_UP_ENGINE.md` — ride-along eligibility and natural moments
- `ROUTINE_ENGINE.md` §7, §8 — quiet hours, elder control, demo clock
- `CHECKIN_CONVERSATION_POLICY.md` §6 — three items, one question, turn caps
