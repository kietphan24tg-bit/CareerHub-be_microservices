import { ApplicationError } from '@careerhub/infrastructure';

export class NotificationNotFoundError extends ApplicationError {
  constructor(notificationId?: string) {
    super(
      notificationId
        ? `Notification not found: ${notificationId}`
        : 'Notification not found.',
      {
        code: 'NOTIFICATION_NOT_FOUND'
      }
    );
  }
}
