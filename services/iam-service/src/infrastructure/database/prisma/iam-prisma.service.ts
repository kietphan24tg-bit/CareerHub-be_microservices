import {
  type DatabaseRuntimeConfig,
  InfrastructureError,
  PrismaLifecycleService
} from '@careerhub/infrastructure';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { IamPrismaClient } from './iam-prisma.types';

export class IamPrismaService extends PrismaLifecycleService<IamPrismaClient> {}

function resolveGeneratedPrismaModulePath(): string {
  const distRelativePath = join(
    __dirname,
    '..',
    '..',
    '..',
    'generated',
    'prisma'
  );

  if (existsSync(distRelativePath)) {
    return distRelativePath;
  }

  return join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    'src',
    'generated',
    'prisma'
  );
}

export function createIamPrismaClient(
  config: DatabaseRuntimeConfig
): IamPrismaClient {
  try {
    const { PrismaPg } = require('@prisma/adapter-pg') as {
      PrismaPg: new (options: { connectionString: string }) => unknown;
    };
    const { PrismaClient } = require(resolveGeneratedPrismaModulePath()) as {
      PrismaClient: new (options: {
        adapter: unknown;
      }) => IamPrismaClient;
    };
    const adapter = new PrismaPg({
      connectionString: config.databaseUrl
    });

    return new PrismaClient({
      adapter
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
