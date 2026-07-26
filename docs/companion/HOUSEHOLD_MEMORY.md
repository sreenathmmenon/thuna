# Thuna — Household Memory

> Design document. **Changes no production code.**
>
> A new memory category: **the home as a context**, distinct from the elder as a person.
> The distinction is not bureaucratic — it changes what may be shared.

---

## 1. Why the household is a separate category

An elder does not live in a vacuum. Lakshmi comes on Mondays and Thursdays. The water purifier
filter is due. Rajan the building manager has a spare key. The LPG cylinder is ordered from the shop
on the corner.

None of this is *about the elder*. It is about the house. And that difference matters for exactly one
reason, which is the point of this document:

> **Household facts are far less sensitive than personal facts, and treating them as personal makes
> Thuna useless for the ordinary business of running a home.**

If "the maid comes on Monday" is classed as personal memory, then every practical arrangement
requires the same consent ceremony as a medical appointment, and the elder ends up either
over-consenting from fatigue or unable to get simple help. Both are bad outcomes produced by a
category error.

The converse error is worse and must be guarded against harder: **treating a personal fact as
household** — because household facts have looser sharing rules, and a misclassification is a
privacy leak. §4 draws the line.

---

## 2. What household memory holds

Stored as `MemoryRecord` with `category: provider_service` (`COMPANION_MEMORY_SCHEMA.md` §3.5) and a
household scope marker. Four kinds of thing:

### 2.1 Who lives there

```
HouseholdMember {
  contactId?      → relationship memory, if they are also a person Thuna knows
  displayName     "Amma"
  role            SPOUSE | RELATIVE | TENANT | LIVE_IN_HELP
  presence        PERMANENT | PART_TIME
}
```

**Only who is in the house, never anything about them.** No health, no routines, no preferences, no
capability records. A spouse who also uses Thuna is a separate principal with their own memory and
their own consent — never a field on the elder's record.

> **Why this matters.** The obvious next feature is "remember Amma's medicine too". That would make
> Thuna hold medical data about a person who never consented to anything, in someone else's account.
> If a second person is to be helped, they get their own profile.

### 2.2 Regular helpers

```
HouseholdHelper {
  displayName     "Lakshmi"
  serviceType     DOMESTIC_HELP | COOK | DRIVER | GARDENER | CARETAKER | NEIGHBOUR
  schedule?       "Mondays and Thursdays, mornings"   — the elder's own words
  channelRef?     opaque handle, if contactable
  notes?          "has a key"                          — elder's words, bounded
}
```

Practical, and the elder is glad Thuna knows it: *"Lakshmi's not due today, she comes Thursday."*

**A helper is not automatically in the circle of trust.** Knowing Lakshmi comes on Mondays does not
mean Thuna may ask her for anything. Circle membership is a separate, explicit, role-scoped grant
(`CIRCLE_OF_TRUST.md` §3). Same structure as the contact-details-versus-consent-to-notify
distinction in `MEMORY_MODEL.md` §5, applied to the household.

### 2.3 Recurring household services

```
HouseholdService {
  serviceType     LPG | WATER_DELIVERY | NEWSPAPER | MILK | WASTE_COLLECTION |
                  INTERNET | ELECTRICITY | MAINTENANCE
  vendorName?     "the shop on the corner"
  cadence?        "second Tuesday"
  lastServicedAt?
  channelRef?     opaque handle
}
```

Never stores account numbers, customer ids, billing credentials, or amounts. A vendor *name* and a
*cadence*, nothing more. Anything account-shaped is `operational` memory
(`COMPANION_MEMORY_SCHEMA.md` §3.1) and subject to the DPDP boundary in `MEMORY_MODEL.md` §7.

### 2.4 Appliances needing service

```
HouseholdAppliance {
  displayName     "water purifier"
  location?       "kitchen"
  serviceCadence? "filter every six months"
  lastServicedAt?
  vendorRef?      → HouseholdService
}
```

