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
import { WORKFLOW_GRPC_PACKAGE_NAME } from '@careerhub/contracts';
import {
  type MicroserviceOptions,
  Transport
} from '@nestjs/microservices';
import { WorkflowModule } from './workflow.module';
import {
  getWorkflowRuntimeConfig,
  type WorkflowEnvironmentVariables
} from './config';
import { WORKFLOW_PRISMA_TOKENS } from './infrastructure';

function resolveWorkflowProtoPath(): string {
  const distRelativePath = join(
    __dirname,
    '..',
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    'workflow',
    'v1',
    'workflow.proto'
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
    'workflow',
    'v1',
    'workflow.proto'
  );
}

async function bootstrap() {
  const app = await NestFactory.create(WorkflowModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<WorkflowEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const workflowRuntimeConfig = getWorkflowRuntimeConfig(configService);
  const prismaReadinessCheck = app.get<PrismaReadinessCheck>(
    WORKFLOW_PRISMA_TOKENS.readinessCheck
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
      package: WORKFLOW_GRPC_PACKAGE_NAME,
      protoPath: resolveWorkflowProtoPath(),
      url: workflowRuntimeConfig.grpcWorkflowUrl
    },
    transport: Transport.GRPC
  });
  configureGrpcRuntime(grpcMicroservice, runtime);

  await app.startAllMicroservices();
  await app.listen(runtimeConfig.port);
}

void bootstrap();
