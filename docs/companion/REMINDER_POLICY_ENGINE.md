# Thuna — Reminder Policy Engine

> Design document. **Changes no production code.**
>
> Reminder timing is **declarative data attached to an event type**, never a per-scenario code path.
> "Remind a week before a wedding" is a row; it is not an `if (type === WEDDING)`.

---

## 1. Why declarative

A hardcoded reminder schedule fails in three predictable ways:

1. **It cannot be corrected.** An elder saying "don't remind me a week ahead, just the day before"
   must change one stored value, not require a deploy.
2. **It diverges per type.** Hand-written schedules acquire subtly different quiet-hours handling,
   different dedup, different snooze caps — and the difference is always discovered in production.
3. **It cannot be explained.** Thuna should be able to say *"I'll mention it a week before, the
   evening before, and on the morning"* — which requires reading the plan, not reverse-engineering
   control flow.

So: a **policy** is data; the **scheduler** is one piece of code that reads it.

---

## 2. The policy language

```
ReminderPolicy {
  policyId        string
  appliesTo       LifeEventType[]        // or a single type; policies are shareable across types
  rules           ReminderRule[]
  dailyCapShare   number                 // max slots this event may take from the daily cap (§7)
  maxTotal        number                 // hard ceiling on occurrences for one event
}

ReminderRule {
  ruleId          string
  offset          Offset                 // §3 — when, relative to the anchor field
  anchorField     string                 // usually "date"; DELIVERY may anchor on "window"
  timeOfDay       MORNING | MIDDAY | EVENING | AT_TIME | RELATIVE   // §4
  purpose         string                 // REQUIRED — the one-sentence reason, spoken aloud
  expects         ReminderExpectation[]  // acknowledge | confirm | answer-attendance | none
  offers          OfferKind[]            // subset of the event's offers, appropriate at this moment
  ifQuietHours    DEFER_NEXT_SLOT | DEFER_TO_MORNING | SKIP        // §6
  ifPast          SKIP | FIRE_IMMEDIATELY | COLLAPSE               // §5
  dedupKey        string                 // §8
  priority        number                 // used only for collapsing and cap arbitration, never spoken
  optional        boolean                // elder may switch this single rule off
}
```

`purpose` being required at the **rule** level is deliberate: `channel-adapter.ts` requires a purpose
to open a session, and `CHECKIN_CONVERSATION_POLICY.md` §1 makes purposelessness a hard fail. If a
rule cannot state why it exists, it should not exist.

---

## 3. Offsets

```
Offset =
  | { days: -7 }                 // 7 days before the anchor
  | { days: -1 }                 // the day before
  | { days: 0 }                  // the day itself
  | { days: +1 }                 // the day after — follow-up
  | { hours: -2 }
  | { minutes: -30 }
  | { onAnchorTimeMinus: "PT2H" }
```

Written in policies as shorthand: `-7d`, `-1d evening`, `0d morning`, `+1d`, `-2h`.

Offsets are always **relative to a field**, never absolute. This is what makes corrections work: when
*"not Sunday, Saturday"* moves `date`, every occurrence re-materialises from the same rules and
lands correctly. A schedule stored as absolute timestamps would need bespoke fix-up logic per type —
which is the code branch this design exists to avoid.

---

## 4. `timeOfDay`

Offsets give the day; `timeOfDay` gives the hour, resolved against elder profile settings.

| Value | Resolves to |
|---|---|
| `MORNING` | Elder's morning slot (default 08:00), after quiet hours end |
| `MIDDAY` | Default 12:30 |
| `EVENING` | Default 18:30, comfortably before quiet hours begin |
| `AT_TIME` | The event's `time` field, if known; falls back to `MORNING` when `UNKNOWN_ACCEPTED` |
| `RELATIVE` | Anchor time minus the offset — used for `-2h` style rules |

Slots are **elder-editable** and shared with routines. *"Don't talk to me before nine"* moves the
morning slot for reminders and routines alike; one setting, one meaning.

---

