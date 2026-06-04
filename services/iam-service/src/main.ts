import 'reflect-metadata';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  configureHttpRuntime,
  getRuntimeConfig,
  type EnvironmentVariables
} from '@careerhub/nest-common';
import { IAM_GRPC_PACKAGE_NAME } from '@careerhub/contracts';
import {
  type MicroserviceOptions,
  Transport
} from '@nestjs/microservices';
import { IamModule } from './iam.module';
import { getIamRuntimeConfig, type IamEnvironmentVariables } from './config';

async function bootstrap() {
  const app = await NestFactory.create(IamModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<IamEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const iamRuntimeConfig = getIamRuntimeConfig(configService);

  app.connectMicroservice<MicroserviceOptions>({
    options: {
      package: IAM_GRPC_PACKAGE_NAME,
      protoPath: join(
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
      ),
      url: iamRuntimeConfig.grpcIamUrl
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
