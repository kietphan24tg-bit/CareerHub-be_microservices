export type NotificationRecord = {
  createdAt: Date;
  id: string;
  identityId: string;
  message: string;
  metadataJson: string | null;
  readAt: Date | null;
  sourceEventId: string | null;
  title: string;
  type: string;
};

export type CreateNotificationRecord = {
  id: string;
  identityId: string;
  message: string;
  metadataJson: string | null;
  sourceEventId?: string | null;
  title: string;
  type: string;
};

export interface NotificationRepository {
  countUnreadByIdentityId(identityId: string): Promise<number>;
  create(notification: CreateNotificationRecord): Promise<NotificationRecord>;
  findByIdAndIdentityId(
    notificationId: string,
    identityId: string
  ): Promise<NotificationRecord | null>;
  findBySourceEventId(sourceEventId: string): Promise<NotificationRecord | null>;
  listByIdentityId(identityId: string): Promise<NotificationRecord[]>;
  markAllReadByIdentityId(identityId: string): Promise<number>;
  markRead(
    notificationId: string,
    identityId: string,
    readAt: Date
  ): Promise<NotificationRecord | null>;
}
