export type PreferredPace = 'normal' | 'slow';

export interface FoodOrderMemory {
  item: string;
  restaurant: string;
  address: string;
  customisations: string[];
}

export interface PaymentRecipientMemory {
  id: string;
  name: string;
  kind: 'person' | 'merchant';
}

export interface ElderProfile {
  id: string;
  name: string;
  preferredLanguage: string;
  preferredPace: PreferredPace;
  preferredAddress: string;
  previousFoodOrder: FoodOrderMemory | null;
  frequentPaymentRecipients: PaymentRecipientMemory[];
  updatedAt: string;
}

export interface TrustedFamilyContact {
  id: string;
  name: string;
  relation: string;
  notificationConsent: boolean;
  consentUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HistoryCategory =
  | 'tasks'
  | 'routines'
  | 'corrections'
  | 'handoffs';

export interface MemoryHistoryEntry {
  id: string;
  category: HistoryCategory;
  summary: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export type ConsentChangeSource =
  | 'elder_explicit_request'
  | 'elder_settings';

export interface ConsentAuditEntry {
  id: string;
  contactId: string;
  previousConsent: boolean;
  nextConsent: boolean;
  changedAt: string;
  source: ConsentChangeSource;
}

export interface MemoryHistory {
  tasks: MemoryHistoryEntry[];
  routines: MemoryHistoryEntry[];
  corrections: MemoryHistoryEntry[];
  handoffs: MemoryHistoryEntry[];
}

export interface ThunaMemoryDocument {
  version: 1;
  profile: ElderProfile | null;
  trustedFamilyContacts: TrustedFamilyContact[];
  history: MemoryHistory;
  consentAudit: ConsentAuditEntry[];
}

export interface ProfileUpdate {
  name?: string;
  previousFoodOrder?: FoodOrderMemory | null;
  frequentPaymentRecipients?: PaymentRecipientMemory[];
}

export interface PreferenceUpdate {
  preferredLanguage?: string;
  preferredPace?: PreferredPace;
  preferredAddress?: string;
}

export interface TrustedContactInput {
  name: string;
  relation: string;
}

export interface HistoryInput {
  summary: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}
