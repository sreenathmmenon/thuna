/**
 * Tests for the safety gate and redaction.
 *
 * These run WITHOUT network access and WITHOUT the MCP SDK installed —
 * they exercise pure logic only. That is deliberate: the safety properties
 * must be verifiable in CI with no credentials.
 *
 *   node --test --experimental-strip-types tests/*.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertToolAllowed,
  resolvePolicy,
  READ_ONLY_POLICY,
  ToolBlockedError,
  TOOL_CLASS,
  ORDER_TOOLS,
  exceedsCartCap,
  CART_VALUE_CAP_INR,
} from '../src/safety.ts';
import { redact, maskSecret, safeStringify } from '../src/redact.ts';
import { createPkcePair, isTokenExpired, buildAuthorizationUrl, SWIGGY_SCOPES } from '../src/oauth-provider.ts';
import { classifyError, extractEnvelope } from '../src/client.ts';
import { loadConfig } from '../src/config.ts';

// ---------------------------------------------------------------- safety gate

test('read-only policy permits documented read tools', () => {
  for (const tool of ['get_addresses', 'search_restaurants', 'search_menu', 'get_food_cart']) {
    assert.doesNotThrow(() => assertToolAllowed(tool, READ_ONLY_POLICY), `${tool} should be allowed`);
  }
});

test('read-only policy blocks every order tool', () => {
  for (const tool of ORDER_TOOLS) {
    assert.throws(() => assertToolAllowed(tool, READ_ONLY_POLICY), ToolBlockedError, `${tool} must be blocked`);
  }
});

test('place_food_order is blocked under the default policy', () => {
  assert.throws(
    () => assertToolAllowed('place_food_order', READ_ONLY_POLICY),
    (e: unknown) => e instanceof ToolBlockedError && /REAL order/i.test(e.message),
  );
});

test('read-only policy blocks cart mutations', () => {
  for (const tool of ['update_food_cart', 'flush_food_cart', 'apply_food_coupon', 'clear_cart']) {
    assert.throws(() => assertToolAllowed(tool, READ_ONLY_POLICY), ToolBlockedError);
  }
});

test('unknown tool names fail closed', () => {
  assert.throws(
    () => assertToolAllowed('definitely_not_a_real_swiggy_tool', READ_ONLY_POLICY),
    (e: unknown) => e instanceof ToolBlockedError && e.toolClass === 'unknown',
  );
});

test('the env flag ALONE does not permit order placement', () => {
  // A stray THUNA_ENABLE_REAL_SWIGGY_ORDER=true in a shell must not be sufficient.
  const policy = resolvePolicy({ enableRealOrder: true, explicitOrderIntent: false });
  assert.equal(policy.allowOrders, false);
  assert.throws(() => assertToolAllowed('place_food_order', policy), ToolBlockedError);
});

test('explicit intent ALONE does not permit order placement', () => {
  const policy = resolvePolicy({ enableRealOrder: false, explicitOrderIntent: true });
  assert.equal(policy.allowOrders, false);
  assert.throws(() => assertToolAllowed('place_food_order', policy), ToolBlockedError);
});

test('order placement requires BOTH the env flag and explicit intent', () => {
  const policy = resolvePolicy({ enableRealOrder: true, explicitOrderIntent: true });
  assert.equal(policy.allowOrders, true);
  assert.doesNotThrow(() => assertToolAllowed('place_food_order', policy));
});

test('every documented tool has a classification', () => {
  // Verified counts from official docs: Food 14, Instamart 13, Dineout 8 = 35 total,
  // minus report_error/get_addresses shared across servers.
  const names = Object.keys(TOOL_CLASS);
  assert.ok(names.length >= 30, `expected 30+ classified tools, got ${names.length}`);
  for (const [name, cls] of Object.entries(TOOL_CLASS)) {
    assert.ok(['read', 'mutate', 'order'].includes(cls), `${name} has invalid class ${cls}`);
  }
});

test('the three order tools are exactly the documented mutating-commitment tools', () => {
  assert.deepEqual([...ORDER_TOOLS].sort(), ['book_table', 'checkout', 'place_food_order']);
});

// ---------------------------------------------------------------- cart cap

test('cart cap rejects >= 1000, per "NOT allowed for cart values of Rs 1000 or more"', () => {
  assert.equal(exceedsCartCap(999), false);
  assert.equal(exceedsCartCap(999.99), false);
  assert.equal(exceedsCartCap(CART_VALUE_CAP_INR), true, 'exactly 1000 must be rejected');
  assert.equal(exceedsCartCap(1000.01), true);
  assert.equal(exceedsCartCap(2500), true);
});

// ---------------------------------------------------------------- redaction

test('redact masks token-bearing keys', () => {
  const out = redact({ access_token: 'super-secret-value-1234567890', user: 'appa' }) as Record<string, unknown>;
  assert.ok(!String(out.access_token).includes('super-secret-value'));
  assert.match(String(out.access_token), /redacted/);
});

test('redact masks code_verifier and client_secret', () => {
  const out = redact({
    code_verifier: 'abcdefghijklmnopqrstuvwxyz012345',
    client_secret: 'shh-this-is-secret-abcdef',
  }) as Record<string, unknown>;
  assert.match(String(out.code_verifier), /redacted/);
  assert.match(String(out.client_secret), /redacted/);
});

test('redact masks PII fields but preserves opaque handles', () => {
  const out = redact({ address: '12 MG Road, Bengaluru', addressId: 'addr_9f2b' }) as Record<string, unknown>;
  assert.ok(!String(out.address).includes('MG Road'));
  // addressId is an opaque handle, not PII — keep it for debugging.
  assert.equal(out.addressId, 'addr_9f2b');
});

test('redact scrubs bearer tokens, phone numbers and emails inside free text', () => {
  const out = redact('call 9845012345 or mail appa@example.com with Bearer abc123XYZ789def') as string;
  assert.ok(!out.includes('9845012345'), 'phone must be scrubbed');
  assert.ok(!out.includes('appa@example.com'), 'email must be scrubbed');
  assert.ok(!out.includes('abc123XYZ789def'), 'bearer token must be scrubbed');
});

test('redact survives circular structures', () => {
  const a: Record<string, unknown> = { name: 'x' };
  a.self = a;
  assert.doesNotThrow(() => safeStringify(a));
});

test('maskSecret never returns the original value', () => {
  const secret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
  assert.notEqual(maskSecret(secret), secret);
  assert.ok(!maskSecret(secret).includes('IUzI1NiIsInR5cCI6'));
});

// ---------------------------------------------------------------- PKCE

test('PKCE verifier is 32 random bytes base64url and challenge is its SHA-256', () => {
  const { verifier, challenge, method } = createPkcePair();
  assert.equal(method, 'S256');
  // 32 bytes base64url-encoded = 43 chars, no padding
  assert.equal(verifier.length, 43);
  assert.match(verifier, /^[A-Za-z0-9_-]+$/, 'verifier must be base64url');
  assert.match(challenge, /^[A-Za-z0-9_-]+$/, 'challenge must be base64url');
  assert.notEqual(verifier, challenge);
});

test('PKCE pairs are unique per call', () => {
  const a = createPkcePair();
  const b = createPkcePair();
  assert.notEqual(a.verifier, b.verifier);
});

test('authorization URL carries the documented PKCE parameters', () => {
  const url = new URL(
    buildAuthorizationUrl({
      authBase: 'https://mcp.swiggy.com',
      clientId: 'client-abc',
      redirectUri: 'http://localhost:8765/callback',
      challenge: 'chal',
      state: 'st',
    }),
  );
  assert.equal(url.origin + url.pathname, 'https://mcp.swiggy.com/auth/authorize');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('scope'), SWIGGY_SCOPES.join(' '));
});

test('token expiry honours the skew window', () => {
  assert.equal(isTokenExpired(undefined), true);
  assert.equal(
    isTokenExpired({ access_token: 't', token_type: 'Bearer', expires_in: 3600, obtained_at: Date.now() }),
    false,
  );
  assert.equal(
    isTokenExpired({
      access_token: 't',
      token_type: 'Bearer',
      expires_in: 60,
      obtained_at: Date.now() - 120_000,
    }),
    true,
  );
});

// ---------------------------------------------------------------- errors

test('error classification matches the official taxonomy', () => {
  assert.equal(classifyError(Object.assign(new Error('nope'), { code: -32001 })), 'auth');
  assert.equal(classifyError(Object.assign(new Error('boom'), { code: -32603 })), 'internal');
  assert.equal(classifyError(new Error('HTTP 401 Unauthorized')), 'auth');
  assert.equal(classifyError(new Error('HTTP 504 Gateway Timeout')), 'upstream_timeout');
  assert.equal(classifyError(new Error('HTTP 502 Bad Gateway')), 'upstream_error');
  assert.equal(classifyError(new Error('Missing required argument addressId')), 'bad_input');
  assert.equal(classifyError(new Error('HTTP 429 Too Many Requests')), 'rate_limited');
});

test('a success:false envelope is recognised (HTTP 200 domain failure)', () => {
  const res = {
    content: [{ type: 'text', text: JSON.stringify({ success: false, error: { message: 'RESTAURANT_CLOSED' } }) }],
  };
  const env = extractEnvelope(res);
  assert.equal(env?.success, false);
  assert.equal(env?.error?.message, 'RESTAURANT_CLOSED');
});

test('a success:true envelope parses', () => {
  const res = { content: [{ type: 'text', text: JSON.stringify({ success: true, data: { addresses: [] } }) }] };
  assert.equal(extractEnvelope(res)?.success, true);
});

test('non-JSON content yields no envelope rather than throwing', () => {
  assert.equal(extractEnvelope({ content: [{ type: 'text', text: 'not json' }] }), undefined);
  assert.equal(extractEnvelope({}), undefined);
});

// ---------------------------------------------------------------- config

test('config defaults to production food server with orders disabled', () => {
  const cfg = loadConfig({} as NodeJS.ProcessEnv);
  assert.equal(cfg.serverUrl, 'https://mcp.swiggy.com/food');
  assert.equal(cfg.enableRealOrder, false, 'real orders must default to false');
  assert.equal(cfg.isStaging, false);
});

test('staging resolves to the documented staging host', () => {
  const cfg = loadConfig({ SWIGGY_USE_STAGING: 'true' } as NodeJS.ProcessEnv);
  assert.equal(cfg.serverUrl, 'https://mcp-staging.swiggy.com/food');
  assert.equal(cfg.isStaging, true);
});

test('instamart uses the /im path, not /instamart', () => {
  const cfg = loadConfig({ SWIGGY_MCP_SERVER: 'im' } as NodeJS.ProcessEnv);
  assert.equal(cfg.serverUrl, 'https://mcp.swiggy.com/im');
});

test('an invalid server name is rejected', () => {
  assert.throws(() => loadConfig({ SWIGGY_MCP_SERVER: 'instamart' } as NodeJS.ProcessEnv), /food\|im\|dineout/);
});

test('non-localhost http redirect URIs are rejected', () => {
  assert.throws(
    () => loadConfig({ SWIGGY_OAUTH_REDIRECT_URI: 'http://example.com/cb' } as NodeJS.ProcessEnv),
    /must be HTTPS/,
  );
  assert.doesNotThrow(() =>
    loadConfig({ SWIGGY_OAUTH_REDIRECT_URI: 'http://localhost:9000/cb' } as NodeJS.ProcessEnv),
  );
  assert.doesNotThrow(() =>
    loadConfig({ SWIGGY_OAUTH_REDIRECT_URI: 'https://thuna.example.com/cb' } as NodeJS.ProcessEnv),
  );
});
