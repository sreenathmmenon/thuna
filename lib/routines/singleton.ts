import { InAppChannelAdapter } from '../channels/in-app';
import { createNotificationAdapter } from '../notifications/factory';
import { RoutineService } from './service';
import { RoutineStore } from './store';

const demoMode = process.env.THUNA_DEMO_MODE !== 'false';

export const routineService = new RoutineService(
  new RoutineStore(),
  new InAppChannelAdapter(),
  createNotificationAdapter(),
  { demoMode },
);
