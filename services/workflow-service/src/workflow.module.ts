import {
  createPrismaModule,
  createRuntimeConfigModule
} from '@careerhub/infrastructure';
import {
  CANDIDATE_GRPC_PACKAGE_NAME,
  EMPLOYER_GRPC_PACKAGE_NAME,
  IAM_GRPC_PACKAGE_NAME
} from '@careerhub/contracts';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RegisterCandidateCommandHandler,
  RegisterEmployerCommandHandler,
  RegistrationSagaOrchestrator,
  WORKFLOW_PORT_TOKENS
} from './application';
import { getWorkflowRuntimeConfig, validateWorkflowEnvironment } from './config';
import {
  CandidateGrpcClient,
  EmployerGrpcClient,
  GRPC_CLIENT_OPTIONS,
  IamGrpcClient,
  InternalGrpcClient,
  PrismaRegistrationSagaRepository,
  RegistrationSagaRecoveryProcessor,
  createWorkflowPrismaClient,
  WorkflowPrismaService,
  WORKFLOW_PRISMA_TOKENS,
  UuidIdGenerator
} from './infrastructure';
import { WorkflowGrpcController } from './presentation';
import type { WorkflowEnvironmentVariables, WorkflowRuntimeConfig } from './config';

function resolveGrpcProtoPath(
  serviceName: 'candidate' | 'employer' | 'iam'
): string {
  const { existsSync } = require('node:fs') as typeof import('node:fs');
  const { join } = require('node:path') as typeof import('node:path');
  const distRelativePath = join(
    __dirname,
    '..',
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    serviceName,
    'v1',
    `${serviceName}.proto`
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
    serviceName,
    'v1',
    `${serviceName}.proto`
  );
}

@Module({
  controllers: [WorkflowGrpcController],
  imports: [
    createRuntimeConfigModule({
      validate: validateWorkflowEnvironment
    }),
    createPrismaModule({
      clientToken: WORKFLOW_PRISMA_TOKENS.client,
      createClient: createWorkflowPrismaClient,
      createService: (client) => new WorkflowPrismaService(client),
      readinessCheckName: 'workflow-prisma',
      readinessCheckToken: WORKFLOW_PRISMA_TOKENS.readinessCheck,
      serviceToken: WORKFLOW_PRISMA_TOKENS.service
    })
  ],
  providers: [
    InternalGrpcClient,
    CandidateGrpcClient,
    EmployerGrpcClient,
    IamGrpcClient,
    RegistrationSagaRecoveryProcessor,
    {
      provide: WORKFLOW_PORT_TOKENS.registrationSagaRepository,
      inject: [WORKFLOW_PRISMA_TOKENS.service],
      useFactory: (prismaService: WorkflowPrismaService) =>
        new PrismaRegistrationSagaRepository(prismaService)
    },
    {
      provide: WORKFLOW_PORT_TOKENS.idGenerator,
      useClass: UuidIdGenerator
    },
    {
      provide: RegistrationSagaOrchestrator,
      inject: [
        WORKFLOW_PORT_TOKENS.registrationSagaRepository,
        WORKFLOW_PORT_TOKENS.idGenerator,
        IamGrpcClient,
        CandidateGrpcClient,
        EmployerGrpcClient
      ],
      useFactory: (
        registrationSagaRepository: PrismaRegistrationSagaRepository,
        idGenerator: UuidIdGenerator,
        iamGrpcClient: IamGrpcClient,
        candidateGrpcClient: CandidateGrpcClient,
        employerGrpcClient: EmployerGrpcClient
      ) =>
        new RegistrationSagaOrchestrator(
          registrationSagaRepository,
          idGenerator,
          iamGrpcClient,
          candidateGrpcClient,
          employerGrpcClient
        )
    },
    {
      provide: RegisterCandidateCommandHandler,
      inject: [RegistrationSagaOrchestrator],
      useFactory: (registrationSagaOrchestrator: RegistrationSagaOrchestrator) =>
        new RegisterCandidateCommandHandler(registrationSagaOrchestrator)
    },
    {
      provide: RegisterEmployerCommandHandler,
      inject: [RegistrationSagaOrchestrator],
      useFactory: (registrationSagaOrchestrator: RegistrationSagaOrchestrator) =>
        new RegisterEmployerCommandHandler(registrationSagaOrchestrator)
    },
    {
      provide: GRPC_CLIENT_OPTIONS,
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<WorkflowEnvironmentVariables, true>
      ) => {
        const workflowRuntimeConfig =
          getWorkflowRuntimeConfig(configService) as WorkflowRuntimeConfig;

        return {
          candidate: {
            deadlineMs: workflowRuntimeConfig.grpcDeadlineMs,
            packageName: CANDIDATE_GRPC_PACKAGE_NAME,
            protoPath: resolveGrpcProtoPath('candidate'),
            serviceUrl: workflowRuntimeConfig.grpcCandidateUrl
          },
          employer: {
            deadlineMs: workflowRuntimeConfig.grpcDeadlineMs,
            packageName: EMPLOYER_GRPC_PACKAGE_NAME,
            protoPath: resolveGrpcProtoPath('employer'),
            serviceUrl: workflowRuntimeConfig.grpcEmployerUrl
          },
          iam: {
            deadlineMs: workflowRuntimeConfig.grpcDeadlineMs,
            packageName: IAM_GRPC_PACKAGE_NAME,
            protoPath: resolveGrpcProtoPath('iam'),
            serviceUrl: workflowRuntimeConfig.grpcIamUrl
          }
        };
      }
    }
  ]
})
export class WorkflowModule {}
