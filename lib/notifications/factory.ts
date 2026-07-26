import { DemoNotificationAdapter } from './console';
import { TelegramNotificationAdapter } from './telegram';
import type { NotificationAdapter } from './types';

export function createNotificationAdapter(
  environment: NodeJS.ProcessEnv = process.env,
): NotificationAdapter {
  const token = environment.THUNA_TELEGRAM_BOT_TOKEN;
  const chatId = environment.THUNA_TELEGRAM_CHAT_ID;
  if (token && chatId) return new TelegramNotificationAdapter(token, chatId);
  return new DemoNotificationAdapter();
}
