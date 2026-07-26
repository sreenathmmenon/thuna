# Thuna — Memory and Privacy Screen

> Design specification. **Changes no production code.**
>
> The elder can ask **"what do you remember about me?"** and get a complete, plainly-spoken answer.
> This screen is that answer, written down.
>
> `MEMORY_MODEL.md` §6 sets the test this screen enforces: *anything Thuna cannot comfortably read
> back aloud should not have been stored.* If an item cannot be rendered as one short sentence in the
> elder's own words, it does not belong in memory — and the fix is to stop storing it, not to hide it
> from this list.

---

## 1. What the elder sees

```
What Thuna remembers

- I prefer Malayalam
- Speak slowly
- Home means this address
- Priya Menon is my daughter
- My usual order is plain dosa
```

Five sentences. Each one first-person, in the elder's own voice, as they would say it themselves.

### What is never on this screen

| Never rendered | Why |
|---|---|
| Category names — Profile, Routine, Episodic, Relationship | Internal filing. "I prefer Malayalam" is not a *Profile Preference Record* to the person who prefers Malayalam |
| `sharingClass` values — `PRIVATE`, `SHAREABLE_WITH_CONSENT`, `ELDER_INITIATED` | §4 renders these as sentences |
| Confidence scores of any kind | A number about how sure a machine is about your own daughter is not information, it is unease |
| Provenance internals — `source`, `evidence`, `extractedFrom`, `rawText` | §3 |
| Timestamps — `createdAt`, `updatedAt`, `expiresAt` | "Learned on 14 March, expires 12 June" is a file, not a memory |
| Record ids, JSON, key-value pairs, any raw field name | — |
| Counts — "23 things remembered" | A number turns a person's preferences into an inventory |
| Correction history | `PRIVATE` and unshareable; a visible list of what the elder got wrong is exactly what a companion must not accumulate |
| Capability memory | `PRIVATE` and unshareable. Not on this screen, not in any screen |
| Draft or unconfirmed life events | Candidates are not memory. They answer a different question — §6 |

**Plain language is not a simplification of the real screen. It is the real screen.** There is no
"advanced view", no developer toggle, no long-press that reveals the underlying record. If a
technical view existed, this list would become the friendly wrapper around the true one — and the
true one would be where the uncomfortable items lived.

---

## 2. Layout — 390 × 844

```
┌──────────────────────────────────────────────┐  ← 390 wide
│            safe-area-inset-top (47)          │
├──────────────────────────────────────────────┤
│  16 │  What Thuna remembers        │   16    │  ← 56 header, --teal-900
├──────────────────────────────────────────────┤     20/600 --bg-cream
│                20 gap                        │
│  ┌────────────────────────────────────────┐  │  ┐
│  │  These are the things I remember       │  │  │ INTRO
│  │  about you. You can change or          │  │  │ 18/26, @70%
│  │  remove any of them.                   │  │  │ w 358, pad-x 0
│  └────────────────────────────────────────┘  │  ┘ pad-bottom 20
│  ┌────────────────────────────────────────┐  │  ┐ ITEM CARD
│  │ 20                                  20 │  │  │ w 358, radius 16
│  │                                        │  │  │ bg --teal-100
│  │   I prefer Malayalam                   │  │  │ 20/28, 500
│  │                                        │  │  │ --charcoal-900
│  │   ─────────────────────────────────    │  │  │ 1px --teal-900 @15%
│  │                                        │  │  │ rule, 16 above/below
│  │   [ Change ]  [ Remove ]  [ Who sees ] │  │  │ ACTION ROW — §3
│  │                                        │  │  │ each 52 tall
│  └────────────────────────────────────────┘  │  ┘ card h 168
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   Speak slowly                         │  │
│  │   ─────────────────────────────────    │  │
│  │   [ Change ]  [ Remove ]  [ Who sees ] │  │
│  └────────────────────────────────────────┘  │
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   Home means this address              │  │
│  │   ─────────────────────────────────    │  │
│  │   [ Change ]  [ Remove ]  [ Who sees ] │  │
│  └────────────────────────────────────────┘  │
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   Priya Menon is my daughter           │  │
│  │   ─────────────────────────────────    │  │
│  │   [ Change ]  [ Remove ]  [ Who sees ] │  │
│  └────────────────────────────────────────┘  │
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   My usual order is plain dosa         │  │
│  │   ─────────────────────────────────    │  │
│  │   [ Change ]  [ Remove ]  [ Who sees ] │  │
│  └────────────────────────────────────────┘  │
│                24 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │      Forget everything about me        │  │  ← 358 × 60, 2px --red-700
│  └────────────────────────────────────────┘  │     border, transparent,
│                24 gap                        │     --red-700 18/600
└──────────────────────────────────────────────┘
```

