import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from '@modelcontextprotocol/sdk/client/auth.js';
import type { CredentialStore } from '../credentials';

export const SWIGGY_FOOD_MCP_URL = 'https://mcp.swiggy.com/food';
export const SWIGGY_OAUTH_BASE_URL = 'https://mcp.swiggy.com';
export const SWIGGY_OAUTH_SCOPE = 'mcp:tools';

export type SwiggyConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'EXPIRED'
  | 'RECONNECT_REQUIRED'
  | 'PROVIDER_UNAVAILABLE';

export interface StoredSwiggyOAuth {
  clientInformation?: OAuthClientInformationMixed;
  tokens?: OAuthTokens;
  tokenObtainedAt?: number;
  tokenExpiresAt?: number;
  codeVerifier?: string;
  oauthState?: string;
  authorizationUrl?: string;
  discoveryState?: OAuthDiscoveryState;
  connectionState: SwiggyConnectionState;
  lastError?: string;
}

export interface SwiggyOAuthStatus {
  state: SwiggyConnectionState;
  connected: boolean;
  expiresAt?: string;
  authorizationUrl?: string;
  message: string;
}

function newState(): string {
  return randomBytes(32).toString('base64url');
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(64).toString('base64url');
  return {
    verifier,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
  };
}

function stateMatches(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length
    && timingSafeEqual(expectedBuffer, receivedBuffer);
}

const EXPIRY_SKEW_MS = 60_000;

export class SwiggyOAuthProvider implements OAuthClientProvider {
  private record: StoredSwiggyOAuth = { connectionState: 'DISCONNECTED' };
  private loaded = false;

  constructor(
    private readonly credentialStore: CredentialStore<StoredSwiggyOAuth>,
    readonly callbackUrl: string,
    private readonly now: () => number = Date.now,
  ) {}

