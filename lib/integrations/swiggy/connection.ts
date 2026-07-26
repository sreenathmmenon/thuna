import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import {
  SWIGGY_FOOD_MCP_URL,
  SWIGGY_OAUTH_BASE_URL,
  SWIGGY_OAUTH_SCOPE,
  SwiggyOAuthProvider,
  type SwiggyOAuthStatus,
} from './oauth';

export class SwiggyConnectionService {
  constructor(
    readonly oauth: SwiggyOAuthProvider,
    private readonly fetchFn: typeof fetch = fetchWithTimeout,
  ) {}

  status(): Promise<SwiggyOAuthStatus> {
    return this.oauth.status();
  }

  async connect(): Promise<SwiggyOAuthStatus> {
    await this.oauth.beginAuthorization();
    try {
      const result = await auth(this.oauth, {
        serverUrl: SWIGGY_FOOD_MCP_URL,
        scope: SWIGGY_OAUTH_SCOPE,
        fetchFn: this.fetchFn,
      });
      if (result === 'AUTHORIZED') await this.oauth.markConnected();
      return this.oauth.status();
    } catch (error) {
      await this.oauth.markUnavailable(
        error instanceof Error ? error.message : 'OAuth discovery failed.',
      );
      throw error;
    }
  }

  async callback(input: {
    code: string | null;
    state: string | null;
    error: string | null;
  }): Promise<SwiggyOAuthStatus> {
    if (input.error) {
      await this.oauth.invalidateCredentials('tokens');
      throw new Error('Swiggy connection was not approved.');
    }
    if (!input.code) throw new Error('Swiggy did not return an authorization code.');
    await this.oauth.validateCallbackState(input.state);
    const result = await auth(this.oauth, {
      serverUrl: SWIGGY_FOOD_MCP_URL,
      authorizationCode: input.code,
      scope: SWIGGY_OAUTH_SCOPE,
      fetchFn: this.fetchFn,
    });
    if (result !== 'AUTHORIZED') {
      throw new Error('Swiggy authorization did not complete.');
    }
    await this.oauth.markConnected();
    return this.oauth.status();
  }

  async disconnect(): Promise<SwiggyOAuthStatus> {
    const token = await this.oauth.accessToken();
    if (token) {
      try {
        await this.fetchFn(`${SWIGGY_OAUTH_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Local credentials are still cleared; the remote session will expire.
      }
    }
    await this.oauth.disconnect();
    return this.oauth.status();
  }
}

async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const timeout = AbortSignal.timeout(15_000);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  return fetch(input, { ...init, signal });
}
