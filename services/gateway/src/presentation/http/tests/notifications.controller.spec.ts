import assert from 'node:assert/strict';
import test from 'node:test';
import { NotificationsController } from '../notifications/notifications.controller';

const BASE_NOTIFICATION = {
  createdAt: '2026-06-01T08:00:00.000Z',
  id: 'notif-1',
  identityId: 'user-1',
  message: 'Your application was reviewed',
  metadata: null,
  readAt: null,
  title: 'Application Update',
  type: 'application_status'
};

const USER = { email: 'candidate@example.com', id: 'user-1', role: 'candidate' as const };

test('listNotifications returns notifications and unreadCount', async () => {
  const controller = new NotificationsController({
    async listNotifications() {
      return { notifications: [BASE_NOTIFICATION], unreadCount: 1 };
    },
    async getNotification() {
      throw new Error('unused');
    },
    async markNotificationRead() {
      throw new Error('unused');
    },
    async markAllNotificationsRead() {
      throw new Error('unused');
    },
    async createNotification() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.listNotifications(USER, 'req-1');

  assert.equal(response.data.notifications.length, 1);
  assert.equal(response.data.notifications[0]?.id, 'notif-1');
  assert.equal(response.data.unreadCount, 1);
  assert.equal(response.message, 'Notifications loaded successfully');
});

test('listNotifications returns empty list when no notifications', async () => {
  const controller = new NotificationsController({
    async listNotifications() {
      return { notifications: [], unreadCount: 0 };
    },
    async getNotification() {
      throw new Error('unused');
    },
    async markNotificationRead() {
      throw new Error('unused');
    },
    async markAllNotificationsRead() {
      throw new Error('unused');
    },
    async createNotification() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.listNotifications(USER, 'req-1');

  assert.equal(response.data.notifications.length, 0);
  assert.equal(response.data.unreadCount, 0);
});

test('getNotification returns the correct notification by id', async () => {
  const controller = new NotificationsController({
    async listNotifications() {
      throw new Error('unused');
    },
    async getNotification(input: { notificationId: string }) {
      assert.equal(input.notificationId, 'notif-1');
      return { notification: BASE_NOTIFICATION };
    },
    async markNotificationRead() {
      throw new Error('unused');
    },
    async markAllNotificationsRead() {
      throw new Error('unused');
    },
    async createNotification() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.getNotification(USER, 'notif-1', 'req-1');

  assert.equal(response.data.notification.id, 'notif-1');
  assert.equal(response.data.notification.identityId, 'user-1');
  assert.equal(response.message, 'Notification loaded successfully');
});

test('markNotificationAsRead returns notification with readAt set', async () => {
  const readNotification = { ...BASE_NOTIFICATION, readAt: '2026-06-01T09:00:00.000Z' };

  const controller = new NotificationsController({
    async listNotifications() {
      throw new Error('unused');
    },
    async getNotification() {
      throw new Error('unused');
    },
    async markNotificationRead(input: { notificationId: string }) {
      assert.equal(input.notificationId, 'notif-1');
      return { notification: readNotification };
    },
    async markAllNotificationsRead() {
      throw new Error('unused');
    },
    async createNotification() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.markNotificationAsRead(USER, 'notif-1', 'req-1');

  assert.equal(response.data.notification.id, 'notif-1');
  assert.ok(response.data.notification.readAt !== null);
  assert.equal(response.message, 'Notification marked as read successfully');
});

test('markAllNotificationsAsRead returns updatedCount', async () => {
  const controller = new NotificationsController({
    async listNotifications() {
      throw new Error('unused');
    },
    async getNotification() {
      throw new Error('unused');
    },
    async markNotificationRead() {
      throw new Error('unused');
    },
    async markAllNotificationsRead() {
      return { updatedCount: 3 };
    },
    async createNotification() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.markAllNotificationsAsRead(USER, 'req-1');

  assert.equal(response.data.updatedCount, 3);
  assert.equal(response.message, 'Notifications marked as read successfully');
});
