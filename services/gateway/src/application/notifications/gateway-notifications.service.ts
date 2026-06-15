import { Injectable } from '@nestjs/common';
import type { NotificationMessage } from '@careerhub/contracts';
import { CommunicationGrpcClient } from '../../infrastructure/transport/grpc/communication-grpc.client';

export type GatewayHttpNotification = {
  createdAt: string;
  id: string;
  identityId: string;
  message: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  title: string;
  type: string;
};

function toGatewayHttpNotification(notification: NotificationMessage): GatewayHttpNotification {
  let metadata: Record<string, unknown> | null = null;

  if (notification.metadata_json) {
    try {
      metadata = JSON.parse(notification.metadata_json) as Record<string, unknown>;
    } catch {
      metadata = null;
    }
  }

  return {
    createdAt: notification.created_at,
    id: notification.id,
    identityId: notification.identity_id,
    message: notification.message,
    metadata,
    readAt: notification.read_at || null,
    title: notification.title,
    type: notification.type
  };
}

@Injectable()
export class GatewayNotificationsService {
  constructor(private readonly communicationGrpcClient: CommunicationGrpcClient) {}

  async listNotifications(input: { identityId: string; requestId?: string }) {
    const response = await this.communicationGrpcClient.listNotifications(
      { identity_id: input.identityId },
      input.requestId
    );

    return {
      notifications: (response.notifications ?? []).map(toGatewayHttpNotification),
      unreadCount: response.unread_count ?? 0
    };
  }

  async getNotification(input: {
    identityId: string;
    notificationId: string;
    requestId?: string;
  }) {
    const response = await this.communicationGrpcClient.getNotification(
      {
        identity_id: input.identityId,
        notification_id: input.notificationId
      },
      input.requestId
    );

    return {
      notification: toGatewayHttpNotification(response.notification)
    };
  }

  async markNotificationRead(input: {
    identityId: string;
    notificationId: string;
    requestId?: string;
  }) {
    const response = await this.communicationGrpcClient.markNotificationRead(
      {
        identity_id: input.identityId,
        notification_id: input.notificationId
      },
      input.requestId
    );

    return {
      notification: toGatewayHttpNotification(response.notification)
    };
  }

  async markAllNotificationsRead(input: { identityId: string; requestId?: string }) {
    const response = await this.communicationGrpcClient.markAllNotificationsRead(
      { identity_id: input.identityId },
      input.requestId
    );

    return {
      updatedCount: response.updated_count ?? 0
    };
  }

  async createNotification(input: {
    identityId: string;
    message: string;
    metadata?: Record<string, unknown>;
    requestId?: string;
    title: string;
    type: string;
  }) {
    const response = await this.communicationGrpcClient.createNotification(
      {
        identity_id: input.identityId,
        message: input.message,
        metadata_json: input.metadata ? JSON.stringify(input.metadata) : undefined,
        title: input.title,
        type: input.type
      },
      input.requestId
    );

    return toGatewayHttpNotification(response.notification);
  }
}
