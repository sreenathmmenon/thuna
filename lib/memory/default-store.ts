import { MemoryStore } from './store';
import { dataFile } from '../storage';

const configuredPath = process.env.THUNA_MEMORY_PATH?.trim();

export const memoryStore = new MemoryStore(
  configuredPath || dataFile('thuna-memory.json'),
);
