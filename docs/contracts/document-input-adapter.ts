/**
 * DRAFT CONTRACT — document input adapter
 * =======================================
 *
 * DOCUMENTATION ONLY. Not imported by the Thuna app. Not compiled into the build.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS FOR
 * ---------------------------------------------------------------------------
 *
 * An elder holds up a piece of paper to a camera: a hospital appointment slip, an
 * electricity bill, a wedding invitation, a prescription envelope, a letter from
 * the bank. This port is the INTAKE seam — image or document in, structured
 * candidate fields out — feeding the extraction that may become a `LifeEvent`.
 *
 * Sarvam Vision is ONE implementation. So is a mock. So is a future on-device
 * OCR. The companion never learns which.
 *
 * ---------------------------------------------------------------------------
 * THE THREE RULES THAT SHAPE THIS FILE
 * ---------------------------------------------------------------------------
 *
 * (a) EXTRACTION IS A PROPOSAL, NEVER A FACT.
 *     OCR misreads. "30/07" and "30/01" differ by one stroke, and the difference
 *     is an elder arriving at a hospital six months early. Every extracted field
 *     therefore carries a confidence and MUST be read back and confirmed before
 *     it becomes a confirmed `LifeEvent`. That requirement is enforced in
 *     ./life-event-adapter.ts (`DOCUMENT_EXTRACTION` cannot skip
 *     `NEEDS_CONFIRMATION`), and mirrored here by the absence of any method that
 *     writes a life event directly.
 *
 * (b) THE IMAGE IS THE MOST SENSITIVE THING IN THE SYSTEM.
 *     A photograph of a document can contain a bank account number, a medical
 *     condition, an address, a signature — several of which Thuna is forbidden to
 *     store at all (MEMORY_MODEL.md §9). So: images are SESSION-SCOPED, retained
 *     for the shortest workable time, never persisted to the memory store, and
 *     never sent to family. `DocumentRetention` makes that explicit rather than
 *     leaving it to reviewer discipline.
 *
 * (c) THUNA READS DOCUMENTS. IT DOES NOT INTERPRET THEM.
 *     It may extract "Dr. Nair, 30 July, 11:00, Manipal Hospital" from an
 *     appointment slip. It may NOT extract a diagnosis, summarise a medical
 *     report, explain lab values, or read a dosage back as guidance. See
 *     `RedactedFieldKind` and the notes — those categories are refused at the
 *     extraction boundary, not filtered downstream.
 */

import type { AdapterResult } from './food-commerce-adapter.ts';
import type { SessionId } from './channel-adapter.ts';
import type { LifeEventKind, EventTime } from './life-event-adapter.ts';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type DocumentId = string & { readonly __brand: 'DocumentId' };
export type ExtractionId = string & { readonly __brand: 'ExtractionId' };

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------

export type DocumentMediaKind = 'IMAGE' | 'PDF';

/**
 * What the elder says this is, where they say. Used as a HINT to the extractor,
 * never as a claim about content. An elder calling something "my bill" does not
 * make an extracted amount trustworthy.
 */
export type DocumentHint =
  | 'APPOINTMENT_SLIP'
  | 'BILL'
  | 'INVITATION'
  | 'LETTER'
  | 'RECEIPT'
  | 'UNKNOWN';

/**
 * How long the raw bytes may live. There is deliberately no `PERSIST` value.
 *
 * `SESSION_ONLY`   — held in memory for the current conversation, discarded on end.
 *                    The default and the only one that should be used.
 * `TRANSIENT_ONLY` — discarded the moment extraction returns. For anything the
 *                    elder flagged as sensitive.
 */
export type DocumentRetention = 'SESSION_ONLY' | 'TRANSIENT_ONLY';

export interface SubmitDocumentInput {
  sessionId: SessionId;
  mediaKind: DocumentMediaKind;
  /**
   * Opaque reference to the bytes — a blob handle, a temp path, a data ref.
   * NEVER a URL that outlives the session, and never logged.
   */
  mediaRef: string;
  mimeType: string;
  byteSize: number;
  hint?: DocumentHint;
  retention: DocumentRetention;
  /**
   * The elder deliberately offered this document, now. Intake is not passive:
   * Thuna does not process images it was not handed.
   */
  explicitUserIntent: boolean;
  /** Language hint for OCR, e.g. 'ml-IN', 'en-IN'. */
  languageHint?: string;
}

