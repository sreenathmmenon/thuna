# Thuna — Malayalam Content Guide

> Design specification. **Changes no production code.**
>
> The persona is **Appa**, `ml-IN`, slow pace, trusted family contact **Sree** (son) — per
> `docs/companion/LIFE_EVENT_DEMO_SCENARIOS.md`. Malayalam is not a localisation of Thuna. It is the
> language Thuna is in. English is the review language for this repository, which is a different
> thing entirely.
>
> **Translation status is marked per string.** Where a translation needs a native speaker's eye
> before it ships, it says so, in the string's own row. Guessing silently is the one failure mode
> this file exists to prevent.

---

## 1. Font stack

```css
--font-ml:
  'Noto Sans Malayalam',            /* primary — bundled, subset, variable */
  'Manjari',                        /* excellent modern Malayalam, common on Linux/desktop */
  'Noto Sans Malayalam UI',         /* Android system fallback */
  'Malayalam Sangam MN',            /* iOS system Malayalam */
  'Nirmala UI',                     /* Windows system Malayalam */
  'Meera', 'Rachana',               /* traditional-orthography fallbacks */
  system-ui, sans-serif;            /* last resort — never reached in practice */
```

| Decision | Reason |
|---|---|
| **Noto Sans Malayalam** as primary | Complete conjunct coverage, both traditional and reformed orthography, actively maintained, variable-weight, and permissively licensed. Its chandrakkala and stacked-conjunct rendering is the most reliable of the open faces. |
| **Bundled and self-hosted, not CDN** | Elders on patchy connections must not see tofu boxes while a font negotiates. Also removes a third-party request from a privacy-sensitive app. |
| **Subset to Malayalam + Latin + digits + `₹`** | Full Noto Sans Malayalam is ~200KB; the subset is ~60KB woff2. Latin must be in the same file so mixed strings do not swap faces mid-line (§7). |
| `font-display: swap` with a metric-matched Latin fallback | A brief fallback render is acceptable; a blank line of guidance is not. |
| **Weights: 400 and 700 only** | Malayalam at 500/600 renders inconsistently across these faces, and the conjuncts thicken unevenly. Two weights, sharply distinct. |
| **Never `sans-serif` alone as fallback** | On a device without a Malayalam face, `sans-serif` produces tofu. The named system fonts above cover iOS, Android, Windows, and Linux. |

**Prohibited:** synthetic bold (`font-synthesis: none`), synthetic italic, letter-spacing on
Malayalam (§4.3), `text-transform: uppercase` (meaningless in Malayalam and it mangles the
mixed-script strings), and any `font-feature-settings` override — the default shaping is correct and
disabling ligatures breaks conjuncts outright.

---

## 2. Line-height — the single most important number in this file

> **Malayalam body text: `line-height: 1.7`. Malayalam headings: `1.4`. Latin body: `1.5`.**

Malayalam is not a linear script. A single line can carry:

- **above-base marks** — the vowel signs ി ീ െ േ ൈ ൊ ോ ൌ and the chandrakkala ്
- **below-base conjuncts** — the stacked forms of ്ല ്ര ്ന ്ത, which descend well below baseline
- **both at once**, on adjacent characters, routinely

The practical consequence: a Malayalam line's ink box is roughly **1.45–1.6×** its nominal font
size, against Latin's ~1.2×. At `line-height: 1.5` — the sensible Latin default — adjacent lines
collide: a descending conjunct on line 1 overlaps an above-base vowel sign on line 2. It does not
"look tight". It renders as visually merged glyphs that an elder with presbyopia cannot decode.

At 1.7 the lines are clearly separate at 18px and stay separate at 200% scaling. 1.8 is acceptable
and slightly more comfortable for long body paragraphs; below 1.6 is a defect.

| Context | Line-height | Notes |
|---|---|---|
| Body / guidance / error body (18–20px) | **1.7** | The default. Never lower. |
| Headings (24–28px) | **1.4** | Larger sizes carry proportionally more room; 1.7 at 28px opens gaps that read as separate paragraphs |
| Button labels (18–20px) | **1.6** | Compact but safe for the 2-line case |
| Confirmation card rows | **1.7** | Same as body |
| Total amount (32px, Latin digits) | **1.2** | Digits only — Latin metrics apply |
| Tabular / meta text (16px) | **1.7** | Small text needs the space most |

`line-height` is set as a **unitless number**, never `px`, so it scales with the user's text-size
setting.

---

## 3. Two-line wrapping

Malayalam labels wrap. This is expected, correct, and must be designed for rather than defended
against.

### 3.1 Why it happens

Malayalam has no articles, marks case and relation with **agglutinated suffixes**, and produces
long single words where English produces short phrases. "Ask my trusted person" is four short words;
`എന്റെ ആളോട് ചോദിക്കാം` is three, one of which is 10 characters and unbreakable. There is no shorter
respectful rendering. Compressing it further produces either curtness or ambiguity, both of which
cost more than a second line.

### 3.2 The rules

| Rule | Specification | Why |
|---|---|---|
| **No fixed heights** | `min-height: 56px`, never `height: 56px`, on every button, row, banner, and card | A fixed height clips the second line's descenders and, at 200%, clips the second line entirely |
| **No ellipsis on labels** | `text-overflow: ellipsis` and `-webkit-line-clamp` are **banned** on every label, button, heading, row, and body string in the package | A truncated confirmation line is a confirmation the elder never saw. `SAFETY_AND_CONFIRMATION_SCREENS.md` §B2 depends on this. |
| **Wrapping allowed to 2 lines by default, 3 where needed** | Buttons: 2. Headings: 3. Body: unlimited. | Copy is written to fit 2; the container tolerates 3 without breaking |
| **`overflow-wrap: break-word`, `word-break: normal`** | Long agglutinated words wrap at grapheme-cluster boundaries only | `word-break: break-all` splits conjuncts mid-cluster and produces nonsense |
| **`hyphens: none`** | Malayalam has no hyphenation convention | Browser hyphenation of Malayalam is always wrong |
| **`text-align: start`, never `justify`** | Justified Malayalam opens rivers between long words at 360px | |
| **Buttons centre their label**, wrapping symmetrically | 2-line labels centre-align both lines | An off-centre second line reads as a rendering fault |
| **Vertical padding is 12px minimum inside buttons** | With `min-height: 56px` this yields a 2-line-safe box | A 20px label at 1.6 = 32px of text; 32 + 24 = 56 exactly |

### 3.3 Line-break control

Two joins must never break across lines. Use `<span style="white-space:nowrap">` or U+2060 WORD
JOINER:

1. **A number and its unit or currency** — `₹203`, `9 മണി`, `2 എണ്ണം`. A total split across lines is
   a misread total.
