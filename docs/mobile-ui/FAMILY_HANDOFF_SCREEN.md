# Thuna — Family Handoff Screen

> Design specification. **Changes no production code.**
>
> One screen, one job: **show the elder the exact words that will be sent, before they are sent.**
>
> What may go in those words is governed by `docs/companion/MINIMUM_DISCLOSURE_POLICY.md`. Whether
> anything may be sent at all is governed by `docs/companion/FAMILY_CONSENT_POLICY.md`. This document
> specifies only the screen.

---

## 1. The screen

```
Ask Sree for help?

I will tell him:

"Appa needs help checking the electricity bill."

I will not share your full conversation.

[ Ask Sree ]        [ Keep this private ]
```

Five parts, always in this order, never rearranged, never collapsed:

| # | Part | Purpose |
|---|---|---|
| 1 | **The question** | Names the person. "Ask Sree for help?" — not "Share?", not "Send" |
| 2 | **"I will tell him:"** | Announces that what follows is the literal message |
| 3 | **The message, in quotation marks** | The verbatim `disclosure` string. Not a summary of it |
| 4 | **"I will not share your full conversation."** | Answers the fear the elder actually has |
| 5 | **Two buttons of equal weight** | Both are real choices |

**Nothing is added to this screen.** No preview of who else can see it, no "recommended", no
recipient picker crowding the message, no explanation of why Thuna is suggesting it. Every added
element is a thing to read before the elder can decide, and the decision is a small one that deserves
to stay small.

---

## 2. Layout — 390 × 844

```
┌──────────────────────────────────────────────┐  ← 390 wide
│            safe-area-inset-top (47)          │
├──────────────────────────────────────────────┤
│  16 │  Ask for help                 │  16    │  ← 56 header, --teal-900
├──────────────────────────────────────────────┤     20/600 --bg-cream
│                32 gap                        │
│  ┌────────────────────────────────────────┐  │  ┐
│  │                                        │  │  │ w 358, radius 24
│  │   Ask Sree for help?                   │  │  │ pad 24, bg --teal-100
│  │   26/34, 600, --charcoal-900           │  │  │ PART 1
│  │                                        │  │  │
│  │   ─────────────────── 20 ──────────    │  │  │
│  │                                        │  │  │
│  │   I will tell him:                     │  │  │ PART 2
│  │   18/500 @70%                          │  │  │ pad-bottom 12
│  │                                        │  │  │
│  │  ┌──────────────────────────────────┐  │  │  │ ┐ PART 3 — THE MESSAGE
│  │  │ ▍                                │  │  │  │ │ 4px --teal-900 left rule
│  │  │ ▍ "Appa needs help checking      │  │  │  │ │ w 310, pad 20 (24 left)
│  │  │ ▍  the electricity bill."        │  │  │  │ │ bg --bg-cream
│  │  │ ▍                                │  │  │  │ │ radius 12
│  │  └──────────────────────────────────┘  │  │  │ ┘ 22/34, 500
│  │                                        │  │  │   --charcoal-900
│  │   ─────────────────── 20 ──────────    │  │  │   quotation marks LITERAL
│  │                                        │  │  │
│  │   I will not share your full           │  │  │ PART 4
│  │   conversation.                        │  │  │ 18/500 @85%
│  │                                        │  │  │
│  └────────────────────────────────────────┘  │  ┘
│                24 gap                        │
│  ┌──────────────────┐  ┌──────────────────┐ │  ┐ PART 5
│  │                  │  │                  │ │  │ 171 × 96 each, gap 16
│  │   Ask Sree       │  │  Keep this       │ │  │ radius 16
│  │                  │  │  private         │ │  │ both 20/600
│  │                  │  │                  │ │  │ both 2px --teal-900 border
│  └──────────────────┘  └──────────────────┘ │  ┘ NEITHER is filled — §3
│                                              │
├──────────────────────────────────────────────┤
│           safe-area-inset-bottom (34)        │
└──────────────────────────────────────────────┘
```