Five cards at 168 + four 12 gaps = 888. The list scrolls; the header does not. There is no bottom
control row on this screen — nothing here is a task in progress.

### The item card

| Element | Spec |
|---|---|
| Card | 358 wide, radius 16, `--teal-100`, padding 20 |
| Sentence | 20/28, weight 500, `--charcoal-900`. Wraps to two lines freely; the card grows to 196 |
| Divider | 1px `--teal-900` at 15%, full inner width, 16 above and below |
| Action row | Three text buttons, left-aligned, 16 gap |

### Action buttons

| Button | Size (390) | Type | Colour |
|---|---|---|---|
| **Change** | 88 × 52 | 16/600 | `--teal-900` |
| **Remove** | 92 × 52 | 16/600 | `--red-700` |
| **Who sees** | 104 × 52 | 16/600 | `--teal-900` |

88 + 16 + 92 + 16 + 104 = **316** inside a 318 inner width. All three are ≥52 tall and no narrower
than 88 — comfortably above the touch minimum in the dimension that matters for a text button, which
is width. Tap targets extend the full 52 height even though the label is 16px tall.

### Viewports

| Viewport | Changes |
|---|---|
| **360 × 800** | Card 328 (inner 288). Actions compress to 82 / 86 / 98 with 12 gaps = 290 — **1 over.** So at 360 the action row wraps to two rows: `[ Change ] [ Remove ]` on the first, `[ Who sees ]` on the second, card height 220. Never shrink a label or drop below 16px |
| **430 × 932** | Card 398 (inner 358). Actions keep their sizes, gaps grow to 24. Sentence stays 20/28 |

Malayalam sentences run longer and wrap to two or three lines; the card grows. Buttons never wrap
their labels — if a translated "Who sees" needs more width, the row wraps as at 360.

---

## 3. Per-item actions

### 3.1 Change

Opens one item, alone, with what it currently says and how to say it differently.

```
┌──────────────────────────────────────────────┐
│  Change                               [ ⟵ ]  │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  Right now I remember:                 │  │  ← 18/500 @70%
│  │                                        │  │
│  │  My usual order is plain dosa          │  │  ← 24/32, 600
│  │                                        │  │
│  │  What should it be instead?            │  │  ← 22/30
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │   Say it, or type it here         🎤   │  │  ← 358 × 72
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │        Leave it as it is               │  │  ← 358 × 52, text-only
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

One item is on this screen. **Changing one thing never re-opens the others** — the same targeted
correction rule as `TASK_SCREEN_SYSTEM.md` §6 and `LIFE_EVENTS_AND_REMEMBER_THIS.md` §5. On save:

> "I'll remember that your usual order is masala dosa."

The old value is not shown afterwards, not kept visible, and not listed anywhere the elder can see.
Supersession is an internal mechanism; a visible history of what the elder used to prefer is a record
of them changing, which is not a thing they asked to be kept.

### 3.2 Remove

**Deletion is real and immediate.** Not a tombstone, not an archive, not a 30-day recycle bin.

```
┌──────────────────────────────────────────────┐
│  Remove                               [ ⟵ ]  │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  Shall I forget this?                  │  │  ← 26/34, 600
│  │                                        │  │
│  │  "My usual order is plain dosa"        │  │  ← 22/30, in the item's
│  │                                        │  │     own words, quoted
│  │  I won't be able to bring it back.     │  │  ← 18/26 @85%
│  └────────────────────────────────────────┘  │
│                24 gap                        │
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │   Forget it      │  │   Keep it        │ │  ← 171 × 88 each, gap 16
│  │   20/600         │  │   20/600         │ │     Forget: 2px --red-700
│  │   --red-700      │  │   --charcoal-900 │ │     Keep: 2px --charcoal-900
│  └──────────────────┘  └──────────────────┘ │     both transparent fill
└──────────────────────────────────────────────┘
```

> "Shall I forget that your usual order is plain dosa? I won't be able to bring it back."

| Rule | Detail |
|---|---|
| **One confirmation, and only one** | Deletion is irreversible, so it is confirmed once. It is not confirmed twice, and there is no typed word to prove intent |
| **"I won't be able to bring it back"** | Honest, because it is true. Not a scare line — a fact stated once, plainly |
| **Both buttons equal weight, neither filled** | Same reasoning as the handoff screen: keeping and forgetting are both legitimate |
| **Immediate** | The item is gone from the list on return. No "removing…" state, no undo toast. An undo toast on a real deletion is a lie about what happened |
| **Deleting a routine deletes its history** | If the item is a reminder, the confirmation says so: *"I'll also forget the times you took it."* |
| **Voice works too** | *"Forget that"* reaches this same confirmation, spoken |

### 3.3 Who sees

Answers "who can access this" **in sentences**. `sharingClass` values never appear.

```
┌──────────────────────────────────────────────┐
│  Who sees this                        [ ⟵ ]  │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  My usual order is plain dosa          │  │  ← 20/28, 600
│  │  ────────────────────────────────────  │  │
│  │  Only you and me.                      │  │  ← 24/32
│  │                                        │  │
│  │  I have never told anyone this,        │  │  ← 18/26 @85%
│  │  and I won't unless you ask me to.     │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │   Who can I tell things?          ›    │  │  ← 358 × 72, outlined
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**The translation table — internal value to the sentence the elder reads:**

