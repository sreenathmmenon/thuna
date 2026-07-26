import {
  chmod,
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname } from 'node:path';

interface StoredCredential<T> {
  version: 1;
  providerId: string;
  value: T;
  updatedAt: string;
}

function isStoredCredential<T>(
  value: unknown,
  providerId: string,
): value is StoredCredential<T> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredCredential<T>>;
  return candidate.version === 1
    && candidate.providerId === providerId
    && typeof candidate.updatedAt === 'string'
    && 'value' in candidate;
}

/**
 * Provider-neutral localhost credential storage.
 *
 * The containing directory and file are owner-only. Production deployments can
 * replace this store with persistent volume or database-backed storage without
 * changing OAuth or food workflow code.
 */
export interface CredentialStore<T> {
  load(): Promise<T | undefined>;
  save(value: T): Promise<void>;
  clear(): Promise<void>;
}

export class ServerCredentialStore<T> implements CredentialStore<T> {
  constructor(
    readonly providerId: string,
    readonly filePath: string,
  ) {}

  async load(): Promise<T | undefined> {
    try {
      const file = await stat(this.filePath);
      if ((file.mode & 0o077) !== 0) {
        await chmod(this.filePath, 0o600);
      }
      const parsed: unknown = JSON.parse(await readFile(this.filePath, 'utf8'));
      if (!isStoredCredential<T>(parsed, this.providerId)) {
        throw new Error('Credential file does not match the expected provider contract.');
      }
      return structuredClone(parsed.value);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async save(value: T): Promise<void> {
    const directory = dirname(this.filePath);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    const payload: StoredCredential<T> = {
      version: 1,
      providerId: this.providerId,
      value: structuredClone(value),
      updatedAt: new Date().toISOString(),
    };
    await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, this.filePath);
    await chmod(this.filePath, 0o600);
  }

  async clear(): Promise<void> {
    try {
      await unlink(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