Vertical: 47 + 56 + 32 + ~330 card + 24 + 96 + 34 = **619 of 844.** Deliberately short. This screen
has room to breathe because it is a screen where the elder should slow down, and a dense screen is
one people scroll past.

### Viewports

| Viewport | Changes |
|---|---|
| **360 × 800** | Card 328, message block 280. Buttons 156 × 96, gap 16. Title 24/32, message 20/30 |
| **430 × 932** | Card 398, message block 350. Buttons 191 × 96. The extra height goes to the gap above the buttons (32 not 24) — more separation between reading and deciding |

Malayalam wraps the message to three or four lines; the message block grows and the card grows with
it. **The message is never truncated, never clamped, never given a "more" link.** A partly-shown
disclosure defeats the entire screen.

---

## 3. Both buttons are real choices

**"Keep this private" is not a cancel button.** It is one of two legitimate answers, and it is styled
to say so.

| Property | Ask Sree | Keep this private |
|---|---|---|
| Size | 171 × 96 | 171 × 96 — identical |
| Position | Left | Right, same row, same baseline |
| Border | 2px `--teal-900` | 2px `--teal-900` |
| Fill | Transparent | Transparent |
| Label | 20/600 `--charcoal-900` | 20/600 `--charcoal-900` |
| Weight, size, colour | Identical | Identical |

**Neither button is filled.** This is the one screen in the product where the primary-action pattern
is deliberately suspended. A filled `--teal-900` "Ask Sree" against an outlined "Keep this private"
would make declining look like the mistake — and the whole premise of the consent policy is that the
elder is the principal, choosing freely. A visual hierarchy here is a thumb on the scale.

Further rules:

- **No dismissive placement.** "Keep this private" is not a small × in the corner, not a text link
  under the fold, not greyed.
- **No "recommended" marker, no default focus, no pre-selection.**
- **No countdown, no auto-send.** The screen waits indefinitely. If the elder walks away, nothing is
  sent — and this is the state where doing nothing must equal not sharing.
- **Hardware back and the header back arrow behave as "Keep this private."** Leaving never sends.
- **No third button.** "Ask someone else" would turn a yes/no into a menu at the moment the elder is
  deciding whether to share at all.

---

## 4. What happens after each

### 4.1 After "Ask Sree"

```
┌──────────────────────────────────────────────┐
│  Ask for help                         [ ⟵ ]  │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  ✓                                     │  │  ← 32px tick, --green-600
│  │                                        │  │
│  │  I told Sree, word for word:           │  │  ← 22/32
│  │                                        │  │
│  │ ┌────────────────────────────────────┐ │  │
│  │ │ ▍ "Appa needs help checking        │ │  │  ← same block, same rule,
│  │ │ ▍  the electricity bill."          │ │  │     same 22/34 type
│  │ └────────────────────────────────────┘ │  │
│  │                                        │  │
│  │  That was all.                         │  │  ← 18/500 @85%
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                20 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   Wait for Sree                   ›    │  │  ← 358 × 72, outlined
│  └────────────────────────────────────────┘  │
│                12 gap                        │
│  ┌────────────────────────────────────────┐  │
│  │   Carry on without help           ›    │  │  ← 358 × 72, outlined
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

> "I told Sree, word for word: 'Appa needs help checking the electricity bill.' That was all."

| Rule | Detail |
|---|---|
| **The message is re-shown, identical** | Same words, same block, same type size. Not a shrunken echo. What Thuna says it sent must be byte-identical to what was sent |
| **"That was all."** | Three words, and the most reassuring on the screen |
| **No delivery telemetry** | No "delivered", no "seen", no "typing". The elder asked a family member for help, not a support ticket |
| **The task is not abandoned** | "Carry on without help" returns to the exact task state. Asking for help must not cost the elder their place |
| **No standing grant is created** | Elder-initiated sharing is scoped to that message only. The next request asks again |

**If the elder later asks "what have you told Sree?"**, this exact quoted text is read back from the
stored `disclosure` — a verbatim quote, never a reconstruction.

### 4.2 After "Keep this private"

```
┌──────────────────────────────────────────────┐
│  Electricity bill                     [ ⟵ ]  │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  I haven't told anyone.                │  │  ← 26/34
│  │                                        │  │
│  │  Shall we keep going?                  │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │   Yes, let's carry on             ›    │  │  ← 358 × 72
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │   Leave it for now                ›    │  │  ← 358 × 72
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

