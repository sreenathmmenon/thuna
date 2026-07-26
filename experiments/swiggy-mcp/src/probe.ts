/**
 * Swiggy MCP proof-of-connection probe.
 *
 * READ-ONLY BY DEFAULT. Places no orders. Mutates nothing.
 *
 * Probes, in order:
 *   1. tool discovery      (listTools)          - proves auth + transport
 *   2. get_addresses       (no arguments)       - proves a real authenticated identity
 *   3. search_restaurants  (addressId, query)   - proves real catalogue data
 *   4. search_menu         (addressId, query)   - optional: dish-level detail
 *   5. get_food_cart       (addressId)          - optional: authoritative cart read
 *
 * place_food_order is NEVER called by this script. There is no code path to it.
 *
 *   node --experimental-strip-types src/probe.ts [--only=discover|addresses|restaurants|menu|cart]
 */

import { loadConfig, describeConfig } from './config.ts';
import { SwiggyOAuthProvider } from './oauth-provider.ts';
import { SwiggyMcpClient, summarise, type ToolCallOutcome } from './client.ts';
import { resolvePolicy, TOOL_CLASS, ORDER_TOOLS } from './safety.ts';
import { safeStringify, redact } from './redact.ts';

const QUERY = process.env.SWIGGY_PROBE_QUERY ?? 'dosa';

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split('=').slice(1).join('=');
}

/** Pull the first address id out of an unknown-shaped payload, defensively. */
function findAddressId(data: unknown): string | undefined {
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number): string | undefined => {
    if (depth > 6 || node === null || typeof node !== 'object' || seen.has(node)) return undefined;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return undefined;
    }

    const obj = node as Record<string, unknown>;
    for (const key of ['addressId', 'address_id', 'id']) {
      const v = obj[key];
      if (typeof v === 'string' && v.length > 0) return v;
      if (typeof v === 'number') return String(v);
    }
    for (const v of Object.values(obj)) {
      const found = walk(v, depth + 1);
      if (found) return found;
    }
    return undefined;
  };
  return walk(data, 0);
}

function findRestaurantId(data: unknown): string | undefined {
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number): string | undefined => {
    if (depth > 6 || node === null || typeof node !== 'object' || seen.has(node)) return undefined;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) {
        const f = walk(item, depth + 1);
        if (f) return f;
      }
      return undefined;
    }
    const obj = node as Record<string, unknown>;
    for (const key of ['restaurantId', 'restaurant_id']) {
      const v = obj[key];
      if (typeof v === 'string' && v) return v;
      if (typeof v === 'number') return String(v);
    }
    for (const v of Object.values(obj)) {
      const f = walk(v, depth + 1);
      if (f) return f;
    }
    return undefined;
  };
  return walk(data, 0);
}