| Internal | The elder reads | Sub-line |
|---|---|---|
| `PRIVATE`, never shared | "Only you and me." | "I have never told anyone this, and I won't unless you ask me to." |
| `PRIVATE`, unshareable by rule | "Only you and me. Always." | "This is one of the things I can never tell anyone, even if you asked." |
| `SHAREABLE_WITH_CONSENT`, no grant | "Only you and me." | "I could tell Sree, but only if you say so. You haven't, so I haven't." |
| `SHAREABLE_WITH_CONSENT`, granted | "You, me, and Sree." | "You said I could tell Sree about this. I can stop any time." + `[ Stop telling Sree ]` |
| `ELDER_INITIATED`, sent once | "You, me, and Sree." | "You asked me to tell Sree this, on the fourth of August. That was the only time." |

Notes:

- **"Always"** carries the unshareable case without introducing a rule the elder has to learn. It
  means: no future setting changes this.
- **Revocation is on this screen**, one tap, immediate, never questioned. Revoking must be at least as
  easy as granting.
- **"Who can I tell things?"** opens the full picture: every recipient, what each may be told, in the
  same sentence form, with a stop control on each. This is the visual form of the spoken answer to
  *"what do you tell my family?"*

---

## 4. "Forget everything about me"

Full profile reset. It sits at the bottom of the list, outlined `--red-700`, and it is the only
destructive control on the screen.

```
┌──────────────────────────────────────────────┐
│  ┌────────────────────────────────────────┐  │
│  │  Shall I forget everything?            │  │  ← 26/34, 600
│  │                                        │  │
│  │  I'll forget your language, how you    │  │  ← 20/28
│  │  like me to speak, your address, the   │  │
│  │  people you've told me about, and      │  │
│  │  your usual order.                     │  │
│  │                                        │  │
│  │  I'll also stop telling anyone         │  │  ← 20/28
│  │  anything.                             │  │
│  │                                        │  │
│  │  I won't be able to bring any of it    │  │  ← 18/26 @85%
│  │  back.                                 │  │
│  └────────────────────────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │  Forget          │  │  Keep it all     │ │  ← 171 × 88, equal weight
│  │  everything      │  │                  │ │
│  └──────────────────┘  └──────────────────┘ │
└──────────────────────────────────────────────┘
```

| Rule | Detail |
|---|---|
| **The consequences are listed in the elder's own sentences** | Not "all profile, routine, episodic and relationship records". The five things they would actually notice |
| **Consent grants are named as a consequence** | "I'll also stop telling anyone anything." A reset that silently left grants standing would be the worst possible bug on this screen |
| **One confirmation** | Same as any deletion. Real, immediate, no undo |
| **After** | "I've forgotten everything. We can start again whenever you like." Warm, unceremonious, and immediately usable — Thuna still works, it just knows nothing |

---

## 5. Reaching this screen

Four routes. All four land on the same screen.

| Route | How |
|---|---|
| **By voice** | *"What do you remember about me?"* — the primary route, and the one that must work first. Also "what do you know about me", "forget that", "what do you tell my family" |
| **From the home screen** | A row reading **"What you remember about me"**, in the elder's phrasing, not "Settings" or "Privacy". 358 × 72, in the ordinary list, not behind a gear icon |
| **From any item Thuna mentions** | When Thuna uses a memory — *"your usual, from Saravana Bhavan"* — the task screen's summary row for that field is tappable and lands on that item's card, scrolled into view |
| **From "Who sees this"** | The recipient screen links back |

**No gear icon, no hamburger, no Settings tree.** A memory the elder cannot find is a memory they
cannot correct. This is a first-class screen with a first-class door.

