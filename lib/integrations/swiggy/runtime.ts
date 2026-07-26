import { resolve } from 'node:path';
import { SwiggyFoodMcpAdapter } from '../../adapters/swiggy-food-mcp';
import { ServerCredentialStore } from '../credentials';
import { SwiggyMcpClient } from './client';
import { SwiggyConnectionService } from './connection';
import {
  SwiggyOAuthProvider,
  type StoredSwiggyOAuth,
} from './oauth';

export interface SwiggyRuntime {
  oauth: SwiggyOAuthProvider;
  connection: SwiggyConnectionService;
  client: SwiggyMcpClient;
  adapter: SwiggyFoodMcpAdapter;
}

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;
let shared: SwiggyRuntime | undefined;

export function createSwiggyRuntime(
  env: RuntimeEnvironment = process.env,
): SwiggyRuntime {
  const dataRoot = resolve(env.THUNA_DATA_ROOT ?? 'data');
  const callbackUrl = env.THUNA_SWIGGY_CALLBACK_URL
    ?? 'http://localhost:3000/api/integrations/swiggy/callback';
  const store = new ServerCredentialStore<StoredSwiggyOAuth>(
    'swiggy',
    resolve(dataRoot, 'private', 'swiggy-oauth.json'),
  );
  const oauth = new SwiggyOAuthProvider(store, callbackUrl);
  const connection = new SwiggyConnectionService(oauth);
  const client = new SwiggyMcpClient(oauth);
  const adapter = new SwiggyFoodMcpAdapter({
    client,
    realOrderEnabled: env.THUNA_ENABLE_REAL_SWIGGY_ORDER === 'true',
  });
  return { oauth, connection, client, adapter };
}

export function getSwiggyRuntime(): SwiggyRuntime {
  shared ??= createSwiggyRuntime();
  return shared;
}

export function resetSwiggyRuntimeForTests(): void {
  shared = undefined;
}
