import type { Routine } from '../routines/types';

export interface ChannelDelivery {
  channel: string;
  simulated: boolean;
  acceptedAt: string;
}

export interface ChannelAdapter {
  readonly name: string;
  startCheckIn(routine: Routine): Promise<ChannelDelivery>;
}

// Optional providers implement this boundary without changing routine business logic.
// No provider credentials or live telephony implementation belongs in the core product.
export interface TelephonyChannelAdapter extends ChannelAdapter {
  readonly provider: 'EXOTEL' | 'TWILIO';
  hangUp(externalCallId: string): Promise<void>;
}
