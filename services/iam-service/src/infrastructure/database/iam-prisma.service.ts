import {
  type DatabaseRuntimeConfig,
  InfrastructureError,
  PrismaLifecycleService
} from '@careerhub/nest-common';
import type { IamPrismaClient } from './iam-prisma.types';

export class IamPrismaService extends PrismaLifecycleService<IamPrismaClient> {}

export function createIamPrismaClient(
  config: DatabaseRuntimeConfig
): IamPrismaClient {
  try {
    const { PrismaClient } = require('../../generated/prisma') as {
      PrismaClient: new (options: {
        datasources: { db: { url: string } };
      }) => IamPrismaClient;
    };

    return new PrismaClient({
      datasources: {
        db: {
          url: config.databaseUrl
        }
      }
    });
  } catch (error) {
    throw new InfrastructureError(
      'IAM Prisma client is unavailable. Run prisma generate for iam-service.',
      {
        cause: error instanceof Error ? error : undefined,
        code: 'IAM_PRISMA_CLIENT_UNAVAILABLE'
      }
    );
  }
}
