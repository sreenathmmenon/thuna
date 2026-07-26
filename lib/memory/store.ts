import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createDemoMemorySeed } from './demo-seed';
import {
  MemoryError,
  consentRequired,
  invalidInput,
  notFound,
} from './errors';
import {
  findForbiddenStoragePath,
  redactSensitiveText,
  sanitiseMetadata,
} from './redaction';
import type {
  ConsentChangeSource,
  ElderProfile,
  HistoryCategory,
  HistoryInput,
  MemoryHistory,
  MemoryHistoryEntry,
  PaymentRecipientMemory,
  PreferenceUpdate,
  ProfileUpdate,
  ThunaMemoryDocument,
  TrustedContactInput,
  TrustedFamilyContact,
} from './types';

const MAX_TEXT_LENGTH = 500;

function now(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cleanText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw invalidInput(`${field} must be a non-empty string`);
  }
  return redactSensitiveText(value.trim()).slice(0, MAX_TEXT_LENGTH);
}

function cleanOptionalIsoDate(value: unknown, field: string): string {
  if (value === undefined) return now();
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw invalidInput(`${field} must be an ISO date`);
  }
  return new Date(value).toISOString();
}

function cleanRecipients(value: unknown): PaymentRecipientMemory[] {
  if (!Array.isArray(value)) {
    throw invalidInput('frequentPaymentRecipients must be an array');
  }
  return value.map((recipient, index) => {
    if (typeof recipient !== 'object' || recipient === null) {
      throw invalidInput(`frequentPaymentRecipients[${index}] is invalid`);
    }
    const input = recipient as Record<string, unknown>;
    if (input.kind !== 'person' && input.kind !== 'merchant') {
      throw invalidInput(
        `frequentPaymentRecipients[${index}].kind must be person or merchant`,
      );
    }
    return {
      id: cleanText(input.id, `frequentPaymentRecipients[${index}].id`),
      name: cleanText(input.name, `frequentPaymentRecipients[${index}].name`),
      kind: input.kind,
    };
  });
}

function emptyHistory(): MemoryHistory {
  return { tasks: [], routines: [], corrections: [], handoffs: [] };
}

function isDocument(value: unknown): value is ThunaMemoryDocument {
  if (typeof value !== 'object' || value === null) return false;
  const document = value as Partial<ThunaMemoryDocument>;
  if (
    document.version !== 1 ||
    !Array.isArray(document.trustedFamilyContacts) ||
    !Array.isArray(document.consentAudit) ||
    typeof document.history !== 'object' ||
    document.history === null
  ) {
    return false;
  }
  return (['tasks', 'routines', 'corrections', 'handoffs'] as const).every(
    (category) => Array.isArray(document.history?.[category]),
  );
}

export class MemoryStore {
  constructor(
    private readonly filePath: string,
    private readonly seedFactory: () => ThunaMemoryDocument =
      createDemoMemorySeed,
  ) {
    if (!existsSync(filePath)) this.write(this.seedFactory());
  }

  getFilePath(): string {
    return this.filePath;
  }

  getSnapshot(): ThunaMemoryDocument {
    return clone(this.read());
  }

  getProfile(): ElderProfile | null {
    return clone(this.read().profile);
  }

  updateProfile(update: ProfileUpdate): ElderProfile {
    const document = this.read();
    if (!document.profile) {
      throw notFound('Profile was deleted; reset the demo before updating it');
    }
    if (typeof update !== 'object' || update === null) {
      throw invalidInput('Profile update must be an object');
    }
    const next = clone(document.profile);
    if ('name' in update) next.name = cleanText(update.name, 'name');
    if ('previousFoodOrder' in update) {
      if (update.previousFoodOrder === null) {
        next.previousFoodOrder = null;
      } else {
        const order = update.previousFoodOrder;
        if (typeof order !== 'object' || order === null) {
          throw invalidInput('previousFoodOrder must be an object or null');
        }
        next.previousFoodOrder = {
          item: cleanText(order.item, 'previousFoodOrder.item'),
          restaurant: cleanText(
            order.restaurant,
            'previousFoodOrder.restaurant',
          ),
          address: cleanText(order.address, 'previousFoodOrder.address'),
          customisations: Array.isArray(order.customisations)
            ? order.customisations.map((item, index) =>
                cleanText(item, `previousFoodOrder.customisations[${index}]`),
              )
            : [],
        };
      }
    }
    if ('frequentPaymentRecipients' in update) {
      next.frequentPaymentRecipients = cleanRecipients(
        update.frequentPaymentRecipients,
      );
    }
    next.updatedAt = now();
    document.profile = next;
    this.write(document);
    return clone(next);
  }