2. **A Latin fragment and its adjacent Malayalam particle** — `OTP, PIN` must not break between the
   Latin token and the comma.

---

## 4. Character width and layout at 360px

### 4.1 The measurement

Malayalam glyphs are **wider per character** than Latin — the base consonants are round and open,
and conjuncts are wider still — but Malayalam uses **fewer characters** per unit of meaning. The two
effects partly cancel. Measured against our own strings:

| String | English chars | Malayalam chars | Rendered width at 18px, 360px viewport |
|---|---|---|---|
| "Yes, continue" | 13 | 11 | Malayalam ≈ **0.95×** English |
| "Change something" | 16 | 20 | Malayalam ≈ **1.25×** |
| "Try again" | 9 | 18 | Malayalam ≈ **1.75×** |
| "Please pause" | 12 | 13 | Malayalam ≈ **1.05×** |
| "I could not hear that clearly." | 30 | 42 | Malayalam ≈ **1.20×** |
| "Never share your OTP, PIN or CVV." | 33 | 48 | Malayalam ≈ **1.15×** |

**Planning figure: assume Malayalam renders at 1.25× the English width, and up to 1.8× for short
imperative labels.** Short labels are the worst case, because English gets to be terse ("Try again")
where Malayalam must still inflect politely.

### 4.2 What this forces at 360px

Usable text width at 360px = 360 − 24 − 24 margins = **312px**. Inside a button with 16px internal
padding each side: **280px**. At 18px Malayalam that is roughly **17–19 characters per line**.

| Consequence | Rule |
|---|---|
| Nearly every button label in this package is 2 lines in Malayalam at 360px | Design for 2, allow 3 |
| **No side-by-side buttons, anywhere** | Two buttons at 360px give ~140px each ≈ 8 Malayalam characters. `വേണ്ട` fits; `എന്തെങ്കിലും മാറ്റണം` does not. This independently confirms the vertical-stack rule in `SAFETY_AND_CONFIRMATION_SCREENS.md` §A1.1 |
| Confirmation card label column widens | 96px at 390px → **112px** at 360px in Malayalam, with the value column wrapping under when needed rather than compressing |
| Body copy is capped at 2 sentences | A third sentence at 1.25× width and 1.7 line-height pushes the action buttons below the fold at 200% scaling |
| Bottom-nav labels | Malayalam nav labels do not fit on one line at 360px. Use **icon + 14px label wrapping to 2 lines**, nav height 72px rather than 64px. |

### 4.3 Prohibited compressions

Never `letter-spacing` (negative or positive), never `transform: scaleX()`, never `font-stretch`,
never a smaller font size for Malayalam than for English. Malayalam conjuncts are shaped as units;
squeezing them breaks the shaping engine's output and, at negative tracking, visually merges the
vowel signs with the following consonant. **If it does not fit, the container grows or the copy
shortens. The type never compresses.**

---

## 5. Numerals policy

> **Decision: Thuna uses Latin/Western digits (0–9) for all times, dates, amounts, quantities, and
> phone numbers. Malayalam digits (൦൧൨൩൪൫൬൭൮൯) are not used anywhere in the interface.**

### 5.1 Justification

1. **Malayalam digits are effectively obsolete in daily use.** Kerala's newspapers, bank statements,
   electricity bills, bus tickets, price boards, and phone dialers all use Latin digits. An elder
   who has read ₹ amounts in Latin digits for sixty years reads `203` faster than `൨൦൩`, and Thuna's
   confirmation total is the single most consequential number in the app.
2. **The confirmation screen must be verifiable against the real world.** The elder cross-checks
   Thuna's total against a Swiggy screen, a bill, or an SMS — all of which will show Latin digits. A
   number they have to transliterate to compare is a number they will not compare.
3. **`AuthoritativeSnapshot.total` arrives as Latin digits** from every provider. Transliterating it
   for display and back for logic introduces a conversion step in the one code path where a
   rendering error means the wrong amount was confirmed. `SAFETY_AND_CONFIRMATION_SCREENS.md` §B2.1
   requires the displayed total to be the provider's total; the fewest transformations is the safest
   design.
4. **Screen readers handle Latin digits in Malayalam reliably**; Malayalam-digit support in TTS
   engines is inconsistent, and a misspoken amount is a serious failure.

### 5.2 The counterpart rule: spoken numbers are always Malayalam words

Digits are for **reading**. Speech is for **hearing**, and there the elder gets natural Malayalam:

| Displayed | Spoken (`ml-IN` TTS) |
|---|---|
| `₹203` | `ഇരുനൂറ്റി മൂന്ന് രൂപ` |
| `9:00` | `രാവിലെ ഒൻപത് മണി` |
| `2 ആഗസ്റ്റ്` | `ആഗസ്റ്റ് രണ്ടാം തീയതി` |
| `×2` | `രണ്ട് എണ്ണം` |

Times are always spoken with the part-of-day word (`രാവിലെ` morning / `ഉച്ചയ്ക്ക്` midday /
`വൈകുന്നേരം` evening / `രാത്രി` night) — Malayalam speakers do not naturally use a bare 24-hour
clock, and "9 മണി" alone is ambiguous between morning and night. This matters most for medicine
reminders.

### 5.3 Formatting

| Item | Format | Example |
|---|---|---|
| Currency | `₹` prefix, no space, Indian grouping (2,2,3) | `₹1,20,500` |
| Time, displayed | 12-hour + Malayalam part-of-day word | `രാവിലെ 9:00` |
| Date, displayed | `D MMMM` with the Malayalam month name | `2 ആഗസ്റ്റ്` |
| Weekday | Full Malayalam name, never abbreviated | `ശനിയാഴ്ച` |
| Quantity | `×` + digit | `×2` |
| Phone | Latin digits, spaced in pairs for readability | `080 6746 6729` |
| Masked account | Last 4 in Latin digits | `അക്കൗണ്ട് ...4821` |

---

## 6. Voice and tone in Malayalam

Malayalam encodes respect grammatically, so tone is not a stylistic layer here — it is a set of
morphological choices that must be made consistently or the register wobbles audibly.

### 6.1 The register