> "I haven't told anyone. Shall we keep going?"

| Rule | Detail |
|---|---|
| **"I haven't told anyone" is stated** | Silence after declining leaves the elder wondering. The confirmation costs one line |
| **Not re-asked** | Not in this task, not in this session. Re-asking until the elder relents is a prohibited grant flow, and it is equally prohibited for a one-off request |
| **No disappointment, no consequence framing** | No "you can always ask later if you get stuck". The elder made a choice; it is not a deferral |
| **Nothing recorded as a difficulty** | Declining help is not stored, not counted, and never mentioned again |
| **The task continues unchanged** | Same step, same fields, same place |

---

## 5. When the elder is not the one asking

Thuna sometimes *offers* the handoff — after a refusal, after a Stop, or at a dosage question. The
offer and the send are separate screens.

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │  Would you like me to ask         │  │
│  │  someone for a hand?              │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │   Ask Sree                   ›   │  │  ← 358 × 72
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │   Ask Priya                  ›   │  │  ← 358 × 72
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │        No, thank you              │  │  ← 358 × 52, text-only
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

Choosing a person opens §1 with that person's name and message. **The offer screen never shows a
message and never sends anything** — picking a recipient is not consent to a text the elder has not
read yet. Two screens, because they are two decisions.

"No, thank you" ends it. The offer is not repeated in the same session.

---

## 6. Consent-gated cases

Elder-initiated help needs no prior grant — the request is the consent. Other categories do, and this
screen is where the absence shows.

### 6.1 No consent, and Thuna cannot share

