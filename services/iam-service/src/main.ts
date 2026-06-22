import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  configureGrpcRuntime,
  configureHttpRuntime,
  getRuntimeConfig,
  initializeOpenTelemetry,
  resolveGrpcProtoPath,
  type MetricsRegistry,
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
import { IAM_METRICS_TOKENS, IAM_PRISMA_TOKENS } from './infrastructure';

async function bootstrap() {
  const app = await NestFactory.create(IamModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<IamEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const iamRuntimeConfig = getIamRuntimeConfig(configService);
  const metricsRegistry = app.get<MetricsRegistry>(IAM_METRICS_TOKENS.registry);
  const prismaReadinessCheck = app.get<PrismaReadinessCheck>(
    IAM_PRISMA_TOKENS.readinessCheck
  );

  const runtime = configureHttpRuntime(app, {
    metricsRegistry,
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
        protoPath: resolveGrpcProtoPath('iam'),
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
