# Thuna — Independence Metrics

> Design document. **Changes no production code.**
>
> **The product goal is increasing independence, not maximising engagement.**
> A successful Thuna is used *less* over time for tasks the elder has learned.

---

## 1. The north-star metric

> **Tasks the elder completes independently, that they previously could not.**

Everything else in this document supports, decomposes, or protects that number.

It is deliberately awkward as a business metric — it goes up as usage goes down, per task. That is
not a flaw in the metric. It is an accurate statement of what this product is for, and any metric
that were more comfortable would be measuring something else.

`COMPANION_PRODUCT_MODEL.md` §10 already says it: *"Note what is absent: engagement, session length,
retention. A companion that maximises engagement is optimising against the elder's interest. The
right amount of Thuna is the least that helps."* This document turns that into numbers.

### What success looks like, concretely

An elder who:

- Ordered food with `DETAILED` guidance in March
- Ordered it with `MINIMAL` guidance in May
- Ordered it without opening Thuna at all in August

is a **complete success**, and Thuna's usage for that task went to zero. That is the shape of the
outcome, and any measurement framework that scores it as churn is measuring the wrong product.

### The corollary that keeps it honest

Independence per task should rise. **Total relationship need not shrink** — the elder who no longer
needs help ordering food may now be using Thuna for a video call, or simply for the check-in they
enjoy. Independence is measured **per task**, not as a global reduction in contact.

Measuring it globally would create pressure to push elders away from things they actually want,
which is a different failure, in the opposite direction, and just as bad.

---

## 2. The metrics that count

All derived from `CAPABILITY_MEMORY.md`, all per-task, all subject to that document's §4 boundary.

| Metric | Definition | Good direction |
|---|---|---|
| **Unaided completion rate** | `completedUnaided / attempts`, per task | ↑ |
| **Guidance level trajectory** | Proportion of tasks at `MINIMAL` or `ON_DEMAND_ONLY` | ↑ |
| **Time to first unaided completion** | Attempts before the first solo success | ↓ |
| **Task graduation** | Tasks moved to `ON_DEMAND_ONLY` and stayed there | ↑ |
| **Handoff appropriateness** | Handoffs that reached `ELDER_CONFIRMED` | ↑ (see §4) |
| **Loop closure rate** | Story loops and requests that closed | ↑ |
| **Correction rate** | Corrections per task | ↓ — Thuna's failing, not the elder's |

### Notes

**Unaided completion rate is per task and never aggregated across tasks.** An aggregate would be an
"independence score" for the person, which `CAPABILITY_MEMORY.md` §4.2 prohibits.

**Correction rate measures Thuna.** A correction means Thuna misheard or misunderstood
(`COMPANION_PRODUCT_MODEL.md` §5.3 — failure is Thuna's, not the elder's). It is a product-quality
metric, never a signal about the elder, and must never inform guidance level.

**Task graduation is the headline.** It is the cleanest expression of the north star: a task the
elder now owns.

---

## 3. Metrics that must NOT exist

Each of these is standard in consumer products, each would be trivially available, and each would
actively make Thuna worse. Their absence is a design decision to be defended in review.

| Prohibited metric | Why it corrupts the product |
|---|---|
| **Daily/monthly active use** | Rewards dependence. Direct inversion of the north star. |
| **Session length** | Rewards Thuna being slow to help |
| **Session count** | Rewards making the elder come back |
| **Retention / churn** | An elder who no longer needs Thuna is a success, not churn |
| **Engagement rate** | An elder editing what they say to satisfy a metric is the failure mode |
| **Tasks completed without escalation** | Rewards Thuna absorbing tasks a person should have (`HUMAN_ATTENTION_BRIDGE.md` §1) |
| **Notifications delivered to family** | Rewards more sharing. Directly opposes consent defaults. |
| **Consent grant rate** | Would create pressure to ask again, or ask better — both prohibited |
| **Any cognitive or health proxy** | `MEMORY_MODEL.md` §9. Prohibited outright. |
| **Any per-person aggregate score** | `CAPABILITY_MEMORY.md` §4.2 |
| **Any trend over a person's data** | `CAPABILITY_MEMORY.md` §4.1 |

### The mechanism to be wary of

Nobody sets out to build a surveillance product. It arrives through metrics. A team that tracks
engagement will, entirely reasonably, ship features that increase engagement — and for this product
those features are: more proactive contact, more sharing, more reasons to come back, and less
teaching. Every one of them is a small betrayal of the elder, and every one will look like a win on
the dashboard.

**The defence is not discipline. It is not collecting the number.**

### On "tasks completed without escalation" specifically

The most seductive of the prohibited metrics, because it looks like a quality measure. It is not. It
rewards Thuna for keeping the elder to itself, and its optimum is a product that never brings a human
back — which `HUMAN_ATTENTION_BRIDGE.md` §1 establishes as the wrong product entirely.

If the number is ever computed, it is **descriptive only** and never a target.

---

## 4. Handoffs count as success

Restating `HUMAN_ATTENTION_BRIDGE.md` §1 in metric terms, because this is where it would be
quietly lost.

