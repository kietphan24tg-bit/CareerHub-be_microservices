import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  configureGrpcRuntime,
  configureHttpRuntime,
  getRuntimeConfig,
  initializeOpenTelemetry,
  type PrismaReadinessCheck,
  type EnvironmentVariables
} from '@careerhub/infrastructure';
import { CANDIDATE_GRPC_PACKAGE_NAME } from '@careerhub/contracts';
import {
  type MicroserviceOptions,
  Transport
} from '@nestjs/microservices';
import { CandidateModule } from './candidate.module';
import {
  getCandidateRuntimeConfig,
  type CandidateEnvironmentVariables
} from './config';
import { CANDIDATE_PRISMA_TOKENS } from './infrastructure';

function resolveCandidateProtoPath(): string {
  const distRelativePath = join(
    __dirname,
    '..',
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    'candidate',
    'v1',
    'candidate.proto'
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
    'candidate',
    'v1',
    'candidate.proto'
  );
}

async function bootstrap() {
  const app = await NestFactory.create(CandidateModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<CandidateEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const candidateRuntimeConfig = getCandidateRuntimeConfig(configService);
  const prismaReadinessCheck = app.get<PrismaReadinessCheck>(
    CANDIDATE_PRISMA_TOKENS.readinessCheck
  );

  const runtime = configureHttpRuntime(app, {
    readinessChecks: [prismaReadinessCheck],
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
        package: CANDIDATE_GRPC_PACKAGE_NAME,
        protoPath: resolveCandidateProtoPath(),
        url: candidateRuntimeConfig.grpcCandidateUrl
      },
      transport: Transport.GRPC
    }
  );
  configureGrpcRuntime(grpcMicroservice, runtime);

  await app.startAllMicroservices();
  await app.listen(runtimeConfig.port);
}

void bootstrap();