export interface SubmittedDocument {
  id: DocumentId;
  sessionId: SessionId;
  mediaKind: DocumentMediaKind;
  hint?: DocumentHint;
  retention: DocumentRetention;
  byteSize: number;
  submittedAt: string;
  /** When the bytes will be discarded. Must always be set. */
  discardAt: string;
}

// ---------------------------------------------------------------------------
// Extraction output
// ---------------------------------------------------------------------------

/**
 * The field kinds Thuna will surface. Small on purpose: these are the things
 * that make a life event, and nothing more.
 */
export type ExtractedFieldKind =
  | 'TITLE'          // "Appointment with Dr. Nair"
  | 'DATE_TIME'
  | 'PLACE_LABEL'    // "Manipal Hospital" — a name, not a full address
  | 'AMOUNT'         // a bill total
  | 'DUE_DATE'
  | 'REFERENCE'      // an account/booking reference, for the elder to read back
  | 'PERSON_NAME'
  | 'PHONE_NUMBER';

/**
 * Categories that MUST be refused at the extraction boundary — detected and
 * dropped, never returned to the companion, never stored, never spoken.
 *
 * The extractor reports that it SAW one (so Thuna can say "there's some private
 * information on this — I've left it alone") without ever carrying the value.
 *
 * These are not filtered downstream. Downstream filtering means the value
 * existed in a variable, a log line, and a crash dump first.
 */
export type RedactedFieldKind =
  | 'OTP_OR_PIN'
  | 'CARD_OR_BANK_DETAILS'
  | 'GOVERNMENT_ID'
  | 'PASSWORD'
  /** Diagnoses, conditions, lab values. Thuna is not a health app. */
  | 'MEDICAL_FINDING'
  /** Drug name paired with a dose. MEMORY_MODEL.md §9. */
  | 'MEDICINE_DOSAGE'
  | 'SIGNATURE';

/**
 * One extracted candidate. `confidence` describes the EXTRACTION — the image
 * quality, the OCR certainty. It never describes the elder, and it must never be
 * used to adapt how Thuna speaks to them. See COMPREHENSION_VERIFICATION.md §2.
 */
export interface ExtractedField {
  kind: ExtractedFieldKind;
  /** Raw text as read. Speakable for readback. */
  value: string;
  /** 0..1. Low values mean ask more carefully — never mean doubt the person. */
  confidence: number;
  /** For DATE_TIME / DUE_DATE, the normalised form, with honest precision. */
  when?: EventTime;
  /** For AMOUNT, minor units. Never used to initiate a payment. */
  amountPaise?: number;
}

/**
 * The result of extraction. Note what it is NOT: it is not a `LifeEvent`, and
 * there is no method here that creates one. The companion takes this, reads it
 * back, and only on an elder's yes does it call
 * `LifeEventAdapter.create({ source: 'DOCUMENT_EXTRACTION', ... })` — which
 * itself lands in `NEEDS_CONFIRMATION`.
 *
 * Two gates for one OCR read is correct. The failure mode is an elder at the
 * wrong hospital on the wrong day.
 */
export interface ExtractionResult {
  id: ExtractionId;
  documentId: DocumentId;

  /** What Thuna thinks this document is. A guess, presented as one. */
  suggestedEventKind?: LifeEventKind;
  /** Confidence in `suggestedEventKind`, 0..1. */
  suggestedKindConfidence?: number;

  fields: ExtractedField[];

  /**
   * Categories detected and dropped. Present so Thuna can be honest about what
   * it ignored — never carrying the values themselves.
   */
  redacted: RedactedFieldKind[];

  /**
   * TRUE when the extractor could not read the document usefully at all.
   * The right response is to ask for a better photo, plainly and without
   * implying the elder did anything wrong:
   * "I can't quite make that out — could you hold it a bit steadier?"
   */
  unreadable: boolean;

  /**
   * Pre-rendered readback covering every field, for confirmation.
   * MUST state uncertainty where confidence is low, and MUST NOT read out any
   * REFERENCE field as a run-on string — digits are spoken in groups.
   */
  readbackText: string;

