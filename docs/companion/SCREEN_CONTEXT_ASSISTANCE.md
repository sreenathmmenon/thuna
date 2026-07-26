# Thuna — Screen Context Assistance

> Design document. **Changes no production code.**
>
> Helping an elder with what is *actually on their screen* — an unfamiliar app, a payment-pending
> message, a delivery notice, a permission dialog, a link someone sent.

---

## 1. The hard rule

> ## No instruction without visible evidence.
>
> If Thuna cannot see it, Thuna does not say which button to press.

This is a structural rule, not a caution. It has a name, a failure mode, and an enforcement point.

### The failure mode: `CONFIDENT_BLIND_INSTRUCTION`

A model asked "where do I press to pay?" will answer. It has read a million UI descriptions; it
will produce a fluent, plausible, specific instruction — *"the blue button at the bottom right"* —
about a screen it has never seen. That instruction is generated from a prior, not from evidence.

Why this is a serious harm rather than a minor inaccuracy:

1. **The elder has no way to detect it.** The whole reason they asked is that they cannot
   interpret the screen. They cannot cross-check a confident answer against the thing they could
   not read.
2. **The instruction is followed.** An elder who trusts Thuna presses what Thuna says to press.
   Being told wrong by a helper is worse than being stuck, because being stuck is recoverable.
3. **Screens are consequential.** The bottom-right button might be *Pay*, *Confirm*, *Allow*, or
   *Delete account*. There is no safe generic guess in an interface Thuna cannot see.
4. **It destroys the safety model.** Every protection in `DIGITAL_SAFETY_POLICY.md` assumes Thuna
   is not the thing telling the elder to tap Allow. A blind instruction makes Thuna the attacker's
   most credible accomplice — the voice the elder already trusts.

**Enforcement:** an instruction-shaped response requires an `evidenceRef` on the current turn. No
evidence, no instruction — the request routes to §4's refusal path, not to the model.

---

## 2. What counts as evidence

| Evidence | Sufficient for |
|---|---|
| A photo or screenshot Thuna has processed via Vision this session | Specific instruction about visible elements |
| Screen text the elder read aloud, captured via Saaras | Instruction about the elements they described |
| The elder's own description of a specific element ("there's a green button that says Pay") | Instruction referring to that element in their words |
| Thuna's own simulated screen state, inside a Thuna skill flow | Instruction — this is the existing `lib/engine.ts` contextual-question behaviour and is unaffected |

| **Not** evidence | Why |
|---|---|
| Knowing which app it is | App layouts differ by version, device, language and region |
| A screenshot from earlier in the session | Screens change; the elder has been tapping |
| The elder's general goal ("I want to pay the bill") | A goal is not a screen |
| A model's confident recall of that app's UI | This *is* the failure mode |

**Evidence expires within the turn.** A screen described three turns ago is not the screen now.

---

## 3. Asking the elder to show or describe

The productive move is almost never "I don't know". It is to get evidence.

### Preferred order

1. **Ask them to describe what they see**, in their own words. Fastest, always available, and it
   works for someone who cannot operate a screenshot.

   > "Tell me what you can see on the screen — is there any writing at the top?"

2. **Ask for one specific element** rather than a full account. Open questions about a screen are
   hard for someone who finds the screen hard.

   > "Is there anything written on the button at the bottom?"

3. **Ask for a photo**, last, and only if describing has not worked.

   > "Could you take a picture of the screen and show me?"

### Phrasing rules

- **Never imply the elder should already know.** ❌ "What does it say? It should be obvious."
  ✅ "These screens are badly designed — tell me what words you can see and I'll work it out."
  Blame the interface, not the person. `COMPANION_PRODUCT_MODEL.md` §5.3.
- **Ask about words, not layout.** "What does it say?" is answerable. "Is it a modal or a
  bottom sheet?" is not.
- **One question per turn**, as everywhere.
- **Accept partial descriptions.** Something is evidence; work with what you have and say what you
  still cannot tell.

---

## 4. Refusing to guess

When there is no evidence and the elder cannot supply any, Thuna says so plainly. This is an
`UNSUPPORTED` outcome (`INPUT_CLASSIFICATION_POLICY.md` §7), not a failure to be papered over.

> "I can't see your screen, so I'd only be guessing which button to press — and if I guessed
>  wrong you might tap something you didn't mean to. Would you like me to help you ring Sree so
>  he can look at it with you?"

Note the structure: **state the limit, state why it matters, offer a person.** The same shape as
the safety refusals in `DIGITAL_SAFETY_POLICY.md` §3, for the same reason — a refusal that leaves
the elder alone with the problem is not much of a help.

### Prohibited hedged instructions

The dangerous middle ground is a guess wearing a disclaimer. All of these are prohibited:

- "It's *usually* the button at the bottom right."
- "In most apps, you'd tap Continue."
- "It's *probably* the blue one."
- "Try pressing the one that says Next — if that's there."

**A hedge does not survive being spoken aloud.** The elder hears "press the blue one"; "probably"
does not reach their thumb. If Thuna cannot see it, Thuna does not name a button — hedged or
otherwise.

---

## 5. What Thuna does with evidence in hand

With a visible screen, Thuna is genuinely useful:

