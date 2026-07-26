import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import type { ContinuityDocument } from './types';

export function emptyContinuityDocument(): ContinuityDocument {
  return {
    version: 1,
    lifeEvents: [],
    pendingLoops: [],
    familyRequests: [],
    familyContentConsent: [],
    consentHistory: [],
    quietHours: { startHour: 21, endHour: 7 },
    dailyBriefEnabled: false,
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isDocument(value: unknown): value is ContinuityDocument {
  if (!value || typeof value !== 'object') return false;
  const document = value as Partial<ContinuityDocument>;
  return document.version === 1
    && Array.isArray(document.lifeEvents)
    && Array.isArray(document.pendingLoops)
    && Array.isArray(document.familyRequests)
    && Array.isArray(document.familyContentConsent)
    && Array.isArray(document.consentHistory)
    && typeof document.quietHours === 'object'
    && document.quietHours !== null
    && typeof document.dailyBriefEnabled === 'boolean';
}

export class ContinuityStore {
  private memoryDocument: ContinuityDocument;

  constructor(private readonly filePath?: string) {
    this.memoryDocument = emptyContinuityDocument();
    if (filePath && existsSync(filePath)) {
      const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
      if (!isDocument(parsed)) {
        throw new Error('Stored continuity data does not match the current contract.');
      }
      this.memoryDocument = parsed;
    } else if (filePath) {
      this.persist(this.memoryDocument);
    }
  }

  snapshot(): ContinuityDocument {
    return clone(this.memoryDocument);
  }

  update(mutator: (document: ContinuityDocument) => void): ContinuityDocument {
    const next = clone(this.memoryDocument);
    mutator(next);
    this.memoryDocument = next;
    this.persist(next);
    return clone(next);
  }

  reset(): ContinuityDocument {
    this.memoryDocument = emptyContinuityDocument();
    this.persist(this.memoryDocument);
    return this.snapshot();
  }

  private persist(document: ContinuityDocument): void {
    if (!this.filePath) return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    renameSync(temporaryPath, this.filePath);
  }
}
