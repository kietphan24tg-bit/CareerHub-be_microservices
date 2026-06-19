import { Controller, Get, Headers, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GatewayNotificationsService } from '../../../application/notifications/gateway-notifications.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly gatewayNotificationsService: GatewayNotificationsService) {}

  @Get()
  async listNotifications(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayNotificationsService.listNotifications({
        identityId: user.id,
        requestId
      }),
      message: 'Notifications loaded successfully'
    };
  }

  @Patch('read-all')
  async markAllNotificationsAsRead(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayNotificationsService.markAllNotificationsRead({
        identityId: user.id,
        requestId
      }),
      message: 'Notifications marked as read successfully'
    };
  }

  @Get(':notificationId')
  async getNotification(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('notificationId') notificationId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayNotificationsService.getNotification({
        identityId: user.id,
        notificationId,
        requestId
      }),
      message: 'Notification loaded successfully'
    };
  }

  @Patch(':notificationId/read')
  async markNotificationAsRead(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('notificationId') notificationId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayNotificationsService.markNotificationRead({
        identityId: user.id,
        notificationId,
        requestId
      }),
      message: 'Notification marked as read successfully'
    };
  }
}