Genuinely useful and entirely unsensitive. Supports a reminder the elder is pleased to get:

> "The water purifier filter is about due — shall I remind you to call them?"

Note the shape: a reminder to *call them*, not an autonomous booking. Nothing consequential happens
without an in-the-moment yes (`COMPANION_PRODUCT_MODEL.md` §6).

---

## 3. Household scope — the third visibility value

`COMPANION_MEMORY_SCHEMA.md` §6 defines `ConsentScope.visibility` with three values. `HOUSEHOLD` is
defined here and applies **only** to records in this category.

| Visibility | Applies to | Meaning |
|---|---|---|
| `ELDER_ONLY` | Default, everywhere | Nothing leaves |
| `SPECIFIC_RECIPIENTS` | Personal facts, per grant | Named people only |
| `HOUSEHOLD` | **Household facts only** | May be shared for a household purpose with a circle member holding a relevant role |

`HOUSEHOLD` is narrower than it sounds. It means: *when the elder asks a circle member for help with
something household-shaped, the relevant household fact may be included in that request.*

> "The tap in the kitchen — Rajan usually looks at things like that."
> "Lakshmi comes Thursday morning, if that suits."

It does **not** mean:

- Household facts are shared proactively — they are not, ever
- Family may query the household — they may not (`FAMILY_STORY_LOOPS.md` §6, same rule)
- Any standing information flow exists — none is created

**`HOUSEHOLD` never overrides the consent gate in `send()`.** It is a ceiling on what a message may
contain, not a permission to send one. The `ConsentGrant` check is unchanged
(`FAMILY_CONSENT_POLICY.md` §11.1).

---

## 4. Household facts vs personal facts

The classification test:

> **Would this still be true if a different person lived in this house?**

If yes → household. If no → personal.

| Household | Personal |
|---|---|
| "Lakshmi comes Mondays and Thursdays" | "Appa likes the kitchen done first" |
| "The purifier needs a filter" | "Appa can't reach the top shelf" |
| "LPG comes from the corner shop" | "Appa has trouble with the LPG app" |
| "The building manager is Rajan" | "Appa doesn't get on with Rajan" |
| "Bin collection is Wednesday" | "Appa forgets bin day" |
| "There are three people in the house" | "Appa is often alone in the afternoons" |

### The right-hand column is where the danger is

Every personal example above is a **fact about the elder wearing household clothing**, and each would
be a meaningful privacy leak if classified as household and thereby made shareable under §3.

The three worst cases, called out:

**"Appa has trouble with the LPG app"** — this is `capability` memory, it is `PRIVATE`, and no
consent unlocks it (`CAPABILITY_MEMORY.md` §4). It must never be filed as a household service note,
which is the exact mistake an implementation would make while trying to be helpful.

**"Appa forgets bin day"** — behavioural observation about a person. Prohibited outright
(`MEMORY_MODEL.md` §9). The *household* fact is "bin collection is Wednesday". A reminder can be
built from that alone, without any claim about the elder's memory. **Build the reminder from the
schedule, never from an observation about forgetting.**

**"Appa is often alone in the afternoons"** — presence pattern about a person. Prohibited: it is
behavioural analytics, it is a proxy for loneliness, and it is a safety risk if shared. The household
fact is who lives there; when any of them happens to be in is not recorded at all.

### When it is genuinely both

Some facts are legitimately both — "the driver takes Appa to the temple on Fridays" is a household
arrangement and a personal routine.

**Classify as personal.** The stricter class always wins. If both readings are available, take the
one that shares less.

---

## 5. Household memory and the circle of trust

The two overlap in people and are separate in structure:

| | Household memory | Circle of trust |
|---|---|---|
| Answers | *Who is around, and what is arranged* | *Whom may I ask for help, for what* |
| Created by | The elder mentioning it | An explicit elder grant with a role |
| Grants anything? | **No** | Yes — the right to be asked |

A helper in household memory with no circle role is simply someone Thuna knows about. Thuna will not
contact them, will not propose them, and will not include them in an offer.