  getPreferences(): PreferenceUpdate | null {
    const profile = this.read().profile;
    if (!profile) return null;
    return {
      preferredLanguage: profile.preferredLanguage,
      preferredPace: profile.preferredPace,
      preferredAddress: profile.preferredAddress,
    };
  }

  updatePreferences(update: PreferenceUpdate): ElderProfile {
    const document = this.read();
    if (!document.profile) {
      throw notFound('Profile was deleted; reset the demo before updating it');
    }
    if (typeof update !== 'object' || update === null) {
      throw invalidInput('Preference update must be an object');
    }
    if ('preferredLanguage' in update) {
      document.profile.preferredLanguage = cleanText(
        update.preferredLanguage,
        'preferredLanguage',
      );
    }
    if ('preferredAddress' in update) {
      document.profile.preferredAddress = cleanText(
        update.preferredAddress,
        'preferredAddress',
      );
    }
    if ('preferredPace' in update) {
      if (update.preferredPace !== 'normal' && update.preferredPace !== 'slow') {
        throw invalidInput('preferredPace must be normal or slow');
      }
      document.profile.preferredPace = update.preferredPace;
    }
    document.profile.updatedAt = now();
    this.write(document);
    return clone(document.profile);
  }

  listTrustedContacts(): TrustedFamilyContact[] {
    return clone(this.read().trustedFamilyContacts);
  }

  getTrustedContact(contactId: string): TrustedFamilyContact {
    const contact = this.read().trustedFamilyContacts.find(
      (candidate) => candidate.id === contactId,
    );
    if (!contact) throw notFound(`Trusted contact ${contactId} was not found`);
    return clone(contact);
  }