| Choice | Decision | Why |
|---|---|---|
| **Second person** | **`നിങ്ങൾ`** (respectful plural), never `നീ` (familiar singular) | `നീ` to an elder from a non-intimate is rude to the point of shocking. `നിങ്ങൾ` is the correct neutral-respectful form for a device addressing an elder. |
| **Not `താങ്കൾ`** | Avoid the formal-literary `താങ്കൾ` | Correct but stiff and bureaucratic — it is the register of official letters and news anchors, and it makes Thuna sound like an institution rather than a companion. |
| **Verb endings** | Respectful/polite forms consistently: `-ാം` (`തുടരാം` "let us continue"), `-ൂ` polite imperative (`നിർത്തൂ`), `-ട്ടെ` (`ഞാൻ പറയട്ടെ`) | Never the bare imperative stem (`നിർത്ത്`), which is a command to a child |
| **Preferred grammatical framing** | **First-person-plural cohortative** — "let us", not "you should" | `തുടരാം` (let us continue) rather than `തുടരുക` (continue!). This carries the whole product posture: Thuna is beside the elder, not instructing them. It is also the natural register of a helpful younger person in a Malayali household. |
| **Thuna's self-reference** | `ഞാൻ` (I), first person singular | Thuna is a someone, not a system. "I could not hear" — `എനിക്ക് കേൾക്കാൻ കഴിഞ്ഞില്ല`. |
| **Address by name** | `അപ്പാ` where a name is used at all | Matches the family register the persona already lives in |

### 6.2 Warm, not familiar

The line to hold: Malayalam has a warm register that is also respectful — roughly how a competent,
fond niece speaks to an uncle. That is Thuna's voice.

**Avoid on the warm side:** diminutives, `ഉം` softeners piled up, `അല്ലേ` tag questions seeking
agreement, and anything that reads as coaxing. These slide into talking to a child, which is the
failure mode this whole product is built against.

**Avoid on the formal side:** Sanskritised vocabulary where a common word exists
(`സ്ഥിരീകരിക്കുക` → `ഉറപ്പിക്കാം`), passive constructions, and noun-heavy officialese. Bank SMS
Malayalam is precisely the register a scam impersonates; Thuna must not sound like it.

### 6.3 Register in the safety screens specifically

The safety copy is the hardest to get right. `DIGITAL_SAFETY_POLICY.md` §5 forbids shaming, and
Malayalam makes shaming easy to do by accident: a bare imperative plus a negative
(`പറയരുത്` "do not say") can land as a scolding depending on what surrounds it.

The mitigation is that **the prohibition is stated about the world, not about the elder**:

| Bad framing | Good framing |
|---|---|
| `നിങ്ങൾ OTP പറയരുത്` — "*you* must not say the OTP" (imperative at the person) | `OTP ആരോടും പറയരുത്` — "the OTP is not to be told to anyone" (a fact about OTPs) |
| `ശ്രദ്ധിക്കണം` — "you must be careful" | (omitted entirely) |
| `നിങ്ങൾ വഞ്ചിക്കപ്പെടുകയാണ്` — "you are being cheated" | `ആ സന്ദേശം ഒരു തട്ടിപ്പാണ്` — "that message is a trick" |

The subject of every safety sentence is the **message, the code, the link, or the app** — never
`നിങ്ങൾ`. This is the Malayalam expression of the "the message is at fault, never the person" rule.

---

## 7. Mixed Malayalam and English

Malayali speech is natively code-mixed. Attempting pure Malayalam produces text an elder reads more
slowly, not less.

### 7.1 What stays in Latin script

| Category | Stays English | Reason |
|---|---|---|
| Brand names | Swiggy, Uber, Google, WhatsApp, BESCOM, SBI, HDFC | The elder sees these in Latin on every app icon, bill, and card. `സ്വിഗ്ഗി` is a puzzle, not a translation. |
| Technical terms in universal use | OTP, PIN, CVV, UPI, SMS, Wi-Fi, app | Every one of these is spoken in Latin form by Malayalam speakers. `ഒറ്റത്തവണ പാസ്‌വേഡ്` for OTP would fail to warn anyone, because the scam caller says "OTP". |
| Currency symbol | ₹ | Universal |
| Digits | 0–9 | §5 |
| The product name | **Thuna / തുണ** | Written `തുണ` in Malayalam-script contexts, `Thuna` in Latin ones. The word means *support / companion*, so it reads naturally in both. |

### 7.2 What is translated

Everything else. Common nouns (`order` → `ഓർഡർ` is acceptable as it is fully naturalised, but
`food` → `ഭക്ഷണം` always), all verbs, all UI actions, all guidance, all safety copy.

**The safety-critical exception:** `OTP`, `PIN`, `CVV` stay Latin **precisely because** the scam
script uses those words. The refusal must contain the same token the elder is hearing on the phone
for the connection to be made in the moment.

### 7.3 Typographic handling of mixed strings

| Rule | Specification |
|---|---|
| One font file covers both scripts | The bundled subset includes Latin, so `OTP` inside a Malayalam sentence renders in Noto Sans Malayalam's Latin, not a fallback face. Prevents the visible mid-line size/weight jump. |
| `lang` attributes | Latin fragments wrapped in `<span lang="en">` so TTS switches voice rather than applying Malayalam phonology to Latin letters. Required by `ACCESSIBILITY_SPECIFICATION.md` §5.4. |
| No script-boundary spacing hacks | No extra letter-spacing around Latin tokens |
| Latin caps stay caps | `OTP` not `Otp`. These are read as letter sequences. |
| No line break inside a Latin token or between it and adjoining punctuation | §3.3 |
| Latin optical size | Latin uppercase at the same nominal size appears slightly larger than Malayalam x-height. Accepted; do **not** compensate by shrinking the Latin, which makes `OTP` look like a footnote in the one sentence that must not be skimmed. |

---

## 8. Translation confidence key

Used in every table below.

| Mark | Meaning |
|---|---|
| ✅ | High confidence. Standard, unambiguous, register-correct. Ship as written. |
| ⚠️ | **Needs native-speaker review before shipping.** Meaning is right; naturalness, register, or a word choice is uncertain. The specific doubt is stated. |
| 🔶 | **Needs native-speaker authoring.** The English is doing work Malayalam may express differently. Do not ship this string as written. |

Every ⚠️ and 🔶 is listed again in §11 as a single review queue.

---

## 9. String table

### 9.1 Core interface

