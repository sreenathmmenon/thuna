# Thuna — Telephony Future Plan

> Design document. **Changes no production code.**
>
> Product rule: telephony is optional, never required for core operation, and
> telephony credentials must not be committed.
>
> **Nothing here should be built during the current build.** This exists so the in-app voice layer is
> shaped correctly today, and so telephony remains an adapter swap rather than a rewrite.

---

## 1. Why telephony matters eventually

The elders who most need Thuna are the least likely to open an app. A phone that rings is a
universal interface — no install, no login, no smartphone, no screen, no learned gesture.

Telephony would let Thuna:
- Reach an elder who does not use apps at all
- Deliver a reminder that cannot be missed by not opening something
- Work on a feature phone
- Be answered by someone with poor vision or limited dexterity

That is a substantial expansion of who Thuna can serve. It is also the point at which Thuna becomes
capable of ringing an elder's house unbidden, which is why the consent and quiet-hours machinery has
to exist *before* the capability does.

---

## 2. Why it is deliberately not now

| Reason | Detail |
|---|---|
| **Not required** | Browser mic satisfies the entire locked demo scope |
| **Credential risk** | Telephony credentials must never be committed; more secrets, more risk |
| **Cost** | Real per-minute charges; a retry loop bug becomes a bill |
| **Regulatory** | India: TRAI/DND registration, commercial-calling rules, consent records |
| **Higher harm ceiling** | A ringing phone at 3am is a real intrusion in a way a missed notification is not |
| **Latency** | PSTN adds round-trip latency to an already tight STT→LLM→TTS loop |

The honest summary: telephony multiplies both Thuna's reach and its capacity to intrude, and only
the second one arrives on day one.

---

## 3. Architectural preparation (do this now — it is free)

Telephony should be **an adapter swap, not a rewrite**. The prerequisite is that nothing in the
routine engine or guidance layer knows how audio reaches the elder.

Already provided in this package:
`docs/contracts/channel-adapter.ts` — one interface covering `IN_APP_VOICE` and `TELEPHONY`.

Design rules to hold in the current build:

1. **The routine engine never learns the channel.** It calls `speak()` / `listen()`; it never asks
   whether there is a phone line.
2. **Session states already cover telephony** — `DIALING`, `RINGING`, `ANSWERED`, `NO_ANSWER`,
   `BUSY` exist in the contract even though in-app voice never uses them. Adding them later would
   change the routine engine's transition table; having them now means it does not.
3. **`humanResponded` is separate from delivery.** Telephony makes this vivid — a call can connect
   to an answering machine. In-app voice should already treat the distinction as real.
4. **Consent and quiet hours are checked in `openSession()`**, not in the routine engine, so a
   future second caller cannot bypass them.
5. **Guidance is channel-neutral.** No copy assumes a screen. Anything spoken must stand alone
   without visuals — which is good practice for accessibility regardless.
