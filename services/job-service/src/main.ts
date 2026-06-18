import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Redis from 'ioredis';
import { MeiliSearch } from 'meilisearch';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  configureGrpcRuntime,
  configureHttpRuntime,
  getRuntimeConfig,
  initializeOpenTelemetry,
  type ReadinessCheck,
  type PrismaReadinessCheck,
  type EnvironmentVariables
} from '@careerhub/infrastructure';
import { JOB_GRPC_PACKAGE_NAME } from '@careerhub/contracts';
import {
  type MicroserviceOptions,
  Transport
} from '@nestjs/microservices';
import { JobModule } from './job.module';
import {
  getJobRuntimeConfig,
  type JobEnvironmentVariables
} from './config';
import { JOB_PRISMA_TOKENS } from './infrastructure';

function resolveJobProtoPath(): string {
  const cwdRelativePath = join(
    process.cwd(),
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    'job',
    'v1',
    'job.proto'
  );

  if (existsSync(cwdRelativePath)) {
    return cwdRelativePath;
  }

  const distRelativePath = join(
    __dirname,
    '..',
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    'job',
    'v1',
    'job.proto'
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
    'packages',
    'contracts',
    'src',
    'grpc',
    'job',
    'v1',
    'job.proto'
  );
}

function createRedisReadinessCheck(redis: Redis, name: string): ReadinessCheck {
  return {
    check: async () => {
      const result = await redis.ping();
      if (result !== 'PONG') {
        throw new Error(`Unexpected Redis ping response: ${result}`);
      }

      return { redis: 'up' };
    },
    name
  };
}

function createMeilisearchReadinessCheck(
  client: MeiliSearch,
  name: string
): ReadinessCheck {
  return {
    check: async () => {
      await client.health();
      return { meilisearch: 'up' };
    },
    name
  };
}

async function bootstrap() {
  const app = await NestFactory.create(JobModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<JobEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const jobRuntimeConfig = getJobRuntimeConfig(configService);
  const prismaReadinessCheck = app.get<PrismaReadinessCheck>(
    JOB_PRISMA_TOKENS.readinessCheck
  );
  const readinessChecks: ReadinessCheck[] = [prismaReadinessCheck];

  if (jobRuntimeConfig.redisUrl) {
    const redis = new Redis(jobRuntimeConfig.redisUrl, {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });
    readinessChecks.push(createRedisReadinessCheck(redis, 'redis'));
  }

  if (jobRuntimeConfig.meilisearchHost) {
    const meilisearch = new MeiliSearch({
      apiKey: jobRuntimeConfig.meilisearchApiKey,
      host: jobRuntimeConfig.meilisearchHost
    });
    readinessChecks.push(
      createMeilisearchReadinessCheck(meilisearch, 'meilisearch')
    );
  }

  const runtime = configureHttpRuntime(app, {
    readinessChecks,
    runtimeConfig
  });
  initializeOpenTelemetry(runtimeConfig);

  const grpcMicroservice = app.connectMicroservice<MicroserviceOptions>(
    {
      options: {
        loader: {
          defaults: true,
          enums: String,
          keepCase: true,
          longs: String,
          oneofs: true
        },
        package: JOB_GRPC_PACKAGE_NAME,
        protoPath: resolveJobProtoPath(),
        url: jobRuntimeConfig.grpcJobUrl
      },
      transport: Transport.GRPC
    }
  );
  configureGrpcRuntime(grpcMicroservice, runtime);

  await app.startAllMicroservices();
  await app.listen(runtimeConfig.port);
}

void bootstrap();
