import type { ChannelAdapter } from './types';
import { createCompanionChannel } from './companion';

export function createElderChannel(
  environment: NodeJS.ProcessEnv = process.env,
): ChannelAdapter {
  return createCompanionChannel(environment);
}
