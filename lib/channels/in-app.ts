import type { ChannelAdapter, ChannelDelivery } from './types';
import type { Routine } from '../routines/types';

export class InAppChannelAdapter implements ChannelAdapter {
  readonly name = 'IN_APP';

  constructor(private readonly now: () => Date = () => new Date()) {}

  async startCheckIn(_routine: Routine): Promise<ChannelDelivery> {
    return {
      channel: this.name,
      simulated: true,
      acceptedAt: this.now().toISOString(),
    };
  }
}