## 5. `ifPast` — the late-creation problem

Events are frequently created *after* some of their reminders would have fired. An invitation
photographed three days before the wedding cannot get a `-7d` reminder.

| `ifPast` | Behaviour | Used for |
|---|---|---|
| `SKIP` | Drop the occurrence silently, record why | Advance-notice rules (`-7d`) |
| `FIRE_IMMEDIATELY` | Fire once, now, subject to quiet hours | Rules whose whole value is urgency (a bill due today) |
| `COLLAPSE` | Merge into the next future occurrence, mentioned once | Where several rules are past at once |

Rule: **at most one `FIRE_IMMEDIATELY` per event creation.** Confirming a bill that is due tomorrow
must not produce a burst of three catch-up reminders. Collapse the rest and say it once:

> "That's due tomorrow — a bit close. I'll remind you in the morning."

---

## 6. Quiet hours

Quiet hours are elder-set (`ROUTINE_ENGINE.md` §7, default 21:00–07:00) and are checked by the
scheduler **before** `DUE → ACTIVE`, for every rule, with no per-type exceptions.

| `ifQuietHours` | Behaviour | Typical rules |
|---|---|---|
| `DEFER_NEXT_SLOT` | Move to the next allowed slot | Advance reminders |
| `DEFER_TO_MORNING` | Hold until the morning slot | Evening-before reminders that slip late |
| `SKIP` | Drop; the reminder has lost its meaning | "Two hours before" for an event now underway |

**No rule may set `ifQuietHours: OVERRIDE`.** There is no such value. Nothing in this engine is
urgent enough to wake an elder — a bill is not, a wedding is not, and if something genuinely is, the
right answer is a human, not a reminder. `ROUTINE_ENGINE.md` §4 already lists
`DUE → ACTIVE` inside quiet hours as a prohibited transition; this document does not create an
exception to it.

A deferred reminder is **always told to be late** when it lands, so the elder is not misled about
timing:

> "This is a little later than I meant to say it — your bill is due today."

---

## 7. Frequency caps and cap arbitration

The elder's `maxRemindersPerDay` (`MEMORY_MODEL.md` §2) is a **global** cap across routines, life
events, pending loops and check-ins. Life events do not get their own budget.

When the day's occurrences exceed the cap:

1. **Collapse same-day occurrences into one contact.** Three events tomorrow become one sentence with
   up to three items (`CHECKIN_CONVERSATION_POLICY.md` §6), not three calls.
2. Then drop by **lowest `priority`**, preferring to drop *advance-notice* rules over *day-of* rules —
   losing "a week before" is an inconvenience; losing "today" is a failure.
3. `optional: true` rules are dropped first.
4. If the cap still cannot be met, Thuna **says so** rather than silently dropping the rest:
   *"There's more than I'd normally mention in a day. Shall I go on?"*

Silent suppression is the failure mode to avoid: an elder who was never told a reminder was dropped
learns not to rely on Thuna.

---

## 8. Dedup

`dedupKey` prevents the same substance being said twice within a window.

```
dedupKey = `${type}:${lifeEventId}:${ruleId}:${scheduledLocalDate}`
```

Rules:

- **Identical key already delivered** → suppress, record `reminder_deduped`.
- **Different rules, same event, same slot** (a `-1d evening` and an `AT_TIME` collapsing together)
  → merge into one utterance, one delivery, both marked delivered.
- **Different events, same slot** → merge into one contact, at most three items spoken.
- **A snoozed occurrence** does not dedup against its own re-fire — that is the elder's request, not
  a duplicate.
- **A cross-source duplicate** — the same wedding extracted from both an invitation photo and a text
  message — is caught earlier, at extraction (`EVENT_EXTRACTION_POLICY.md` §8), not here. By the time
  two `LifeEvent`s exist, dedup can only merge *speech*, not *records*.

Dedup is deliberately conservative: **when in doubt, suppress.** Saying a thing twice reads as
malfunction; saying it once when it was scheduled twice reads as competence.

