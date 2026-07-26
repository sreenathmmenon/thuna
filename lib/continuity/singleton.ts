import { join } from 'node:path';
import { authoriseFamilyHandoff } from '../family';
import { memoryStore } from '../memory/default-store';
import { DemoNotificationAdapter } from '../notifications/console';
import { routineService } from '../routines/singleton';
import { ContinuityError } from './errors';
import { ContinuityService } from './service';
import { ContinuityStore } from './store';

const storePath = process.env.THUNA_CONTINUITY_PATH
  ?? join(process.cwd(), 'data', 'thuna-continuity.json');

export const continuityService = new ContinuityService(
  new ContinuityStore(storePath),
  new DemoNotificationAdapter(),
  {
    listRoutines: () => routineService.list(),
    authorizeFamilyRequest: (request) => {
      try {
        authoriseFamilyHandoff(memoryStore, {
          contactId: request.contactId,
          elderExplicitlyRequested: true,
          reason: request.purpose,
        });
      } catch {
        throw new ContinuityError(
          'CONSENT_REQUIRED',
          'Enable trusted-family notification consent before offering this request.',
          403,
        );
      }
    },
  },
);
