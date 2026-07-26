import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { authoriseFamilyHandoff } from '../lib/family';
import { MemoryError, MemoryStore } from '../lib/memory';

const temporaryDirectories: string[] = [];

function makeStore(): { store: MemoryStore; path: string } {
  const directory = mkdtempSync(join(tmpdir(), 'thuna-memory-'));
  temporaryDirectories.push(directory);
  const path = join(directory, 'memory.json');
  return { store: new MemoryStore(path), path };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('governed memory persistence', () => {
  it('starts with the exact demo identity, preferences, order, family, and recipients', () => {
    const { store } = makeStore();
    const memory = store.getSnapshot();

    expect(memory.profile).toMatchObject({
      name: 'Appa',
      preferredLanguage: 'Malayalam',
      preferredPace: 'slow',
      preferredAddress: 'Home',
      previousFoodOrder: {
        item: 'Masala Dosa',
        restaurant: 'Udupi Cafe',
        address: 'Home',
      },
    });
    expect(memory.trustedFamilyContacts).toEqual([
      expect.objectContaining({
        name: 'Sree',
        notificationConsent: false,
      }),
    ]);
    expect(
      memory.profile?.frequentPaymentRecipients.map((contact) => contact.name),
    ).toEqual(['Priya Menon', 'Priya Stores', 'Priya Nair']);
  });

  it('persists profile, preferences, and all four history types across store instances', () => {
    const { store, path } = makeStore();
    store.updateProfile({ name: 'Appachan' });
    store.updatePreferences({
      preferredLanguage: 'English',
      preferredPace: 'normal',
      preferredAddress: 'My Home',
    });
    for (const category of [
      'tasks',
      'routines',
      'corrections',
      'handoffs',
    ] as const) {
      store.appendHistory(category, {
        summary: `${category} entry`,
        metadata: { safe: true },
      });
    }

    const reloaded = new MemoryStore(path);
    expect(reloaded.getProfile()).toMatchObject({
      name: 'Appachan',
      preferredLanguage: 'English',
      preferredPace: 'normal',
      preferredAddress: 'My Home',
    });
    expect(reloaded.listHistory('tasks')).toHaveLength(1);
    expect(reloaded.listHistory('routines')).toHaveLength(1);
    expect(reloaded.listHistory('corrections')).toHaveLength(1);
    expect(reloaded.listHistory('handoffs')).toHaveLength(1);
  });

  it('redacts credentials and medicine dosage and removes prohibited metadata keys', () => {
    const { store, path } = makeStore();
    const entry = store.appendHistory('corrections', {
      summary:
        'User said OTP is 123456, card number 4242424242424242 and medicine 5 mg',
      metadata: {
        otp: '123456',
        pin: '4321',
        cvv: '999',
        cardNumber: '5555555555554444',
        medicine_dosage: '5 mg',
        nested: { account_number: '123456789', note: 'PIN 6789' },
      },
    });
    const stored = readFileSync(path, 'utf8');

    expect(entry.summary).toContain('[REDACTED SENSITIVE VALUE]');
    expect(entry.summary).toContain('[REDACTED FINANCIAL VALUE]');
    expect(entry.summary).toContain('[REDACTED MEDICINE DOSAGE]');
    expect(entry.metadata).toEqual({
      nested: { note: 'PIN [REDACTED SENSITIVE VALUE]' },
    });
    for (const secret of [
      '123456',
      '4321',
      '4242424242424242',
      '5555555555554444',
      '123456789',
      '5 mg',
    ]) {
      expect(stored).not.toContain(secret);
    }
  });
});

describe('trusted-family consent', () => {
  it('never grants contact notification consent implicitly', () => {
    const { store } = makeStore();
    const created = store.createTrustedContact({
      name: 'Lakshmi',
      relation: 'daughter',
      notificationConsent: true,
    } as never);

    expect(created.notificationConsent).toBe(false);
    expect(store.getConsentAudit()).toEqual([]);
  });

  it('requires explicit confirmation, records changes, and governs handoff', () => {
    const { store } = makeStore();

    expect(() =>
      store.setNotificationConsent(
        'sree',
        true,
        false,
        'elder_settings',
      ),
    ).toThrowError(
      expect.objectContaining<Partial<MemoryError>>({
        code: 'CONSENT_REQUIRED',
      }),
    );
    expect(() =>
      authoriseFamilyHandoff(store, {
        contactId: 'sree',
        elderExplicitlyRequested: true,
        reason: 'Please help with this unsupported task',
      }),
    ).toThrowError(
      expect.objectContaining<Partial<MemoryError>>({
        code: 'CONSENT_REQUIRED',
      }),
    );

    store.setNotificationConsent(
      'sree',
      true,
      true,
      'elder_explicit_request',
    );
    expect(() =>
      authoriseFamilyHandoff(store, {
        contactId: 'sree',
        elderExplicitlyRequested: false,
        reason: 'No implicit surveillance',
      }),
    ).toThrowError(
      expect.objectContaining<Partial<MemoryError>>({
        code: 'CONSENT_REQUIRED',
      }),
    );

    const handoff = authoriseFamilyHandoff(store, {
      contactId: 'sree',
      elderExplicitlyRequested: true,
      reason: 'Please help with this unsupported task',
    });
    expect(handoff).toMatchObject({
      authorised: true,
      simulated: true,
      contact: { name: 'Sree', notificationConsent: true },
    });
    expect(store.getConsentAudit()).toEqual([
      expect.objectContaining({
        contactId: 'sree',
        previousConsent: false,
        nextConsent: true,
        source: 'elder_explicit_request',
      }),
    ]);
    expect(store.listHistory('handoffs')).toHaveLength(1);
  });
});

describe('privacy reset and delete', () => {
  it('deletes all profile-linked memory and restores only the exact demo seed on reset', () => {
    const { store, path } = makeStore();
    store.updateProfile({ name: 'Changed Name' });
    store.setNotificationConsent('sree', true, true, 'elder_settings');
    store.appendHistory('tasks', { summary: 'SIMULATED task completed' });

    store.deleteProfileAndMemory();
    const deleted = new MemoryStore(path).getSnapshot();
    expect(deleted.profile).toBeNull();
    expect(deleted.trustedFamilyContacts).toEqual([]);
    expect(deleted.history).toEqual({
      tasks: [],
      routines: [],
      corrections: [],
      handoffs: [],
    });
    expect(deleted.consentAudit).toEqual([]);

    const reset = store.resetToDemoSeed();
    expect(reset.profile?.name).toBe('Appa');
    expect(reset.profile?.preferredLanguage).toBe('Malayalam');
    expect(reset.profile?.preferredPace).toBe('slow');
    expect(reset.trustedFamilyContacts[0]).toMatchObject({
      name: 'Sree',
      notificationConsent: false,
    });
    expect(reset.consentAudit).toEqual([]);
  });
});
