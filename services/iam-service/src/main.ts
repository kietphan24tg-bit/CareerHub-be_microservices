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
import { IAM_GRPC_PACKAGE_NAME } from '@careerhub/contracts';
import {
  type MicroserviceOptions,
  Transport
} from '@nestjs/microservices';
import { IamModule } from './iam.module';
import { getIamRuntimeConfig, type IamEnvironmentVariables } from './config';
import { IAM_PRISMA_TOKENS } from './infrastructure';

function resolveIamProtoPath(): string {
  const distRelativePath = join(
    __dirname,
    '..',
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    'iam',
    'v1',
    'iam.proto'
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
    'iam',
    'v1',
    'iam.proto'
  );
}

async function bootstrap() {
  const app = await NestFactory.create(IamModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<IamEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const iamRuntimeConfig = getIamRuntimeConfig(configService);
  const prismaReadinessCheck = app.get<PrismaReadinessCheck>(
    IAM_PRISMA_TOKENS.readinessCheck
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
        package: IAM_GRPC_PACKAGE_NAME,
        protoPath: resolveIamProtoPath(),
        url: iamRuntimeConfig.grpcIamUrl
      },
      transport: Transport.GRPC
    }
  );
  configureGrpcRuntime(grpcMicroservice, runtime);

  await app.startAllMicroservices();
  await app.listen(runtimeConfig.port);
}

void bootstrap();
