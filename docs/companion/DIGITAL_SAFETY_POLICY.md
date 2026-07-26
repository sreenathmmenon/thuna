# Thuna — Digital Safety Policy

> Design document. **Changes no production code.**
>
> Elders are the most targeted demographic for digital fraud in India, and the attacks are not
> crude. They are scripted, patient, and specifically engineered to defeat exactly the qualities
> that make someone a good person to deal with: trust, politeness, and a wish not to cause trouble.
>
> Thuna's job here is narrow and absolute: **never be the instrument.**

---

## 1. The one rule

> ## A refusal must never depend on a model's judgement.

Every credential and fraud refusal in Thuna runs **before any AI call**, as a deterministic
function, in exactly the pattern already established by `quickCheck()` in `lib/router.ts`:

```ts
const RISKY = /\b(otp|pin|cvv|card number|password|secret)\b/i;
export function quickCheck(text: string): RouteDecision | null {
  if (RISKY.test(text)) return { type: 'risky', reason: 'sensitive credential' };
  return null;
}
```

The reasoning is not squeamishness about models. It is that **a model asked to help with a scam
can be talked into it, and a regular expression cannot.** Fraud scripts are adversarial prose
written by people who iterate against refusals. "It's not really an OTP, it's a verification
code." "I'm from the bank's own security team." "She's my mother, I have her permission." A
language model weighing context will eventually find one of these persuasive. A deterministic
check has nothing to weigh.

So the safety gate is architecturally *in front of* the classifier, not one of its outcomes. See
`UNIVERSAL_INBOX.md` §3, stage 2 — safety precedes classification, and a refused input is never
extracted from at all.

---

## 2. The absolute prohibitions

Thuna will never **request, accept, store, transmit, log, repeat aloud, or type into anything**:

- OTPs, one-time codes, verification codes, "the number the bank just sent"
- PINs, ATM PINs, UPI PINs, card PINs
- CVVs, card numbers, expiry dates
- Passwords, passphrases, security answers
- Net-banking credentials, account numbers paired with credentials
- Government identifiers (Aadhaar, PAN) offered as proof to a third party

This holds **regardless of who is asking, why, or how urgent it sounds** — including if the elder
themselves asks Thuna to relay it, and including if a family member asks. There is no consent
setting that unlocks it, and no `--force` path. This matches `MEMORY_MODEL.md` §9 (prohibited
memory) and `CHECKIN_CONVERSATION_POLICY.md` §9 (what Thuna must never say).

**If an OTP appears in a transcript or OCR text, it is dropped at the gate and never enters
`rawText` downstream.** Redaction happens at capture, not at logging time.

---

## 3. The response pattern

Every risk detection follows the same four beats, in the same order. The order is the design.

```
  PAUSE  ──►  EXPLAIN  ──►  REFUSE  ──►  OFFER A PERSON  ──►  record minimal metadata
```

| Beat | What happens | Why it is in this position |
|---|---|---|
| **1. Pause** | Stop the current flow. Do not continue whatever task was underway. | Scams work by momentum. Breaking the tempo is most of the protection. |
| **2. Explain the risk** | One plain sentence about *why*, not just *that*. | An elder who understands the pattern is protected next time, when Thuna is not there. A bare "I can't do that" teaches nothing. |
| **3. Refuse** | Clearly, without hedging, without apologising into a negotiation. | A soft refusal invites a second attempt. |
| **4. Offer a person** | Name a specific trusted person and offer to reach them. | The elder is mid-scam with a real problem. Refusal alone leaves them alone with the caller. |
| **5. Record minimally** | That a risk was refused. Never the content. | §6. |

### Beat 4 is not optional

A refusal without an offer of human help is the failure mode where Thuna's safety policy makes
things *worse*: the elder is now confused, still being pressured, and has been told no by the one
thing that was helping them. Every refusal ends by naming a real person. See
`TRUSTED_PERSON_HANDOFF.md`.

---

## 4. Exact refusal wording

Templates, not free generation — same discipline as `CHECKIN_CONVERSATION_POLICY.md` §10.5. The
model may translate and adapt pace; it must not invent the structure of a refusal.

### OTP / PIN / CVV requested

> "Stop — please don't tell me that, and please don't tell them either.
>  That code is the key to your money, and a real bank will never ask for it.
>  I won't take it and I won't pass it on.
>  Shall I help you ring Sree about this?"

### Remote-access app (AnyDesk / TeamViewer / QuickSupport)

> "Please don't install that. That app would let them see and control your phone,
>  including your bank app. Nobody from a real bank or company will ask you to install it.
>  Let's stop here. Would you like me to call Sree?"

### Suspicious link

> "I'd rather you didn't open that link. I can't tell where it really goes,
>  and links sent like this are often used to take money.
>  Shall we ask Sree to look at it first?"

### Unknown QR code

> "Please don't scan that. Scanning a code like that can send money out of your account —
>  it doesn't bring money in, even when someone says it will.
>  Would you like me to get Sree?"

### Secrecy request — the highest-signal case

> "Wait. Somebody asking you to keep money matters from your family is the clearest sign
>  there is that something is wrong. Honest people do not need that.
>  I'd like you to talk to Sree before anything else happens. Shall I ring him?"

### Urgent transfer under pressure

> "Nothing here has to happen this minute — that hurry is part of how this works.
>  Real offices do not ask for money in the next ten minutes.
>  Let's slow down and ask Sree first."

### Screen sharing during a call

> "Please don't share your screen with them. They would be able to see your codes as they
>  arrive. Let's end this call. Would you like me to help you ring Sree?"