async function main(): Promise<void> {
  const only = arg('only');
  const cfg = loadConfig();

  console.log('\n╭─ Swiggy MCP — proof of connection ─────────────────────────╮');
  console.log(`  ${describeConfig(cfg)}`);
  console.log('╰────────────────────────────────────────────────────────────╯\n');

  // Read-only policy: mutations and orders both refused, regardless of token scope.
  const policy = resolvePolicy({
    enableRealOrder: cfg.enableRealOrder,
    allowMutations: false,
    explicitOrderIntent: false, // this script never opts in. By construction.
  });

  console.log('  Safety gate:');
  console.log(`    mutations allowed : ${policy.allowMutations}`);
  console.log(`    orders allowed    : ${policy.allowOrders}`);
  console.log(`    blocked order tools: ${ORDER_TOOLS.join(', ')}`);
  if (cfg.enableRealOrder) {
    console.log(
      '\n  NOTE: THUNA_ENABLE_REAL_SWIGGY_ORDER=true is set, but this probe still refuses\n' +
        '        order placement — it never signals explicit order intent.\n',
    );
  }
  console.log();

  const provider = new SwiggyOAuthProvider({
    authBase: cfg.authBase,
    redirectUri: cfg.redirectUri,
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    tokenFile: cfg.tokenFile,
  });
  await provider.store.load();

  if (!provider.tokens()?.access_token) {
    console.log('  No cached credential found.');
    console.log('  The MCP SDK will start the OAuth flow and print an authorisation URL.');
    console.log('  If you would rather authorise first, run:  npm run auth\n');
  } else {
    console.log(`  Using cached credential: ${provider.store.describe()}\n`);
  }

  const client = new SwiggyMcpClient(cfg, provider, policy);
  const results: ToolCallOutcome[] = [];

  try {
    console.log('  Connecting…');
    await client.connect();
    console.log('  Connected.\n');
  } catch (err) {
    console.error(`  Could not connect: ${err instanceof Error ? err.message : String(err)}`);
    console.error('\n  Most likely causes:');
    console.error('    - OAuth not completed  → run: npm run auth');
    console.error('    - MCP SDK not installed → run: npm install');
    console.error('    - No production access  → apply at https://mcp.swiggy.com/builders/access/');
    console.error('      (or set SWIGGY_USE_STAGING=true if you have staging credentials)\n');
    process.exitCode = 1;
    return;
  }

  // ---- 1. Tool discovery ------------------------------------------------
  if (!only || only === 'discover') {
    console.log('  [1] Tool discovery');
    try {
      const tools = await client.listTools();
      console.log(`      ${tools.length} tools exposed by ${cfg.serverUrl}\n`);
      for (const t of tools) {
        const cls = TOOL_CLASS[t.name] ?? 'UNKNOWN';
        const marker = cls === 'order' ? ' ← BLOCKED' : cls === 'mutate' ? ' ← blocked (read-only run)' : '';
        console.log(`      ${cls.padEnd(7)} ${t.name}${marker}`);
      }
      const undocumented = tools.filter((t) => TOOL_CLASS[t.name] === undefined);
      if (undocumented.length) {
        console.log(
          `\n      ${undocumented.length} tool(s) not in our verified allowlist: ` +
            `${undocumented.map((t) => t.name).join(', ')}\n` +
            '      These fail closed. Read their official reference page before enabling.',
        );
      }
      console.log();
    } catch (err) {
      console.error(`      Discovery failed: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  // ---- 2. get_addresses -------------------------------------------------
  let addressId: string | undefined;
  if (!only || only === 'addresses' || only === 'restaurants' || only === 'menu' || only === 'cart') {
    console.log('  [2] get_addresses  (read-only, no arguments)');
    const out = await client.callTool('get_addresses', {});
    results.push(out);
    console.log(summarise(out));
    if (out.ok && out.envelope?.data) {
      addressId = findAddressId(out.envelope.data);
      console.log(`       parsed addressId: ${addressId ? `${addressId.slice(0, 4)}…` : 'not found'}`);
      if (cfg.verbose) console.log(safeStringify(out.envelope.data));
    }
    console.log();
  }

  const overrideAddress = process.env.SWIGGY_PROBE_ADDRESS_ID;
  if (overrideAddress) addressId = overrideAddress;

  // ---- 3. search_restaurants -------------------------------------------
  let restaurantId: string | undefined;
  if ((!only || only === 'restaurants' || only === 'menu') && addressId) {
    console.log(`  [3] search_restaurants  (addressId, query="${QUERY}")`);
    const out = await client.callTool('search_restaurants', { addressId, query: QUERY });
    results.push(out);
    console.log(summarise(out));
    if (out.ok && out.envelope?.data) {
      restaurantId = findRestaurantId(out.envelope.data);
      console.log(`       parsed restaurantId: ${restaurantId ? `${restaurantId.slice(0, 6)}…` : 'not found'}`);
      if (cfg.verbose) console.log(safeStringify(out.envelope.data));
    }
    console.log();
  } else if (!only && !addressId) {
    console.log('  [3] search_restaurants — skipped (no addressId available)\n');
  }

  // ---- 4. search_menu (optional) ---------------------------------------
  if ((only === 'menu' || (!only && addressId)) && addressId) {
    console.log(`  [4] search_menu  (addressId, query="${QUERY}")`);
    const args: Record<string, unknown> = { addressId, query: QUERY };
    if (restaurantId) args.restaurantIdOfAddedItem = restaurantId;
    const out = await client.callTool('search_menu', args);
    results.push(out);
    console.log(summarise(out));
    if (out.ok && cfg.verbose && out.envelope?.data) console.log(safeStringify(out.envelope.data));
    console.log();
  }

  // ---- 5. get_food_cart (optional, read-only) --------------------------
  if ((only === 'cart' || (!only && addressId)) && addressId) {
    console.log('  [5] get_food_cart  (authoritative cart read — read-only)');
    const out = await client.callTool('get_food_cart', { addressId });
    results.push(out);
    console.log(summarise(out));
    if (out.ok && out.envelope?.data) {
      console.log('       Note: this is the ONLY trustworthy source of cart total.');
      console.log('       Never read back a locally computed total to a user.');
      if (cfg.verbose) console.log(safeStringify(out.envelope.data));
    }
    console.log();
  }

  // ---- 6. Prove the gate actually blocks -------------------------------
  console.log('  [6] Safety gate verification (attempting a blocked call)');
  const blocked = await client.callTool('place_food_order', { addressId: addressId ?? 'x' });
  console.log(summarise(blocked));
  if (blocked.errorClass !== 'blocked') {
    console.error('\n      !! GATE FAILURE: place_food_order was not blocked. Investigate before proceeding.\n');
    process.exitCode = 1;
  } else {
    console.log('       Gate holds — no order can be placed by this probe.\n');
  }

  await client.close();

  // ---- Summary ----------------------------------------------------------
  const okCount = results.filter((r) => r.ok).length;
  console.log('╭─ Result ───────────────────────────────────────────────────╮');
  console.log(`  probes run     : ${results.length}`);
  console.log(`  succeeded      : ${okCount}`);
  console.log(`  failed         : ${results.length - okCount}`);
  console.log(`  orders placed  : 0  (structurally impossible in this script)`);
  console.log('╰────────────────────────────────────────────────────────────╯\n');

  if (results.length > 0 && okCount === 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\n  Probe failed: ${err instanceof Error ? err.message : String(err)}\n`);
  if (process.env.SWIGGY_PROBE_VERBOSE) console.error(redact(err));
  process.exitCode = 1;
});