| Outcome | Counts as |
|---|---|
| Elder completed the task with Thuna's help | ✅ Success |
| Elder completed the task unaided | ✅✅ Better success |
| Elder asked for a person; a person helped | ✅ **Success** |
| Thuna offered a person; elder accepted; loop closed | ✅ **Success** |
| Thuna kept trying and the elder gave up | ❌ Failure |
| Thuna absorbed a task a person should have done | ❌ Failure, though it looks like a win |

**Handoff appropriateness** — the proportion of handoffs reaching `ELDER_CONFIRMED` — is the
legitimate handoff metric. It asks *did the handoff work*, not *did we avoid one*.

The last row is the one to watch. An elder who wanted to hear their daughter's voice and instead got
a competent AI resolution has been served worse, and no metric in a conventional framework would
notice. This one names it.

---

## 5. What is measured about the person: nothing

Every metric here is about **a task** or **the product**. None is about the elder.

| Legitimate subject | Never a subject |
|---|---|
| A task type | The elder's ability |
| A guidance level | The elder's cognition |
| A flow, screen, or step | The elder's health |
| Thuna's own error rate | The elder's mood |
| A loop's closure | The elder's habits or activity level |

Test for any proposed metric:

> **Could this number be read as a statement about the person?**

If yes, it is prohibited regardless of how it is labelled. "Independence score: 62" is a statement
about a person. "Unaided completion rate for `ORDER_FOOD`: 8/10" is a statement about a task and a
flow.

### The reporting boundary

**No metric in this document is ever shared with family.** Not aggregated, not summarised, not
"reassuring". A family-facing independence dashboard would be a cognitive assessment tool with a
friendly chart, and the elder would rightly experience it as one.

`CAPABILITY_MEMORY.md` §4.4: the underlying data is `PRIVATE` and not consent-unlockable, so nothing
derived from it can be shared either. **Derived data inherits the sharing class of its source** — the
alternative is a laundering route around every privacy rule in the model.

---

## 6. Measuring without surveilling

Product-level improvement needs aggregate data. Individual privacy forbids per-person histories.
Both hold, if aggregation is done properly.

Rules:

1. **Aggregate across elders, never over one elder's timeline.** "The UPI PIN step fails often" is a
   product insight. "This elder's UPI PIN step fails often" is a personal record.
2. **Counts, not sequences.** Ordered event sequences per person reconstruct a behavioural history
   even when each event is innocuous.
3. **No identifiers in aggregates.** Hashed at rest per `MEMORY_MODEL.md` §11 and not joinable back.
4. **Rolling windows, not lifetime history.** Same 180-day window as capability memory. No long tail,
   no trend to draw.
5. **No cohorts by age, and no cohorts that function as proxies for it.**
6. **The elder can opt out**, and opting out costs them nothing.

> The useful insights are almost entirely about the *software*: which steps are hard, which screens
> are confusing, which flows are too long. Those aggregate cleanly across people and need nothing
> about any individual. If a proposed measurement genuinely requires one elder's history, it is
> measuring the elder.

---

## 7. Elder-facing framing

The elder should never see a score, a chart, a streak, or a progress bar. Gamified independence is
condescending and turns ordinary competence into a performance.

**If the elder asks what Thuna keeps:**

> "Only which tasks you've done on your own, so I know how much to explain. Nothing about how you're
>  doing."

**Never said:**

> ~~"You're doing better this month!"~~
> ~~"Your independence score is up."~~
> ~~"You've used me less this week — well done."~~

All three reveal that Thuna is keeping score of the person, and all three are the condescension
`COMPANION_PRODUCT_MODEL.md` §5.4 prohibits.

**The right expression of the metric is silence.** The elder experiences it as Thuna gradually saying
less about things they already know — which is what a helpful person does, without commentary.

---

## 8. Implementation notes for Codex

1. **Do not instrument session count, session length, DAU/MAU, or retention.** Not "collect but don't
   display" — do not collect. §3.
2. **Every metric is keyed by `taskType`.** No per-elder aggregate accessor exists. If one is needed
   for a dashboard, the dashboard is wrong.
3. **No metric function returns a trend or direction.** Same rule as `CAPABILITY_MEMORY.md` §4.1.
4. **Derived data inherits `sharingClass` from its source.** A value computed from `PRIVATE` records
   is `PRIVATE`. Enforce in the type, so aggregation cannot launder a sharing class. §5.
5. **Aggregation is cross-elder only.** The aggregation function should take a population, never a
   single elder's series. Make the wrong call impossible to write.
6. **No elder-facing metric surface.** No progress view, no streaks, no summary card. §7.
7. **Handoff outcomes are counted as successes** wherever completion is counted. Assert it in the
   test suite, so a later refactor cannot quietly reclassify them. §4.
8. Test: no engagement metric is collected; no per-person aggregate exists; derived values retain
   `PRIVATE`; handoffs count as success; no family-facing metric path exists.

---

## Related

- `CAPABILITY_MEMORY.md` — the source data, and the boundary all these metrics inherit
- `ADAPTIVE_GUIDANCE.md` — the mechanism by which independence increases
- `HUMAN_ATTENTION_BRIDGE.md` §1 — escalation as a success state
- `COMPANION_PRODUCT_MODEL.md` §10 — success criteria, and what is deliberately absent
- `MEMORY_MODEL.md` §9, §11 — prohibited inference; hashing and logging