### Caller claiming to be a bank official

> "You can hang up. If it is really your bank, you can ring the number printed on your card
>  and reach them yourself — that's always safe, and this isn't.
>  Would you like help finding that number, or shall I call Sree?"

---

## 5. Tone: never shame the elder

> **Scams are engineered by professionals to work. Nearly falling for one is not a failure of
> intelligence, character, or age.**

This is a product requirement, not a tone preference, and it is the requirement most likely to be
violated by well-meaning copy.

**Prohibited, absolutely:**

| Never say | Why |
|---|---|
| "You almost gave away your PIN!" | Alarm framed as the elder's error |
| "You should be more careful." | Instruction to a competent adult, delivered as correction |
| "This is a common scam — you didn't recognise it?" | Implies a deficit |
| "Good thing I was here." | Positions Thuna as the elder's minder |
| "I'll let Sree know you nearly fell for something." | A report of being victimised, which is the single most humiliating thing Thuna could produce |
| Any praise for stopping ("well done for not sending it!") | Congratulating an adult for ordinary judgement — `COMPANION_PRODUCT_MODEL.md` §5.4 |

**The correct posture is that the message is at fault, never the person.** "That message is a
trick" — not "you were tricked". Thuna refuses the *attacker*, and stands beside the elder while
doing it.

If the elder is upset afterwards, `CHECKIN_CONVERSATION_POLICY.md` §5 applies: do not assess, do
not counsel, do not record an inference. Offer a person and stop.

---

## 6. Minimal metadata — what is recorded

**A refusal record must never read as a record of someone being defrauded.**

Recorded:

```
RiskRefusalRecord
  refusalId
  signal            the RiskSignal id that fired  (e.g. SECRECY_REQUEST)
  occurredAt
  channel           VOICE | PHOTO | SCREEN | FORWARDED_MESSAGE
  handoffOffered    boolean
  handoffAccepted   boolean
  category          Episodic
  sharingClass      PRIVATE            ← not consent-unlockable
  expiresAt         30 days
```

**Never recorded, under any circumstance:**

- The scam message text, the caller's script, or any quote from it
- The link, the QR payload, the phone number of the caller
- Any credential, even redacted or partial ("the OTP ended in 47")
- The elder's reaction, distress, confusion, or hesitation
- How close the elder came to complying
- Any count or trend ("third attempt this month") — that is behavioural analytics,
  prohibited by `MEMORY_MODEL.md` §9

### Why the content is not kept, even though it would be useful

There is a real argument for keeping scam text: it would help improve detection. It is refused
anyway, for two reasons.

First, `MEMORY_MODEL.md` §6 sets the practical test — *anything Thuna cannot comfortably read
back aloud should not have been stored.* An elder asking "what do you remember about me?" must
not hear a stored transcript of the afternoon someone tried to rob them.

Second, `sharingClass: PRIVATE` in `MEMORY_MODEL.md` §10 is **not consent-unlockable**. If the
content existed, a future family-visibility feature could eventually surface it. Not storing it is
the only durable guarantee.

---

## 7. What Thuna will still do

Safety must not become paralysis. Thuna continues to help with:

- Explaining what a legitimate message or bill actually says (`SCREEN_CONTEXT_ASSISTANCE.md`)
- Reading an official notice aloud in the elder's language
- Confirming that a bank's printed helpline number is the safe route
- Helping ring a trusted person
- Remembering that a bill is due (a `BILL` candidate — `UNIVERSAL_INBOX.md` §6)

Thuna refuses **actions and disclosures**, not **understanding**. An elder who asks "what does
this message mean?" gets a plain answer, including "it means someone is trying to take money from
you". That is the most valuable thing Thuna can say.

---

## 8. Implementation notes for Codex

1. **Extend the existing `quickCheck()` pattern; do not create a parallel system.** The current
   `RISKY` regex in `lib/router.ts` is the seed. `RISK_SIGNAL_MODEL.md` enumerates the full signal
   set with detection notes. Keep it one deterministic function returning a refusal or `null`.
2. **The gate runs on every `CapturedInput`**, not only on elder utterances. OCR text from a photo
   and a forwarded message body go through the same function.
3. **Refusal short-circuits.** No classification, no extraction, no model call, no candidate. The
   pipeline returns `REFUSED` from stage 2.
4. **Redact at capture.** A matched credential pattern is stripped from `rawText` before anything
   downstream can see it — not filtered at log time.
5. **Refusal templates live beside `lib/guidance.ts`**, keyed by signal id, translated per locale.
   The structure is fixed; only wording is localised.
6. **Test the gate with no model wired at all.** If the refusals require a model to be available,
   the architecture is wrong.
7. **Never write a bypass.** No admin flag, no "trusted contact said it's fine", no
   `allowCredentials: true`. The absence of the code path is the guarantee.

---

## Related

- `RISK_SIGNAL_MODEL.md` — the enumerated signals, weights, and detection notes
- `TRUSTED_PERSON_HANDOFF.md` — beat 4: routing to a real human
- `SCREEN_CONTEXT_ASSISTANCE.md` — the no-instruction-without-evidence rule
- `UNIVERSAL_INBOX.md` §3 — the pipeline stage this gate occupies
- `MEMORY_MODEL.md` §9, §10 — prohibited memory; `PRIVATE` is not consent-unlockable
- `CHECKIN_CONVERSATION_POLICY.md` §9 — what Thuna must never say
- `lib/router.ts` — the existing `quickCheck()` this policy builds on (read-only)
