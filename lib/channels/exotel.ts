import { z } from 'zod';
import type { ChannelAdapter, ChannelDelivery } from './types';
import type { Routine } from '../routines/types';

const exotelResponseSchema = z.object({
  response: z
    .array(
      z.object({
        status: z.string().optional(),
        data: z.object({ id: z.string().optional() }).nullable().optional(),
      }),
    )
    .optional(),
});

interface ExotelConfig {
  apiKey: string;
  apiToken: string;
  accountSid: string;
  callerId: string;
  elderPhone: string;
  flowUrl: string;
  apiBase: string;
  callbackBaseUrl?: string;
}

function safeUrl(value: string, allowedProtocols: readonly string[]): string | null {
  try {
    const parsed = new URL(value);
    return allowedProtocols.includes(parsed.protocol) ? parsed.toString().replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}

function configFromEnv(environment: NodeJS.ProcessEnv): ExotelConfig | null {
  if (environment.THUNA_ENABLE_REAL_TELEPHONY !== 'true') return null;
  const apiKey = environment.EXOTEL_API_KEY?.trim();
  const apiToken = environment.EXOTEL_API_TOKEN?.trim();
  const accountSid = environment.EXOTEL_ACCOUNT_SID?.trim();
  const callerId = environment.EXOTEL_CALLER_ID?.trim();
  const elderPhone = environment.THUNA_ELDER_PHONE_NUMBER?.trim();
  const flowUrl = safeUrl(environment.EXOTEL_VOICEBOT_FLOW_URL?.trim() ?? '', ['http:', 'https:']);
  const apiBase = safeUrl(
    environment.EXOTEL_API_BASE?.trim() || 'https://api.in.exotel.com',
    ['https:'],
  );
  const callbackBaseUrl = safeUrl(environment.THUNA_PUBLIC_BASE_URL?.trim() ?? '', ['https:']);
  if (
    !apiKey ||
    !apiToken ||
    !accountSid ||
    !callerId ||
    !elderPhone ||
    !/^\+[1-9]\d{7,14}$/.test(elderPhone) ||
    !flowUrl ||
    !apiBase
  ) {
    return null;
  }
  return {
    apiKey,
    apiToken,
    accountSid,
    callerId,
    elderPhone,
    flowUrl,
    apiBase,
    callbackBaseUrl: callbackBaseUrl ?? undefined,
  };
}

export class ExotelVoiceCallChannel implements ChannelAdapter {
  readonly name = 'PHONE_CALL';

  constructor(
    private readonly config: ExotelConfig,
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  static fromEnv(
    environment: NodeJS.ProcessEnv = process.env,
    fetcher: typeof fetch = fetch,
  ): ExotelVoiceCallChannel | null {
    const config = configFromEnv(environment);
    return config ? new ExotelVoiceCallChannel(config, fetcher) : null;
  }

  async startCheckIn(routine: Routine): Promise<ChannelDelivery> {
    const endpoint =
      `${this.config.apiBase}/v2/accounts/${encodeURIComponent(this.config.accountSid)}/campaigns`;
    const callback = this.config.callbackBaseUrl
      ? `${this.config.callbackBaseUrl}/api/telephony/exotel/status`
      : undefined;
    const body = {
      campaigns: [
        {
          name: `thuna-${routine.id.slice(0, 8)}-${Date.now()}`,
          from: this.config.elderPhone,
          caller_id: this.config.callerId,
          campaign_type: 'dynamic',
          url: this.config.flowUrl,
          retries: {
            number_of_retries: 0,
            interval_mins: 1,
            mechanism: 'Linear',
            on_status: ['busy', 'no-answer', 'failed'],
          },
          ...(callback
            ? {
                call_status_callback: callback,
                call_schedule_callback: callback,
              }
            : {}),
          // Minimum disclosure: provider transport receives no reminder copy,
          // address, profile, or health information.
          custom_field: JSON.stringify({
            routineId: routine.id,
            routineType: routine.type,
          }),
        },
      ],
    };
    const authorization = Buffer.from(
      `${this.config.apiKey}:${this.config.apiToken}`,
    ).toString('base64');
    const response = await this.fetcher(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(`Exotel rejected the reminder call (${response.status}).`);
    }
    const parsed = exotelResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new Error('Exotel returned an invalid campaign response.');
    const providerId = parsed.data.response?.find((entry) => entry.data?.id)?.data?.id;
    return {
      channel: this.name,
      simulated: false,
      acceptedAt: this.now().toISOString(),
      externalId: providerId,
    };
  }
}
