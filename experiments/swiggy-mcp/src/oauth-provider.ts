/**
 * OAuth 2.1 + PKCE provider skeleton for Swiggy MCP.
 *
 * Verified facts (https://mcp.swiggy.com/builders/docs/start/authenticate/):
 *   - OAuth 2.1 with PKCE, S256. "There is no static API key."
 *   - GET  /auth/authorize  - user lands on Swiggy's consent UI (phone + OTP)
 *   - POST /auth/token      - exchange authorization code
 *   - POST /auth/register   - Dynamic Client Registration (RFC 7591)
 *   - POST /auth/logout     - revoke session
 *   - Code verifier: 32 random bytes, base64url. Challenge: SHA-256.
 *   - Scopes: mcp:tools, mcp:resources, mcp:prompts (server-level, not read/write-split)
 *   - Access token 5 days; session 30 days idle sliding; auth code 120s single-use
 *   - On 401: re-run OAuth. NEVER retry with the same token.
 *
 * SECURITY: tokens are held in memory by default. Optional file persistence is
 * dev-only, opt-in, gitignored, and written with mode 0600.
 *
 * The OTP is entered by the user on Swiggy's own consent page. This code never
 * sees, requests, or stores an OTP — matching Thuna's first safety invariant.
 *
 * This implements the shape of `OAuthClientProvider` from @modelcontextprotocol/sdk
 * without importing it, so the file typechecks with or without the SDK installed.
 */

import { createHash, randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { maskSecret } from './redact.ts';

export interface OAuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  /** Local bookkeeping: epoch ms when this token was obtained. */
  obtained_at?: number;
}

export interface OAuthClientInformation {
  client_id: string;
  client_secret?: string;
}

export interface PkcePair {
  verifier: string;
  challenge: string;
  method: 'S256';
}

/** Swiggy's documented scopes. Note: there is no read-only scope. */
export const SWIGGY_SCOPES = ['mcp:tools', 'mcp:resources', 'mcp:prompts'] as const;

/**
 * PKCE per the official spec: verifier is 32 random bytes base64url-encoded,
 * challenge is the SHA-256 of the verifier, method S256.
 */
export function createPkcePair(): PkcePair {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge, method: 'S256' };
}

/** Access tokens live 5 days; treat as expired a little early to avoid races. */
const EXPIRY_SKEW_MS = 5 * 60 * 1000;

export function isTokenExpired(tokens: OAuthTokens | undefined): boolean {
  if (!tokens?.access_token) return true;
  if (!tokens.expires_in || !tokens.obtained_at) return false; // unknown → assume usable
  return Date.now() >= tokens.obtained_at + tokens.expires_in * 1000 - EXPIRY_SKEW_MS;
}

/**
 * In-memory token store with optional dev-only file persistence.
 *
 * Swiggy's rule: store tokens "in memory or secure OS storage"; never log to disk
 * in plaintext. File persistence here exists purely so a developer need not redo
 * the browser flow on every probe run. It is off unless SWIGGY_TOKEN_FILE is set.
 */
export class TokenStore {
  private tokens: OAuthTokens | undefined;
  private clientInfo: OAuthClientInformation | undefined;
  private verifier: string | undefined;

  private readonly filePath?: string;

  constructor(filePath?: string) {
    this.filePath = filePath;
  }

  getTokens(): OAuthTokens | undefined {
    return this.tokens;
  }

  async setTokens(tokens: OAuthTokens): Promise<void> {
    this.tokens = { ...tokens, obtained_at: tokens.obtained_at ?? Date.now() };
    await this.persist();
  }

  getClientInformation(): OAuthClientInformation | undefined {
    return this.clientInfo;
  }

  async setClientInformation(info: OAuthClientInformation): Promise<void> {
    this.clientInfo = info;
    await this.persist();
  }

  getCodeVerifier(): string | undefined {
    return this.verifier;
  }

  setCodeVerifier(v: string): void {
    // Deliberately NOT persisted: the verifier is single-use and short-lived (120s window).
    this.verifier = v;
  }

  clear(): void {
    this.tokens = undefined;
    this.verifier = undefined;
  }

