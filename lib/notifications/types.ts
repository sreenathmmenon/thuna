export interface FamilyNotification {
  routineId: string;
  routineType: string;
  message: string;
}

export interface NotificationResult {
  adapter: string;
  simulated: boolean;
  acceptedAt: string;
}

export interface NotificationAdapter {
  readonly name: string;
  notifyFamily(notification: FamilyNotification): Promise<NotificationResult>;
}
