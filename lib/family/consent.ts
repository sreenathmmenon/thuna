import { consentRequired } from '../memory/errors';
import type { MemoryHistoryEntry, TrustedFamilyContact } from '../memory/types';
import { MemoryStore } from '../memory/store';

export interface FamilyHandoffRequest {
  contactId: string;
  elderExplicitlyRequested: boolean;
  reason: string;
}

export interface FamilyHandoffAuthorization {
  authorised: true;
  simulated: true;
  contact: TrustedFamilyContact;
  historyEntry: MemoryHistoryEntry;
}

export function authoriseFamilyHandoff(
  store: MemoryStore,
  request: FamilyHandoffRequest,
): FamilyHandoffAuthorization {
  if (!request.elderExplicitlyRequested) {
    throw consentRequired(
      'Family handoff requires an explicit request from the elder',
    );
  }
  const contact = store.getTrustedContact(request.contactId);
  if (!contact.notificationConsent) {
    throw consentRequired(
      `Notification consent is not enabled for ${contact.name}`,
    );
  }
  const historyEntry = store.appendHistory('handoffs', {
    summary: `SIMULATED family handoff requested for ${contact.name}: ${request.reason}`,
    metadata: {
      contactId: contact.id,
      elderExplicitlyRequested: true,
      simulated: true,
    },
  });
  return {
    authorised: true,
    simulated: true,
    contact,
    historyEntry,
  };
}
