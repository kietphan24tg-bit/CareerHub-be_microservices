import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  InMemoryMetricsRegistry,
  type MetricsRegistry
} from '@careerhub/infrastructure';
import {
  CANDIDATE_GRPC_PACKAGE_NAME,
  EMPLOYER_GRPC_PACKAGE_NAME,
  IAM_GRPC_PACKAGE_NAME,
  JOB_GRPC_PACKAGE_NAME
} from '@careerhub/contracts';
import { createRuntimeConfigModule } from '@careerhub/infrastructure';
import { ConfigService } from '@nestjs/config';
import { GatewayAuthService } from './application/auth/gateway-auth.service';
import { GatewayProfileService } from './application/profiles/gateway-profile.service';
import { GatewayResumeExportService } from './application/resumes/gateway-resume-export.service';
import { GatewayResumesService } from './application/resumes/gateway-resumes.service';
import { GatewayJobsService } from './application/jobs/gateway-jobs.service';
import { JobGrpcLookupAdapter } from './application/saved-jobs/adapters/job-grpc-lookup.adapter';
import { GatewaySavedJobsService } from './application/saved-jobs/gateway-saved-jobs.service';
import { JOB_LOOKUP_PORT } from './application/saved-jobs/ports/job-lookup.port';
import { GatewayRolesGuard } from './auth/guards/gateway-roles.guard';
import { GatewayJwtAuthGuard } from './auth/guards/gateway-jwt-auth.guard';
import { CandidateGrpcClient } from './infrastructure/transport/grpc/candidate-grpc.client';
import { EmployerGrpcClient } from './infrastructure/transport/grpc/employer-grpc.client';
import { JobGrpcClient } from './infrastructure/transport/grpc/job-grpc.client';
import { AuthController } from './presentation/http/auth/auth.controller';
import { CandidateProfilesController } from './presentation/http/candidate-profiles/candidate-profiles.controller';
import { CompanyProfilesController } from './presentation/http/company-profiles/company-profiles.controller';
import { ResumesController } from './presentation/http/resumes/resumes.controller';
import { EmployerJobsController } from './presentation/http/jobs/employer-jobs.controller';
import { PublicJobsController } from './presentation/http/jobs/public-jobs.controller';
import { SavedJobsController } from './presentation/http/saved-jobs/saved-jobs.controller';
import { GatewayController } from './presentation/http/health/gateway.controller';
import { GRPC_CLIENT_OPTIONS } from './infrastructure/transport/grpc/grpc.constants';
import { GatewayGrpcClient } from './infrastructure/transport/grpc/gateway-grpc.client';
import { IamGrpcClient } from './infrastructure/transport/grpc/iam-grpc.client';
import {
  getGatewayRuntimeConfig,
  type GatewayRuntimeConfig
} from './config/gateway-runtime-config';
import {
  type GatewayEnvironmentVariables,
  validateGatewayEnvironment
} from './config/gateway-env.schema';
import {
  GATEWAY_METRICS_TOKENS,
  GATEWAY_RUNTIME_CONFIG
} from './config/gateway.constants';

function resolveGrpcProtoPath(
  serviceName: 'candidate' | 'employer' | 'iam' | 'job'
): string {
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
  controllers: [
    AuthController,
    CandidateProfilesController,
    CompanyProfilesController,
    EmployerJobsController,
    PublicJobsController,
    ResumesController,
    SavedJobsController,
    GatewayController
  ],
  imports: [createRuntimeConfigModule({ validate: validateGatewayEnvironment })],
  providers: [
    GatewayAuthService,
    GatewayProfileService,
    GatewayResumeExportService,
    GatewayJobsService,
    GatewayResumesService,
    GatewaySavedJobsService,
    {
      provide: JOB_LOOKUP_PORT,
      useClass: JobGrpcLookupAdapter
    },
    GatewayJwtAuthGuard,
    GatewayRolesGuard,
    GatewayGrpcClient,
    CandidateGrpcClient,
    EmployerGrpcClient,
    IamGrpcClient,
    JobGrpcClient,
    {
      provide: GATEWAY_METRICS_TOKENS.registry,
      useFactory: (): MetricsRegistry => new InMemoryMetricsRegistry()
    },
    {
      provide: APP_GUARD,
      useClass: GatewayJwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: GatewayRolesGuard
    },
    {
      provide: GATEWAY_RUNTIME_CONFIG,
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<GatewayEnvironmentVariables, true>
      ): GatewayRuntimeConfig => getGatewayRuntimeConfig(configService)
    },
    {
      provide: GRPC_CLIENT_OPTIONS,
      inject: [GATEWAY_RUNTIME_CONFIG],
      useFactory: (gatewayRuntimeConfig: GatewayRuntimeConfig) => ({
        candidate: {
          packageName: CANDIDATE_GRPC_PACKAGE_NAME,
          protoPath: resolveGrpcProtoPath('candidate'),
          serviceUrl: gatewayRuntimeConfig.grpcCandidateUrl
        },
        employer: {
          packageName: EMPLOYER_GRPC_PACKAGE_NAME,
          protoPath: resolveGrpcProtoPath('employer'),
          serviceUrl: gatewayRuntimeConfig.grpcEmployerUrl
        },
        iam: {
          packageName: IAM_GRPC_PACKAGE_NAME,
          protoPath: resolveGrpcProtoPath('iam'),
          serviceUrl: gatewayRuntimeConfig.grpcIamUrl
        },
        job: {
          packageName: JOB_GRPC_PACKAGE_NAME,
          protoPath: resolveGrpcProtoPath('job'),
          serviceUrl: gatewayRuntimeConfig.grpcJobUrl
        }
      })
    }
  ]
})
export class AppModule {}
