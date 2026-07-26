/**
 * Environment configuration for the Swiggy MCP probe.
 *
 * Standalone: imports nothing from Thuna production code.
 *
 * Server URLs are verified from official docs:
 *   https://mcp.swiggy.com/builders/docs/start/what-is-swiggy-mcp/
 */

export type SwiggyServer = 'food' | 'im' | 'dineout';

/** Official production hosts. Instamart's path is `/im`, not `/instamart`. */
const PROD_BASE = 'https://mcp.swiggy.com';

/**
 * Staging: "same shape as production, backed by seeded data (no real orders)."
 * https://mcp.swiggy.com/builders/docs/operate/access/
 *
 * Staging is the correct target for demos and CI. It cannot create a real order.
 */
const STAGING_BASE = 'https://mcp-staging.swiggy.com';

export interface ProbeConfig {
  /** Which Swiggy MCP server to talk to. */
  server: SwiggyServer;
  /** Resolved base host (production or staging). */
  baseUrl: string;
  /** Full server URL, e.g. https://mcp.swiggy.com/food */
  serverUrl: string;
  /** OAuth issuer base — auth endpoints live under this host. */
  authBase: string;
  /** Local redirect URI. Must be exact-match allowlisted with Swiggy. */
  redirectUri: string;
  /** Port parsed from redirectUri, used by the local callback listener. */
  callbackPort: number;
  /** Dynamic Client Registration (RFC 7591) is used when this is absent. */
  clientId?: string;
  /** Optional; Swiggy's flow is public-client PKCE, so normally unset. */
  clientSecret?: string;
  /** Whether we are pointed at staging. */
  isStaging: boolean;
  /**
   * MASTER SAFETY FLAG. Default false.
   * Even when true, place_food_order still requires explicit per-run intent.
   */
  enableRealOrder: boolean;
  /** Optional dev-only token cache path. Opt-in; gitignored; written 0600. */
  tokenFile?: string;
  /** Verbose (still redacted) logging. */
  verbose: boolean;
}

function bool(v: string | undefined, dflt: boolean): boolean {
  if (v === undefined) return dflt;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ProbeConfig {
  const server = (env.SWIGGY_MCP_SERVER ?? 'food').trim() as SwiggyServer;
  if (!['food', 'im', 'dineout'].includes(server)) {
    throw new Error(
      `SWIGGY_MCP_SERVER must be one of food|im|dineout (got "${server}"). ` +
        `Note Instamart uses "im", not "instamart".`,
    );
  }

  const isStaging = bool(env.SWIGGY_USE_STAGING, false);
  const baseUrl = (env.SWIGGY_MCP_BASE_URL ?? (isStaging ? STAGING_BASE : PROD_BASE)).replace(/\/+$/, '');

  const redirectUri = env.SWIGGY_OAUTH_REDIRECT_URI ?? 'http://localhost:8765/callback';
  let callbackPort: number;
  try {
    const u = new URL(redirectUri);
    callbackPort = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
  } catch {
    throw new Error(`SWIGGY_OAUTH_REDIRECT_URI is not a valid URL: "${redirectUri}"`);
  }

  // Swiggy requires HTTPS redirect URIs except for localhost during development.
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(redirectUri);
  if (!redirectUri.startsWith('https://') && !isLocalhost) {
    throw new Error(
      `SWIGGY_OAUTH_REDIRECT_URI must be HTTPS (http:// is only allowed for localhost). Got "${redirectUri}".`,
    );
  }

  return {
    server,
    baseUrl,
    serverUrl: `${baseUrl}/${server}`,
    authBase: baseUrl,
    redirectUri,
    callbackPort,
    clientId: env.SWIGGY_OAUTH_CLIENT_ID?.trim() || undefined,
    clientSecret: env.SWIGGY_OAUTH_CLIENT_SECRET?.trim() || undefined,
    isStaging,
    enableRealOrder: bool(env.THUNA_ENABLE_REAL_SWIGGY_ORDER, false),
    tokenFile: env.SWIGGY_TOKEN_FILE?.trim() || undefined,
    verbose: bool(env.SWIGGY_PROBE_VERBOSE, false),
  };
}

/** Human-readable, non-sensitive summary for startup logging. */
export function describeConfig(cfg: ProbeConfig): string {
  return [
    `server        : ${cfg.server}`,
    `url           : ${cfg.serverUrl}`,
    `environment   : ${cfg.isStaging ? 'STAGING (seeded data, no real orders)' : 'PRODUCTION'}`,
    `redirect      : ${cfg.redirectUri}`,
    `client id     : ${cfg.clientId ? 'from env' : 'dynamic registration (RFC 7591)'}`,
    `real orders   : ${cfg.enableRealOrder ? '!! ENABLED !!' : 'disabled (safe)'}`,
    `token storage : ${cfg.tokenFile ? `${cfg.tokenFile} (0600, gitignored)` : 'memory only'}`,
  ].join('\n  ');
}