> **Elder:** "Ask Lakshmi to pick up milk."
> **Thuna:** "I don't have a way to contact Lakshmi. Would you like me to remind you to ask her when
>  she's here on Thursday?"

Honest about the limit, useful anyway, and no boundary crossed.

---

## 6. Retention and deletion

| Item | Retention |
|---|---|
| `HouseholdMember` | Until changed |
| `HouseholdHelper` | Until changed |
| `HouseholdService` | Until changed |
| `HouseholdAppliance` | Until changed |
| `lastServicedAt` | Superseded on each service |
| Any account identifier | **Not stored here** — `operational`, session-scoped |

Deletion follows `MEMORY_RETENTION_AND_DELETION.md`. Household records are among the easiest to
delete and among the least likely to be regretted — *"forget about the purifier"* removes it and any
reminder built on it.

**Profile reset purges household memory.** The house is remembered because the elder lives there; the
record has no independent existence.

### Read-back

> "Lakshmi comes Mondays and Thursdays. The purifier is due a filter in March. Rajan is the building
>  manager. LPG from the corner shop."

Comfortable to say aloud, which is the test (`MEMORY_MODEL.md` §6). If a household read-back were
uncomfortable, the record is misclassified — almost certainly a personal fact filed as household.

---

## 7. Elder-facing phrasing

**Using it naturally:**

> "Lakshmi's not due today — Thursday, isn't it?"

**Offering a service reminder:**

> "The purifier filter is about due. Shall I remind you to call them?"

**Confirming a new household fact:**

> "Shall I remember that the bin goes out Wednesday?"

**Declining to contact someone not in the circle:**

> "I don't have a way to reach Lakshmi. Shall I remind you on Thursday instead?"

**Including a household fact in a help request:**

> "I'll tell Rajan there's a tap needs looking at, at the house. Nothing else."

**Refusing a family query:**

> "Sree asked who comes to the house. That's not something I can tell him — he should ask you."

**Deleting:**

> "Right, I'll forget about the purifier. I won't remind you about it any more."

---

## 8. Implementation notes for Codex

1. **Household records carry an explicit `householdScoped: true` marker**, and `HOUSEHOLD` visibility
   is rejected on any record without it. Personal records cannot acquire household visibility.
2. **The classification test (§4) runs at write time, not read time.** A record filed wrongly is
   already a leak by the time anything reads it.
3. **`HouseholdMember` has no health, routine, capability, or preference fields.** Not omitted for
   scope — structurally absent, so a second person's data cannot be attached to the elder's account.
4. **No account numbers, customer ids, or amounts** in this category. Those are `operational` and
   session-scoped per `MEMORY_MODEL.md` §7.
5. **Household presence is never a `HOUSEHOLD`-scoped record.** Do not model "who is home when". §4.
6. **A `HouseholdHelper` is not a `CircleMember`.** Separate types, separate stores. Contactability
   requires an explicit circle role (`CIRCLE_OF_TRUST.md` §3).
7. **Reminders built from household schedules never reference the elder's behaviour.** Trigger on the
   cadence, never on an observation about forgetting.
8. Test: personal fact cannot be `HOUSEHOLD`-scoped; helper without a circle role is never contacted
   or proposed; family query refused *and elder notified*; profile reset purges household memory.

---

## Related

- `COMPANION_MEMORY_SCHEMA.md` §3.5, §6 — the `provider_service` category; `ConsentScope`
- `CIRCLE_OF_TRUST.md` — why knowing someone is not permission to ask them
- `RELATIONSHIP_MEMORY.md` — people records, where a household member is also a known person
- `CAPABILITY_MEMORY.md` — why "trouble with the LPG app" can never be household-scoped
- `MEMORY_MODEL.md` §5, §7, §9 — contacts vs consent; DPDP boundary; prohibited memory
- `MEMORY_RETENTION_AND_DELETION.md` — deletion mechanics
