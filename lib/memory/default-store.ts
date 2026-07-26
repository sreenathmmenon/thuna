import { join } from 'node:path';
import { MemoryStore } from './store';

const configuredPath = process.env.THUNA_MEMORY_PATH?.trim();

export const memoryStore = new MemoryStore(
  configuredPath || join(process.cwd(), 'data', 'thuna-memory.json'),
);
