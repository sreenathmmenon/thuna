import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { dataFile } from '../storage';

const ALLOWED_STATUSES = new Set([
  'created',
  'in-progress',
  'completed',
  'no-answer',
  'busy',
  'failed',
  'canceled',
]);

export interface DeliveryEvidence {
  provider: 'EXOTEL';
  kind: 'CALL_STATUS';
  providerReferenceHash: string;
  status: string;
  recordedAt: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function candidateData(value: unknown): Record<string, unknown>[] {
  const root = record(value);
  if (!root) return [];
  const candidates = [root];
  if (Array.isArray(root.response)) {
    for (const item of root.response) {
      const responseItem = record(item);
      if (responseItem) candidates.push(responseItem);
      const data = record(responseItem?.data);
      if (data) candidates.push(data);
    }
  }
  return candidates;
}

export function parseExotelDeliveryEvidence(
  rawBody: string,
  contentType: string | null,
  now: Date = new Date(),
): DeliveryEvidence | null {
  let payload: unknown = null;
  try {
    payload = contentType?.includes('application/json')
      ? JSON.parse(rawBody)
      : Object.fromEntries(new URLSearchParams(rawBody));
  } catch {
    return null;
  }
  for (const candidate of candidateData(payload)) {
    const statusValue = candidate.status;
    const status =
      typeof statusValue === 'string' ? statusValue.trim().toLowerCase() : '';
    const referenceValue =
      candidate.campaign_sid ?? candidate.call_sid ?? candidate.id;
    const reference =
      typeof referenceValue === 'string' ? referenceValue.trim() : '';
    if (!ALLOWED_STATUSES.has(status) || !/^[A-Za-z0-9_-]{6,200}$/.test(reference)) {
      continue;
    }
    return {
      provider: 'EXOTEL',
      kind: 'CALL_STATUS',
      providerReferenceHash: createHash('sha256').update(reference).digest('hex'),
      status,
      recordedAt: now.toISOString(),
    };
  }
  return null;
}

export function appendDeliveryEvidence(
  evidence: DeliveryEvidence,
  filePath = process.env.THUNA_DELIVERY_EVIDENCE_PATH?.trim() ||
    dataFile('thuna-delivery-evidence.json'),
): void {
  let entries: DeliveryEvidence[] = [];
  if (existsSync(filePath)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
      if (Array.isArray(parsed)) {
        entries = parsed.filter(
          (entry): entry is DeliveryEvidence =>
            record(entry)?.provider === 'EXOTEL' &&
            record(entry)?.kind === 'CALL_STATUS' &&
            typeof record(entry)?.providerReferenceHash === 'string' &&
            typeof record(entry)?.status === 'string' &&
            typeof record(entry)?.recordedAt === 'string',
        );
      }
    } catch {
      entries = [];
    }
  }
  entries.push(evidence);
  entries = entries.slice(-500);
  mkdirSync(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(entries, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  renameSync(temporaryPath, filePath);
}