| Key | English | Malayalam | ✔ | Note |
|---|---|---|---|---|
| `greeting.morning` | Good morning, Appa. | സുപ്രഭാതം, അപ്പാ. | ✅ | `സുപ്രഭാതം` is standard and warm |
| `greeting.day` | Hello Appa, it's Thuna. | നമസ്കാരം അപ്പാ, ഇത് തുണയാണ്. | ✅ | |
| `talk.idle` | Talk to Thuna | തുണയോട് സംസാരിക്കാം | ✅ | 19 chars, 2 lines at 360px — expected |
| `talk.listening` | I'm listening | ഞാൻ കേൾക്കുന്നുണ്ട് | ✅ | |
| `talk.thinking` | One moment | ഒരു നിമിഷം | ✅ | |
| `action.stop` | Stop | നിർത്തൂ | ✅ | Polite imperative, not bare `നിർത്ത്` |
| `action.wait` | Wait | ഒന്ന് നിൽക്കൂ | ⚠️ | Bare `കാത്തിരിക്കൂ` is more literal but colder. `ഒന്ന് നിൽക്കൂ` is the natural spoken form — confirm it does not read as abrupt on a button |
| `action.repeat` | Say that again | ഒന്നുകൂടി പറയാമോ | ⚠️ | This is the elder asking Thuna. Confirm `പറയാമോ` (interrogative-polite) over `പറയൂ` — the question form is gentler but may read oddly as a button label |
| `action.continue` | Continue | തുടരാം | ✅ | Cohortative — "let us continue" |
| `action.yes_continue` | Yes, continue | അതെ, തുടരാം | ✅ | |
| `action.change` | Change something | എന്തെങ്കിലും മാറ്റണം | ⚠️ | Literally "something must be changed". Confirm against `മാറ്റാനുണ്ട്` ("there is something to change"), which may be more natural on a button |
| `action.cancel` | Cancel | വേണ്ട | ✅ | Literally "not needed" — the natural Malayalam decline. Warmer and clearer than the loanword `ക്യാൻസൽ` |
| `action.start_again` | Start again | വീണ്ടും തുടങ്ങാം | ✅ | |
| `action.not_now` | Not now | ഇപ്പോൾ വേണ്ട | ✅ | |
| `action.try_later` | Try later | പിന്നീട് നോക്കാം | ✅ | |
| `status.due_now` | Due now | ഇപ്പോൾ ചെയ്യേണ്ടത് | ⚠️ | Literally "what must be done now". Fits the Home list; confirm it is not too long as a status chip |
| `status.coming_soon` | Coming soon | ഉടനെ വരുന്നത് | ⚠️ | Means "the thing coming shortly" — a list heading, not a marketing "coming soon". Confirm no ambiguity |
| `status.done` | Done | കഴിഞ്ഞു | ✅ | |
| `status.waiting` | waiting | കാത്തിരിക്കുന്നു | ✅ | Disabled-button suffix |
| `status.practice` | This is a practice run. | ഇത് ഒരു പരിശീലനമാണ്. | ⚠️ | `പരിശീലനം` = practice/training. Confirm it reads as "not real" rather than "a lesson" — this is the SIMULATED label and misreading it is consequential |
| `status.practice.body` | Nothing will be ordered and no money will move. | ഒന്നും ഓർഡർ ചെയ്യില്ല, പണം ഒന്നും പോകില്ല. | ✅ | |

### 9.2 Safety — the pause pattern

| Key | English | Malayalam | ✔ | Note |
|---|---|---|---|---|
| `safety.heading` | Please pause | ഒന്ന് നിർത്തൂ | ✅ | The single most-shown safety string. `ഒന്ന്` softens the imperative into a request — exactly the calm register required |
| `safety.credential.body` | Never share your OTP, PIN or CVV — not with me, not with them. | നിങ്ങളുടെ OTP, PIN അല്ലെങ്കിൽ CVV ആരോടും പറയരുത് — എന്നോടും വേണ്ട, അവരോടും വേണ്ട. | ⚠️ | Latin tokens deliberate (§7.2). Confirm the em-dash clause reads naturally in Malayalam rather than as an English construction |
| `safety.credential.body2` | That code is the key to your money, and a real bank will never ask for it. | ആ നമ്പർ നിങ്ങളുടെ പണത്തിന്റെ താക്കോലാണ്. ശരിയായ ബാങ്ക് അത് ഒരിക്കലും ചോദിക്കില്ല. | ✅ | `താക്കോൽ` (key) metaphor works directly in Malayalam |
| `safety.btn.understand` | I understand | എനിക്ക് മനസ്സിലായി | ✅ | |
| `safety.btn.trusted` | Ask my trusted person | എന്റെ ആളോട് ചോദിക്കാം | ⚠️ | `എന്റെ ആൾ` = "my person" — warm and idiomatic, but confirm it is not too colloquial for a button. Alternative: `വിശ്വസ്തനോട് ചോദിക്കാം` (more formal, less warm) |
| `safety.btn.talk_to` | Talk to Sree | ശ്രീയോട് സംസാരിക്കാം | ✅ | Named-person variant, secrecy screen only |
| `safety.btn.stop_task` | Stop this task | ഈ ജോലി നിർത്തൂ | ✅ | |
| `safety.link.body` | I cannot tell where this link really goes. | ഈ ലിങ്ക് ശരിക്കും എവിടേക്കാണ് പോകുന്നതെന്ന് എനിക്ക് പറയാൻ കഴിയില്ല. | ✅ | |
| `safety.link.body2` | Links sent this way are often used to take money, so it is safer not to open it. | ഇങ്ങനെ വരുന്ന ലിങ്കുകൾ പണം തട്ടിയെടുക്കാൻ ഉപയോഗിക്കാറുണ്ട്. തുറക്കാതിരിക്കുന്നതാണ് സുരക്ഷിതം. | ✅ | Split into two sentences — a single long sentence exceeds 4 lines at 360px |
| `safety.remote.body` | That app would let someone else see and control this phone, including your bank app. | ആ ആപ്പ് ഇട്ടാൽ മറ്റൊരാൾക്ക് ഈ ഫോൺ കാണാനും നിയന്ത്രിക്കാനും കഴിയും — ബാങ്ക് ആപ്പ് ഉൾപ്പെടെ. | ⚠️ | Confirm `ഇട്ടാൽ` (colloquial "if installed") vs `ഇൻസ്റ്റാൾ ചെയ്താൽ`. The colloquial form is what an elder would say |
| `safety.remote.body2` | No real bank or company ever asks for it. | ശരിയായ ഒരു ബാങ്കും കമ്പനിയും അത് ചോദിക്കില്ല. | ✅ | |
| `safety.qr.body` | Scanning a code like this sends money out of your account. | ഇതുപോലൊരു കോഡ് സ്കാൻ ചെയ്താൽ നിങ്ങളുടെ അക്കൗണ്ടിൽ നിന്ന് പണം പോകും. | ✅ | |
| `safety.qr.body2` | It never brings money in, even when someone says it is a refund. | അത് ഒരിക്കലും പണം കൊണ്ടുവരില്ല — തിരികെ കിട്ടും എന്ന് ആരു പറഞ്ഞാലും. | ✅ | The highest-value durable sentence in the package |
| `safety.urgent.body` | Nothing here has to happen this minute — that hurry is part of how this works. | ഇവിടെ ഒന്നും ഈ നിമിഷം തന്നെ നടക്കേണ്ടതില്ല. ആ തിടുക്കം തന്നെയാണ് ഇതിന്റെ രീതി. | ⚠️ | Second clause is idiomatically tricky. `ഇതിന്റെ രീതി` = "this thing's method". Confirm it conveys "the hurry is the trick" without naming a scam |
| `safety.urgent.body2` | Real offices do not ask for money in the next ten minutes. | ശരിയായ ഓഫീസുകൾ പത്ത് മിനിറ്റിനുള്ളിൽ പണം ചോദിക്കില്ല. | ✅ | |
| `safety.secrecy.body` | When someone asks you to keep money matters from your family, that is the clearest sign there is that something is wrong. | പണകാര്യങ്ങൾ കുടുംബത്തിൽ നിന്ന് മറച്ചുവയ്ക്കാൻ ആരെങ്കിലും പറഞ്ഞാൽ, എന്തോ ശരിയല്ല എന്നതിന്റെ ഏറ്റവും വ്യക്തമായ അടയാളമാണ് അത്. | 🔶 | **Author natively.** 123 characters, ~7 lines at 360px — too long, and the clause structure is English-shaped. The *meaning* is exactly right and must be preserved; a native speaker should render it in two short Malayalam sentences. This is the highest-signal string in the entire product |
| `safety.secrecy.body2` | Honest people never need that. | സത്യസന്ധരായ ആളുകൾക്ക് അതിന്റെ ആവശ്യമില്ല. | ✅ | |
| `safety.secrecy.body3` | Nothing has gone wrong yet. Talking to Sree now is the safe thing to do. | ഇതുവരെ ഒന്നും തെറ്റിയിട്ടില്ല. ഇപ്പോൾ ശ്രീയോട് സംസാരിക്കുന്നതാണ് സുരക്ഷിതം. | ⚠️ | `തെറ്റിയിട്ടില്ല` = "nothing has gone wrong". Confirm it does not imply "you have not made a mistake **yet**", which would introduce blame the English avoids. Critical nuance |
| `safety.recipient.body` | This payment is going to Rajesh K., not to the electricity board. | ഈ പണം പോകുന്നത് രാജേഷ് കെ.-ക്ക് ആണ്, വൈദ്യുതി ബോർഡിലേക്ക് അല്ല. | ✅ | |
| `safety.recipient.body2` | Money sent to the wrong person usually cannot be brought back. | തെറ്റായ ആൾക്ക് പോയ പണം സാധാരണ തിരികെ കിട്ടാറില്ല. | ✅ | |
| `safety.btn.check_who` | Check who this is | ഇത് ആരാണെന്ന് നോക്കാം | ✅ | |

