import type {
  CreateNotificationRecord,
  NotificationRecord,
  NotificationRepository
} from '../../../application';
import { CommunicationPrismaService } from '../prisma/communication-prisma.service';
import type { NotificationPersistenceRecord } from '../prisma/communication-prisma.types';

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prismaService: CommunicationPrismaService) {}

  private mapRecord(record: NotificationPersistenceRecord): NotificationRecord {
    return {
      createdAt: record.createdAt,
      id: record.id,
      identityId: record.identityId,
      message: record.message,
      metadataJson: record.metadataJson,
      readAt: record.readAt,
      sourceEventId: record.sourceEventId,
      title: record.title,
      type: record.type
    };
  }

  async countUnreadByIdentityId(identityId: string): Promise<number> {
    return this.prismaService.prisma.notification.count({
      where: {
        identityId,
        readAt: null
      }
    });
  }

  async create(notification: CreateNotificationRecord): Promise<NotificationRecord> {
    const created = await this.prismaService.prisma.notification.create({
      data: notification
    });

    return this.mapRecord(created);
  }

  async findByIdAndIdentityId(
    notificationId: string,
    identityId: string
  ): Promise<NotificationRecord | null> {
    const record = await this.prismaService.prisma.notification.findFirst({
      where: {
        id: notificationId,
        identityId
      }
    });

    return record ? this.mapRecord(record) : null;
  }

  async findBySourceEventId(sourceEventId: string): Promise<NotificationRecord | null> {
    const record = await this.prismaService.prisma.notification.findFirst({
      where: {
        sourceEventId
      }
    });

    return record ? this.mapRecord(record) : null;
  }

  async listByIdentityId(identityId: string): Promise<NotificationRecord[]> {
    const records = await this.prismaService.prisma.notification.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      where: {
        identityId
      }
    });

    return records.map((record) => this.mapRecord(record));
  }

  async markAllReadByIdentityId(identityId: string): Promise<number> {
    const result = await this.prismaService.prisma.notification.updateMany({
      data: {
        readAt: new Date()
      },
      where: {
        identityId,
        readAt: null
      }
    });

    return result.count;
  }

  async markRead(
    notificationId: string,
    identityId: string,
    readAt: Date
  ): Promise<NotificationRecord | null> {
    try {
      const updated = await this.prismaService.prisma.notification.update({
        data: {
          readAt
        },
        where: {
          id: notificationId,
          identityId
        }
      });

      return this.mapRecord(updated);
    } catch {
      return null;
    }
  }
}
