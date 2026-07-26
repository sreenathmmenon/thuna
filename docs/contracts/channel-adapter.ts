/**
 * DRAFT CONTRACT — channel adapter
 * ================================
 *
 * DOCUMENTATION ONLY. Not imported by the Thuna app.
 *
 * A CHANNEL is how a conversation with the elder physically happens:
 * in-app voice today; a phone call, WhatsApp, or a smart speaker later.
 *
 * ---------------------------------------------------------------------------
 * WHY SEPARATE THIS FROM NOTIFICATIONS
 * ---------------------------------------------------------------------------
 *
 * A notification is one-way and fire-and-forget ("tell Sree the medicine was taken").
 * A channel is BIDIRECTIONAL and stateful — it can be answered, it can go unanswered,
 * the elder can say "wait", and it can be hung up.
 *
 * Conflating them is what leads to the worst bug in this product category:
 * treating "we delivered a reminder" as "the elder took their medicine". A channel
 * that reports delivery success says NOTHING about human response.
 *
 * This is Thuna's existing invariant — SILENCE IS NOT COMPLETION — expressed at the
 * transport layer. See docs/companion/ROUTINE_ENGINE.md.
 *
 * ---------------------------------------------------------------------------
 * TELEPHONY POSTURE
 * ---------------------------------------------------------------------------
 *
 * Per CODEX_MASTER_ORCHESTRATION.md: "Optional telephony adapter; telephony is never
 * required for core operation" and "Telephony credentials must not be committed."
 * This contract keeps telephony strictly behind the same interface as in-app voice,
 * so the routine engine never learns whether it is talking over a speaker or a phone.
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type ChannelId = string & { readonly __brand: 'ChannelId' };
export type SessionId = string & { readonly __brand: 'SessionId' };

export type ChannelKind =
  | 'IN_APP_VOICE'   // browser mic + speaker. The only one required for core operation.
  | 'IN_APP_TEXT'    // typed fallback (demo mode / accessibility)
  | 'TELEPHONY'      // outbound/inbound PSTN via Exotel, Twilio, ...
  | 'MESSAGING'      // WhatsApp, SMS, Telegram — turn-based, not real-time
  | 'SMART_SPEAKER';

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface ChannelCapabilities {
  readonly channelId: ChannelId;
  readonly kind: ChannelKind;
  readonly displayName: string;

  /** Can Thuna initiate contact, or only respond? Governs proactive routines. */
  readonly supportsOutbound: boolean;
  readonly supportsInbound: boolean;

  /** Real-time audio both ways (interruptible), vs turn-based. */
  readonly supportsFullDuplexAudio: boolean;
  readonly supportsAudioIn: boolean;
  readonly supportsAudioOut: boolean;
  readonly supportsText: boolean;

  /**
   * Can the elder interrupt mid-utterance? Elders often need to.
   * Where false, keep spoken turns short so they are not trapped listening.
   */
  readonly supportsBargeIn: boolean;

  /** Can we distinguish "answered" from "delivered"? Critical for routines. */
  readonly canDetectAnswer: boolean;

  /**
   * TRUE only where a real provider is wired AND credentials exist.
   * Drives SIMULATED labelling.
   */
  readonly isSimulated: boolean;

  /** Cost/consent-bearing channels need explicit elder opt-in before outbound use. */
  readonly requiresExplicitConsentForOutbound: boolean;

  /** Max spoken utterance before chunking (Bulbul: 2500 chars per request). */
  readonly maxUtteranceChars?: number;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export type SessionState =
  | 'IDLE'
  | 'DIALING'      // outbound attempt in flight (telephony)
  | 'RINGING'
  | 'ANSWERED'     // a HUMAN is present. The only state implying reachability.
  | 'ACTIVE'
  | 'ON_HOLD'      // elder said "wait"
  | 'ENDED'
  | 'NO_ANSWER'    // rang out. NOT a failure of the elder — never treat as refusal.
  | 'BUSY'
  | 'FAILED';      // transport error; the elder may never have been reached

export interface ChannelSession {
  id: SessionId;
  channelId: ChannelId;
  state: SessionState;
  startedAt: string;
  endedAt?: string;
  /** True only if a human demonstrably responded. Drives routine transitions. */
  humanResponded: boolean;
  /** Set when ENDED — who hung up matters for escalation decisions. */
  endedBy?: 'ELDER' | 'THUNA' | 'PROVIDER' | 'TIMEOUT';
}