  get redirectUrl(): string {
    return this.callbackUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: 'Thuna localhost Swiggy integration',
      redirect_uris: [this.callbackUrl],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: SWIGGY_OAUTH_SCOPE,
    };
  }

  async initialize(): Promise<void> {
    if (this.loaded) return;
    this.record = await this.credentialStore.load()
      ?? { connectionState: 'DISCONNECTED' };
    this.loaded = true;
    this.refreshExpiryState();
  }

  async beginAuthorization(): Promise<void> {
    await this.initialize();
    this.record.oauthState = newState();
    this.record.codeVerifier = undefined;
    this.record.authorizationUrl = undefined;
    this.record.lastError = undefined;
    this.record.connectionState = 'CONNECTING';
    await this.persist();
  }

  async status(): Promise<SwiggyOAuthStatus> {
    await this.initialize();
    this.refreshExpiryState();
    const expiresAt = this.record.tokenExpiresAt
      ? new Date(this.record.tokenExpiresAt).toISOString()
      : undefined;
    const messages: Record<SwiggyConnectionState, string> = {
      DISCONNECTED: 'Swiggy is not connected.',
      CONNECTING: 'Continue connecting Swiggy in the secure Swiggy page.',
      CONNECTED: 'Swiggy is connected.',
      EXPIRED: 'Please reconnect Swiggy.',
      RECONNECT_REQUIRED: 'Please reconnect Swiggy.',
      PROVIDER_UNAVAILABLE: 'Swiggy is temporarily unavailable.',
    };
    return {
      state: this.record.connectionState,
      connected: this.record.connectionState === 'CONNECTED',
      expiresAt,
      authorizationUrl: this.record.authorizationUrl,
      message: messages[this.record.connectionState],
    };
  }

  async validateCallbackState(received: string | null): Promise<void> {
    await this.initialize();
    if (!received || !this.record.oauthState || !stateMatches(this.record.oauthState, received)) {
      this.record.connectionState = 'RECONNECT_REQUIRED';
      this.record.lastError = 'OAuth state mismatch.';
      await this.persist();
      throw new Error('Swiggy connection state did not match. Start again.');
    }
  }

  async markConnected(): Promise<void> {
    await this.initialize();
    this.record.oauthState = undefined;
    this.record.codeVerifier = undefined;
    this.record.authorizationUrl = undefined;
    this.record.connectionState = 'CONNECTED';
    this.record.lastError = undefined;
    await this.persist();
  }

  async markUnavailable(message: string): Promise<void> {
    await this.initialize();
    this.record.connectionState = 'PROVIDER_UNAVAILABLE';
    this.record.lastError = message.slice(0, 300);
    await this.persist();
  }

  async disconnect(): Promise<void> {
    await this.credentialStore.clear();
    this.record = { connectionState: 'DISCONNECTED' };
    this.loaded = true;
  }

  async accessToken(): Promise<string | undefined> {
    await this.initialize();
    this.refreshExpiryState();
    return this.record.connectionState === 'CONNECTED'
      ? this.record.tokens?.access_token
      : undefined;
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    await this.initialize();
    return this.record.clientInformation;
  }

  async saveClientInformation(info: OAuthClientInformationMixed): Promise<void> {
    await this.initialize();
    this.record.clientInformation = structuredClone(info);
    await this.persist();
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    await this.initialize();
    this.refreshExpiryState();
    return this.record.connectionState === 'EXPIRED'
      ? undefined
      : this.record.tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await this.initialize();
    const obtainedAt = this.now();
    this.record.tokens = structuredClone(tokens);
    this.record.tokenObtainedAt = obtainedAt;
    this.record.tokenExpiresAt = typeof tokens.expires_in === 'number'
      ? obtainedAt + tokens.expires_in * 1000
      : undefined;
    this.record.connectionState = 'CONNECTED';
    await this.persist();
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    await this.initialize();
    if (authorizationUrl.protocol !== 'https:' || authorizationUrl.hostname !== 'mcp.swiggy.com') {
      throw new Error('Refusing an unexpected Swiggy authorization URL.');
    }
    this.record.authorizationUrl = authorizationUrl.toString();
    this.record.connectionState = 'CONNECTING';
    await this.persist();
  }

  async state(): Promise<string> {
    await this.initialize();
    if (!this.record.oauthState) {
      this.record.oauthState = newState();
      await this.persist();
    }
    return this.record.oauthState;
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await this.initialize();
    this.record.codeVerifier = codeVerifier;
    await this.persist();
  }

  async codeVerifier(): Promise<string> {
    await this.initialize();
    if (!this.record.codeVerifier) {
      throw new Error('Swiggy PKCE verifier is missing. Start the connection again.');
    }
    return this.record.codeVerifier;
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    await this.initialize();
    this.record.discoveryState = structuredClone(state);
    await this.persist();
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    await this.initialize();
    return this.record.discoveryState;
  }

  async invalidateCredentials(
    scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery',
  ): Promise<void> {
    await this.initialize();
    if (scope === 'all' || scope === 'tokens') {
      this.record.tokens = undefined;
      this.record.tokenObtainedAt = undefined;
      this.record.tokenExpiresAt = undefined;
      this.record.connectionState = 'RECONNECT_REQUIRED';
    }
    if (scope === 'all' || scope === 'client') this.record.clientInformation = undefined;
    if (scope === 'all' || scope === 'verifier') this.record.codeVerifier = undefined;
    if (scope === 'all' || scope === 'discovery') this.record.discoveryState = undefined;
    await this.persist();
  }

  private refreshExpiryState(): void {
    if (
      this.record.tokens?.access_token
      && this.record.tokenExpiresAt
      && this.now() >= this.record.tokenExpiresAt - EXPIRY_SKEW_MS
    ) {
      this.record.connectionState = 'EXPIRED';
    } else if (this.record.tokens?.access_token && this.record.connectionState === 'DISCONNECTED') {
      this.record.connectionState = 'CONNECTED';
    }
  }

  private async persist(): Promise<void> {
    await this.credentialStore.save(this.record);
  }
}
