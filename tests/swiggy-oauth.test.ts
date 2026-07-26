import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { CredentialStore } from '../lib/integrations/credentials';
import {
  generatePkcePair,
  SwiggyOAuthProvider,
  type StoredSwiggyOAuth,
} from '../lib/integrations/swiggy/oauth';
import { redactProviderData, redactSecret } from '../lib/integrations/redact';

class MemoryStore implements CredentialStore<StoredSwiggyOAuth> {
  value?: StoredSwiggyOAuth;
  async load() { return this.value && structuredClone(this.value); }
  async save(value: StoredSwiggyOAuth) { this.value = structuredClone(value); }
  async clear() { this.value = undefined; }
}

describe('Swiggy OAuth security', () => {
  it('generates an RFC 7636 S256 verifier and challenge', () => {
    const pair = generatePkcePair();
    expect(pair.verifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.challenge).toBe(
      createHash('sha256').update(pair.verifier).digest('base64url'),
    );
  });

  it('rejects a callback state mismatch and requires reconnection', async () => {
    const oauth = new SwiggyOAuthProvider(
      new MemoryStore(),
      'http://localhost:3000/api/integrations/swiggy/callback',
    );
    await oauth.beginAuthorization();
    await expect(oauth.validateCallbackState('attacker-state')).rejects.toThrow(/did not match/i);
    expect((await oauth.status()).state).toBe('RECONNECT_REQUIRED');
  });

  it('accepts only the exact callback state', async () => {
    const oauth = new SwiggyOAuthProvider(
      new MemoryStore(),
      'http://localhost:3000/api/integrations/swiggy/callback',
    );
    await oauth.beginAuthorization();
    const state = await oauth.state();
    await expect(oauth.validateCallbackState(state)).resolves.toBeUndefined();
  });

  it('marks an expired token unusable', async () => {
    let now = 1_000_000;
    const oauth = new SwiggyOAuthProvider(
      new MemoryStore(),
      'http://localhost:3000/api/integrations/swiggy/callback',
      () => now,
    );
    await oauth.saveTokens({ access_token: 'server-only-token', token_type: 'Bearer', expires_in: 120 });
    expect(await oauth.accessToken()).toBe('server-only-token');
    now += 70_000;
    expect(await oauth.accessToken()).toBeUndefined();
    expect((await oauth.status()).state).toBe('EXPIRED');
  });

  it('redacts secrets, phone numbers and addresses', () => {
    expect(redactSecret('abc')).not.toContain('abc');
    expect(redactProviderData({
      access_token: 'secret',
      phone: '9876543210',
      address: 'private home',
      safe: 'ok',
    })).toEqual({
      access_token: '[REDACTED]',
      phone: '[REDACTED]',
      address: '[REDACTED]',
      safe: 'ok',
    });
  });
});
