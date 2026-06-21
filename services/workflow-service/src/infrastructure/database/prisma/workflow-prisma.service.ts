import {
  type DatabaseRuntimeConfig,
  InfrastructureError,
  PrismaLifecycleService
} from '@careerhub/infrastructure';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkflowPrismaClient } from './workflow-prisma.types';

export class WorkflowPrismaService extends PrismaLifecycleService<WorkflowPrismaClient> {}

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

export function createWorkflowPrismaClient(
  config: DatabaseRuntimeConfig
): WorkflowPrismaClient {
  try {
    const { PrismaPg } = require('@prisma/adapter-pg') as {
      PrismaPg: new (options: { connectionString: string }) => unknown;
    };
    const { PrismaClient } = require(resolveGeneratedPrismaModulePath()) as {
      PrismaClient: new (options: {
        adapter: unknown;
      }) => WorkflowPrismaClient;
    };
    const adapter = new PrismaPg({
      connectionString: config.databaseUrl
    });

    return new PrismaClient({
      adapter
    });
  } catch (error) {
    throw new InfrastructureError(
      'Workflow Prisma client is unavailable. Run prisma generate for workflow-service.',
      {
        cause: error instanceof Error ? error : undefined,
        code: 'WORKFLOW_PRISMA_CLIENT_UNAVAILABLE'
      }
    );
  }
}
