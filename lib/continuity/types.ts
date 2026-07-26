export const INBOX_CLASSES = [
  'TASK',
  'LIFE_EVENT',
  'ROUTINE',
  'BILL',
  'PENDING_PROMISE',
  'FAMILY_REQUEST',
  'QUESTION',
  'UNSUPPORTED',
] as const;

export type InboxClass = (typeof INBOX_CLASSES)[number];
export type CaptureSource = 'VOICE' | 'TYPED' | 'DOCUMENT' | 'FAMILY';
export type FieldSource =
  | 'ELDER_SPEECH'
  | 'ELDER_TYPED'
  | 'DOCUMENT_EXTRACTION'
  | 'FAMILY_ENTRY'
  | 'ELDER_CORRECTION';

export type SharingScope = 'ELDER_ONLY' | 'CONSENTED_FAMILY_CONTENT';

export interface SourceProvenance {
  source: CaptureSource;
  capturedAt: string;
  reference?: string;
}

export interface CandidateField {
  key: string;
  value: string | number | boolean | null;
  unit?: string;
  source: FieldSource;
  rawText?: string;
  confidence: number;
  status: 'EXTRACTED' | 'CORRECTED' | 'CONFIRMED' | 'UNKNOWN_ACCEPTED';
  correctedFrom?: string | number | boolean | null;
  correctedAt?: string;
}

export interface InboxCandidate {
  id: string;
  capturedText: string;
  classification: InboxClass;
  title: string;
  fields: CandidateField[];
  source: SourceProvenance;
  confidence: 'CANDIDATE';
  state: 'CANDIDATE' | 'REJECTED';
  readback: string;
  revision: number;
  createdAt: string;
  expiresAt: string;
}

export type LifeEventType =
  | 'WEDDING'
  | 'FAMILY_EVENT'
  | 'BIRTHDAY'
  | 'APPOINTMENT'
  | 'BILL'
  | 'DELIVERY'
  | 'RENEWAL'
  | 'SERVICE_VISIT'
  | 'TRAVEL'
  | 'OTHER';

export type LifeEventState =
  | 'CONFIRMED'
  | 'UPCOMING'
  | 'DUE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'SNOOZED'
  | 'MISSED'
  | 'CANCELLED'
  | 'ESCALATED';

export interface ReminderOccurrence {
  id: string;
  scheduledFor: string;
  purpose: string;
  dedupKey: string;
  priority: number;
  state: 'SCHEDULED' | 'SNOOZED' | 'DELIVERED' | 'CANCELLED';
}

export interface ContinuityTransition {
  id: string;
  at: string;
  event: string;
  detail: string;
}

export interface ContinuityMemoryMetadata {
  source: SourceProvenance;
  confidence: 'CONFIRMED';
  sharingScope: SharingScope;
  supersedesId?: string;
  supersededBy?: string;
}

export interface LifeEvent {
  id: string;
  type: LifeEventType;
  state: LifeEventState;
  title: string;
  fields: CandidateField[];
  reminders: ReminderOccurrence[];
  completion?: {
    completedAt: string;
    method: 'ELDER_CONFIRMED' | 'PROVIDER_VERIFIED' | 'ELDER_DECLINED_TO_SAY';
  };
  memory: ContinuityMemoryMetadata;
  createdAt: string;
  updatedAt: string;
  history: ContinuityTransition[];
}

export type PendingLoopState =
  | 'OPEN'
  | 'SCHEDULED'
  | 'DUE'
  | 'ACTIVE'
  | 'SNOOZED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface LoopTrigger {
  kind: 'AT_TIME' | 'AFTER_DINNER' | 'TOMORROW' | 'MANUAL';
  at?: string;
  stated: string;
}

export interface PendingLoop {
  id: string;
  description: string;
  originalUtterance: string;
  state: PendingLoopState;
  trigger: LoopTrigger;
  dueAt?: string;
  snoozeCount: number;
  completion?: {
    completedAt: string;
    method: 'ELDER_CONFIRMED' | 'ELDER_RELEASED' | 'TASK_COMPLETED';
  };
  memory: ContinuityMemoryMetadata;
  consentRequired: boolean;
  createdAt: string;
  updatedAt: string;
  history: ContinuityTransition[];
}

