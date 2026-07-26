# Thuna — Risk Signal Model

> Design document. **Changes no production code.**
>
> `DIGITAL_SAFETY_POLICY.md` states the rules. This enumerates the **signals** those rules fire
> on, what each one weighs, and how they are detected deterministically before any model call.

---

## 1. Design constraints

1. **Every signal is detectable without a model.** Regex, keyword sets, and structural checks
   only. A signal that requires semantic judgement to detect is a signal an attacker can phrase
   around, and worse, one that fails silently when the model is unavailable.
2. **Signals fire on *any* `CapturedInput`** — elder speech, OCR text from a photo, a forwarded
   message, screen text. Not only on what the elder says.
3. **False positives are cheap; false negatives are not.** A wrongly-refused legitimate request
   costs the elder one inconvenient moment and an offer to ask a person. A missed scam costs them
   their savings. **Tune toward over-refusal.**
4. **Severity determines the response, never whether there is one.** There is no signal that fires
   and is then ignored.

---

## 2. Severity levels

| Level | Meaning | Response |
|---|---|---|
| `CRITICAL` | Fraud is near-certain, or an irreversible disclosure is imminent | Full PAUSE → EXPLAIN → REFUSE → OFFER PERSON. Flow terminates. |
| `HIGH` | Strongly indicative; legitimate cases exist but are rare | Same pattern; refuse the action, offer the person |
| `MEDIUM` | Suspicious in context; may be benign | Pause and caution; do not proceed without a trusted person |
| `LOW` | Worth naming, not worth blocking | Explain plainly, let the elder decide |

**Any `CRITICAL` or `HIGH` signal terminates the current flow.** It is not a warning the elder can
click past — there is no "continue anyway" path, because that path is precisely what a scammer
would coach them through.

---

## 3. The signal set

### 3.1 `CREDENTIAL_REQUEST` — CRITICAL

Someone is asking for, or the elder is about to speak, an OTP / PIN / CVV / password / card number.

- **Detection:** extends the existing `RISKY` regex in `lib/router.ts`. Add: `one time`,
  `one-time`, `verification code`, `security code`, `otp`, `atm pin`, `upi pin`, `mpin`,
  `cvv`, `card number`, `expiry`, `net banking`, `password`, `passcode`, plus Malayalam and
  transliterated equivalents.
- **Also fires on a bare 4/6-digit number** arriving in a context where a credential was
  previously mentioned in-session. An elder reading a code aloud will not say the word "OTP".
- **Action:** refuse, redact at capture, never store even partially.

### 3.2 `SECRECY_REQUEST` — CRITICAL, and the highest-signal indicator in this model

Someone is asking the elder to keep a transaction, call, or payment from their family.

- **Detection:** `don't tell`, `do not tell`, `keep this between us`, `don't mention`,
  `no need to tell your son/daughter/family`, `this is confidential`, `surprise for your family`,
  `bank policy not to inform`, plus Malayalam equivalents.
- **Why it is treated as first-class, above even the credential request:**

  > **Anyone asking an elder to keep money matters from their family is almost certainly
  > defrauding them.**

  A credential request has rare legitimate lookalikes — a bank's own IVR, a genuine app login. A
  secrecy request about money has essentially none. Legitimate institutions have no interest in
  whether an elder's son knows about a transaction; the *only* party that benefits from that
  secrecy is one that expects the family to intervene. It is also the signal most likely to be
  present when every other signal is absent — a patient long-con fraud may never say "OTP", but it
  will always, eventually, ask for silence.

  Additionally, it is the signal that most directly attacks Thuna's own mitigation. Every other
  refusal ends by offering to call a trusted person; secrecy is the instruction designed to make
  the elder decline that offer.

- **Action:** refuse the surrounding request entirely, name the pattern explicitly, and press the
  handoff offer harder than for any other signal. Wording in `DIGITAL_SAFETY_POLICY.md` §4.

### 3.3 `REMOTE_ACCESS_INSTALL` — CRITICAL

The elder is being asked to install screen-control software.

- **Detection:** `anydesk`, `teamviewer`, `quicksupport`, `rustdesk`, `airdroid`,
  `remote desktop`, `screen control`, `install this app so I can see your screen`, plus common
  misspellings and phonetic forms from a Saaras transcript (`any desk`, `team viewer`).
- **Why CRITICAL:** it hands over the device permanently, not just one code. It is the single
  most-used technique in Indian remote-banking fraud, and it survives after the call ends.
- **Action:** refuse installation. Recommend the elder not proceed even after the call ends.

