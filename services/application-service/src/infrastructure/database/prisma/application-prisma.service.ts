import {
  type DatabaseRuntimeConfig,
  InfrastructureError,
  PrismaLifecycleService
} from '@careerhub/infrastructure';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ApplicationPrismaClient } from './application-prisma.types';

export class ApplicationPrismaService extends PrismaLifecycleService<ApplicationPrismaClient> {}

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

export function createApplicationPrismaClient(
  config: DatabaseRuntimeConfig
): ApplicationPrismaClient {
  try {
    const { PrismaPg } = require('@prisma/adapter-pg') as {
      PrismaPg: new (options: { connectionString: string }) => unknown;
    };
    const { PrismaClient } = require(resolveGeneratedPrismaModulePath()) as {
      PrismaClient: new (options: {
        adapter: unknown;
      }) => ApplicationPrismaClient;
    };
    const adapter = new PrismaPg({
      connectionString: config.databaseUrl
    });

    return new PrismaClient({
      adapter
    });
  } catch (error) {
    throw new InfrastructureError(
      'Application Prisma client is unavailable. Run prisma generate for application-service.',
      {
        cause: error instanceof Error ? error : undefined,
        code: 'APPLICATION_PRISMA_CLIENT_UNAVAILABLE'
      }
    );
  }
}