| Elder's situation | Thuna's help |
|---|---|
| Unfamiliar screen | Read the visible text aloud, in Malayalam, and say plainly what the screen is for |
| English-only interface | Translate the visible words (Sarvam Translate) — **only the words that are there** |
| Payment-pending message | Explain what it claims; check it against `RISK_SIGNAL_MODEL.md`; never pay |
| Delivery-delay message | Explain it; if it asks for a fee, that is `DELIVERY_DELAY_LURE` |
| Permission dialog | Say what the permission actually grants, in plain words; **do not say which button to press** |
| Event notice / bill / slip | Read it, then offer to remember it — `DOCUMENT_TO_EVENT_PIPELINE.md` |
| Suspicious link on screen | Refuse to open it; explain; offer a person — `DIGITAL_SAFETY_POLICY.md` §4 |

### The permission dialog case

Even with the dialog fully visible, Thuna **explains, and does not direct**:

> "That box is asking to let the app control your phone — that's a lot of access.
>  I can tell you what it means, but I won't tell you to press it. What is it you were trying
>  to do?"

Why the restraint persists even with evidence: a permission dialog is exactly what a remote-access
scam produces (`RISK_SIGNAL_MODEL.md` §3.11), and Thuna cannot see *why* the dialog appeared. It
can read the words; it cannot know whether a fraudster is on the phone. So it describes and asks.

If any other risk signal is present in the session, this escalates to `CRITICAL` and becomes a
refusal.

---

## 6. Never describing what was not seen

A distinct failure from §1 and worth naming separately: Thuna must not **narrate** a screen it has
not seen.

- ❌ "You should be on the payment page now."
- ❌ "It'll be loading — you'll see a spinner."
- ❌ "There'll be a confirmation message."

Each of these is a fabricated observation, and an elder will reasonably take it as Thuna knowing
what is happening. When Thuna does not know, it says so and asks:

> "I can't tell what happened. What can you see now?"

This is also `CHECKIN_CONVERSATION_POLICY.md` §9 — never claim a real external action occurred
when it did not.

---

## 7. Privacy of screen content

A screen capture is among the most sensitive things an elder can hand over: bank balances, chat
messages, health information, other people's names.

- **`mediaRef` and OCR `rawText` are session-scoped.** Never persisted —
  `MEMORY_MODEL.md` §9 (no transcripts beyond the session), `UNIVERSAL_INBOX.md` §4.
- **Only confirmed fields survive**, via the ordinary confirmation gate
  (`CONFIRM_BEFORE_MEMORY.md`). A photograph of a bill leaves behind the amount and due date the
  elder confirmed — never the image, and never the rest of what was on the screen.
- **Credentials visible in a capture are redacted at capture**, before anything downstream reads
  them. An OTP in a notification banner is stripped, not stored and then filtered.
- **Never shared with family** without the ordinary consent gate, and screen content has no
  notification category — meaning there is no path to send it at all.
- **Balances and amounts are not remembered** unless the elder confirms a `BILL` candidate.
  Reading a balance aloud is help; recording it is a financial profile.

---

## 8. Sarvam roles

Primary category remains **Voice Experience**; vision supports it.

| Model | Role |
|---|---|
| **Sarvam Vision** | Reading the screenshot or photograph into text |
| **Translate** | Rendering English interface text into Malayalam |
| **Sarvam-30B/105B** | Explaining what the visible screen is for; forming the clarifying question |
| **Saaras** | The elder describing the screen aloud — the *preferred* evidence path (§3) |
| **Bulbul** | Speaking the explanation back |

The preferred evidence path is spoken description, not photography. An elder who cannot read the
screen can usually still read a few words aloud, and speaking is one action where taking a
screenshot is several. The voice path is both the safer fallback and the product's centre.

---

## 9. Implementation notes for Codex

1. **`evidenceRef` is a required parameter on any instruction-producing response path.** Make the
   blind instruction unrepresentable rather than discouraged — the same technique as the typed
   consent gate in `docs/contracts/notification-adapter.ts`.
2. **Evidence is turn-scoped.** Clear it at the end of every turn; do not carry a screenshot
   forward.
3. **Pre-model guard:** if the utterance is instruction-shaped (`which button`, `where do I press`,
   `what do I tap`, `എവിടെ അമർത്തണം`) and no evidence exists this turn, return the §4 refusal
   without calling a model. Same pattern as `quickCheck()` in `lib/router.ts`. A model given the
   question will answer it.
4. **Thuna's own simulated screens are exempt** — `lib/engine.ts` already answers contextual
   questions from its own screen state, which is real evidence. Do not regress that behaviour.
5. **Screen captures never touch persistent storage.** Session memory only, discarded at session
   end.
6. **Redact credentials at capture**, shared with `DIGITAL_SAFETY_POLICY.md` §8.4.
7. **Test the refusal with no model wired**, as with all pre-model guards.

---

## Related

- `DOCUMENT_TO_EVENT_PIPELINE.md` — turning a seen document into a confirmed event
- `DIGITAL_SAFETY_POLICY.md` — refusal pattern, redaction at capture
- `RISK_SIGNAL_MODEL.md` §3.11 — permission dialogs; §3.7 suspicious links
- `TRUSTED_PERSON_HANDOFF.md` — where "ask Sree" goes
- `UNIVERSAL_INBOX.md` — `CapturedInput`, session-scoped `rawText`
- `MEMORY_MODEL.md` §9 — no transcripts, no persisted captures
- `COMPANION_PRODUCT_MODEL.md` §5, §6 — dignity; contextual questions mid-flow
