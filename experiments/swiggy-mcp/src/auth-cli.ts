/**
 * Interactive OAuth helper.
 *
 * Runs a one-shot localhost listener to capture the authorization code redirect,
 * then hands control back to the MCP SDK to complete the PKCE exchange.
 *
 * The user completes phone + OTP on SWIGGY'S OWN consent page. This process never
 * sees an OTP, and must never ask for one.
 *
 *   node --experimental-strip-types src/auth-cli.ts
 */

import { createServer } from 'node:http';
import { loadConfig, describeConfig } from './config.ts';
import { SwiggyOAuthProvider, swiggyAuthEndpoints } from './oauth-provider.ts';

/** Wait for a single OAuth redirect on the configured localhost port. */
function awaitAuthorizationCode(port: number, path: string): Promise<{ code: string; state?: string }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      if (url.pathname !== path) {
        res.writeHead(404).end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state') ?? undefined;
      const error = url.searchParams.get('error');

      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(
        error
          ? `<h1>Authorisation failed</h1><p>${escapeHtml(error)}</p><p>You can close this tab.</p>`
          : `<h1>Authorised</h1><p>You can close this tab and return to the terminal.</p>`,
      );

      server.close();
      if (error) reject(new Error(`Authorization failed: ${error}`));
      else if (!code) reject(new Error('No authorization code in redirect.'));
      else resolve({ code, state });
    });

    server.on('error', reject);
    server.listen(port, () => {
      console.log(`  Listening for the OAuth redirect on http://localhost:${port}${path}`);
    });

    // The authorization code is valid for 120 seconds; give the human a little longer
    // to complete phone + OTP, but do not hang forever.
    setTimeout(() => {
      server.close();
      reject(new Error('Timed out waiting for the OAuth redirect (5 minutes).'));
    }, 5 * 60 * 1000).unref();
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  console.log('\nSwiggy MCP — OAuth\n');
  console.log(`  ${describeConfig(cfg)}\n`);

  const endpoints = swiggyAuthEndpoints(cfg.authBase);
  console.log('  Endpoints:');
  console.log(`    authorize : ${endpoints.authorize}`);
  console.log(`    token     : ${endpoints.token}`);
  console.log(`    register  : ${endpoints.register}\n`);

  const redirectPath = new URL(cfg.redirectUri).pathname;

  const provider = new SwiggyOAuthProvider({
    authBase: cfg.authBase,
    redirectUri: cfg.redirectUri,
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    tokenFile: cfg.tokenFile,
    onRedirect: async (url) => {
      console.log('  Open this URL in your browser to authorise:\n');
      console.log(`    ${url.toString()}\n`);
      console.log('  You will verify with phone + OTP on Swiggy\'s own consent page.');
      console.log('  Thuna never sees, asks for, or stores that OTP.\n');
    },
  });
  await provider.store.load();

  if (provider.tokens()?.access_token) {
    console.log(`  Existing credential found: ${provider.store.describe()}`);
    console.log('  Delete the token file or unset SWIGGY_TOKEN_FILE to force re-authorisation.\n');
    return;
  }

  // The MCP SDK drives the PKCE dance; we only need to capture the redirect.
  // Imported dynamically (and loosely typed) so this file typechecks before `npm install`.
  let auth: (provider: unknown, opts: Record<string, unknown>) => Promise<string>;
  try {
    const sdkAuth = '@modelcontextprotocol/sdk/client/auth.js';
    const mod = (await import(/* @vite-ignore */ sdkAuth)) as {
      auth: (provider: unknown, opts: Record<string, unknown>) => Promise<string>;
    };
    auth = mod.auth;
  } catch {
    console.error(
      '  The MCP SDK is not installed. Run `npm install` in experiments/swiggy-mcp first.\n',
    );
    process.exitCode = 1;
    return;
  }

  const codePromise = awaitAuthorizationCode(cfg.callbackPort, redirectPath);

  // First call triggers registration (if needed) + redirect.
  const result = await auth(provider, { serverUrl: cfg.serverUrl });
  if (result === 'AUTHORIZED') {
    console.log(`\n  Already authorised: ${provider.store.describe()}\n`);
    return;
  }

  const { code } = await codePromise;
  console.log('  Authorization code received. Exchanging for a token…');

  // Second call completes the exchange using the stored PKCE verifier.
  const finished = await auth(provider, {
    serverUrl: cfg.serverUrl,
    authorizationCode: code,
  });

  if (finished === 'AUTHORIZED') {
    console.log(`\n  Authorised. ${provider.store.describe()}`);
    console.log(
      cfg.tokenFile
        ? `  Cached to ${cfg.tokenFile} (mode 0600, gitignored).\n`
        : '  Token held in memory only — it will not survive this process.\n' +
          '  Set SWIGGY_TOKEN_FILE to cache it for repeated probe runs.\n',
    );
    console.log('  Next: npm run probe\n');
  } else {
    console.error(`\n  OAuth did not complete (state: ${finished}).\n`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`\n  OAuth failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
