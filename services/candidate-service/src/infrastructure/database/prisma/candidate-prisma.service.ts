import {
  type DatabaseRuntimeConfig,
  InfrastructureError,
  PrismaLifecycleService
} from '@careerhub/infrastructure';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CandidatePrismaClient } from './candidate-prisma.types';

export class CandidatePrismaService extends PrismaLifecycleService<CandidatePrismaClient> {}

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

export function createCandidatePrismaClient(
  config: DatabaseRuntimeConfig
): CandidatePrismaClient {
  try {
    const { PrismaPg } = require('@prisma/adapter-pg') as {
      PrismaPg: new (options: { connectionString: string }) => unknown;
    };
    const { PrismaClient } = require(resolveGeneratedPrismaModulePath()) as {
      PrismaClient: new (options: {
        adapter: unknown;
      }) => CandidatePrismaClient;
    };
    const adapter = new PrismaPg({
      connectionString: config.databaseUrl
    });

    return new PrismaClient({
      adapter
    });
  } catch (error) {
    throw new InfrastructureError(
      'Candidate Prisma client is unavailable. Run prisma generate for candidate-service.',
      {
        cause: error instanceof Error ? error : undefined,
        code: 'CANDIDATE_PRISMA_CLIENT_UNAVAILABLE'
      }
    );
  }
}
