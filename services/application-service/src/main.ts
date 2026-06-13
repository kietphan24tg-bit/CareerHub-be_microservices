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
import { APPLICATION_GRPC_PACKAGE_NAME } from '@careerhub/contracts';
import {
  type MicroserviceOptions,
  Transport
} from '@nestjs/microservices';
import { ApplicationModule } from './application.module';
import {
  getApplicationRuntimeConfig,
  type ApplicationEnvironmentVariables
} from './config';
import { APPLICATION_PRISMA_TOKENS } from './infrastructure';

function resolveApplicationProtoPath(): string {
  const distRelativePath = join(
    __dirname,
    '..',
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    'application',
    'v1',
    'application.proto'
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
    'application',
    'v1',
    'application.proto'
  );
}

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<ApplicationEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const applicationRuntimeConfig = getApplicationRuntimeConfig(configService);
  const prismaReadinessCheck = app.get<PrismaReadinessCheck>(
    APPLICATION_PRISMA_TOKENS.readinessCheck
  );

  const runtime = configureHttpRuntime(app, {
    readinessChecks: [prismaReadinessCheck],
    runtimeConfig
  });
  initializeOpenTelemetry(runtimeConfig);

  const grpcMicroservice = app.connectMicroservice<MicroserviceOptions>({
    options: {
      loader: {
        defaults: true,
        enums: String,
        keepCase: true,
        longs: String,
        oneofs: true
      },
      package: APPLICATION_GRPC_PACKAGE_NAME,
      protoPath: resolveApplicationProtoPath(),
      url: applicationRuntimeConfig.grpcApplicationUrl
    },
    transport: Transport.GRPC
  });
  configureGrpcRuntime(grpcMicroservice, runtime);

  await app.startAllMicroservices();
  await app.listen(runtimeConfig.port);
}

void bootstrap();