When a routine goes unanswered twice and no `ROUTINE_MISSED` grant exists, **the handoff screen never
opens.** No preview, no greyed "Ask Sree" button, no "grant permission to enable this". Instead, at
the next contact, one offer, once:

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │  You didn't answer this           │  │  ← 26/34
│  │  morning's reminder.              │  │
│  │                                   │  │
│  │  Would you like me to let Sree    │  │
│  │  know when that happens?          │  │
│  │                                   │  │
│  │  I won't unless you say so.       │  │  ← 18/500 @85%
│  └──────────────────────────────────┘  │
│  ┌──────────────────┐ ┌──────────────┐ │
│  │  Yes, tell Sree  │ │  No, keep it │ │  ← 171 × 96 each
│  │                  │ │  between us  │ │     equal weight, both
│  └──────────────────┘ └──────────────┘ │     outlined — §3
└────────────────────────────────────────┘
```

> "You didn't answer this morning's reminder. Would you like me to let Sree know when that happens? I
> won't unless you say so."

"Yes, tell Sree" opens the grant screen, which must show **a real example of the message** that would
be sent before the grant is recorded. It does not retroactively send anything about this morning.

"No, keep it between us" ends it. **Not re-asked in the same session.** If the elder hesitates, the
answer is no.

### 6.2 What Thuna offers instead when it cannot share

Being unable to notify is not being unable to help. The screen offers what remains:

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │  I can't tell anyone about this   │  │
│  │  unless you ask me to.            │  │
│  │                                   │  │
│  │  I can help you call Sree now,    │  │
│  │  if you like.                     │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │   Call Sree                  ›   │  │  ← 358 × 72
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │   Try again together         ›   │  │  ← 358 × 72
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │        Leave it for now           │  │  ← 358 × 52, text-only
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

| Rule | Detail |
|---|---|
| **The limit is stated plainly, without apology or blame** | "I can't tell anyone about this unless you ask me to." Not "you haven't given permission" — which frames the elder's own privacy setting as their oversight |
| **A blocked send is a normal result, not an error** | Neutral `--teal-100`. No red, no warning rule, no error iconography |
| **Calling is offered because it is elder-initiated** | The elder speaking to Sree directly needs no grant and discloses nothing through Thuna. It is the better option, not the fallback |
| **No path to a grant from here** | Asking for consent at the moment the elder needs help is coercive — consent as a precondition for getting help is a prohibited grant flow |

### 6.3 When a family member asks Thuna for more

If Sree replies asking *"what's actually wrong?"*, Thuna does not answer from memory — not partially,
not vaguely. It tells the elder:

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │  Sree is asking what the trouble  │  │
│  │  is.                              │  │
│  │                                   │  │
│  │  Shall I tell him anything, or    │  │
│  │  would you rather say yourself?   │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │   I'll tell him myself       ›   │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │   Tell him something for me  ›   │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │        Don't answer him           │  │  ← text-only
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

"Tell him something for me" opens §1 with the message the **elder dictates** — the elder may disclose
anything they like about themselves. This policy constrains Thuna, not the elder. Whatever they say
appears in the quoted block, verbatim, and is still shown before sending.

Similarly, if a family member asks Thuna to expand what it shares, Thuna declines and **tells the
elder it was asked.** That notification uses this same screen shape, with a single "I understand"
acknowledgement.

---

## 7. Implementation notes for GLM

1. **The quoted block renders the stored `disclosure` string and nothing else.** Not a template
   re-evaluated at render time, not a model-composed sentence. Render the exact string that will be
   passed to the adapter.
2. **The preview and the send must read the same variable.** Pass one `disclosure: string` into the
   screen and into `send()`. Test that the rendered text and the sent payload are byte-identical —
   two derivations of "the message" is exactly how a preview drifts from reality.
3. **`FamilyHandoff` has no props for task state, attempt counts, step names, durations, error text,
   amounts, or capability data.** Structural enforcement: the composer cannot reach what it is not
   given. Assert the absence of the fields, not the absence of substrings.
4. **Neither button may take a `variant="primary"`.** Add a lint rule or a test asserting both buttons
   render with identical computed styles apart from their labels. This will be the most-regressed rule
   in this document, because "make the primary action obvious" is a reflex.
5. **Back, swipe-back, and dismiss all resolve to the decline path.** Never leave the screen in a state
   where an ambiguous exit sends.
6. **No timers, no auto-advance, no auto-focus on either button.**
7. **The confirmation screen re-reads the stored `disclosure`**, not a copy held in component state.
8. **The consent check happens in `send()`, not here.** This screen never asks "am I allowed?" — it
   renders what it is given. A blocked send returns a normal result the caller renders as §6.2.
9. **Declining is not persisted anywhere the elder or family can see.** No "declined help" event in
   any elder-facing history.
10. **Recipient names come from relationship memory and are rendered as the elder refers to them** —
    "Sree", not "Sreenath Menon (Son)". The screen speaks the elder's language about their own family.

---

## Related

- `docs/companion/MINIMUM_DISCLOSURE_POLICY.md` — what may be in the message; §3 requires this preview
- `docs/companion/FAMILY_CONSENT_POLICY.md` §5, §6, §8, §10 — grants, revocation, elder-initiated sharing, escalation without consent
- `docs/companion/FAMILY_REQUEST_LIFECYCLE.md` — where `disclosure` is stored
- `docs/companion/HUMAN_ATTENTION_BRIDGE.md` — when to ask a person at all
- `ROUTINE_AND_CHECKIN_SCREENS.md` §4.7 — the `ESCALATED` state and the no-consent offer
- `TASK_SCREEN_SYSTEM.md` §4.6, §6 — where "Ask someone" appears in a task
- `MEMORY_AND_PRIVACY_SCREEN.md` — "who can see this" in plain words
- `COMPONENT_SPECIFICATION.md` — `FamilyHandoff`
- `VISUAL_DESIGN_SYSTEM.md` — tokens
