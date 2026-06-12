import {
  type DatabaseRuntimeConfig,
  InfrastructureError,
  PrismaLifecycleService
} from '@careerhub/infrastructure';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { JobPrismaClient } from './job-prisma.types';

export class JobPrismaService extends PrismaLifecycleService<JobPrismaClient> {}

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

export function createJobPrismaClient(
  config: DatabaseRuntimeConfig
): JobPrismaClient {
  try {
    const { PrismaPg } = require('@prisma/adapter-pg') as {
      PrismaPg: new (options: { connectionString: string }) => unknown;
    };
    const { PrismaClient } = require(resolveGeneratedPrismaModulePath()) as {
      PrismaClient: new (options: {
        adapter: unknown;
      }) => JobPrismaClient;
    };
    const adapter = new PrismaPg({
      connectionString: config.databaseUrl
    });

    return new PrismaClient({
      adapter
    });
  } catch (error) {
    throw new InfrastructureError(
      'Job Prisma client is unavailable. Run prisma generate for job-service.',
      {
        cause: error instanceof Error ? error : undefined,
        code: 'JOB_PRISMA_CLIENT_UNAVAILABLE'
      }
    );
  }
}
