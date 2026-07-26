/**
 * Guarded Swiggy MCP client.
 *
 * Wraps the official MCP SDK's Client + StreamableHTTPClientTransport
 * ("Streamable HTTP transport - one URL per server, standard JSON-RPC").
 *
 * Every tool call passes through `assertToolAllowed` FIRST. The gate is the point
 * of this file: Swiggy's scopes cannot express read-only, so we enforce it here.
 *
 * The SDK is imported dynamically so that `npm run typecheck` and the unit tests
 * (which exercise safety/redaction logic) work without network or node_modules.
 */

import type { ProbeConfig } from './config.ts';
import { assertToolAllowed, type GatePolicy } from './safety.ts';
import { safeStringify } from './redact.ts';
import type { SwiggyOAuthProvider } from './oauth-provider.ts';

/** Uniform Swiggy envelope. Verified: identical across all documented tools. */
export interface SwiggyEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { message: string };
}

export interface ToolCallOutcome<T = unknown> {
  toolName: string;
  ok: boolean;
  envelope?: SwiggyEnvelope<T>;
  /** Raw MCP content when the envelope could not be parsed. */
  raw?: unknown;
  latencyMs: number;
  errorClass?: ErrorClass;
  errorMessage?: string;
}

/**
 * Official error taxonomy.
 * https://mcp.swiggy.com/builders/docs/reference/errors/
 */
export type ErrorClass =
  | 'auth'            // HTTP 401 / JSON-RPC -32001 → re-run OAuth, never reuse token
  | 'bad_input'       // HTTP 400 "Invalid…"/"Missing…" → fix args, do NOT retry
  | 'upstream_timeout'// HTTP 504 / "timeout" → backoff, max 5
  | 'upstream_error'  // HTTP 502/503 → backoff, max 5
  | 'domain_failure'  // HTTP 200 + success:false → terminal, surface to user
  | 'internal'        // HTTP 500 / -32603 → backoff once, report_error
  | 'rate_limited'    // HTTP 429 (planned; not emitted today)
  | 'blocked'         // our own gate refused the call
  | 'unknown';

export function classifyError(err: unknown): ErrorClass {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  // JSON-RPC codes surface on the error object in the SDK.
  const code = (err as { code?: number })?.code;
  if (code === -32001) return 'auth';
  if (code === -32603) return 'internal';

  if (/\b401\b|unauthenticated|unauthorized|token_expired/i.test(msg)) return 'auth';
  if (/\b429\b|rate.?limit/i.test(msg)) return 'rate_limited';
  if (/\b504\b/.test(msg) || lower.includes('timeout')) return 'upstream_timeout';
  if (/\b50[23]\b/.test(msg)) return 'upstream_error';
  if (/\b500\b/.test(msg)) return 'internal';
  if (/\b400\b/.test(msg) || /^(invalid|missing)/i.test(msg)) return 'bad_input';
  return 'unknown';
}

/** Retry ladder: "500, 1000, 2000, 4000" ms, cap 5 retries, 30s wall-clock budget. */
const BACKOFF_MS = [500, 1000, 2000, 4000, 8000] as const;
const RETRY_BUDGET_MS = 30_000;