---

## 6. The spoken version

The elder asks *"what do you remember about me?"* and hears the same content as the screen, in the
same order:

> "You prefer Malayalam. You like me to speak slowly. I know where home is. Priya Menon is your
> daughter. And your usual order is plain dosa.
>
> You can tell me to forget any of it."

**Rules for the spoken form:**

| Rule | Detail |
|---|---|
| **Same items, same order** | Screen and voice do not diverge. The spoken list is the screen list read aloud, second person instead of first |
| **The closing line is required** | "You can tell me to forget any of it." A readback without a way to act on it is a recital |
| **No counts** | Never "I remember five things about you" |
| **Complete, not summarised** | Everything on the screen is spoken. If the list is long enough that speaking it fully is unreasonable, that is a signal Thuna is storing too much, not a reason to abbreviate |
| **Anything unspeakable is unstorable** | The practical test from `MEMORY_MODEL.md` §6, applied literally. If an item cannot be said comfortably out loud, it should never have been stored |
| **Voice actions work** | *"Forget the dosa one"* reaches §3.2's confirmation, spoken: *"Shall I forget that your usual order is plain dosa? I won't be able to bring it back."* |

### The different question

If the elder asks *"what are you still asking me about?"*, they get the **candidates** — `DRAFT` and
`NEEDS_CONFIRMATION` life events — which are deliberately **not** on this screen. They are Thuna's
open questions, not its memory, and answering the memory question with unconfirmed guesses would
misrepresent what Thuna knows.

> "Two things I haven't finished checking with you: a wedding on the eighth of August, and a bill I
> couldn't read properly."

Those live behind the "Not saved yet" cards in `LIFE_EVENTS_AND_REMEMBER_THIS.md` §7.2.

---

## 7. Implementation notes for GLM

1. **The screen's props are a `{ id, sentence, actions }[]`.** No categories, no scores, no
   timestamps, no sharing enums. Map at the boundary, once, in a function whose only job is producing
   the sentence. Structural enforcement — the view cannot leak what it was never given.
2. **The sentence is stored or templated per memory kind, not model-generated at render.** "I prefer
   Malayalam" must be identical every time the elder opens the screen. A regenerated sentence that
   drifts wording between visits reads as Thuna's memory being unstable.
3. **The spoken readback and the screen render from the same list.** One source, two presentations
   (first person on screen, second person aloud). Test that the item sets are identical.
4. **Filter `DRAFT` and `NEEDS_CONFIRMATION` life events out of this list.** Test it directly; this
   will be the easiest thing to get wrong when life events land in memory.
5. **Deletion calls a real delete.** Assert the record is absent from the store afterwards, not
   flagged. Assert that deleting a routine also removes its occurrence history.
6. **No undo affordance anywhere on this screen.** No toast, no snackbar, no "Undo" for 5 seconds. The
   confirmation is the safety mechanism; a fake undo undermines the honesty of "I won't be able to
   bring it back."
7. **Full reset must purge consent grants**, and the confirmation copy must say so. Test that no grant
   survives a reset.
8. **The `sharingClass` → sentence mapping is one table** (§3.3), tested exhaustively so a new value
   cannot render as a raw enum. Add a fallback assertion that fails loudly in tests rather than
   printing `SHAREABLE_WITH_CONSENT` to an elder.
9. **Capability memory has no path to this screen.** It is `PRIVATE` and unshareable; it is not
   rendered, not listed, and not summarised.
10. **Every action button is ≥52 tall with a full-height tap target**, even though the labels are 16px.
    Verify at 360 width, where the action row wraps to two lines.

---

## Related

- `docs/companion/MEMORY_MODEL.md` §6 — the readback, deletion, and the read-aloud test this screen enforces
- `docs/companion/MEMORY_MODEL.md` §10 — sharing classes, translated to sentences in §3.3
- `docs/companion/MEMORY_RETENTION_AND_DELETION.md` — deletion semantics
- `docs/companion/MEMORY_CORRECTION_AND_SUPERSESSION.md` — what happens behind "Change"
- `docs/companion/FAMILY_CONSENT_POLICY.md` §6, §7 — revocation and "what do you tell my family?"
- `docs/companion/CAPABILITY_MEMORY.md` — why capability data never appears here
- `LIFE_EVENTS_AND_REMEMBER_THIS.md` §7.2 — candidates, which are a different question
- `FAMILY_HANDOFF_SCREEN.md` — the sharing this screen describes
- `COMPONENT_SPECIFICATION.md` — `MemoryReview`
- `VISUAL_DESIGN_SYSTEM.md` — tokens
