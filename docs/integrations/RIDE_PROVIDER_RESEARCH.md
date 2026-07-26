# Ride Provider Research

> Research conducted 2026-07-26. **Changes no production code.**
>
> **Headline finding: no Indian ride-hailing provider publishes an official MCP server.**
> Every "ride MCP" discoverable today is third-party or community-built. This document says so
> plainly rather than presenting a community wrapper as a vendor integration.

---

## 1. Summary

| Provider | Official public API? | Sandbox? | Official MCP? | Usable by Thuna now? |
|---|---|---|---|---|
| **Uber** | ✅ Yes — `developer.uber.com` | ✅ `sandbox-api.uber.com` | ❌ No | ⚠️ Sandbox only |
| **Ola** | ⚠️ Exists, **invite-only** | ⚠️ Stated, gated | ❌ No | ❌ No |
| **Rapido** | ❌ None found | ❌ | ❌ No | ❌ No |
| **Namma Yatri** | ⚠️ Open **data**, not a booking API | ❌ | ❌ No | ❌ No |
| **ONDC / Beckn** | ✅ Open protocol | ⚠️ Reference sandboxes | ❌ No | ❌ Requires BAP registration |

Contrast with food: **Swiggy MCP is genuinely first-party and official.** That asymmetry is the
central finding — it is why food is integration-ready and rides are not.

---

## 2. Uber — the only verifiable sandbox

**Official docs:** <https://developer.uber.com/docs/riders/guides/sandbox>

Verified:
- Sandbox base URL: `https://sandbox-api.uber.com/<version>` (rides: `/v1.2/requests`)
- "Development endpoints for testing the functionality of an application without making calls to the
  production Uber platform"
- **Sandbox requests do not create real trips.** Developers can exercise the ordering flow "without
  worrying about a real world trip being created"
- "Most of the endpoints in the sandbox environment are proxied straight to the production
  environment", with `Request` the main exception
- OAuth 2.0; the `request` scope is required to create ride requests — a **privileged scope**
- "All OAuth users and their tokens that are available in the production Uber API environment will
  also be valid to make requests to the sandbox API"
- Sandbox permits scenarios production blocks (restricted pickup locations; users with no payment
  method on file)

**Assessment.** The only ride provider where a developer can exercise a realistic booking flow today
with zero real-world consequence. Suitable as a **reference/mock data source**. Note that privileged
scopes and India availability both need verification before any production consideration.

---

## 3. Ola — official but gated

**Official portal:** <https://developers.olacabs.com/docs/overview> (returned **HTTP 503** on
2026-07-26 — could not be read directly)

From secondary sources:
- An official Ola Developer Platform exists, with sandbox APIs and a certification step before
  production credentials
- **Invite-only since November 2017.** "Developer APIs are opened up to interested affiliates and
  partners on a case-to-case basis"
- "Expression of interest through mail does not guarantee access"
- Contact: `affiliates@olacabs.com`

**Assessment.** Officially exists, practically inaccessible. Access is a business-development
outcome, not a technical step. **Do not plan around it.**

> ⚠️ The primary source was unreachable. Treat the above as **unverified** and re-check before
> relying on it.

---

## 4. Rapido — no official developer API found

Searched for an official developer portal, partner API docs, and `developer(s).rapido.*`. **None
found.**

**Two false positives worth recording**, because both would mislead a future search:

1. **"Rapido REST APIs" on `developers.exlibrisgroup.com`** — this is **Ex Libris Rapido**, a library
   resource-sharing product. Completely unrelated to the Indian bike-taxi company. The name collision
   is total, and the docs look convincingly like an API reference.
2. **`rdxshubham/rapido` on GitHub** — self-described as *"Rapido API unofficial"*. Community
   reverse-engineering, not a sanctioned interface.

**Assessment.** No official integration path. Anything presented as a "Rapido API" is either a
different company or unofficial. **Do not integrate.**

---

## 5. Namma Yatri — open source, but not an open booking API

- Fully open source: `github.com/nammayatri/nammayatri`, **AGPL-3.0**
- Built on the **Beckn protocol**, part of **ONDC**
- Operated by Moving Tech Innovations (hived off from Juspay in late 2023)
- Publishes an **open data** platform (`nammayatri.in/open`) — aggregate metrics and dashboards

**The crucial distinction:** open source and open data are **not** an open booking API. The repo
being public does not give a third party a hosted endpoint to call, and no third-party consumer
booking API is documented.

**AGPL-3.0 also matters.** It is a strong copyleft licence with network-use provisions. Reusing that
code inside Thuna would carry licensing obligations that need real legal consideration — not a
casual dependency decision.

**Assessment.** Admirable openness; not an integration path. Booking requires participating in the
ONDC network as a registered BAP (§6).

---

## 6. ONDC / Beckn — open protocol, high barrier

**This is the substantive answer to "can we use community MCPs?" for rides.**

Beckn is a genuinely open protocol, and Namma Yatri is a real participant. But you cannot simply
call it. To book a ride you must become a **BAP** (Beckn Application Platform — the buyer-side node),
which requires:

- A valid domain (FQDN/DNS) and a valid **SSL certificate** for OCSP validation
- **Self-signed digital certificates** with separate keypairs for signing and encryption
- Registration in the **ONDC registry** with a Subscriber ID, country, cities, domain and type
- Registrar approval, then cryptographic exchange to move from `INITIATED` to `SUBSCRIBED`
- Ongoing compliance with network policy

**A community MCP server cannot grant you any of this.** It either points at a mock/sandbox, or it
uses *its own* credentials — in which case rides book under someone else's network identity, which is
not something to put an elder's journey behind.

**Assessment.** The most *philosophically* aligned option — open, India-native, driver-friendly — and
a legitimate long-term direction. But BAP registration is an organisational undertaking, not a
sprint task.

---

## 7. Community MCP servers — what they are good for

Community servers exist and were examined:

| Server | Reality |
|---|---|
| Beckn Mobility MCP (`@dumko2001`) | Community project. Exposes `search_cabs`, `select_ride`, `init_booking`, `confirm_booking`. Unaffiliated with ONDC, Namma Yatri, or any provider |
| Rapido Ride Scraper (Apify) | A **scraper**, not a sanctioned API. Brittle; likely contrary to terms of service |
| MCP Uber Server | Community-built. Not from Uber |

### Recommendation

**Legitimate uses — encouraged:**
- **Reference implementations.** Reading how someone shaped `search → select → confirm` is genuinely
  useful for validating `docs/contracts/ride-adapter.ts`.
- **Mock data sources.** Realistic shapes for a `MockRideAdapter`, with no real booking.
- **Learning the Beckn flow** before committing to BAP registration.

**Illegitimate use — do not:**
- **Booking a real ride for a real elder.** A community wrapper is the wrong trust tier for putting a
  person into a stranger's vehicle. It carries no SLA, no support path, no security review, no
  liability, and can break or change behaviour without notice.

This is the same reasoning Thuna already applies to OTPs: the question is not "is it technically
possible" but "is this a trustworthy enough channel for a consequential act affecting a vulnerable
person". For **reading** data, community tooling is fine. For **committing an elder to a journey**,
it is not.

This is exactly why `docs/contracts/ride-adapter.ts` carries a **triple gate** —
`realRideEnabled && explicitUserIntent && providerIsOfficial` — with `providerIsOfficial` read from
`capabilities.isOfficialIntegration`. Shipping an unofficial adapter cannot silently enable real
bookings; the type system refuses.

---

## 8. Recommendation for Thuna

### 8.1 Provider-neutral `RideAdapter` — **do this**

Already drafted: `docs/contracts/ride-adapter.ts`. Provider-neutral by necessity, not preference —
there is no dominant option to design around, and the landscape is likely to change.

### 8.2 Mock adapter — **the only thing to ship near-term**

```
MockRideAdapter
  isSimulated: true
  isOfficialIntegration: false
```

Sufficient for any demo. Consistent with Thuna's existing posture that external actions are faithful,
clearly-labelled simulations.

### 8.3 Sandbox adapter — optional, later

Only Uber's sandbox is verified to exist and to avoid real trips. Still `isSimulated: true`. Worth
building only if realistic ride data materially improves the product.

### 8.4 Production — **not without approval**

Requires, in order: a chosen provider, an approved commercial/partner agreement (or BAP registration),
a security review, and an explicit product decision that Thuna should book rides for elders at all.

That last one is a genuine open question. Rides are the highest-consequence vertical in this package
— a wrong order wastes money; a wrong ride puts a person somewhere they did not intend to be,
possibly without a usable phone. It deserves a deliberate decision, not incremental drift into it.

---

## 9. Rides are not in scope

`AGENTS.md` locks the demo to `ORDER_FOOD`, `MEDICINE_REMINDER`, `RISKY_REQUEST`, and optionally
`PHONE_SETTINGS`. Rides are **not** in scope, and this research does not change that.

`docs/contracts/ride-adapter.ts` exists so the adapter layer is shaped correctly from the start —
not as a licence to build a `RIDE` skill.

---

## 10. What could not be verified

Stated honestly:

1. **Ola's developer portal** returned HTTP 503. Details are from secondary sources and are
   **unverified**.
2. **Uber India availability** — the sandbox is documented, but whether ride-request scopes are
   available for Indian operations was not confirmed.
3. **Uber privileged scope approval** — the `request` scope is privileged; the approval process was
   not researched.
4. **Beckn sandbox specifics** — reference sandboxes are mentioned in ONDC materials but were not
   directly verified.
5. **Namma Yatri partner programmes** — no evidence found either way of a private partner API.

None of these gaps changes the recommendation, because all roads lead to mock-first regardless.

---

## Sources

- [Uber sandbox](https://developer.uber.com/docs/riders/guides/sandbox) — verified
- [Uber Riders API reference](https://developer.uber.com/docs/riders/references/api)
- [Ola Developer Platform](https://developers.olacabs.com/docs/overview) — **HTTP 503, unverified**
- [Namma Yatri (GitHub, AGPL-3.0)](https://github.com/nammayatri/nammayatri)
- [Namma Yatri Open Data](https://nammayatri.in/open/)
- [Beckn registry spec](https://github.com/beckn/registry)
- [ONDC participant onboarding](https://github.com/ONDC-Official/developer-docs)
- [Ex Libris Rapido](https://developers.exlibrisgroup.com/rapido/) — **different company; false positive**