  /** Load a previously cached token, if file persistence is enabled. */
  async load(): Promise<void> {
    if (!this.filePath) return;
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as {
        tokens?: OAuthTokens;
        clientInfo?: OAuthClientInformation;
      };
      this.tokens = parsed.tokens;
      this.clientInfo = parsed.clientInfo;
    } catch {
      // Absent or unreadable cache is not an error — we simply re-authorise.
    }
  }

  private async persist(): Promise<void> {
    if (!this.filePath) return; // memory-only: the default and the safe path
    const payload = JSON.stringify(
      { tokens: this.tokens, clientInfo: this.clientInfo },
      null,
      2,
    );
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, payload, { encoding: 'utf8', mode: 0o600 });
    await chmod(this.filePath, 0o600); // enforce even if the file pre-existed
  }

  /** Safe one-line description for logs. Never prints the token. */
  describe(): string {
    if (!this.tokens?.access_token) return 'no token';
    const expiry =
      this.tokens.expires_in && this.tokens.obtained_at
        ? new Date(this.tokens.obtained_at + this.tokens.expires_in * 1000).toISOString()
        : 'unknown';
    return `token ${maskSecret(this.tokens.access_token)} (expires ${expiry})`;
  }
}

/**
 * Swiggy OAuth endpoints, derived from the documented base.
 */
export function swiggyAuthEndpoints(authBase: string) {
  const base = authBase.replace(/\/+$/, '');
  return {
    authorize: `${base}/auth/authorize`,
    token: `${base}/auth/token`,
    register: `${base}/auth/register`,
    logout: `${base}/auth/logout`,
    /** SDKs with native authProvider support discover metadata here. */
    protectedResourceMetadata: `${base}/.well-known/oauth-protected-resource`,
  };
}

/**
 * Build the authorization URL the user must open in a browser.
 * They complete phone + OTP on Swiggy's consent UI — never in this process.
 */
export function buildAuthorizationUrl(opts: {
  authBase: string;
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
  scopes?: readonly string[];
}): string {
  const { authorize } = swiggyAuthEndpoints(opts.authBase);
  const url = new URL(authorize);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', opts.clientId);
  url.searchParams.set('redirect_uri', opts.redirectUri);
  url.searchParams.set('code_challenge', opts.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', opts.state);
  url.searchParams.set('scope', (opts.scopes ?? SWIGGY_SCOPES).join(' '));
  return url.toString();
}

/**
 * OAuthClientProvider-shaped object for the MCP SDK's StreamableHTTPClientTransport.
 *
 * The SDK drives PKCE itself when given a provider of this shape; we supply storage
 * and the redirect behaviour.
 */
export class SwiggyOAuthProvider {
  readonly store: TokenStore;
  private readonly opts: {
    authBase: string;
    redirectUri: string;
    clientId?: string;
    clientSecret?: string;
    tokenFile?: string;
    /** Called with the URL the user must visit. Default: print it. */
    onRedirect?: (url: URL) => void | Promise<void>;
  };

  constructor(opts: {
    authBase: string;
    redirectUri: string;
    clientId?: string;
    clientSecret?: string;
    tokenFile?: string;
    onRedirect?: (url: URL) => void | Promise<void>;
  }) {
    this.opts = opts;
    this.store = new TokenStore(opts.tokenFile);
  }

  get redirectUrl(): string {
    return this.opts.redirectUri;
  }

  /** RFC 7591 dynamic registration metadata, used when no client_id is configured. */
  get clientMetadata() {
    return {
      client_name: 'Thuna Swiggy MCP Probe (read-only)',
      redirect_uris: [this.opts.redirectUri],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none' as const, // public client + PKCE
      scope: SWIGGY_SCOPES.join(' '),
    };
  }

  clientInformation(): OAuthClientInformation | undefined {
    if (this.opts.clientId) {
      return { client_id: this.opts.clientId, client_secret: this.opts.clientSecret };
    }
    return this.store.getClientInformation();
  }

  async saveClientInformation(info: OAuthClientInformation): Promise<void> {
    await this.store.setClientInformation(info);
  }

  tokens(): OAuthTokens | undefined {
    return this.store.getTokens();
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await this.store.setTokens(tokens);
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    if (this.opts.onRedirect) {
      await this.opts.onRedirect(authorizationUrl);
      return;
    }
    // Default: never auto-open a browser silently. Print and let the human decide.
    console.log('\n  Open this URL to authorise (phone + OTP happens on Swiggy\'s page):\n');
    console.log(`  ${authorizationUrl.toString()}\n`);
  }

  saveCodeVerifier(verifier: string): void {
    this.store.setCodeVerifier(verifier);
  }

  codeVerifier(): string {
    const v = this.store.getCodeVerifier();
    if (!v) throw new Error('No PKCE code verifier in this session — restart the OAuth flow.');
    return v;
  }

  /**
   * 401 handling. Swiggy: "Re-run the OAuth flow. Never retry with the same token."
   */
  async invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier'): Promise<void> {
    if (scope === 'all' || scope === 'tokens') this.store.clear();
  }
}
