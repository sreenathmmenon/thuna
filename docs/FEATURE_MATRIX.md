# Thuna feature matrix

| Area | Status | Real or simulated | Safety boundary |
|---|---|---|---|
| Browser microphone | Complete | Real browser recording | User starts and stops capture |
| Saaras v3 STT | Complete | Real Sarvam REST API | Audio held only for request processing |
| Structured interpretation | Complete | Real Sarvam chat with deterministic fallback | Zod validation; one retry; no state mutation |
| Deterministic task engine | Complete | Real application logic | Session store is the only state committer |
| Bulbul v3 speech | Complete | Real Sarvam REST API | Normal/slow pace and recoverable fallback |
| Order food | Complete | Simulated external action | Fresh explicit confirmation after correction |
| Send payment | Complete | Simulated external action | Recipient mismatch block; no credentials |
| Phone help | Complete | Simulated guidance | One instruction at a time; no phone control claim |
| Track order | Complete | Simulated status | Never invents a delivery promise |
| General help | Complete | Real deterministic explanation | Never claims external-app control |
| Unsupported request | Complete | Real safe pause | Offers consented human help |
| Credential refusal | Complete | Real pre-AI rule | OTP/PIN/CVV never sent to the model |
| Medicine reminder | Complete | Real in-app state engine; simulated check-in | Reminder only; silence is not completion |
| Other routines | Complete | Real state engine; simulated in-app channel | Same governed lifecycle |
| Snooze/retry/history | Complete | Real deterministic routine logic | One retry; explicit completion |
| Memory | Complete | File-backed demo persistence | Redaction, reset, delete, no dosage/credentials |
| Trusted family | Complete | Real consent store; simulated notification by default | Explicit consent and request required |
| Telegram | Optional | Real only with existing credentials | Never required for demo |
| Exotel/Twilio | Interface only | Not connected | Optional; no committed credentials |
| Food/payment providers | Not connected by design | Simulated | No Swiggy, UPI, or banking actions |

## Sarvam APIs used

- `POST /speech-to-text` with `saaras:v3`.
- `POST /v1/chat/completions` with the configured Sarvam chat model.
- `POST /text-to-speech` with `bulbul:v3`.

Sarvam Translate remains available in the adapter but is not required by the
primary end-to-end path.
