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
import {
  CANDIDATE_METRICS_TOKENS,
  CANDIDATE_PRISMA_TOKENS
} from './infrastructure';

async function bootstrap() {
  const app = await NestFactory.create(CandidateModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<CandidateEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const candidateRuntimeConfig = getCandidateRuntimeConfig(configService);
  const metricsRegistry = app.get<MetricsRegistry>(CANDIDATE_METRICS_TOKENS.registry);
  const prismaReadinessCheck = app.get<PrismaReadinessCheck>(
    CANDIDATE_PRISMA_TOKENS.readinessCheck
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
        package: CANDIDATE_GRPC_PACKAGE_NAME,
        protoPath: resolveGrpcProtoPath('candidate'),
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
