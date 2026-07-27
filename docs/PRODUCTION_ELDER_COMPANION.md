# Thuna proactive elder companion

## Elder experience

The elder-facing product keeps four useful concepts in view:

- Talk to Thuna
- What is happening today
- Reminders
- Ask family

It does not expose scheduler controls, webhooks, retry counters, provider
configuration, MCP tool names, or OAuth terminology.

A due reminder presents three choices: **Done**, **Remind me later**, and **Ask
family**. Silence never selects one of them. Telegram is not an elder reminder
channel; its optional adapter remains isolated to explicitly consented family
or administrative notifications.

## Governed delivery ladder

```text
Confirmed reminder becomes due
  → persistent device/in-app alert
  → wait for the configured response window
  → record NO_RESPONSE when there is no acknowledgement
  → schedule a policy-bounded retry
  → for medicine/appointment retries only, call through configured Exotel
  → Sarvam voice agent reports an authenticated elder outcome
  → complete, snooze, ask family, or record no response
```

The model proposes the reminder content and schedule. Deterministic code owns
the channel policy, retry count, state transitions, safety checks, confirmation,
and append-only event history. The exact proposal that the elder reviews is
stored under a short-lived identifier and is the only proposal that confirmation
can persist.

## Automatic unanswered processing

The Node.js instrumentation hook starts the scheduler only when
`THUNA_SCHEDULER_ENABLED=true`. Every tick:

1. Finds active reminders whose response window has expired.
2. Appends `NO_RESPONSE`.
3. Schedules the next attempt and increments `retryCount`, or marks the routine
   missed after the configured limit.
4. Triggers reminders that are now due.

The scheduler has a process-wide overlap guard. A single file-backed deployment
must run one replica; multi-replica production requires a database-backed lease
or queue.

## Device notifications

The included service worker displays a persistent notification with vibration
and the governed Done, Remind me later, and Ask family actions. Notification
actions call the same routine APIs as the open application.

This is an honest PWA layer, not a claim of an OEM alarm. A browser can restrict
background work, and this implementation does not yet include a Web Push
subscription service. If the application is fully closed, exact delivery is not
guaranteed. Maximum-reliability Android distribution should use a native shell
with `AlarmManager`, a foreground ringing service, boot restoration, and an
offline acknowledgement queue while preserving the same server contracts.

## Exotel and Sarvam responsibilities

`ExotelVoiceCallChannel` uses Exotel’s documented campaigns API and passes only
the routine ID and generic routine type in `custom_field`. It does not send
reminder copy, profile data, addresses, tokens, or raw health information.
Provider retry is disabled because Thuna’s deterministic scheduler owns retries.

The configured Exotel Voicebot flow connects the call to the separately deployed
Sarvam conversational agent. Exotel’s status callback is treated only as
delivery evidence. A provider status such as “completed” means a call ended; it
does not prove the elder completed the reminder. Thuna stores only the normalized
status, server timestamp, and a SHA-256 hash of the provider reference in the
private data root; it discards phone numbers and the raw callback.

The Sarvam voice agent reports one authenticated outcome:

```http
POST /api/telephony/outcome
Authorization: Bearer <THUNA_TELEPHONY_WEBHOOK_SECRET>
Content-Type: application/json
```

```json
{ "routineId": "...", "outcome": "completed" }
```

Other accepted outcomes are `snoozed` with `snoozeMinutes`, `family_help`, and
`no_response`. The bearer secret must contain at least 32 characters and is
compared in constant time.

Official references:

- [Exotel Create Campaign API](https://developer.exotel.com/api/create-campaign)
- [Exotel Voicebot Applet](https://docs.exotel.com/exotel-agentstream/voicebot-applet)
- [Next.js 14 instrumentation](https://nextjs.org/docs/14/app/building-your-application/optimizing/instrumentation)

## Configuration

All provider access is disabled by default:

```env
THUNA_DEMO_MODE=false
THUNA_SCHEDULER_ENABLED=true
THUNA_SCHEDULER_INTERVAL_SECONDS=15

THUNA_ENABLE_REAL_TELEPHONY=false
THUNA_PUBLIC_BASE_URL=https://your-thuna-domain.example
THUNA_TELEPHONY_WEBHOOK_SECRET=<at-least-32-random-characters>
THUNA_ELDER_PHONE_NUMBER=+9198XXXXXXXX

EXOTEL_API_KEY=
EXOTEL_API_TOKEN=
EXOTEL_ACCOUNT_SID=
EXOTEL_CALLER_ID=
EXOTEL_API_BASE=https://api.in.exotel.com
EXOTEL_VOICEBOT_FLOW_URL=https://my.exotel.com/<account>/exoml/start_voice/<app-id>
```

Set `THUNA_ENABLE_REAL_TELEPHONY=true` only after the Exotel caller ID, elder
number, Voicebot/App Bazaar flow, public HTTPS callback, Sarvam voice agent, and
authenticated outcome path have been validated. No credential is committed.

## Validation boundary

Automated tests cover automatic no-response scheduling, deterministic channel
policy, call-on-retry behavior, failure preservation, recurrence, legacy
persistence migration, minimum-disclosure Exotel request mapping, explicit
feature gating, and webhook authentication.

The automated suite never places a real call. A live Exotel/Sarvam call remains
a credentialed operational gate and must not be represented as verified until
an actual provider campaign and authenticated spoken outcome are observed.