function retryable(cls: ErrorClass): boolean {
  return cls === 'upstream_timeout' || cls === 'upstream_error' || cls === 'rate_limited';
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class SwiggyMcpClient {
  // Typed loosely: the SDK is resolved at runtime.
  private client: { callTool: Function; listTools: Function; connect: Function; close: Function } | undefined;
  private transport: unknown;

  private readonly cfg: ProbeConfig;
  private readonly auth: SwiggyOAuthProvider;
  private readonly policy: GatePolicy;

  constructor(cfg: ProbeConfig, auth: SwiggyOAuthProvider, policy: GatePolicy) {
    this.cfg = cfg;
    this.auth = auth;
    this.policy = policy;
  }

  async connect(): Promise<void> {
    // Dynamic + loosely typed so this file typechecks before `npm install`.
    const sdkClient = '@modelcontextprotocol/sdk/client/index.js';
    const sdkHttp = '@modelcontextprotocol/sdk/client/streamableHttp.js';

    const { Client } = (await import(/* @vite-ignore */ sdkClient)) as {
      Client: new (info: unknown, opts: unknown) => Record<string, Function>;
    };
    const { StreamableHTTPClientTransport } = (await import(/* @vite-ignore */ sdkHttp)) as {
      StreamableHTTPClientTransport: new (url: URL, opts: unknown) => unknown;
    };

    this.transport = new StreamableHTTPClientTransport(new URL(this.cfg.serverUrl), {
      authProvider: this.auth,
    });

    this.client = new Client(
      { name: 'thuna-swiggy-probe', version: '0.1.0' },
      { capabilities: {} },
    ) as unknown as SwiggyMcpClient['client'];

    await (this.client as unknown as { connect: (t: unknown) => Promise<void> }).connect(this.transport);
  }

  async close(): Promise<void> {
    try {
      await (this.client as any)?.close?.();
    } catch {
      /* closing is best-effort */
    }
  }

  /** Tool discovery — proves auth + transport without touching any data. */
  async listTools(): Promise<Array<{ name: string; description?: string }>> {
    if (!this.client) throw new Error('Not connected. Call connect() first.');
    const res = (await (this.client as any).listTools()) as {
      tools?: Array<{ name: string; description?: string }>;
    };
    return res.tools ?? [];
  }

  /**
   * Gated tool call with the documented retry policy.
   *
   * Order-placing tools are NEVER retried here regardless of error class — they are
   * non-idempotent and require the check-then-retry reconciliation procedure, which
   * is a deliberate caller-level decision, not something a client wrapper should
   * perform silently.
   */
  async callTool<T = unknown>(
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<ToolCallOutcome<T>> {
    // GATE FIRST — before any network activity.
    try {
      assertToolAllowed(toolName, this.policy);
    } catch (e) {
      return {
        toolName,
        ok: false,
        latencyMs: 0,
        errorClass: 'blocked',
        errorMessage: e instanceof Error ? e.message : String(e),
      };
    }

    if (!this.client) throw new Error('Not connected. Call connect() first.');

    const isOrderTool = toolName === 'place_food_order' || toolName === 'checkout' || toolName === 'book_table';
    const started = Date.now();
    let attempt = 0;
    let lastErr: unknown;

    while (attempt <= BACKOFF_MS.length) {
      try {
        const res = await (this.client as any).callTool({ name: toolName, arguments: args });
        const envelope = extractEnvelope<T>(res);
        const latencyMs = Date.now() - started;

        if (envelope && envelope.success === false) {
          // HTTP 200 + success:false → domain failure. Terminal. Do not retry.
          return {
            toolName,
            ok: false,
            envelope,
            latencyMs,
            errorClass: 'domain_failure',
            errorMessage: envelope.error?.message ?? envelope.message ?? 'domain failure',
          };
        }

        return { toolName, ok: true, envelope, raw: envelope ? undefined : res, latencyMs };
      } catch (err) {
        lastErr = err;
        const cls = classifyError(err);

        if (cls === 'auth') {
          await this.auth.invalidateCredentials('tokens');
          return {
            toolName,
            ok: false,
            latencyMs: Date.now() - started,
            errorClass: 'auth',
            errorMessage:
              'Authentication failed (401 / -32001). Tokens cleared. Re-run the OAuth flow — ' +
              'never retry with the same token.',
          };
        }

        // Never auto-retry a non-idempotent order tool.
        if (isOrderTool) {
          return {
            toolName,
            ok: false,
            latencyMs: Date.now() - started,
            errorClass: cls,
            errorMessage:
              `"${toolName}" failed with a ${cls} error and is NOT idempotent. ` +
              `Do NOT retry blindly. Wait 2-5s, then call the order-history tool ` +
              `(get_food_orders / get_orders / get_booking_status) to determine whether the ` +
              `order actually went through.`,
          };
        }

        if (!retryable(cls) || Date.now() - started > RETRY_BUDGET_MS || attempt >= BACKOFF_MS.length) {
          return {
            toolName,
            ok: false,
            latencyMs: Date.now() - started,
            errorClass: cls,
            errorMessage: err instanceof Error ? err.message : String(err),
          };
        }

        const wait = BACKOFF_MS[attempt] ?? 8000;
        const jitter = Math.floor(wait * 0.2 * Math.random());
        await sleep(wait + jitter);
        attempt++;
      }
    }

    return {
      toolName,
      ok: false,
      latencyMs: Date.now() - started,
      errorClass: classifyError(lastErr),
      errorMessage: lastErr instanceof Error ? lastErr.message : String(lastErr),
    };
  }
}

/**
 * Pull the Swiggy envelope out of an MCP tool result.
 * MCP wraps results in a content array; Swiggy puts its JSON envelope in a text block.
 */
export function extractEnvelope<T = unknown>(res: unknown): SwiggyEnvelope<T> | undefined {
  const content = (res as { content?: Array<{ type?: string; text?: string }> })?.content;
  if (!Array.isArray(content)) return undefined;

  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string') {
      try {
        const parsed = JSON.parse(block.text) as SwiggyEnvelope<T>;
        if (parsed && typeof parsed === 'object' && 'success' in parsed) return parsed;
      } catch {
        // Not JSON — try the next block.
      }
    }
  }
  return undefined;
}

/** Redacted one-line summary of an outcome, safe for stdout. */
export function summarise(outcome: ToolCallOutcome): string {
  const status = outcome.ok ? 'OK ' : 'FAIL';
  const cls = outcome.errorClass ? ` [${outcome.errorClass}]` : '';
  return `  ${status} ${outcome.toolName} (${outcome.latencyMs}ms)${cls}` +
    (outcome.errorMessage ? `\n       ${outcome.errorMessage}` : '');
}

export { safeStringify };
