# Thuna — Cross-Channel Continuity

> Design document. **Changes no production code.**
>
> Governing principle: **the elder is talking to Thuna, not to a phone or a browser.** Changing how
> the sound travels should not make Thuna forget the conversation — and must never make it forget
> that a confirmation belongs to a moment, not to a person.

---

## 1. The problem

An elder starts an order in the app, their daughter calls, they pick up the phone, and later Thuna
rings them back. Three channels, one conversation.

Two failure modes, in tension:

- **Forgetting.** Making them repeat the restaurant, the item and the address because the transport
  changed. Insulting, and the main reason people abandon voice assistants.
- **Over-remembering.** Carrying a *confirmation* across the gap and placing an order on a yes given
  in a different context, minutes or hours ago, possibly to a different total.

The resolution is the same line drawn in `INTERRUPTION_AND_RESUME.md` §2:

> **Confirmed fields travel. Confirmations do not.**

---

## 2. What crosses a channel boundary

| Carried | Not carried |
|---|---|
| The active task or routine (`PreparedActionId`, routine occurrence) | The `ActionConfirmation` |
| Confirmed fields — restaurant, item, address, recipient | Any authority to execute |
| The unanswered question | Cached provider figures |
| Pause reason | The old readback text as though still current |
| Pending provider action (an `UNKNOWN` awaiting reconcile) | Session-scoped provider PII |
| Next safe step | Held document images (`document-input-adapter.ts`) |
| Expiry / invalidation condition | Conversation transcript |

The right-hand column is not a list of things that are hard to move. It is a list of things that
**must not** move.

---

## 3. Channel change is a resume

A channel change is treated exactly as an interruption — same record, same decision table
(`INTERRUPTION_AND_RESUME.md` §4), with one addition:

> **A channel change always re-reads authoritative state and always re-asks, regardless of elapsed
> time.**

Even a two-second handover from browser to phone re-reads and re-asks. The reasoning is not that
prices moved in two seconds; it is that Thuna cannot be sure the same person is now on the line,
or that the elder heard the readback before the switch.

### Re-opening on the new channel

> *"It's Thuna. We were sorting out your dosa order — nothing's been placed. Shall I read it out
> again?"*

Three obligations in that sentence:

1. **Identify itself.** On a new channel the elder may not know who is speaking.
2. **State the actual state.** "Nothing's been placed" — true only when it is true, i.e. never after
   an unreconciled `UNKNOWN`.
3. **Offer, do not resume.** The elder consents to continuing.

---

## 4. Confirmations are channel-bound

`ActionConfirmation.confirmedVia` records the `ChannelKind` the yes arrived on. It is not decoration:

> **A confirmation is only valid for execution on the channel it was given on, within its TTL, bound
> to its revision.**

Why all three conditions:

- **Channel** — a yes in a text message is a different act from a yes spoken aloud, and Thuna cannot
  verify that the same person holds both.
- **TTL** — an old yes is not a yes (`INTERRUPTION_AND_RESUME.md` §1).
- **Revision** — they agreed to a specific state (`prepared-action.ts`).

So a channel change invalidates the confirmation even when the TTL is intact and the revision has not
moved. The elder is asked again. It costs one sentence.

---

## 5. Identity across channels

Thuna does not do voice biometrics, does not fingerprint, and does not build a behavioural profile to
recognise anyone. What it has is weaker and that is accepted:

| Channel | Assurance |
|---|---|
| In-app voice | The device is the elder's; assurance from the session |
| Telephony | The number rang; **whoever answered is not verified** |
| Messaging | The handle is the elder's; the person holding it is not verified |

Consequences, encoded rather than hoped for:

1. **No consequential action on an unverified channel** without a fresh, in-the-moment confirmation
   on that channel.
2. **Nothing private is volunteered on an inbound unverified channel.** Thuna does not read out an
   elder's appointments to whoever picked up the phone.
3. **A handoff never inherits authority.** Family calling on the elder's behalf gets no permissions
   (`ACTION_PERMISSION_MODEL.md` §8).

---

## 6. What each channel can carry

| | In-app voice | Telephony | Messaging | Smart speaker |
|---|---|---|---|---|
| Full readback | yes | yes | yes (as text) | yes |
| Explicit confirmation | yes | yes | **case by case** — §7 | yes |
| Long list of options | yes (with screen) | **no** — max 3 spoken | yes | **no** — max 3 |
| Document intake | yes | no | yes | no |
| Sensitive detail | yes | **only after the elder speaks first** | **no** | **no** — shared space |

The smart-speaker row is about the room, not the device: a shared speaker may have other people in
earshot, so anything the elder would not say aloud to a visitor is not said through it.

---

## 7. Confirmation over messaging

Turn-based text is a weaker confirmation surface, so:

- Allowed for `LOW` risk actions.
- Allowed for `MEDIUM` risk only where the elder set it up deliberately.
- **Never for `HIGH` risk.** A ride, a bill, or anything above their ceiling is confirmed by voice,
  in a live conversation, or not at all.
- The readback must be one message containing every element from `DRAFT_BEFORE_ACTION.md` §3 — never
  split across messages where a partial read could be answered.

---

## 8. Quiet hours and consent follow the elder, not the channel

- Quiet hours apply across every channel. Switching to telephony does not create a new window.
- Outbound consent is **per channel kind** (`ChannelCapabilities.requiresExplicitConsentForOutbound`).
  Consent to in-app check-ins is not consent to be phoned.
- A "stop" on any channel stops everything on every channel, at once.

---

## 9. Implementation notes for Codex

1. Continuity state hangs off the `PreparedAction` and the routine occurrence — **not** off the
   `ChannelSession`. Sessions die; the task outlives them.
2. `ActionConfirmation.confirmedVia` must be **checked**, not merely recorded. An execution whose
   channel differs from `confirmedVia` is refused.
3. Session teardown must discard session-scoped provider PII and held documents. A channel change is
   a teardown.
4. Never migrate a transcript across channels. There is no transcript to migrate
   (`MEMORY_MODEL.md` §9).
5. The re-opening line is generated from the resume record, so it cannot claim "nothing's been
   placed" when `nextSafeStep` is `RECONCILE_THEN_SPEAK`.
6. Suggested tests:
   - confirmed fields survive a channel change; the confirmation does not
   - execution refused when the execution channel differs from `confirmedVia`
   - a channel change re-reads authoritative state even at zero elapsed time
   - `HIGH` risk cannot be confirmed over messaging
   - an inbound unverified call is told nothing private unprompted
   - "stop" on one channel halts an in-flight action on another
   - session-scoped PII and held documents are discarded on channel change

---

## Related

- `INTERRUPTION_AND_RESUME.md` — the resume record and the decision table
- `docs/contracts/channel-adapter.ts` — `ChannelKind`, `SessionState`, `humanResponded`
- `docs/contracts/prepared-action.ts` — `ActionConfirmation.confirmedVia`
- `ACTION_PERMISSION_MODEL.md` §8 — family assistance grants no authority
- `TELEPHONY_FUTURE_PLAN.md` — the telephony posture this assumes
