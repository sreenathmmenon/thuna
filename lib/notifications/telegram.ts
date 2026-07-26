import { RoutineError } from '../routines/errors';
import type {
  FamilyNotification,
  NotificationAdapter,
  NotificationResult,
} from './types';

export class TelegramNotificationAdapter implements NotificationAdapter {
  readonly name = 'TELEGRAM';

  constructor(
    private readonly botToken: string,
    private readonly chatId: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (!botToken || !chatId) {
      throw new RoutineError(
        'INVALID_INPUT',
        'Telegram notifications require configured credentials.',
      );
    }
  }

  async notifyFamily(notification: FamilyNotification): Promise<NotificationResult> {
    const response = await this.fetchImpl(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: notification.message,
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      throw new RoutineError(
        'DELIVERY_FAILED',
        `Family notification delivery failed (${response.status}).`,
        502,
      );
    }

    return {
      adapter: this.name,
      simulated: false,
      acceptedAt: this.now().toISOString(),
    };
  }
}