---

## 9. Example policies (data, not code)

### `WEDDING`

| ruleId | offset | timeOfDay | purpose | expects | offers | ifPast |
|---|---|---|---|---|---|---|
| `advance` | `-7d` | `EVENING` | "Ammini's wedding is next Sunday" | acknowledge | `GIFT_HELP`, `FAMILY_HELP` | `SKIP` |
| `eve` | `-1d` | `EVENING` | "The wedding is tomorrow" | acknowledge | `ARRANGE_RIDE`, `MAP_DIRECTIONS` | `SKIP` |
| `morning` | `0d` | `MORNING` | "The wedding is today" | acknowledge | `ARRANGE_RIDE`, `MAP_DIRECTIONS`, `FAMILY_HELP` | `FIRE_IMMEDIATELY` |
| `followup` | `+1d` | `MIDDAY` | "Did you get to the wedding?" | answer-attendance | `SET_FOLLOW_UP` | `SKIP` |

The `+1d` follow-up is the row that makes Thuna feel like a companion rather than an alarm clock.
It is also the row that must **never** nag: one ask, and `MISSED` is an acceptable resting state.

### `BILL`

| ruleId | offset | timeOfDay | purpose | expects | offers | ifPast |
|---|---|---|---|---|---|---|
| `advance` | `-3d` | `EVENING` | "The electricity bill is due on Friday" | acknowledge | `CALL_PROVIDER` | `SKIP` |
| `dueDay` | `0d` | `MORNING` | "The electricity bill is due today" | confirm | `CALL_PROVIDER`, `FAMILY_HELP` | `FIRE_IMMEDIATELY` |
| `after` | `+1d` | `MIDDAY` | "Did the bill get paid?" | confirm | `FAMILY_HELP` | `SKIP` |

`after` asks; it never assumes. `expects: confirm` maps to `completionRule:
EXPLICIT_CONFIRMATION` — and an unanswered `after` leaves the bill **unpaid and unknown**, which is
the honest state. See §11.

### `APPOINTMENT`

| ruleId | offset | timeOfDay | purpose | expects | offers | ifPast |
|---|---|---|---|---|---|---|
| `advance` | `-1d` | `EVENING` | "Your eye appointment is tomorrow at ten" | acknowledge | `ARRANGE_RIDE` | `SKIP` |
| `morning` | `0d` | `MORNING` | "Your appointment is today at ten" | acknowledge | `ARRANGE_RIDE`, `MAP_DIRECTIONS` | `FIRE_IMMEDIATELY` |
| `leaveBy` | `-2h` | `RELATIVE` | "Time to think about leaving" | acknowledge | `ARRANGE_RIDE` | `SKIP` |
| `followup` | `+1d` | `MIDDAY` | "Did you make it to the appointment?" | answer-attendance | `SET_FOLLOW_UP` | `SKIP` |

The `+1d` follow-up asks **whether they went**. It does not ask what the doctor said, how they feel,
or anything else — that is health inference and is prohibited (`MEMORY_MODEL.md` §9).

### `DELIVERY`

| ruleId | offset | timeOfDay | purpose | expects | offers | ifPast |
|---|---|---|---|---|---|---|
| `expected` | `0d` | `EVENING` | "Your parcel was due today" | confirm | `CALL_PROVIDER` | `FIRE_IMMEDIATELY` |
| `chase` | `+2d` | `MIDDAY` | "The parcel still hasn't turned up" | confirm | `CALL_PROVIDER`, `FAMILY_HELP` | `SKIP` |

### Others