### 3.4 `SCREEN_SHARING_REQUEST` — CRITICAL

The elder is being asked to share their screen during a call.

- **Detection:** `share your screen`, `screen share`, `let me see your screen`, `start sharing`,
  `press the share button`. Also fires on a detected screen-share permission dialog via the
  screen-context path (`SCREEN_CONTEXT_ASSISTANCE.md`).
- **Why CRITICAL:** functionally equivalent to handing over the OTP, because incoming SMS codes
  become visible to the attacker without ever being spoken.

### 3.5 `URGENT_TRANSFER_PRESSURE` — HIGH

Money must move immediately, or something bad happens.

- **Detection:** co-occurrence of a **money term** (`transfer`, `pay`, `send money`, `upi`,
  `deposit`, `refund`, `fine`, `penalty`, `arrears`, `₹`, `rupees`) with an **urgency term**
  (`immediately`, `right now`, `within 10 minutes`, `last chance`, `account will be blocked`,
  `case will be filed`, `arrest`, `expire today`, `final notice`).
- **Note the co-occurrence requirement.** "Pay the electricity bill" is a normal `BILL` candidate.
  "Pay the electricity bill in the next ten minutes or supply will be cut" is this signal.
- **Why HIGH not CRITICAL:** genuine final-notice bills exist. The response is to slow down and
  involve a person, not to assert fraud.

### 3.6 `AUTHORITY_IMPERSONATION` — HIGH

Caller claims to be a bank, police, court, telecom, or government official.

- **Detection:** authority term (`bank official`, `RBI`, `SBI`, `branch manager`, `police`,
  `cyber cell`, `CBI`, `TRAI`, `income tax`, `customs`, `court`, `KYC department`) co-occurring
  with a **demand** (payment, credential, install, verification).
- **Not fired by the authority term alone.** "My pension is from SBI" is not a risk.
- **Standard advice attached to the refusal:** hang up and call the number printed on the card or
  the official website. This is the one piece of counter-scam guidance Thuna gives proactively,
  because it is always safe and it works.

### 3.7 `SUSPICIOUS_LINK` — HIGH

A URL the elder is being pushed to open.

- **Detection, structural:** URL shorteners (`bit.ly`, `tinyurl`, `t.co`, `is.gd`, `rb.gy`),
  IP-address hosts, punycode / mixed-script domains, lookalike domains (`sbi-verify`,
  `hdfc-kyc`, `-refund`, `-support` suffixes), `.apk` endings, non-Indian TLDs paired with an
  Indian institution name, and any link arriving inside a message that also carries another
  signal.
- **Thuna never opens or follows a link to check it.** Fetching it is itself a disclosure (it
  confirms a live target) and Thuna cannot verify a destination anyway.
- **Do not claim a link is safe.** Absence of signals is not evidence of safety. The most Thuna
  says is "I can't tell where this goes."

### 3.8 `UNKNOWN_QR` — HIGH

A QR code the elder is being asked to scan, particularly "to receive money".

- **Detection:** QR detected in a `PHOTO`/`SCREEN` capture, or `scan this code`, `scan to receive`,
  `scan for refund` in text.
- **The critical fact to state:** *scanning a UPI QR sends money; it never receives it.* "Scan
  this to get your refund" is definitionally fraudulent. Say this plainly — it is a piece of
  understanding the elder keeps.

### 3.9 `PAYMENT_PENDING_CLAIM` — MEDIUM

"Your payment failed / your order is on hold / a small amount is pending."

- **Detection:** `payment pending`, `payment failed`, `order on hold`, `small fee`,
  `processing charge`, `refund pending`, `complete your payment` — arriving from an
  unsolicited channel rather than from an app the elder opened.
- **Why MEDIUM:** genuinely common and often legitimate. The rule is not refusal but **route
  verification**: never pay from the message. Open the app or call the printed number.

### 3.10 `DELIVERY_DELAY_LURE` — MEDIUM

"Your parcel is held; pay a customs/redelivery fee."

- **Detection:** delivery terms (`parcel`, `courier`, `shipment`, `delivery`, `customs`) with a
  fee or link.
- **Standard response:** legitimate couriers do not collect fees by SMS link. Verify in the app.

### 3.11 `PERMISSION_DIALOG` — MEDIUM

An OS or app permission prompt is on screen during an assisted flow.

- **Detection:** via the screen-context path — dialog text matching `allow`, `grant access`,
  `accessibility`, `display over other apps`, `install unknown apps`, `record screen`.
