const FORBIDDEN_KEY_PARTS = [
  'otp',
  'onetimepassword',
  'pin',
  'cvv',
  'cvc',
  'password',
  'passcode',
  'bankingcredential',
  'paymentcredential',
  'bankaccount',
  'cardnumber',
  'carddetail',
  'accountnumber',
  'medicinedosage',
  'dosage',
  'dose',
];

const SECRET_WITH_LABEL =
  /\b(otp|pin|cvv|cvc|password|passcode)\b(?:\s*(?:is|was|:|=|-)\s*|\s+)[^\s,.;]{3,}/gi;
const FINANCIAL_NUMBER_WITH_LABEL =
  /\b((?:bank\s+)?account|card)\s*(?:number|no\.?)?(\s*(?:is|:|=|-)\s*)\d{6,19}\b/gi;
const LONG_CARD_LIKE_NUMBER = /\b(?:\d[ -]?){12,19}\b/g;
const MEDICINE_DOSAGE =
  /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|ml|tablets?|capsules?|drops?)\b/gi;

export function isForbiddenStorageKey(key: string): boolean {
  const normalised = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return FORBIDDEN_KEY_PARTS.some((part) => normalised.includes(part));
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(
      SECRET_WITH_LABEL,
      (_match, label: string) => `${label} [REDACTED SENSITIVE VALUE]`,
    )
    .replace(
      FINANCIAL_NUMBER_WITH_LABEL,
      (_match, label: string) => `${label} [REDACTED FINANCIAL VALUE]`,
    )
    .replace(LONG_CARD_LIKE_NUMBER, '[REDACTED FINANCIAL VALUE]')
    .replace(MEDICINE_DOSAGE, '[REDACTED MEDICINE DOSAGE]');
}

export function sanitiseStorageValue(value: unknown): unknown {
  if (typeof value === 'string') return redactSensitiveText(value);
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitiseStorageValue);
  if (typeof value === 'object' && value) {
    const clean: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (isForbiddenStorageKey(key)) continue;
      clean[key] = sanitiseStorageValue(child);
    }
    return clean;
  }
  return undefined;
}

export function sanitiseMetadata(
  value: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const sanitised = sanitiseStorageValue(value ?? {});
  return typeof sanitised === 'object' &&
    sanitised !== null &&
    !Array.isArray(sanitised)
    ? (sanitised as Record<string, unknown>)
    : {};
}

export function findForbiddenStoragePath(
  value: unknown,
  path = '$',
): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const result = findForbiddenStoragePath(value[index], `${path}[${index}]`);
      if (result) return result;
    }
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;

  for (const [key, child] of Object.entries(value)) {
    if (isForbiddenStorageKey(key)) return `${path}.${key}`;
    const result = findForbiddenStoragePath(child, `${path}.${key}`);
    if (result) return result;
  }
  return null;
}
