import { ValidationError } from '@careerhub/shared-kernel';
import { NotificationNotFoundError } from '../errors/notification-not-found.error';
import type {
  IdGenerator,
  NotificationRecord,
  NotificationRepository
} from '../ports';

export type CreateNotificationInput = {
  identityId: string;
  message: string;
  metadataJson?: string;
  sourceEventId?: string;
  title: string;
  type: string;
};

export type ListNotificationsResult = {
  notifications: NotificationRecord[];
  unreadCount: number;
};

function normalizeRequired(value: string, message: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new ValidationError(message);
  }

  return normalized;
}

function normalizeOptionalJson(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

export class NotificationOperationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async createNotification(
    input: CreateNotificationInput
  ): Promise<NotificationRecord> {
    const sourceEventId = input.sourceEventId?.trim();

    if (sourceEventId) {
      const existing =
        await this.notificationRepository.findBySourceEventId(sourceEventId);

      if (existing) {
        return existing;
      }
    }

    try {
      return await this.notificationRepository.create({
        id: this.idGenerator.generate(),
        identityId: normalizeRequired(
          input.identityId,
          'Notification identity id is required'
        ),
        message: normalizeRequired(input.message, 'Notification message is required'),
        metadataJson: normalizeOptionalJson(input.metadataJson),
        sourceEventId: sourceEventId ?? null,
        title: normalizeRequired(input.title, 'Notification title is required'),
        type: normalizeRequired(input.type, 'Notification type is required')
      });
    } catch (error) {
      if (sourceEventId && isUniqueConstraintError(error)) {
        const existing =
          await this.notificationRepository.findBySourceEventId(sourceEventId);

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async createNotificationIfNew(
    input: CreateNotificationInput
  ): Promise<{ created: boolean; notification: NotificationRecord }> {
    const sourceEventId = input.sourceEventId?.trim();

    if (sourceEventId) {
      const existing =
        await this.notificationRepository.findBySourceEventId(sourceEventId);

      if (existing) {
        return { created: false, notification: existing };
      }
    }

    try {
      const notification = await this.createNotification(input);
      return { created: true, notification };
    } catch (error) {
      if (sourceEventId && isUniqueConstraintError(error)) {
        const existing =
          await this.notificationRepository.findBySourceEventId(sourceEventId);

        if (existing) {
          return { created: false, notification: existing };
        }
      }

      throw error;
    }
  }

  async listNotifications(identityId: string): Promise<ListNotificationsResult> {
    const normalizedIdentityId = normalizeRequired(
      identityId,
      'Notification identity id is required'
    );
    const [notifications, unreadCount] = await Promise.all([
      this.notificationRepository.listByIdentityId(normalizedIdentityId),
      this.notificationRepository.countUnreadByIdentityId(normalizedIdentityId)
    ]);

    return {
      notifications,
      unreadCount
    };
  }

  async getNotification(
    identityId: string,
    notificationId: string
  ): Promise<NotificationRecord> {
    const notification = await this.notificationRepository.findByIdAndIdentityId(
      normalizeRequired(notificationId, 'Notification id is required'),
      normalizeRequired(identityId, 'Notification identity id is required')
    );

    if (!notification) {
      throw new NotificationNotFoundError(notificationId);
    }

    return notification;
  }

  async markNotificationRead(
    identityId: string,
    notificationId: string
  ): Promise<NotificationRecord> {
    const normalizedNotificationId = normalizeRequired(
      notificationId,
      'Notification id is required'
    );
    const normalizedIdentityId = normalizeRequired(
      identityId,
      'Notification identity id is required'
    );
    const existing = await this.notificationRepository.findByIdAndIdentityId(
      normalizedNotificationId,
      normalizedIdentityId
    );

    if (!existing) {
      throw new NotificationNotFoundError(normalizedNotificationId);
    }

    if (existing.readAt) {
      return existing;
    }

    const updated = await this.notificationRepository.markRead(
      normalizedNotificationId,
      normalizedIdentityId,
      new Date()
    );

    if (!updated) {
      throw new NotificationNotFoundError(normalizedNotificationId);
    }

    return updated;
  }

  async markAllNotificationsRead(identityId: string): Promise<number> {
    return this.notificationRepository.markAllReadByIdentityId(
      normalizeRequired(identityId, 'Notification identity id is required')
    );
  }
}
