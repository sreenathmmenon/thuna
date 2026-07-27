import type { ChannelAdapter, ChannelDelivery } from './types';
import type { Routine } from '../routines/types';
import { InAppChannelAdapter } from './in-app';
import { ExotelVoiceCallChannel } from './exotel';

/**
 * Elder-first delivery ladder. The product raises an in-app/device-visible
 * check-in first. A configured phone adapter is attempted only on retries for
 * routines whose deterministic policy contains PHONE_CALL.
 */
export class CompanionChannel implements ChannelAdapter {
  readonly name = 'COMPANION';

  constructor(
    private readonly inApp: ChannelAdapter,
    private readonly phone: ChannelAdapter | null,
  ) {}

  async startCheckIn(routine: Routine): Promise<ChannelDelivery> {
    const alert = await this.inApp.startCheckIn(routine);
    const shouldCall = routine.channels.includes('PHONE_CALL') && routine.retryCount > 0;
    if (!shouldCall || !this.phone) return alert;
    try {
      return await this.phone.startCheckIn(routine);
    } catch {
      // A provider/network failure cannot erase the accepted device/in-app
      // alert or authorize a different state transition.
      return {
        ...alert,
        detail: 'Device alert remains active; the configured phone call failed closed.',
      };
    }
  }
}

export function createCompanionChannel(
  environment: NodeJS.ProcessEnv = process.env,
): ChannelAdapter {
  return new CompanionChannel(
    new InAppChannelAdapter(),
    ExotelVoiceCallChannel.fromEnv(environment),
  );
}
