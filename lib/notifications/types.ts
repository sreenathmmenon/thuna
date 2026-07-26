export type NotificationCategory = 'ROUTINE_HELP' | 'CONSENTED_FAMILY_CONTENT';

export interface FamilyNotification {
  routineId: string;
  routineType: string;
  message: string;
  category?: NotificationCategory;
  contactId?: string;
  minimumDisclosure?: boolean;
  elderApproved?: boolean;
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
