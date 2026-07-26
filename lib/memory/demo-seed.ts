import type { ThunaMemoryDocument } from './types';

const SEEDED_AT = '2026-07-26T00:00:00.000Z';

export const DEMO_MEMORY_SEED: ThunaMemoryDocument = {
  version: 1,
  profile: {
    id: 'elder-appa',
    name: 'Appa',
    preferredLanguage: 'Malayalam',
    preferredPace: 'slow',
    preferredAddress: 'Home',
    previousFoodOrder: {
      item: 'Masala Dosa',
      restaurant: 'Udupi Cafe',
      address: 'Home',
      customisations: [],
    },
    frequentPaymentRecipients: [
      { id: 'priya-menon', name: 'Priya Menon', kind: 'person' },
      { id: 'priya-stores', name: 'Priya Stores', kind: 'merchant' },
      { id: 'priya-nair', name: 'Priya Nair', kind: 'person' },
    ],
    updatedAt: SEEDED_AT,
  },
  trustedFamilyContacts: [
    {
      id: 'sree',
      name: 'Sree',
      relation: 'family',
      notificationConsent: false,
      consentUpdatedAt: null,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
  ],
  history: {
    tasks: [],
    routines: [],
    corrections: [],
    handoffs: [],
  },
  consentAudit: [],
};

export function createDemoMemorySeed(): ThunaMemoryDocument {
  return structuredClone(DEMO_MEMORY_SEED);
}
