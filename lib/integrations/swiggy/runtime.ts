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

export function resolveSwiggyDataRoot(
  env: RuntimeEnvironment = process.env,
): string {
  const configuredRoot = env.THUNA_DATA_ROOT?.trim()
    || env.RAILWAY_VOLUME_MOUNT_PATH?.trim()
    || env.THUNA_DATA_DIR?.trim();
  return resolve(configuredRoot || 'data');
}

export function resolveSwiggyCallbackUrl(
  env: RuntimeEnvironment = process.env,
): string {
  const explicit = env.THUNA_SWIGGY_CALLBACK_URL?.trim();
  if (explicit) return explicit;
  const railwayDomain = env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) {
    return `https://${railwayDomain}/api/integrations/swiggy/callback`;
  }
  return 'http://localhost:3000/api/integrations/swiggy/callback';
}

export function createSwiggyRuntime(
  env: RuntimeEnvironment = process.env,
): SwiggyRuntime {
  const dataRoot = resolveSwiggyDataRoot(env);
  const callbackUrl = resolveSwiggyCallbackUrl(env);
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
