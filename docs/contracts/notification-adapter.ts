/**
 * DRAFT CONTRACT — notification adapter
 * =====================================
 *
 * DOCUMENTATION ONLY. Not imported by the Thuna app.
 *
 * One-way, outbound messages ABOUT the elder, sent TO someone else (usually family).
 *
 * ---------------------------------------------------------------------------
 * THE CENTRAL DESIGN CLAIM
 * ---------------------------------------------------------------------------
 *
 * This is the most ethically loaded adapter in the package, so the safety rule is
 * encoded in the TYPES rather than left to reviewer discipline.
 *
 * Thuna's product invariants:
 *   - "Family notification requires explicit elder consent."
 *   - "No implicit surveillance."
 *   - "No emotional or medical inference silently shared with family."
 *
 * A companion that reports on an elder without their knowledge is a surveillance
 * device wearing a friendly voice. The line between "help" and "monitoring" is
 * CONSENT, and consent is per-recipient, per-category, and revocable.
 *
 * So `send()` does not take a free-text string. It takes a NotificationPayload whose
 * category must be matched by a ConsentGrant. It is therefore not possible to send
 * "he sounded sad today" without a consent record that explicitly permits emotional
 * observations — and that category is deliberately hard to grant.
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type RecipientId = string & { readonly __brand: 'RecipientId' };
export type NotificationId = string & { readonly __brand: 'NotificationId' };

export type NotificationChannelKind =
  | 'CONSOLE'   // demo/dev sink. Always safe.
  | 'IN_APP'    // shown inside Thuna
  | 'EMAIL'
  | 'SMS'
  | 'TELEGRAM'
  | 'WHATSAPP'
  | 'PUSH';

export interface TrustedRecipient {
  id: RecipientId;
  /** "Sree". Speakable. */
  displayName: string;
  relation?: string;
  /** Opaque handle. Never log the underlying address in the clear. */
  addressRef: string;
  channelKind: NotificationChannelKind;
}

// ---------------------------------------------------------------------------
// Consent — the gate
// ---------------------------------------------------------------------------

/**
 * What MAY be shared, in ascending order of intimacy.
 * Each is a SEPARATE consent decision. Granting one never implies another.
 */
export type NotificationCategory =
  /** "Appa asked me to let you know he needs help with something." Elder-initiated. */
  | 'ELDER_REQUESTED_HELP'
  /** "Appa's grocery order was placed." Factual, about a task the elder chose to do. */
  | 'TASK_COMPLETED'
  /** "Appa asked me to stop and would like a person to call." Elder-initiated handoff. */
  | 'HANDOFF_REQUESTED'
  /** "Appa's medicine reminder went unanswered twice." SENSITIVE — see notes. */
  | 'ROUTINE_MISSED'
  /** Routine marked done. Often unnecessary; can feel like being checked up on. */
  | 'ROUTINE_COMPLETED'
  /** Account/technical issues, e.g. Swiggy re-authorisation needed. */
  | 'ACCOUNT_ACTION_NEEDED';

/**
 * DELIBERATELY ABSENT AND NOT IMPLEMENTABLE:
 *
 *   - emotional state inference ("he sounded lonely")
 *   - health inference ("he may be unwell")
 *   - behavioural analytics ("he has been less active this week")
 *   - location tracking
 *   - conversation transcripts
 *
 * These are not omitted for lack of time. Thuna does not infer or transmit them.
 * If a future requirement asks for one, it needs a product-level ethics decision and
 * explicit, informed, revocable elder consent — NOT a new enum member.
 *
 * Adding a value to NotificationCategory is a safety-relevant change. Review it as one.
 */

export interface ConsentGrant {
  recipientId: RecipientId;
  category: NotificationCategory;
  /** FALSE means do not send. Absence of a grant also means do not send. */
  granted: boolean;
  /** When the elder granted it. Auditable. */
  grantedAt: string;
  /** How: spoken in-app, set by the elder in settings, etc. */
  grantedVia: string;
  /** Consent can expire. Silence is not renewal. */
  expiresAt?: string;
  revokedAt?: string;
}

