import type {
  FamilyNotification,
  NotificationAdapter,
  NotificationResult,
} from './types';

export class DemoNotificationAdapter implements NotificationAdapter {
  readonly name = 'DEMO_CONSOLE';
  readonly sent: FamilyNotification[] = [];

  constructor(private readonly now: () => Date = () => new Date()) {}

  async notifyFamily(notification: FamilyNotification): Promise<NotificationResult> {
    this.sent.push({ ...notification });
    return {
      adapter: this.name,
      simulated: true,
      acceptedAt: this.now().toISOString(),
    };
  }
}