6. **Utterance chunking already exists** (Bulbul's ≤2500 chars per request).

Holding these costs nothing today and saves a redesign later.

---

## 4. Providers (for future evaluation only)

**No integration should be attempted now.** Recorded so evaluation has a starting point.

| Provider | Relevance | Notes |
|---|---|---|
| **Exotel** | India-focused | Named in the orchestration doc. Indian numbers, local compliance |
| **Twilio** | Global, mature | Named in the orchestration doc. Strong docs; India calling has extra regulatory steps |
| **Plivo** | India presence | Alternative |

Requirements when the time comes:
- Programmable outbound voice
- Real-time media streaming (bidirectional audio into the Sarvam pipeline)
- DTMF (a keypad press is a robust confirmation for an elder who struggles with speech recognition)
- Call-status webhooks (answered / no-answer / busy / failed)
- Indian number provisioning and DND/TRAI compliance support

**Verify all of this against official provider documentation at evaluation time.** Nothing in this
table has been verified for this package — telephony research was explicitly out of scope.

---

## 5. Regulatory (India) — must be researched before any build

Flagged, not resolved:

- **TRAI / DND registration** for commercial voice calls
- **Consent records** — proof the recipient agreed to be called
- **Calling-hour restrictions** — likely tighter than Thuna's own quiet hours
- **Caller ID** requirements
- **DPDP** — call audio is PII; recording carries additional obligations
- **Opt-out** — a spoken/keypad opt-out honoured immediately and permanently

Design assumption: **Thuna does not record calls.** Audio is processed transiently for STT and
discarded. Recording would create a store of an elder's private conversations, which conflicts with
`MEMORY_MODEL.md` §9 (no transcripts beyond the session).

---

## 6. Safety rules specific to telephony

Beyond everything in `CHECKIN_CONVERSATION_POLICY.md`:

1. **Hard quiet hours.** A defect that fires a notification early is an annoyance; one that rings a
   phone at 3am is a harm. Enforce at the adapter, independently of the scheduler.
2. **Rate limit at the adapter.** Maximum calls per elder per day, independent of routine logic. A
   retry-loop bug must not be able to call twenty times.
3. **Immediate hang-up on request.** "Stop" ends the call at once.
4. **DTMF as an accessibility path.** "Press 1 if you've taken it." More reliable than STT for many
   elders, and cheaper.
5. **Answering machines are not people.** `humanResponded` must be false. Never mark a routine
   complete because a voicemail accepted audio.
6. **Identify immediately.** An unexpected automated call is alarming; the first sentence must say
   who is calling and why.
7. **Never request OTP/PIN/CVV on a call** — the existing pre-model refusal applies unchanged, and
   matters more here, since voice-phishing is the exact shape of this interaction.
8. **Cost ceiling** with a hard stop, alarmed.

Rule 7 deserves emphasis: an automated phone call asking an elder for a code is *indistinguishable
from a scam*. Thuna must never do it, and should proactively say it never will — that is genuinely
protective, because it teaches the elder that any such call is fraudulent.

---

## 7. Staged rollout

**Stage 0 — now.** Interface only. `ChannelAdapter` exists; only `InAppVoiceChannelAdapter` is
implemented. No credentials, no provider dependency.

**Stage 1 — simulated telephony.** A `MockTelephonyChannelAdapter` exercising `DIALING` → `RINGING`
→ `ANSWERED` / `NO_ANSWER` / `BUSY`, plus answering-machine and mid-call-hangup cases. Proves the
routine engine handles telephony states with **zero cost and zero risk**. This is the highest-value
cheap step, and the natural next one.

**Stage 2 — one real number, one consenting tester.** Only after: web product green, regulatory
review done, credentials in a secret manager, cost ceiling enforced, quiet hours verified at the
adapter. Test on the builder's own phone before any real elder.

**Stage 3 — limited real use.** Explicitly consented elders only. Per-elder opt-in, opt-out honoured
immediately, monitoring for cost and call-frequency anomalies.

**Stage 4 — general availability.** Only after regulatory compliance is confirmed in writing.

**Do not skip Stage 1.** Most telephony bugs are state-machine bugs, and they are far cheaper to
find against a mock than against a real phone ringing in someone's house.

---

## 8. Definition of "ready"

Telephony is ready to *begin* only when all are true:

1. Web product is green (typecheck, tests, build)
2. `MockTelephonyChannelAdapter` passes the full routine test suite
3. Quiet hours enforced at the adapter, independently tested
4. Per-elder call rate limit implemented and tested
5. Consent model live, with telephony as its own consent category
6. Credentials in a secret manager — never in the repo, never in `.env` committed
7. Cost ceiling with hard stop
8. Indian regulatory requirements researched and documented
9. Immediate, permanent opt-out implemented
10. A real human has consented to be the first test subject

**Any "no" means not yet.**

---

## 9. Explicit non-goals

Thuna telephony will **not**:

- Answer inbound calls as a general assistant
- Record or store call audio
- Place calls to anyone other than the consenting elder (no calling family *for* them without an
  explicit in-the-moment request)
- Be marketed or presented as an emergency or medical alert system
- Operate without the elder's per-channel consent
- Replace human contact — the best outcome of a Thuna call is often that a person calls next

---

## Related

- `docs/contracts/channel-adapter.ts` — the interface that makes this a swap
- `ROUTINE_ENGINE.md` — channel-agnostic state machine
- `CHECKIN_CONVERSATION_POLICY.md` — what is said once connected
- `FAMILY_CONSENT_POLICY.md` — consent model