- **`Accessibility`, `display over other apps`, and `install unknown apps` escalate to CRITICAL**
  when co-occurring with any other signal — that combination is the remote-access takeover.
- Otherwise: describe what the dialog actually grants, in plain language, and let the elder decide.
  Never say which button to press unless the dialog is visible — `SCREEN_CONTEXT_ASSISTANCE.md`.

### 3.12 `UNSOLICITED_WINDFALL` — HIGH

Lottery, prize, unexpected refund, KYC bonus, government scheme payout.

- **Detection:** `you have won`, `lottery`, `lucky draw`, `prize`, `cashback`, `unclaimed`,
  `scheme benefit`, `arrears credited` — paired with any action request.
- **The plain fact to state:** no genuine prize requires a payment or a code to release it.

### 3.13 `ISOLATION_PRESSURE` — HIGH

The caller is discouraging the elder from ending the call, consulting anyone, or hanging up.

- **Detection:** `stay on the line`, `don't hang up`, `don't put me on hold`, `don't consult
  anyone`, `stay with me until it's done`.
- **Companion to `SECRECY_REQUEST`.** Where secrecy targets the family afterwards, isolation
  targets interruption during. Both attack the same mitigation.
- **Action:** state plainly that ending a call is always allowed and never has consequences.

---

## 4. Combination rules

Signals compose. The composed severity is not the maximum — some pairs are qualitatively worse
than either part.

| Combination | Escalates to | Reasoning |
|---|---|---|
| `SECRECY_REQUEST` + anything | `CRITICAL`, non-overridable | Secrecy converts an ambiguous request into a fraud pattern |
| `AUTHORITY_IMPERSONATION` + `CREDENTIAL_REQUEST` | `CRITICAL` | The canonical bank-fraud call |
| `PERMISSION_DIALOG` (accessibility) + any | `CRITICAL` | Device takeover in progress |
| `URGENT_TRANSFER_PRESSURE` + `ISOLATION_PRESSURE` | `CRITICAL` | The elder is being held on the line while money moves |
| `PAYMENT_PENDING_CLAIM` + `SUSPICIOUS_LINK` | `HIGH` | The standard phishing shape |
| Two or more `MEDIUM` | `HIGH` | Independent weak signals are rarely independently benign |

---

## 5. What a fired signal produces

```
RiskDetection
  signals[]         signal ids that matched
  severity          composed, per §4
  channel           VOICE | PHOTO | SCREEN | FORWARDED_MESSAGE
  matchedAtStage    always PRE_MODEL
  refusalTemplateId → DIGITAL_SAFETY_POLICY.md §4
  handoffOffered    → TRUSTED_PERSON_HANDOFF.md
```

**Deliberately absent:** the matched text, the surrounding message, the link, the number, the
elder's response, and any counter. Storing which *pattern* fired is enough to explain the refusal;
storing what was said is a record of someone being targeted. See `DIGITAL_SAFETY_POLICY.md` §6.

---

## 6. Implementation notes for Codex

1. **One table, one function.** `RISK_SIGNALS: Signal[]` where each entry carries
   `{ id, severity, patterns, requiresCooccurrenceWith?, templateId }`. `detectRisk(text)` walks
   the table and returns a `RiskDetection | null`. Adding a signal is adding a row.
2. **Runs pre-model, always** — it is stage 2 of `UNIVERSAL_INBOX.md` §3 and shares its home with
   `quickCheck()` in `lib/router.ts`.
3. **Patterns must cover Malayalam, English, and Manglish transliteration.** A Saaras transcript
   of a Malayalam speaker reading an English scam SMS aloud is the realistic input.
4. **Test the co-occurrence signals both ways** — the benign case must pass. "Pay the electricity
   bill" reaching the safety gate and being refused would break a legitimate `BILL` flow.
5. **No severity threshold is configurable at runtime.** A settings-tunable fraud threshold is a
   social-engineering target.
6. **Never log matched text.** Log `signalId` and `severity` only.

---

## Related

- `DIGITAL_SAFETY_POLICY.md` — the rules, the response pattern, exact refusal wording
- `TRUSTED_PERSON_HANDOFF.md` — what happens after a refusal
- `SCREEN_CONTEXT_ASSISTANCE.md` — permission dialogs and the evidence requirement
- `UNIVERSAL_INBOX.md` §3 — stage 2, where this runs
- `MEMORY_MODEL.md` §9 — why counts and trends are not stored
- `lib/router.ts` — the existing `quickCheck()` and `RISKY` regex (read-only)