| type | rules |
|---|---|
| `BIRTHDAY` | `-1d evening` ("tomorrow"), `0d morning` (offers `CALL_FAMILY`, `GIFT_HELP`) |
| `ANNIVERSARY` | as `BIRTHDAY` |
| `RELIGIOUS_EVENT` | `-1d evening`, `0d morning` |
| `COMMUNITY_EVENT` | `-1d evening`, `0d morning`, `+1d` attendance follow-up |
| `FAMILY_EVENT` | as `WEDDING`, minus `GIFT_HELP` unless the elder adds it |
| `RENEWAL` | `-14d`, `-3d`, `0d morning`, `+1d` confirm |
| `SERVICE_VISIT` | `-1d evening`, `0d morning` (window stated), `+1d` confirm |
| `TRAVEL` | `-1d evening` (packing), `-3h relative` (leaving) |
| `CUSTOM` | `-1d evening`, `0d morning` — the safe default; elder may edit either |

---

## 10. Elder control

Every policy is editable by voice, without a settings screen. These map to stored overrides on the
event or the type, never to code:

| Elder says | Effect |
|---|---|
| "Don't remind me a week ahead" | Disable the `advance` rule for this type |
| "Just tell me on the day" | Keep `0d` only |
| "Remind me the evening before too" | Enable `eve` |
| "Stop reminding me about this one" | Cancel occurrences for this event only |
| "Stop asking whether I went" | Disable `followup` for this type |
| "Not so many reminders" | Lower `maxRemindersPerDay` globally |
| "No reminders today" | Global pause (`QUIET_HOURS_AND_FREQUENCY.md` §6) |

Thuna **states the effect back**, and scopes it explicitly — this-event versus this-type is exactly
the distinction `MEMORY_MODEL.md` §8 says a stateless system gets wrong:

> "Just for the wedding, or for all reminders like this?"

---

## 11. Never mark paid from silence

Stated here as well as in `LIFE_EVENTS_ENGINE.md` §5, because this is the file an implementer reads
when wiring the `after` rule and it is the easiest place to get it wrong.

A `BILL` may reach `COMPLETED` **only** via:

1. Explicit elder confirmation — *"Yes, I paid it yesterday"* — through `isConfirmation()`; or
2. Provider verification through an adapter that actually checked.

Never via: the due date passing, a reminder being delivered, a `+1d` follow-up going unanswered, an
elder saying "okay" to the reminder itself (acknowledging a reminder is not reporting a payment), or
model output.

An unanswered `after` occurrence leaves the bill `MISSED` and the event **not** completed. Thuna
should then be able to say honestly: *"I don't know whether that bill was paid — shall I put it on
the list again?"*

---

## 12. Implementation notes for Codex

1. One scheduler, one `materialise(policy, event, now, profile) → ReminderOccurrence[]`. Pure.
   Re-runnable. Corrections call it again and diff.
2. Occurrences are stored with `state` from the shared vocabulary (`SCHEDULED`/`DUE`/`ACTIVE`/
   `SNOOZED`/`COMPLETED`/`MISSED`/`CANCELLED`) so the routine and life-event schedulers can be the
   same code operating on different sources.
3. Quiet-hours and cap checks live in the scheduler, applied uniformly. Do not let a type spec
   contain a time check.
4. `purpose` is non-nullable at the type level. Make a purposeless rule unconstructable.
5. Store policies as JSON in the type registry so a reviewer can diff a timing change without
   reading code.
6. Log `reminder_deduped`, `reminder_deferred_quiet_hours`, `reminder_dropped_cap` with the reason.
   These three logs are how you find out the elder is being over- or under-served.
7. Demo clock (`ROUTINE_ENGINE.md` §8): compress offsets by the same factor as routines. `-7d`
   becomes seconds. **The rules are unchanged** — never a separate demo policy set, or the demo
   proves nothing.

---

## Related

- `LIFE_EVENTS_ENGINE.md` — the state machine these occurrences drive
- `LIFE_EVENT_SCHEMA.md` — `reminderPlan`, `OfferKind`
- `QUIET_HOURS_AND_FREQUENCY.md` — the global cap, pause, and slot settings
- `PROACTIVE_COMPANION_POLICY.md` — what every occurrence must define before speaking
- `ROUTINE_ENGINE.md` §7, §8 — quiet hours, elder control, demo clock
- `CHECKIN_CONVERSATION_POLICY.md` §6 — three items maximum, one question per turn