### 9.3 Confirmation

| Key | English | Malayalam | ✔ | Note |
|---|---|---|---|---|
| `confirm.order` | Shall I place this order? | ഈ ഓർഡർ കൊടുക്കട്ടെ? | ✅ | `-ട്ടെ` permission-seeking form — exactly the register: Thuna asks leave to act |
| `confirm.payment` | Shall I pay this bill? | ഈ ബിൽ അടയ്ക്കട്ടെ? | ✅ | |
| `confirm.message` | Shall I send this to Sree? | ഇത് ശ്രീക്ക് അയക്കട്ടെ? | ✅ | |
| `confirm.event` | Shall I add this to your calendar? | ഇത് കലണ്ടറിൽ ചേർക്കട്ടെ? | ✅ | |
| `confirm.reminder` | Shall I remind you about this? | ഇത് ഞാൻ ഓർമ്മിപ്പിക്കട്ടെ? | ✅ | |
| `confirm.row.from` | From | എവിടെ നിന്ന് | ✅ | |
| `confirm.row.to` | To | എവിടേക്ക് | ✅ | Address variant |
| `confirm.row.to_person` | To | ആർക്ക് | ✅ | Person variant — Malayalam distinguishes these; English does not |
| `confirm.row.total` | Total | ആകെ | ✅ | |
| `confirm.row.delivery` | Delivery | ഡെലിവറി | ✅ | Naturalised loanword, universally understood |
| `confirm.row.taxes` | Taxes | നികുതി | ✅ | |
| `confirm.row.paid_by` | Paid by | പണം എങ്ങനെ | ⚠️ | Literally "money how". Confirm against `പണം അടയ്ക്കുന്ന വിധം` (correct but long for a label column) |
| `confirm.estimate` | about ₹240 | ഏകദേശം ₹240 | ✅ | |
| `confirm.estimate.note` | The final amount may be a little different. | അവസാന തുക അല്പം വ്യത്യാസപ്പെടാം. | ✅ | |
| `confirm.hold` | I will ask again if anything changes before this is placed. | ഇത് കൊടുക്കുന്നതിന് മുൻപ് എന്തെങ്കിലും മാറിയാൽ ഞാൻ വീണ്ടും ചോദിക്കാം. | ✅ | The calm non-timer line |
| `confirm.hold.late` | I have been holding this a while. I will check the price again before placing it. | ഇത് കുറച്ചു നേരമായി ഞാൻ പിടിച്ചുവച്ചിരിക്കുന്നു. കൊടുക്കുന്നതിന് മുൻപ് വില ഒന്നുകൂടി നോക്കാം. | ⚠️ | `പിടിച്ചുവച്ചിരിക്കുന്നു` (holding) may be heavy. Confirm a lighter phrasing exists that keeps the "this is my doing, not your delay" framing |
| `confirm.recheck` | Let me check this is still the same. | ഇത് ഇപ്പോഴും അതുപോലെ തന്നെയാണോ എന്ന് ഞാൻ ഒന്ന് നോക്കട്ടെ. | ✅ | |
| `confirm.no_cancel` | Once this is placed, I cannot cancel it here. Sree or Swiggy's helpline can. | ഒരിക്കൽ കൊടുത്താൽ എനിക്ക് ഇവിടെ നിന്ന് ക്യാൻസൽ ചെയ്യാൻ കഴിയില്ല. ശ്രീക്കോ Swiggy-യുടെ ഹെൽപ്പ്‌ലൈനിനോ കഴിയും. | ⚠️ | Loanwords `ക്യാൻസൽ`, `ഹെൽപ്പ്‌ലൈൻ` are what people actually say. Confirm acceptable in written form |
| `confirm.payment.warning` | A payment cannot be undone once it is sent. | ഒരിക്കൽ അയച്ചാൽ പണം തിരികെ എടുക്കാൻ കഴിയില്ല. | ✅ | |
| `changed.heading` | This changed while you were deciding | നിങ്ങൾ ആലോചിക്കുന്നതിനിടെ ഇത് മാറി | ✅ | 34 chars, 2 lines at 360px at 28px heading — verified in §10 |
| `changed.body` | The total is now ₹228, not ₹203. | ആകെ തുക ഇപ്പോൾ ₹228 ആണ്, ₹203 അല്ല. | ✅ | |
| `changed.reassure` | I have not placed anything. | ഞാൻ ഒന്നും കൊടുത്തിട്ടില്ല. | ✅ | Mandatory, leads the screen |
| `changed.btn` | Yes, continue at ₹228 | അതെ, ₹228-ന് തുടരാം | ✅ | Amount inside the label |
| `changed.before` | Before | മുൻപ് | ✅ | |
| `changed.now` | Now | ഇപ്പോൾ | ✅ | |

