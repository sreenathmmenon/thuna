import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

// Central persistent-storage resolver.
// Railway's service filesystem is ephemeral; persistent Thuna data must live under one
// mounted volume (/app/data on Railway). Priority order:
//   1. RAILWAY_VOLUME_MOUNT_PATH  (Railway volume mount)
//   2. THUNA_DATA_DIR             (explicit data directory)
//   3. <repo>/data                (local dev fallback)
export function dataRoot(): string {
  const vol = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (vol) return vol;
  const dir = process.env.THUNA_DATA_DIR?.trim();
  if (dir) return dir;
  return join(process.cwd(), 'data');
}

export function dataFile(name: string): string {
  // Reject path traversal: only bare filenames are allowed.
  if (typeof name !== 'string' || name.length === 0 || /[\\/]/.test(name) || name === '.' || name === '..') {
    throw new Error(`Invalid data file name: ${String(name)}`);
  }
  return join(dataRoot(), name);
}

export function ensureDataDir(): string {
  const root = dataRoot();
  mkdirSync(root, { recursive: true });
  return root;
}
