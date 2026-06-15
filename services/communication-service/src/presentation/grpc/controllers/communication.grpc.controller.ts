import {
  COMMUNICATION_GRPC_SERVICE_NAME,
  type CreateNotificationRequest,
  type CreateNotificationResponse,
  type GetNotificationRequest,
  type GetNotificationResponse,
  type ListNotificationsRequest,
  type ListNotificationsResponse,
  type MarkAllNotificationsReadRequest,
  type MarkAllNotificationsReadResponse,
  type MarkNotificationReadRequest,
  type MarkNotificationReadResponse,
  type NotificationMessage
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  NotificationOperationsService,
  type NotificationRecord
} from '../../../application';
import { mapErrorToCommunicationGrpcException } from '../mappers/grpc-error.mapper';

function toGrpcNotification(
  notification: NotificationRecord
): NotificationMessage {
  return {
    created_at: notification.createdAt.toISOString(),
    id: notification.id,
    identity_id: notification.identityId,
    message: notification.message,
    metadata_json: notification.metadataJson ?? '',
    read_at: notification.readAt?.toISOString() ?? '',
    title: notification.title,
    type: notification.type
  } as unknown as NotificationMessage;
}

@Controller()
export class CommunicationGrpcController {
  constructor(
    private readonly notificationOperationsService: NotificationOperationsService
  ) {}

  @GrpcMethod(COMMUNICATION_GRPC_SERVICE_NAME, 'CreateNotification')
  async createNotification(
    request: CreateNotificationRequest
  ): Promise<CreateNotificationResponse> {
    try {
      const notification =
        await this.notificationOperationsService.createNotification({
          identityId: request.identity_id,
          message: request.message,
          metadataJson: request.metadata_json,
          title: request.title,
          type: request.type
        });

      return {
        notification: toGrpcNotification(notification)
      };
    } catch (error) {
      throw mapErrorToCommunicationGrpcException(error);
    }
  }

  @GrpcMethod(COMMUNICATION_GRPC_SERVICE_NAME, 'ListNotifications')
  async listNotifications(
    request: ListNotificationsRequest
  ): Promise<ListNotificationsResponse> {
    try {
      const result = await this.notificationOperationsService.listNotifications(
        request.identity_id
      );

      return {
        notifications: result.notifications.map(toGrpcNotification),
        unread_count: result.unreadCount
      } as unknown as ListNotificationsResponse;
    } catch (error) {
      throw mapErrorToCommunicationGrpcException(error);
    }
  }

  @GrpcMethod(COMMUNICATION_GRPC_SERVICE_NAME, 'GetNotification')
  async getNotification(
    request: GetNotificationRequest
  ): Promise<GetNotificationResponse> {
    try {
      const notification = await this.notificationOperationsService.getNotification(
        request.identity_id,
        request.notification_id
      );

      return {
        notification: toGrpcNotification(notification)
      };
    } catch (error) {
      throw mapErrorToCommunicationGrpcException(error);
    }
  }

  @GrpcMethod(COMMUNICATION_GRPC_SERVICE_NAME, 'MarkNotificationRead')
  async markNotificationRead(
    request: MarkNotificationReadRequest
  ): Promise<MarkNotificationReadResponse> {
    try {
      const notification =
        await this.notificationOperationsService.markNotificationRead(
          request.identity_id,
          request.notification_id
        );

      return {
        notification: toGrpcNotification(notification)
      };
    } catch (error) {
      throw mapErrorToCommunicationGrpcException(error);
    }
  }

  @GrpcMethod(COMMUNICATION_GRPC_SERVICE_NAME, 'MarkAllNotificationsRead')
  async markAllNotificationsRead(
    request: MarkAllNotificationsReadRequest
  ): Promise<MarkAllNotificationsReadResponse> {
    try {
      const updatedCount =
        await this.notificationOperationsService.markAllNotificationsRead(
          request.identity_id
        );

      return {
        updated_count: updatedCount
      } as unknown as MarkAllNotificationsReadResponse;
    } catch (error) {
      throw mapErrorToCommunicationGrpcException(error);
    }
  }
}