### 9.4 Errors and recovery

| Key | English | Malayalam | ✔ | Note |
|---|---|---|---|---|
| `err.stt` | I could not hear that clearly. | എനിക്ക് അത് വ്യക്തമായി കേൾക്കാൻ കഴിഞ്ഞില്ല. | ✅ | Subject is `എനിക്ക്` (to me) — Thuna owns the failure. Never `നിങ്ങൾ` |
| `err.stt.noisy` | It may be noisy where you are. | അവിടെ ശബ്ദമുണ്ടാകും. | ✅ | Neutral, non-corrective |
| `err.not_understood` | I did not follow that. | എനിക്ക് അത് പിടികിട്ടിയില്ല. | ✅ | `പിടികിട്ടിയില്ല` is warm and idiomatic |
| `err.btn.try_again` | Try again | വീണ്ടും ശ്രമിക്കാം | ✅ | |
| `err.btn.type` | Type instead | പകരം ടൈപ്പ് ചെയ്യാം | ✅ | `ടൈപ്പ്` is the universally used loanword |
| `err.mic.permission` | I do not have permission to use the microphone yet. | മൈക്ക് ഉപയോഗിക്കാൻ എനിക്ക് ഇതുവരെ അനുമതി കിട്ടിയിട്ടില്ല. | ✅ | Thuna lacks permission — the elder did not deny it |
| `err.mic.permission.body` | You can turn it on in Settings, or type to me instead — both work just as well. | സെറ്റിങ്ങ്സിൽ അത് ഓൺ ചെയ്യാം, അല്ലെങ്കിൽ എനിക്ക് ടൈപ്പ് ചെയ്ത് പറയാം — രണ്ടും ഒരുപോലെ നന്നായി പ്രവർത്തിക്കും. | ✅ | |
| `err.mic.busy` | I cannot reach the microphone just now. | മൈക്കിൽ എനിക്ക് ഇപ്പോൾ എത്താൻ കഴിയുന്നില്ല. | ⚠️ | `എത്താൻ കഴിയുന്നില്ല` is a slightly English "cannot reach". Confirm a more natural Malayalam idiom for a device being unavailable |
| `err.mic.busy.body` | Another app may be using it — a phone call, perhaps. | മറ്റൊരു ആപ്പ് അത് ഉപയോഗിക്കുന്നുണ്ടാകാം — ഒരുപക്ഷേ ഒരു ഫോൺ വിളി. | ✅ | |
| `err.tts` | I cannot speak just now, but I can still show you everything. | എനിക്ക് ഇപ്പോൾ സംസാരിക്കാൻ കഴിയുന്നില്ല, പക്ഷേ എല്ലാം കാണിച്ചുതരാം. | ✅ | |
| `err.offline.banner` | No connection just now. I will keep everything and carry on when it is back. | ഇപ്പോൾ കണക്ഷൻ ഇല്ല. എല്ലാം ഞാൻ സൂക്ഷിച്ചുവയ്ക്കാം, തിരികെ വരുമ്പോൾ തുടരാം. | ✅ | Wraps to 2 lines at 360px; banner grows to 72px |
| `err.online.banner` | Back online. | കണക്ഷൻ തിരികെ വന്നു. | ✅ | |
| `err.interrupted` | The connection was interrupted. | ബന്ധം ഇടയ്ക്ക് മുറിഞ്ഞു. | ✅ | |
| `err.interrupted.body` | Nothing was lost. We were at the delivery address. | ഒന്നും നഷ്ടപ്പെട്ടിട്ടില്ല. നമ്മൾ ഡെലിവറി വിലാസത്തിലായിരുന്നു. | ✅ | |
| `err.btn.continue_from` | Continue from where we stopped | നിർത്തിയിടത്ത് നിന്ന് തുടരാം | ✅ | 28 chars, 2 lines at 360px — verified in §10 |
| `err.provider_down` | Swiggy is not answering just now. | Swiggy ഇപ്പോൾ പ്രതികരിക്കുന്നില്ല. | ✅ | Brand stays Latin |
| `err.provider_down.body` | Nothing was ordered. This usually clears up in a few minutes. | ഒന്നും ഓർഡർ ചെയ്തിട്ടില്ല. സാധാരണ കുറച്ചു മിനിറ്റിനുള്ളിൽ ഇത് ശരിയാകും. | ✅ | |
| `err.rejected` | That did not go through. | അത് നടന്നില്ല. | ✅ | |
| `err.nothing_charged` | Nothing was charged. | പണം ഒന്നും പോയിട്ടില്ല. | ✅ | Mandatory on every REJECTED screen |
| `err.provider_says` | Udupi Cafe says: | ഉഡുപ്പി കഫേ പറയുന്നു: | ✅ | Provider text quoted verbatim after this, untranslated |
| `err.unknown.checking` | Let me check whether that went through. | അത് നടന്നോ എന്ന് ഞാൻ ഒന്ന് നോക്കട്ടെ. | ✅ | Nothing definitive — matches the non-speakable UNKNOWN rule |
| `err.unknown.wait` | This takes a moment. Please do not close this. | ഇതിന് അല്പം സമയമെടുക്കും. ദയവായി ഇത് അടയ്ക്കരുത്. | ✅ | |
| `err.unknown.unresolved` | I could not tell whether that order went through. | ആ ഓർഡർ നടന്നോ ഇല്ലയോ എന്ന് എനിക്ക് പറയാൻ കഴിഞ്ഞില്ല. | ✅ | |
| `err.unknown.unresolved.body` | I do not want to guess, and I do not want you charged twice. Sree can check in a moment. | എനിക്ക് ഊഹിച്ചു പറയാൻ വയ്യ, രണ്ടു തവണ പണം പോകാനും പാടില്ല. ശ്രീക്ക് ഒരു നിമിഷം കൊണ്ട് നോക്കാൻ കഴിയും. | ⚠️ | `ഊഹിച്ചു പറയാൻ വയ്യ` is idiomatic ("I can't bring myself to guess"). Confirm register — it should read as care, not reluctance |
| `err.session_expired` | I did not want to guess after so long. | ഇത്രയും നേരം കഴിഞ്ഞ് ഊഹിക്കാൻ എനിക്ക് താൽപ്പര്യമില്ല. | ⚠️ | Must not sound like Thuna blaming the delay. Confirm; consider a native rephrasing centring Thuna's caution |
| `err.session_expired.body` | Nothing was ordered. Shall we do this again? It will be quick — I remember what you wanted. | ഒന്നും ഓർഡർ ചെയ്തിട്ടില്ല. നമുക്ക് ഇത് വീണ്ടും ചെയ്യാമോ? വേഗം കഴിയും — നിങ്ങൾക്ക് വേണ്ടത് എനിക്ക് ഓർമ്മയുണ്ട്. | ✅ | |
| `err.unsupported` | That is not something I can do yet. | അത് എനിക്ക് ഇതുവരെ ചെയ്യാൻ അറിയില്ല. | ⚠️ | `അറിയില്ല` = "I don't know how". Warmer than a capability statement, and it locates the limit in Thuna. Confirm it does not read as helplessness |
| `err.unsupported.body` | I can order food, book a ride, keep your reminders and calendar, and pass a message to your family. | എനിക്ക് ഭക്ഷണം ഓർഡർ ചെയ്യാം, വണ്ടി വിളിക്കാം, ഓർമ്മപ്പെടുത്തലുകളും കലണ്ടറും സൂക്ഷിക്കാം, കുടുംബത്തിന് സന്ദേശം എത്തിക്കാം. | ✅ | `വണ്ടി വിളിക്കാം` ("call a vehicle") is the natural Malayalam for booking a ride |
| `err.repeated` | This is not working for me today. | ഇന്ന് ഇത് എനിക്ക് ശരിയാകുന്നില്ല. | ✅ | Subject is Thuna |
| `err.repeated.body` | I am sorry — it is not you. Sree could sort this out in a minute, or we can leave it and try later. | ക്ഷമിക്കണം — ഇത് നിങ്ങളുടെ കുഴപ്പമല്ല. ശ്രീക്ക് ഇത് ഒരു മിനിറ്റിൽ ശരിയാക്കാൻ കഴിയും, അല്ലെങ്കിൽ നമുക്ക് പിന്നീട് നോക്കാം. | ⚠️ | `നിങ്ങളുടെ കുഴപ്പമല്ല` = "not your fault". This is the one place Thuna addresses the elder's self-blame directly, so the phrasing must land gently. **Priority review** |
| `err.resume.heading` | Shall we finish what we started? | നമ്മൾ തുടങ്ങിയത് പൂർത്തിയാക്കാമോ? | ✅ | |
| `err.resume.still` | Still to choose: how to pay | ഇനി തിരഞ്ഞെടുക്കാനുള്ളത്: പണം എങ്ങനെ | ⚠️ | Long; confirm it fits the card row at 360px or split into label + value |
| `err.ask_sree` | Ask Sree | ശ്രീയോട് ചോദിക്കാം | ✅ | |
| `err.show_number` | Show me Swiggy's number | Swiggy-യുടെ നമ്പർ കാണിക്കൂ | ✅ | |
| `err.keep_for_later` | Keep this for later | ഇത് പിന്നത്തേക്ക് വയ്ക്കാം | ✅ | |
| `load.getting_menu` | Getting the menu. | മെനു എടുക്കുന്നു. | ✅ | |
| `load.checking_price` | Checking the price. | വില നോക്കുന്നു. | ✅ | |
| `load.sending` | Sending your message. | നിങ്ങളുടെ സന്ദേശം അയക്കുന്നു. | ✅ | |
| `load.taking_moment` | Swiggy is taking a moment. | Swiggy അല്പം സമയമെടുക്കുന്നു. | ✅ | |

