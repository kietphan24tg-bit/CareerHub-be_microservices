import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  configureHttpRuntime,
  getRuntimeConfig,
  type EnvironmentVariables
} from '@careerhub/nest-common';
import { EMPLOYER_GRPC_PACKAGE_NAME } from '@careerhub/contracts';
import {
  type MicroserviceOptions,
  Transport
} from '@nestjs/microservices';
import { EmployerModule } from './employer.module';
import {
  getEmployerRuntimeConfig,
  type EmployerEnvironmentVariables
} from './config';

function resolveEmployerProtoPath(): string {
  const distRelativePath = join(
    __dirname,
    '..',
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    'employer',
    'v1',
    'employer.proto'
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
    'employer',
    'v1',
    'employer.proto'
  );
}

async function bootstrap() {
  const app = await NestFactory.create(EmployerModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<EmployerEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const employerRuntimeConfig = getEmployerRuntimeConfig(configService);

  app.connectMicroservice<MicroserviceOptions>({
    options: {
      loader: {
        defaults: true,
        enums: String,
        keepCase: true,
        longs: String,
        oneofs: true
      },
      package: EMPLOYER_GRPC_PACKAGE_NAME,
      protoPath: resolveEmployerProtoPath(),
      url: employerRuntimeConfig.grpcEmployerUrl
    },
    transport: Transport.GRPC
  });

  configureHttpRuntime(app, {
    runtimeConfig
  });

  await app.startAllMicroservices();
  await app.listen(runtimeConfig.port);
}

void bootstrap();
