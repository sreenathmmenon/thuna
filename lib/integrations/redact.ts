const PRIVATE_KEY = /token|secret|password|verifier|authorization|cookie|phone|mobile|address|location|latitude|longitude|otp|pin|cvv/i;

export function redactSecret(value: string): string {
  if (!value) return '[REDACTED]';
  return `[REDACTED:${value.length}]`;
}

export function redactProviderData(value: unknown, key = ''): unknown {
  if (PRIVATE_KEY.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redactProviderData(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([childKey, child]) => [childKey, redactProviderData(child, childKey)]),
    );
  }
  if (typeof value === 'string') {
    return value
      .replace(/\b(?:\+?91[-\s]?)?[6-9]\d{9}\b/g, '[REDACTED_PHONE]')
      .replace(/\bBearer\s+[A-Za-z0-9._~-]+\b/gi, 'Bearer [REDACTED]');
  }
  return value;
}

export function safeProviderLog(value: unknown): string {
  return JSON.stringify(redactProviderData(value));
}