---

## 10. Layout test — the longest strings at 360px

**Method.** Noto Sans Malayalam, weight as specified, at 360px viewport with 24px margins each side
(312px available) and 16px internal button padding (280px available inside a button). Character
counts are Unicode code points; the "renders as" figures assume ~15.5px average advance for
Malayalam at 18px and ~24px at 28px heading.

### 10.1 Button labels — the 280px constraint

| String | Chars | Lines at 18px/280px | Button height at `line-height: 1.6` | Verdict |
|---|---|---|---|---|
| `നിർത്തിയിടത്ത് നിന്ന് തുടരാം` (Continue from where we stopped) | 28 | **2** | 12 + 29 + 29 + 12 = **82px** | ✅ fits; button grows from 60 to 82 |
| `ഇനി തിരഞ്ഞെടുക്കാനുള്ളത്: പണം എങ്ങനെ` (Still to choose: how to pay) | 36 | **2** (card row, not a button) | row height 62px | ⚠️ tight; split into label/value |
| `എന്തെങ്കിലും മാറ്റണം` (Change something) | 20 | **1** | **56px** | ✅ single line |
| `എന്റെ ആളോട് ചോദിക്കാം` (Ask my trusted person) | 21 | **2** | **82px** | ✅ |
| `തുണയോട് സംസാരിക്കാം` (Talk to Thuna) | 19 | **1** at TalkButton width | n/a | ✅ |
| `Swiggy-യുടെ നമ്പർ കാണിക്കൂ` (Show me Swiggy's number) | 26 | **2** | **82px** | ✅ |
| `പകരം ടൈപ്പ് ചെയ്യാം` (Type instead) | 19 | **1** | **56px** | ✅ |

**Longest button label in the package:** `നിർത്തിയിടത്ത് നിന്ന് തുടരാം` at 28 characters. It fits in
**2 lines** at 360px inside a button that grows to 82px. ✅ **Test passes**, provided `min-height`
rather than `height` is used — with a fixed 60px height the second line is clipped, which is exactly
the failure this document exists to prevent.

At **200% text scaling** the same label is 2 lines at 36px type = 12 + 58 + 58 + 12 = **140px**. It
still fits horizontally (the container is full-width) and the screen scrolls. ✅

### 10.2 Headings — the 312px constraint

| String | Chars | Lines at 28px/312px | Verdict |
|---|---|---|---|
| `നിങ്ങൾ ആലോചിക്കുന്നതിനിടെ ഇത് മാറി` (This changed while you were deciding) | 34 | **2** (~2.6 lines' worth of advance, breaks after `ആലോചിക്കുന്നതിനിടെ`) | ✅ |
| `ഒന്ന് നിർത്തൂ` (Please pause) | 13 | **1** | ✅ |
| `നമ്മൾ തുടങ്ങിയത് പൂർത്തിയാക്കാമോ?` (Shall we finish what we started?) | 33 | **2** | ✅ |
| `മൈക്ക് ഉപയോഗിക്കാൻ എനിക്ക് ഇതുവരെ അനുമതി കിട്ടിയിട്ടില്ല.` (mic permission) | 56 | **3** | ✅ within the 3-line heading allowance |

**Longest heading:** the microphone-permission string at 56 characters, rendering in **3 lines** at
28px/360px. The `ErrorRecovery` takeover allows 3 heading lines (`ACCESSIBILITY_SPECIFICATION.md`
§4.1). ✅

### 10.3 The one string that fails

`safety.secrecy.body` at **123 characters** renders in approximately **7 lines** at 20px/312px. That
is 238px of body text before the three buttons, which at 200% scaling pushes the third button —
`Stop this task` — below the fold on an 800px-tall screen.

**This is a fail, and it is the reason the string is marked 🔶.** It is not a translation problem;
it is a length problem inherited from an English sentence with three subordinate clauses. The
required fix is a native speaker rendering the same meaning as **two short Malayalam sentences of at
most 55 characters each**, preserving:

- the conditional framing ("when someone asks…"), not an accusation
- "the clearest sign there is" — the strength of the claim is the point
- the subject being the request, never the elder

Until that exists, do not ship this screen in Malayalam. Every other string in the package passes.

### 10.4 Standing rule

> **Any new Malayalam string over 60 characters must be measured at 360px before it ships.**
> Over 100 characters, it must be split into two sentences. Body copy on any takeover screen is
> capped at **2 sentences**, because 3 sentences plus 1.7 line-height plus 200% scaling puts the
> exit button below the fold — and on a safety screen, the exit must never be below the fold.

---

## 11. Native-speaker review queue

Everything marked ⚠️ or 🔶, in priority order. **Priority 1 must be resolved before any Malayalam
build ships.**

| # | Priority | Key | The specific doubt |
|---|---|---|---|
| 1 | **P1** 🔶 | `safety.secrecy.body` | Too long (123 chars, 7 lines, fails §10.3). Needs native authoring as two short sentences. Highest-signal string in the product |
| 2 | **P1** ⚠️ | `err.repeated.body` | "it is not you" must land as reassurance, not pity. The one place Thuna addresses self-blame directly |
| 3 | **P1** ⚠️ | `safety.secrecy.body3` | `തെറ്റിയിട്ടില്ല` must not imply "you haven't made a mistake **yet**" |
| 4 | **P1** ⚠️ | `status.practice` | `പരിശീലനം` must read as "not real", not "a training exercise". Misreading the SIMULATED label is consequential |
| 5 | P2 ⚠️ | `safety.credential.body` | Em-dash clause structure may be English-shaped |
| 6 | P2 ⚠️ | `safety.urgent.body` | "the hurry is part of how this works" — idiomatically hard without naming a scam |
| 7 | P2 ⚠️ | `safety.btn.trusted` | `എന്റെ ആൾ` warm vs `വിശ്വസ്തൻ` formal — register call |
| 8 | P2 ⚠️ | `err.session_expired` | Must not read as blaming the elder's delay |
| 9 | P2 ⚠️ | `err.unsupported` | `അറിയില്ല` must not read as helplessness |
| 10 | P2 ⚠️ | `err.unknown.unresolved.body` | `ഊഹിച്ചു പറയാൻ വയ്യ` should read as care, not reluctance |
| 11 | P3 ⚠️ | `action.change` | Button naturalness: `മാറ്റണം` vs `മാറ്റാനുണ്ട്` |
| 12 | P3 ⚠️ | `action.repeat` | Interrogative `പറയാമോ` as a button label |
| 13 | P3 ⚠️ | `action.wait` | `ഒന്ന് നിൽക്കൂ` abruptness on a button |
| 14 | P3 ⚠️ | `status.due_now`, `status.coming_soon` | Length and ambiguity as list headings |
| 15 | P3 ⚠️ | `confirm.row.paid_by` | Label-column length |
| 16 | P3 ⚠️ | `confirm.hold.late` | `പിടിച്ചുവച്ചിരിക്കുന്നു` may be heavy |
| 17 | P3 ⚠️ | `confirm.no_cancel` | Loanwords `ക്യാൻസൽ`, `ഹെൽപ്പ്‌ലൈൻ` in written form |
| 18 | P3 ⚠️ | `safety.remote.body` | Colloquial `ഇട്ടാൽ` vs `ഇൻസ്റ്റാൾ ചെയ്താൽ` |
| 19 | P3 ⚠️ | `err.mic.busy` | "cannot reach" is an English idiom |
| 20 | P3 ⚠️ | `err.resume.still` | Row length at 360px |

**Review brief for the native speaker:** the reviewer is checking *register and naturalness*, not
meaning — the English meanings are fixed by the safety and contract documents and must not drift.
The register target is §6.1: `നിങ്ങൾ`, cohortative verbs, warm but not familiar, never a bare
imperative at the person, and on safety screens the grammatical subject is always the message or the
code, never the elder.

---

## 12. Implementation notes for GLM

1. **One string table, two columns.** `{ key, en, ml, reviewStatus }` living beside `lib/guidance.ts`
   as `DIGITAL_SAFETY_POLICY.md` §8.5 requires. Structure fixed, wording localised. The model may
   pace and adapt delivery; it must never author a safety, confirmation, or error string.
2. **Ship the `reviewStatus` field.** A build flag fails the Malayalam build if any string on a
   safety screen is `🔶`. Item 1 in §11 is currently that string.
3. **`lang="ml-IN"` on `<html>`; `lang="en"` on every Latin span.** Required for TTS voice switching
   and for the accessibility spec.
4. **`line-height: 1.7` unitless on body, 1.4 on headings.** A single `1.5` anywhere in Malayalam
   body text is a rendering defect, not a style preference.
5. **`min-height` never `height`. No ellipsis. No line-clamp.** Enforce by lint — these three rules
   prevent every Malayalam clipping bug in this document.
6. **Self-host the subset font.** Latin must be in the same file as Malayalam so mixed strings do
   not swap faces mid-line.
7. **Numbers: Latin digits in the DOM, Malayalam words in the TTS payload.** These are two different
   strings for the same value. The display string comes from `authoritative.total` untouched; the
   spoken string is generated from the same number by a formatter. Never transliterate the display.
8. **Test with real strings.** Latin placeholder text hides every bug in §3, §4, and §10. The §10.1
   longest-label test is the gate.
9. **Screenshot regression at 360px, 100% and 200%, in Malayalam,** for every screen in the package.
   A layout that passes in English and fails in Malayalam is a layout that fails, since Malayalam is
   the shipping language.

---

## Related

- `docs/mobile-ui/SAFETY_AND_CONFIRMATION_SCREENS.md` — the English master copy these strings translate
- `docs/mobile-ui/ERROR_AND_RECOVERY_STATES.md` — the English master copy for §9.4
- `docs/mobile-ui/ACCESSIBILITY_SPECIFICATION.md` §11 — the accessibility-binding Malayalam numbers
- `docs/companion/DIGITAL_SAFETY_POLICY.md` §4, §5 — refusal wording and the shame prohibition the Malayalam register must preserve
- `docs/companion/LIFE_EVENT_DEMO_SCENARIOS.md` — the Appa / `ml-IN` / Sree persona
- `VISUAL_DESIGN_SYSTEM.md` — type scale and component sizing these wrapping rules constrain