  extractedAt: string;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface DocumentInputCapabilities {
  readonly providerId: string;      // 'mock' | 'sarvam-vision' | 'on-device-ocr'
  readonly displayName: string;
  /** TRUE for mocks. Drives SIMULATED labelling. */
  readonly isSimulated: boolean;
  /** TRUE when bytes leave the device. Requires an explicit elder grant. */
  readonly sendsImageOffDevice: boolean;
  readonly supportedMediaKinds: readonly DocumentMediaKind[];
  readonly supportedMimeTypes: readonly string[];
  readonly maxByteSize: number;
  readonly supportedLanguages: readonly string[];
  /**
   * TRUE when the implementation performs the §(c) refusals itself.
   * Thuna MUST NOT use an extractor where this is false for anything other than
   * a mock — post-hoc filtering is not redaction.
   */
  readonly redactsSensitiveCategories: boolean;
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export interface DocumentInputAdapter {
  readonly capabilities: DocumentInputCapabilities;

  healthCheck(): Promise<AdapterResult<{ authenticated: boolean }>>;

  /**
   * Accept a document. Implementations MUST refuse when:
   *   - `explicitUserIntent` is false
   *   - the mime type or size is outside capabilities
   *   - `sendsImageOffDevice` is true and no off-device grant exists
   *
   * A refusal here is normal and is spoken plainly, not swallowed.
   */
  submit(input: SubmitDocumentInput): Promise<AdapterResult<SubmittedDocument>>;

  /**
   * Extract candidate fields. Read-only with respect to Thuna's state — this
   * creates nothing and confirms nothing.
   */
  extract(
    documentId: DocumentId,
    opts?: { hint?: DocumentHint; languageHint?: string },
  ): Promise<AdapterResult<ExtractionResult>>;

  /**
   * Discard the bytes. Called on session end, on `TRANSIENT_ONLY` immediately
   * after extraction, and on any elder request ("delete that photo").
   * Real deletion, not a flag. MEMORY_MODEL.md §6.
   */
  discard(documentId: DocumentId): Promise<AdapterResult<{ discarded: boolean }>>;

  /**
   * Everything still held for a session, so the elder can ask "what have you got
   * of mine?" and get a complete answer — and so session teardown can prove it
   * discarded everything.
   */
  listHeld(sessionId: SessionId): Promise<SubmittedDocument[]>;
}

// ---------------------------------------------------------------------------
// Notes for Codex
// ---------------------------------------------------------------------------

/**
 * 1. SHIP THE MOCK. `MockDocumentInputAdapter`, `isSimulated: true`,
 *    `sendsImageOffDevice: false`. Sarvam Vision is a later, flag-gated step and
 *    needs its own elder-facing consent copy ("this sends the picture to be
 *    read — is that alright?").
 *
 * 2. There is no `createLifeEvent()` on this port, deliberately. Extraction
 *    proposes; the elder confirms; the life event port creates. Do not add a
 *    convenience method that collapses those three steps.
 *
 * 3. Redact at the extractor, not after. If a card number reaches an
 *    `ExtractedField`, it has already been in a log and a stack trace.
 *
 * 4. `MEDICAL_FINDING` and `MEDICINE_DOSAGE` redaction is what keeps Thuna a
 *    reminder rather than a health app. An elder asking "what does this report
 *    say?" gets the existing refusal ("I shouldn't guess — your doctor can tell
 *    you properly"), routed pre-model like the OTP refusal in `lib/router.ts`.
 *
 * 5. `discardAt` must be enforced by an actual sweep, and session teardown must
 *    call `discard()` for everything in `listHeld()`. An image that outlives the
 *    conversation is the worst leak available in this product.
 *
 * 6. Speak reference numbers in groups ("four eight two one"), never as a
 *    single run of digits, and never speak anything in `redacted`.
 *
 * 7. Suggested tests:
 *      - submit refused without `explicitUserIntent`
 *      - submit refused when off-device and no grant exists
 *      - a card number in the image never appears in `fields`, only in `redacted`
 *      - a diagnosis never appears in `fields`
 *      - session end discards every held document
 *      - low-confidence DATE_TIME produces a readback that states the uncertainty
 *      - an extraction cannot create a confirmed LifeEvent without an elder yes
 *      - `unreadable: true` produces a blame-free "could you hold it steadier"
 */
