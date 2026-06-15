import type { PrismaClientLike } from '@careerhub/infrastructure';

export type NotificationPersistenceRecord = {
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

export type NotificationCreateInput = {
  id: string;
  identityId: string;
  message: string;
  metadataJson: string | null;
  sourceEventId?: string | null;
  title: string;
  type: string;
};

export type NotificationModelDelegate = {
  count(args: {
    where: { identityId: string; readAt: null };
  }): Promise<number>;
  create(args: {
    data: NotificationCreateInput;
  }): Promise<NotificationPersistenceRecord>;
  findFirst(args: {
    where:
      | { id: string; identityId: string }
      | { sourceEventId: string };
  }): Promise<NotificationPersistenceRecord | null>;
  findMany(args: {
    orderBy: { createdAt: 'desc' };
    where: { identityId: string };
  }): Promise<NotificationPersistenceRecord[]>;
  update(args: {
    data: { readAt: Date };
    where: { id: string; identityId: string };
  }): Promise<NotificationPersistenceRecord>;
  updateMany(args: {
    data: { readAt: Date };
    where: { identityId: string; readAt: null };
  }): Promise<{ count: number }>;
};

export type CommunicationPrismaClient = PrismaClientLike & {
  notification: NotificationModelDelegate;
};