export const FAMILY_REQUEST_STATES = [
  'REQUESTED',
  'OFFERED',
  'ACCEPTED',
  'SCHEDULED',
  'COMPLETED',
  'ELDER_CONFIRMED',
  'CANCELLED',
] as const;

export type FamilyRequestState = (typeof FAMILY_REQUEST_STATES)[number];

export interface FamilyAttentionRequest {
  id: string;
  contactId: string;
  purpose: string;
  disclosure: string;
  state: FamilyRequestState;
  elderApprovedAt: string;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
  history: ContinuityTransition[];
}

export type ContinuityNotificationCategory = 'CONSENTED_FAMILY_CONTENT';

export interface FamilyContentConsent {
  contactId: string;
  category: ContinuityNotificationCategory;
  granted: boolean;
  grantedAt: string;
  revokedAt?: string;
}

export interface ConsentHistoryEntry {
  id: string;
  contactId: string;
  category: ContinuityNotificationCategory;
  previousConsent: boolean;
  nextConsent: boolean;
  changedAt: string;
  source: 'ELDER_EXPLICIT_APPROVAL' | 'ELDER_SETTINGS';
}

export interface QuietHours {
  startHour: number;
  endHour: number;
}

export interface ContinuityDocument {
  version: 1;
  lifeEvents: LifeEvent[];
  pendingLoops: PendingLoop[];
  familyRequests: FamilyAttentionRequest[];
  familyContentConsent: FamilyContentConsent[];
  consentHistory: ConsentHistoryEntry[];
  quietHours: QuietHours;
  dailyBriefEnabled: boolean;
}

export interface ContinuitySnapshot extends ContinuityDocument {
  candidates: InboxCandidate[];
}

export interface DailyBriefItem {
  id: string;
  category:
    | 'EVENT'
    | 'BILL'
    | 'DELIVERY'
    | 'ROUTINE'
    | 'FAMILY'
    | 'PENDING_PROMISE';
  title: string;
  detail: string;
  dueAt?: string;
  priority: number;
  dedupKey: string;
}

export interface DailyBrief {
  generatedAt: string;
  deferredForQuietHours: boolean;
  items: DailyBriefItem[];
  omittedCount: number;
  spokenSummary: string | null;
}

export type ContinuityChannel = 'WEB' | 'PHONE_INTERFACE';
export type PauseReason =
  | 'ELDER_ASKED_TO_WAIT'
  | 'NO_RESPONSE'
  | 'CHANNEL_DROPPED'
  | 'INTERRUPTED_BY_HIGHER_PRIORITY'
  | 'SYSTEM';
export type NextSafeStep =
  | 'RE_READ_AND_RECONFIRM'
  | 'ASK_PENDING_QUESTION'
  | 'RECONCILE_THEN_SPEAK'
  | 'RESUME'
  | 'ABANDON';

export interface ContinuityCheckpoint {
  id: string;
  subjectId: string;
  confirmedFields: Record<string, string | number | boolean>;
  pendingQuestion?: string;
  pauseReason: PauseReason;
  nextSafeStep: NextSafeStep;
  stateRevision: string;
  confirmationRevision?: string;
  originChannel: ContinuityChannel;
  createdAt: string;
  expiresAt: string;
}

export interface ResumeDecision {
  resumable: boolean;
  confirmedFields: Record<string, string | number | boolean>;
  pendingQuestion?: string;
  nextSafeStep: NextSafeStep;
  staleConfirmationInvalidated: boolean;
  reason: string;
}

export interface DocumentInputAdapter {
  readonly name: string;
  extractCandidate(input: {
    transientMediaRef: string;
    locale: string;
    explicitUserIntent: boolean;
    retention: 'SESSION_ONLY' | 'TRANSIENT_ONLY';
  }): Promise<{
    text: string;
    fields: CandidateField[];
    source: 'DOCUMENT';
    redactedKinds: Array<
      | 'OTP_OR_PIN'
      | 'CARD_OR_BANK_DETAILS'
      | 'GOVERNMENT_ID'
      | 'PASSWORD'
      | 'MEDICAL_FINDING'
      | 'MEDICINE_DOSAGE'
      | 'SIGNATURE'
    >;
  }>;
}
