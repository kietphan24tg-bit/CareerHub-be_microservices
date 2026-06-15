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
  type EnvironmentVariables,
  type PrismaReadinessCheck
} from '@careerhub/infrastructure';
import { COMMUNICATION_GRPC_PACKAGE_NAME } from '@careerhub/contracts';
import {
  type MicroserviceOptions,
  Transport
} from '@nestjs/microservices';
import { CommunicationModule } from './communication.module';
import {
  getCommunicationRuntimeConfig,
  type CommunicationEnvironmentVariables
} from './config';
import { COMMUNICATION_PRISMA_TOKENS } from './infrastructure';

function resolveCommunicationProtoPath(): string {
  const distRelativePath = join(
    __dirname,
    '..',
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    'communication',
    'v1',
    'communication.proto'
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
    'communication',
    'v1',
    'communication.proto'
  );
}

async function bootstrap() {
  const app = await NestFactory.create(CommunicationModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<CommunicationEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const communicationRuntimeConfig = getCommunicationRuntimeConfig(configService);
  const prismaReadinessCheck = app.get<PrismaReadinessCheck>(
    COMMUNICATION_PRISMA_TOKENS.readinessCheck
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
        package: COMMUNICATION_GRPC_PACKAGE_NAME,
        protoPath: resolveCommunicationProtoPath(),
        url: communicationRuntimeConfig.grpcCommunicationUrl
      },
      transport: Transport.GRPC
    }
  );
  configureGrpcRuntime(grpcMicroservice, runtime);

  await app.startAllMicroservices();
  await app.listen(runtimeConfig.port);
}

void bootstrap();
