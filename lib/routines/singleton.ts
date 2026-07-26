import { InAppChannelAdapter } from '../channels/in-app';
import { createNotificationAdapter } from '../notifications/factory';
import { dataFile } from '../storage';
import { RoutineService } from './service';
import { RoutineStore } from './store';

const demoMode = process.env.THUNA_DEMO_MODE !== 'false';

const storePath = process.env.THUNA_ROUTINES_PATH?.trim()
  ?? dataFile('thuna-routines.json');

function buildRoutineService(): RoutineService {
  return new RoutineService(
    new RoutineStore(undefined, undefined, storePath),
    new InAppChannelAdapter(),
    createNotificationAdapter(),
    { demoMode },
  );
}

/**
 * Next.js compiles each API route into its own bundle in development, so a
 * plain module-level singleton would be instantiated once per route —
 * /api/routines and /api/routines/trigger would each see a different store.
 * Caching the instance on globalThis (the same pattern used for database
 * clients in Next.js apps) guarantees one service per process; the file
 * store above guarantees the data also survives the process.
 */
const globalCache = globalThis as typeof globalThis & {
  __thunaRoutineService?: RoutineService;
};

export const routineService: RoutineService =
  globalCache.__thunaRoutineService ?? buildRoutineService();

globalCache.__thunaRoutineService = routineService;
