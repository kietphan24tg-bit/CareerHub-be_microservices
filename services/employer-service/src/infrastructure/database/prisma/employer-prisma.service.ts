import {
  type DatabaseRuntimeConfig,
  InfrastructureError,
  PrismaLifecycleService
} from '@careerhub/nest-common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { EmployerPrismaClient } from './employer-prisma.types';

export class EmployerPrismaService extends PrismaLifecycleService<EmployerPrismaClient> {}

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

export function createEmployerPrismaClient(
  config: DatabaseRuntimeConfig
): EmployerPrismaClient {
  try {
    const { PrismaPg } = require('@prisma/adapter-pg') as {
      PrismaPg: new (options: { connectionString: string }) => unknown;
    };
    const { PrismaClient } = require(resolveGeneratedPrismaModulePath()) as {
      PrismaClient: new (options: {
        adapter: unknown;
      }) => EmployerPrismaClient;
    };
    const adapter = new PrismaPg({
      connectionString: config.databaseUrl
    });

    return new PrismaClient({
      adapter
    });
  } catch (error) {
    throw new InfrastructureError(
      'Employer Prisma client is unavailable. Run prisma generate for employer-service.',
      {
        cause: error instanceof Error ? error : undefined,
        code: 'EMPLOYER_PRISMA_CLIENT_UNAVAILABLE'
      }
    );
  }
}
