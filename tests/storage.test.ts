import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dataRoot, dataFile, ensureDataDir } from '../lib/storage';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TMP = join(tmpdir(), 'thuna-storage-test');
const SAVE: Record<string, string | undefined> = {};
const TRACK = ['RAILWAY_VOLUME_MOUNT_PATH', 'THUNA_DATA_DIR'];

beforeEach(() => {
  for (const k of TRACK) { SAVE[k] = process.env[k]; delete process.env[k]; }
  rmSync(TMP, { recursive: true, force: true });
});
afterEach(() => {
  for (const k of TRACK) { if (SAVE[k] === undefined) delete process.env[k]; else process.env[k] = SAVE[k]; }
  rmSync(TMP, { recursive: true, force: true });
});

describe('storage resolver', () => {
  it('falls back to <cwd>/data when no env set', () => {
    expect(dataRoot()).toBe(join(process.cwd(), 'data'));
  });
  it('uses RAILWAY_VOLUME_MOUNT_PATH first', () => {
    process.env.RAILWAY_VOLUME_MOUNT_PATH = '/app/data';
    expect(dataRoot()).toBe('/app/data');
  });
  it('uses THUNA_DATA_DIR when no volume', () => {
    process.env.THUNA_DATA_DIR = '/var/thuna';
    expect(dataRoot()).toBe('/var/thuna');
  });
  it('RAILWAY_VOLUME_MOUNT_PATH wins over THUNA_DATA_DIR', () => {
    process.env.RAILWAY_VOLUME_MOUNT_PATH = '/app/data';
    process.env.THUNA_DATA_DIR = '/var/thuna';
    expect(dataRoot()).toBe('/app/data');
  });
  it('ensureDataDir creates the directory', () => {
    process.env.THUNA_DATA_DIR = TMP;
    ensureDataDir();
    expect(existsSync(TMP)).toBe(true);
  });
  it('ensureDataDir is idempotent', () => {
    process.env.THUNA_DATA_DIR = TMP;
    ensureDataDir();
    ensureDataDir();
    expect(existsSync(TMP)).toBe(true);
  });
  it('dataFile rejects path traversal', () => {
    expect(() => dataFile('../escape')).toThrow();
    expect(() => dataFile('a/b')).toThrow();
    expect(() => dataFile('')).toThrow();
    expect(() => dataFile('..')).toThrow();
  });
  it('dataFile returns path under root', () => {
    process.env.THUNA_DATA_DIR = '/app/data';
    expect(dataFile('thuna-memory.json')).toBe(join('/app/data', 'thuna-memory.json'));
  });
});
