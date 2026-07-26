/**
 * Redaction for all probe logging.
 *
 * Swiggy's rules (official docs):
 *   - never "log tokens to disk in plaintext"
 *   - "Log session IDs for debugging, not full request/response bodies in plaintext"
 *   - all tool-call content (identifiers, addresses, cart items, order status) is PII under DPDP
 *
 * Everything printed by this experiment goes through `redact()` first.
 * Fail closed: unknown-but-suspicious keys are masked rather than passed through.
 */

/** Key names whose values must never be printed in full. */
const SENSITIVE_KEY = new RegExp(
  [
    'token',
    'access_?token',
    'refresh_?token',
    'id_?token',
    'authorization',
    'code_?verifier',
    'code_?challenge',
    '\\bcode\\b',
    'secret',
    'client_?secret',
    'password',
    'otp',
    'pin',
    'cvv',
    'api_?key',
    'cookie',
    'set-cookie',
    'bearer',
  ].join('|'),
  'i',
);

/** Keys that are PII: shown in a shortened, non-identifying form. */
const PII_KEY = new RegExp(
  [
    'phone',
    'mobile',
    'email',
    'address(?!Id)',   // addressId is an opaque handle, address is a street address
    'lat',
    'lng',
    'latitude',
    'longitude',
    'house',
    'flat',
    'street',
    'landmark',
    'pincode',
    'zip',
    'name(?!s$)',
  ].join('|'),
  'i',
);

const MASK = '«redacted»';

/** Keeps a token debuggable (prefix/length) without disclosing it. */
export function maskSecret(value: string): string {
  if (!value) return MASK;
  if (value.length <= 8) return MASK;
  return `${value.slice(0, 4)}…${MASK}…(len:${value.length})`;
}

/** Shortens PII to something recognisable to its owner but not disclosing. */
export function maskPii(value: string): string {
  if (!value) return MASK;
  const trimmed = value.trim();
  if (trimmed.length <= 2) return MASK;
  return `${trimmed.slice(0, 2)}${'*'.repeat(Math.min(6, Math.max(1, trimmed.length - 2)))}`;
}

/** SHA-256-style stable pseudonym is overkill here; a short non-reversible tag suffices. */
export function hashTag(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return `#${(h >>> 0).toString(16).padStart(8, '0')}`;
}

/** Bearer tokens / long opaque strings appearing inside free text. */
function scrubText(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, `Bearer ${MASK}`)
    .replace(/\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, MASK) // JWT
    .replace(/\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g, MASK)                                 // Indian mobile
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, MASK);                                  // email
}

/**
 * Recursively redact a value for safe logging.
 * Depth-limited and cycle-safe so a hostile/looping payload cannot hang the probe.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > 8) return '«depth-limit»';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') return scrubText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'function') return '«fn»';

  if (Array.isArray(value)) {
    if (seen.has(value)) return '«circular»';
    seen.add(value);
    const head = value.slice(0, 5).map((v) => redact(v, depth + 1, seen));
    return value.length > 5 ? [...head, `«+${value.length - 5} more»`] : head;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return '«circular»';
    seen.add(obj);

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = typeof v === 'string' ? maskSecret(v) : MASK;
      } else if (PII_KEY.test(k)) {
        out[k] = typeof v === 'string' ? maskPii(v) : MASK;
      } else {
        out[k] = redact(v, depth + 1, seen);
      }
    }
    return out;
  }

  return MASK;
}

/** Pretty-print a redacted value. Use this instead of console.log for any payload. */
export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(redact(value), null, 2);
  } catch {
    return '«unserialisable»';
  }
}