export interface ConsentDecision {
  allowed: boolean;
  /** Elder-facing explanation when blocked. */
  reason: string;
  grant?: ConsentGrant;
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

/**
 * Structured, not free-text. The category is checked against consent BEFORE any
 * message is rendered, so an ungranted category cannot leak through prose.
 */
export interface NotificationPayload {
  category: NotificationCategory;
  /** Short, factual, non-diagnostic. */
  summary: string;
  /**
   * Optional detail. MUST remain factual: what happened, when.
   * MUST NOT contain inference about mood, health, or capability.
   */
  detail?: string;
  occurredAt: string;
  /** Routine/task this concerns, for the recipient's context. */
  referenceId?: string;
  /**
   * TRUE when the elder explicitly asked for this to be sent, in this moment.
   * Elder-initiated messages are the safest category and may bypass some
   * frequency limits — but never the consent check itself.
   */
  elderInitiated: boolean;
}

export interface DeliveryReceipt {
  id: NotificationId;
  recipientId: RecipientId;
  category: NotificationCategory;
  /**
   * The message reached the transport. It says NOTHING about whether a human read
   * it, and MUST NOT be treated as the elder having been helped.
   */
  delivered: boolean;
  deliveredAt?: string;
  error?: { code: string; message: string; retryable: boolean };
}

export type NotificationResult =
  | { ok: true; receipt: DeliveryReceipt }
  /** Consent gate refused. This is a NORMAL outcome, not an error to route around. */
  | { ok: false; blocked: true; decision: ConsentDecision }
  | { ok: false; blocked: false; error: { code: string; message: string; retryable: boolean } };

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface NotificationAdapterCapabilities {
  readonly adapterId: string;
  readonly displayName: string;
  readonly channelKind: NotificationChannelKind;
  /** TRUE for CONSOLE/demo sinks. Drives SIMULATED labelling. */
  readonly isSimulated: boolean;
  readonly supportsRichText: boolean;
  readonly maxMessageChars?: number;
  /** Anti-nagging: family should not be pinged repeatedly about the same thing. */
  readonly maxPerRecipientPerHour?: number;
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export interface NotificationAdapter {
  readonly capabilities: NotificationAdapterCapabilities;

  healthCheck(): Promise<{ available: boolean }>;

  /**
   * Consent check. MUST be callable independently so the UI can honestly tell the
   * elder "I can't tell Sree that unless you allow it" BEFORE anything is composed.
   */
  checkConsent(
    recipientId: RecipientId,
    category: NotificationCategory,
  ): Promise<ConsentDecision>;

  /**
   * Send a notification.
   *
   * Implementations MUST:
   *   1. Call checkConsent FIRST and return `{ ok:false, blocked:true }` when refused.
   *      Never send-then-log. Never "send anyway because it seemed urgent".
   *   2. Enforce `maxPerRecipientPerHour`.
   *   3. Redact PII from logs.
   *   4. Record an audit entry: who, what category, when, under which grant.
   */
  send(
    recipientId: RecipientId,
    payload: NotificationPayload,
  ): Promise<NotificationResult>;

  /** Audit trail. The elder has a right to see everything sent about them. */
  listSent(opts?: {
    recipientId?: RecipientId;
    since?: string;
    limit?: number;
  }): Promise<DeliveryReceipt[]>;
}

/**
 * Consent storage, separated so it can be backed by the memory layer.
 * See docs/companion/FAMILY_CONSENT_POLICY.md.
 */
export interface ConsentStore {
  grant(input: Omit<ConsentGrant, 'grantedAt'> & { grantedAt?: string }): Promise<ConsentGrant>;
  /** Revocation must take effect IMMEDIATELY and must always be available. */
  revoke(recipientId: RecipientId, category: NotificationCategory): Promise<void>;
  check(recipientId: RecipientId, category: NotificationCategory): Promise<ConsentDecision>;
  /** Everything the elder has agreed to, for review. Must be readable aloud. */
  listGrants(recipientId?: RecipientId): Promise<ConsentGrant[]>;
  /** Deleting an elder's profile must purge grants too. */
  purge(recipientId?: RecipientId): Promise<void>;
}

// ---------------------------------------------------------------------------
// Notes for Codex
// ---------------------------------------------------------------------------

/**
 * 1. Ship `ConsoleNotificationAdapter` (isSimulated: true) by default. Per the
 *    orchestration doc, wire Email/Telegram ONLY if credentials already exist, and
 *    never commit them.
 *
 * 2. The consent check belongs INSIDE `send()`, not at call sites. Call sites
 *    multiply; the adapter is one place. A blocked send is a normal, expected result.
 *
 * 3. ROUTINE_MISSED is the category to be most careful with. "He missed his medicine"
 *    is exactly the information families want and exactly the information that turns
 *    a companion into a monitor. Require a distinct, explicit grant; state plainly to
 *    the elder what will be shared and when; and make revocation trivially easy.
 *
 * 4. `delivered: true` means a transport accepted the message. It does not mean
 *    anyone helped. Never let a delivery receipt close a routine or satisfy an
 *    escalation.
 *
 * 5. Anything an elder could reasonably be surprised to learn was sent should not be
 *    sent. If in doubt, ask them first — that IS the product.
 */