  createTrustedContact(input: TrustedContactInput): TrustedFamilyContact {
    if (typeof input !== 'object' || input === null) {
      throw invalidInput('Trusted contact must be an object');
    }
    const timestamp = now();
    const contact: TrustedFamilyContact = {
      id: randomUUID(),
      name: cleanText(input.name, 'name'),
      relation: cleanText(input.relation, 'relation'),
      notificationConsent: false,
      consentUpdatedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const document = this.read();
    document.trustedFamilyContacts.push(contact);
    this.write(document);
    return clone(contact);
  }

  updateTrustedContact(
    contactId: string,
    input: Partial<TrustedContactInput>,
  ): TrustedFamilyContact {
    if (typeof input !== 'object' || input === null) {
      throw invalidInput('Trusted contact update must be an object');
    }
    const document = this.read();
    const contact = document.trustedFamilyContacts.find(
      (candidate) => candidate.id === contactId,
    );
    if (!contact) throw notFound(`Trusted contact ${contactId} was not found`);
    if ('name' in input) contact.name = cleanText(input.name, 'name');
    if ('relation' in input) {
      contact.relation = cleanText(input.relation, 'relation');
    }
    contact.updatedAt = now();
    this.write(document);
    return clone(contact);
  }

  deleteTrustedContact(contactId: string): void {
    const document = this.read();
    const nextContacts = document.trustedFamilyContacts.filter(
      (candidate) => candidate.id !== contactId,
    );
    if (nextContacts.length === document.trustedFamilyContacts.length) {
      throw notFound(`Trusted contact ${contactId} was not found`);
    }
    document.trustedFamilyContacts = nextContacts;
    this.write(document);
  }

  setNotificationConsent(
    contactId: string,
    nextConsent: boolean,
    confirmedByElder: boolean,
    source: ConsentChangeSource,
  ): TrustedFamilyContact {
    if (!confirmedByElder) {
      throw consentRequired(
        'Notification consent can change only after explicit elder confirmation',
      );
    }
    if (
      source !== 'elder_explicit_request' &&
      source !== 'elder_settings'
    ) {
      throw invalidInput('Invalid consent change source');
    }
    if (typeof nextConsent !== 'boolean') {
      throw invalidInput('notificationConsent must be boolean');
    }

    const document = this.read();
    const contact = document.trustedFamilyContacts.find(
      (candidate) => candidate.id === contactId,
    );
    if (!contact) throw notFound(`Trusted contact ${contactId} was not found`);
    const previousConsent = contact.notificationConsent;
    const changedAt = now();
    contact.notificationConsent = nextConsent;
    contact.consentUpdatedAt = changedAt;
    contact.updatedAt = changedAt;
    document.consentAudit.push({
      id: randomUUID(),
      contactId,
      previousConsent,
      nextConsent,
      changedAt,
      source,
    });
    this.write(document);
    return clone(contact);
  }

  getConsentAudit() {
    return clone(this.read().consentAudit);
  }

  listHistory(category?: HistoryCategory): MemoryHistory | MemoryHistoryEntry[] {
    const history = this.read().history;
    return clone(category ? history[category] : history);
  }

  appendHistory(
    category: HistoryCategory,
    input: HistoryInput,
  ): MemoryHistoryEntry {
    if (!(['tasks', 'routines', 'corrections', 'handoffs'] as const).includes(category)) {
      throw invalidInput('Invalid history category');
    }
    if (typeof input !== 'object' || input === null) {
      throw invalidInput('History entry must be an object');
    }
    const entry: MemoryHistoryEntry = {
      id: randomUUID(),
      category,
      summary: cleanText(input.summary, 'summary'),
      occurredAt: cleanOptionalIsoDate(input.occurredAt, 'occurredAt'),
      metadata: sanitiseMetadata(input.metadata),
    };
    const document = this.read();
    document.history[category].push(entry);
    this.write(document);
    return clone(entry);
  }

  resetToDemoSeed(): ThunaMemoryDocument {
    const seed = this.seedFactory();
    this.write(seed);
    return clone(seed);
  }

  deleteProfileAndMemory(): void {
    const blank: ThunaMemoryDocument = {
      version: 1,
      profile: null,
      trustedFamilyContacts: [],
      history: emptyHistory(),
      consentAudit: [],
    };
    this.write(blank);
  }

  private read(): ThunaMemoryDocument {
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'));
      if (!isDocument(parsed)) {
        throw new MemoryError(
          'MEMORY_CORRUPT',
          'Stored memory does not match the Thuna memory contract',
          500,
        );
      }
      const forbiddenPath = findForbiddenStoragePath(parsed);
      if (forbiddenPath) {
        throw new MemoryError(
          'MEMORY_CORRUPT',
          `Stored memory contains a prohibited field at ${forbiddenPath}`,
          500,
        );
      }
      return parsed;
    } catch (error) {
      if (error instanceof MemoryError) throw error;
      throw new MemoryError(
        'MEMORY_IO_ERROR',
        'Thuna memory could not be read',
        500,
      );
    }
  }

  private write(document: ThunaMemoryDocument): void {
    const forbiddenPath = findForbiddenStoragePath(document);
    if (forbiddenPath) {
      throw invalidInput(`Prohibited sensitive field at ${forbiddenPath}`);
    }
    const directory = dirname(this.filePath);
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    try {
      mkdirSync(directory, { recursive: true });
      writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
      });
      renameSync(temporaryPath, this.filePath);
    } catch {
      throw new MemoryError(
        'MEMORY_IO_ERROR',
        'Thuna memory could not be saved',
        500,
      );
    }
  }
}