// ---------------------------------------------------------------------------
// Turns
// ---------------------------------------------------------------------------

export interface SpeakRequest {
  sessionId: SessionId;
  text: string;
  /** Thuna supports a slow pace for elders — honoured where the channel can. */
  pace?: 'normal' | 'slow';
  languageCode?: string;
  /** Pre-generated audio (demo fallback chain). */
  audioUrl?: string;
  /** Allow the elder to interrupt this utterance where supported. */
  interruptible?: boolean;
}

export interface ListenRequest {
  sessionId: SessionId;
  /** Give elders generous time. Short timeouts read as being cut off. */
  timeoutMs?: number;
  languageHint?: string;
}

export interface ListenResult {
  /**
   * Absent transcript means NOTHING WAS HEARD.
   * It does NOT mean "no", "yes", or consent. Callers must not infer intent
   * from silence — see ROUTINE_ENGINE.md.
   */
  transcript?: string;
  languageCode?: string;
  confidence?: number;
  /** True when the window expired with no speech. */
  timedOut: boolean;
  durationMs: number;
}

export interface ChannelError {
  code: string;
  message: string;
  retryable: boolean;
}

export type ChannelResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ChannelError };

// ---------------------------------------------------------------------------
// Outbound
// ---------------------------------------------------------------------------

export interface OpenSessionInput {
  /** Opaque handle for the elder on this channel. Never a raw phone number in logs. */
  recipientRef: string;
  /**
   * Why Thuna is initiating. Proactive contact MUST have a stated purpose —
   * see CHECKIN_CONVERSATION_POLICY.md.
   */
  purpose: string;
  /** Elder consent for THIS kind of outbound contact must be verified first. */
  consentVerified: boolean;
  /** Quiet hours must be checked before this call. */
  quietHoursChecked: boolean;
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export interface ChannelAdapter {
  readonly capabilities: ChannelCapabilities;

  healthCheck(): Promise<ChannelResult<{ available: boolean }>>;

  /**
   * Begin a conversation.
   *
   * Implementations MUST refuse when `consentVerified` is false or
   * `quietHoursChecked` is false and the channel requires consent. Waking an elder
   * at 3am is a real harm, and the check belongs here where it cannot be skipped.
   */
  openSession(input: OpenSessionInput): Promise<ChannelResult<ChannelSession>>;

  getSession(id: SessionId): Promise<ChannelResult<ChannelSession>>;

  speak(input: SpeakRequest): Promise<ChannelResult<{ spokenMs: number }>>;

  listen(input: ListenRequest): Promise<ChannelResult<ListenResult>>;

  /** Elder said "wait". Pause without ending. */
  hold(sessionId: SessionId): Promise<ChannelResult<void>>;
  resume(sessionId: SessionId): Promise<ChannelResult<void>>;

  /** Always available. An elder must be able to end any conversation immediately. */
  endSession(
    sessionId: SessionId,
    reason: 'COMPLETED' | 'ELDER_REQUESTED_STOP' | 'ESCALATED' | 'ERROR',
  ): Promise<ChannelResult<ChannelSession>>;

  /** Inbound (elder-initiated) sessions, where the channel supports it. */
  onInboundSession?(handler: (session: ChannelSession) => void): void;
}

// ---------------------------------------------------------------------------
// Notes for Codex
// ---------------------------------------------------------------------------

/**
 * 1. Ship `InAppVoiceChannelAdapter` only. Telephony stays an interface with no
 *    credentials, per the orchestration doc.
 *
 * 2. NEVER map `state: 'ENDED'` to routine completion. Only an explicit spoken
 *    confirmation completes a routine. `humanResponded` exists so the routine engine
 *    can tell "reached a person" from "delivered a sound into an empty room".
 *
 * 3. `NO_ANSWER` is not refusal and not completion. It is the MISSED path
 *    (ROUTINE_ENGINE.md), which may retry once and then escalate only with consent.
 *
 * 4. `openSession` is the correct chokepoint for quiet hours and consent. Putting
 *    those checks in the routine engine alone means a future second caller can
 *    bypass them; putting them here means they cannot.
 *
 * 5. Do not log `recipientRef` in the clear. Hash it, per the same PII rules that
 *    govern Swiggy session logging.
 */
