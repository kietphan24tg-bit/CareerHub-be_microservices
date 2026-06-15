import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { NotificationNotFoundError } from '../errors/notification-not-found.error';
import type {
  CreateNotificationRecord,
  NotificationRecord,
  NotificationRepository
} from '../ports';
import { NotificationOperationsService } from './notification-operations.service';

function makeNotification(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    createdAt: new Date('2026-06-12T00:00:00.000Z'),
    id: 'notification-1',
    identityId: 'identity-1',
    message: 'A candidate applied to your job posting.',
    metadataJson: '{"applicationId":"application-1"}',
    readAt: null,
    sourceEventId: null,
    title: 'New application received',
    type: 'application_received',
    ...overrides
  };
}

function createRepository(seed: NotificationRecord[] = [makeNotification()]): NotificationRepository {
  const records = [...seed];

  return {
    async countUnreadByIdentityId(identityId: string) {
      return records.filter(
        (record) => record.identityId === identityId && record.readAt === null
      ).length;
    },
    async create(notification: CreateNotificationRecord) {
      const created = makeNotification({
        createdAt: new Date('2026-06-12T01:00:00.000Z'),
        id: notification.id,
        identityId: notification.identityId,
        message: notification.message,
        metadataJson: notification.metadataJson,
        readAt: null,
        sourceEventId: notification.sourceEventId ?? null,
        title: notification.title,
        type: notification.type
      });
      records.push(created);
      return created;
    },
    async findByIdAndIdentityId(notificationId: string, identityId: string) {
      return (
        records.find(
          (record) => record.id === notificationId && record.identityId === identityId
        ) ?? null
      );
    },
    async findBySourceEventId(sourceEventId: string) {
      return records.find((record) => record.sourceEventId === sourceEventId) ?? null;
    },
    async listByIdentityId(identityId: string) {
      return records.filter((record) => record.identityId === identityId);
    },
    async markAllReadByIdentityId(identityId: string) {
      let updatedCount = 0;

      for (const record of records) {
        if (record.identityId === identityId && record.readAt === null) {
          record.readAt = new Date('2026-06-12T02:00:00.000Z');
          updatedCount += 1;
        }
      }

      return updatedCount;
    },
    async markRead(notificationId: string, identityId: string, readAt: Date) {
      const record = records.find(
        (item) => item.id === notificationId && item.identityId === identityId
      );

      if (!record) {
        return null;
      }

      record.readAt = readAt;
      return record;
    }
  };
}

function createService(seed?: NotificationRecord[]) {
  return new NotificationOperationsService(createRepository(seed), {
    generate() {
      return 'notification-created';
    }
  });
}

test('listNotifications returns notifications and unreadCount', async () => {
  const service = createService([
    makeNotification(),
    makeNotification({
      id: 'notification-2',
      readAt: new Date('2026-06-12T01:00:00.000Z')
    })
  ]);

  const result = await service.listNotifications('identity-1');

  assert.equal(result.notifications.length, 2);
  assert.equal(result.unreadCount, 1);
});

test('getNotification enforces ownership by identity id', async () => {
  const service = createService();

  const notification = await service.getNotification('identity-1', 'notification-1');
  assert.equal(notification.id, 'notification-1');

  await assert.rejects(
    () => service.getNotification('identity-2', 'notification-1'),
    NotificationNotFoundError
  );
});

test('markNotificationRead marks unread notification and is idempotent when already read', async () => {
  const service = createService();

  const marked = await service.markNotificationRead('identity-1', 'notification-1');
  assert.ok(marked.readAt);

  const markedAgain = await service.markNotificationRead('identity-1', 'notification-1');
  assert.equal(markedAgain.id, 'notification-1');
});

test('markAllNotificationsRead returns updated count', async () => {
  const service = createService([
    makeNotification(),
    makeNotification({ id: 'notification-2' })
  ]);

  const updatedCount = await service.markAllNotificationsRead('identity-1');

  assert.equal(updatedCount, 2);
});

test('createNotification validates required fields', async () => {
  const service = createService([]);

  await assert.rejects(
    () =>
      service.createNotification({
        identityId: ' ',
        message: 'Message',
        title: 'Title',
        type: 'application_received'
      }),
    ValidationError
  );

  const created = await service.createNotification({
    identityId: 'identity-1',
    message: 'Message body',
    metadataJson: '{"applicationId":"application-1"}',
    title: 'Title',
    type: 'application_received'
  });

  assert.equal(created.id, 'notification-created');
  assert.equal(created.identityId, 'identity-1');
});

test('createNotificationIfNew returns existing notification for duplicate sourceEventId', async () => {
  const service = createService([
    makeNotification({
      id: 'existing-notification',
      sourceEventId: 'event-1'
    })
  ]);

  const result = await service.createNotificationIfNew({
    identityId: 'identity-1',
    message: 'Message body',
    sourceEventId: 'event-1',
    title: 'Title',
    type: 'application_received'
  });

  assert.equal(result.created, false);
  assert.equal(result.notification.id, 'existing-notification');
});

test('createNotificationIfNew creates notification when sourceEventId is new', async () => {
  const service = createService([]);

  const result = await service.createNotificationIfNew({
    identityId: 'identity-1',
    message: 'Message body',
    sourceEventId: 'event-2',
    title: 'Title',
    type: 'application_received'
  });

  assert.equal(result.created, true);
  assert.equal(result.notification.id, 'notification-created');
  assert.equal(result.notification.sourceEventId, 'event-2');
});