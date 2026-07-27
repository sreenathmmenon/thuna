import type { Routine } from '../routines/types';

export interface ChannelDelivery {
  channel: string;
  simulated: boolean;
  acceptedAt: string;
  externalId?: string;
  detail?: string;
}

export interface ChannelAdapter {
  readonly name: string;
  startCheckIn(routine: Routine): Promise<ChannelDelivery>;
}

// Optional providers implement this boundary without changing routine business
// logic. Credentials remain server-side and provider code remains outside the
// deterministic routine engine.
export interface TelephonyChannelAdapter extends ChannelAdapter {
  readonly provider: 'EXOTEL' | 'TWILIO';
  hangUp(externalCallId: string): Promise<void>;
}
