import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import {
  InMemoryMetricsRegistry,
  createRuntimeConfigModule,
  resolveGrpcProtoPath,
  type MetricsRegistry
} from '@careerhub/infrastructure';
import {
  APPLICATION_GRPC_PACKAGE_NAME,
  CANDIDATE_GRPC_PACKAGE_NAME,
  COMMUNICATION_GRPC_PACKAGE_NAME,
  EMPLOYER_GRPC_PACKAGE_NAME,
  IAM_GRPC_PACKAGE_NAME,
  JOB_GRPC_PACKAGE_NAME,
  WORKFLOW_GRPC_PACKAGE_NAME
} from '@careerhub/contracts';
import { ConfigService } from '@nestjs/config';
import { GatewayAuthService } from './application/auth/gateway-auth.service';
import { GatewayProfileService } from './application/profiles/gateway-profile.service';
import { GatewayResumeExportService } from './application/resumes/gateway-resume-export.service';
import { GatewayResumesService } from './application/resumes/gateway-resumes.service';
import { GatewayJobsService } from './application/jobs/gateway-jobs.service';
import { GatewayApplicationsService } from './application/applications/gateway-applications.service';
import { GatewayDashboardService } from './application/dashboard/gateway-dashboard.service';
import { GatewayInterviewsService } from './application/interviews/gateway-interviews.service';
import { GatewayNotificationsService } from './application/notifications/gateway-notifications.service';
import { GatewayOffersService } from './application/offers/gateway-offers.service';
import { GatewayRecruiterNotesService } from './application/recruiter-notes/gateway-recruiter-notes.service';
import { JobGrpcLookupAdapter } from './application/saved-jobs/adapters/job-grpc-lookup.adapter';
import { GatewaySavedJobsService } from './application/saved-jobs/gateway-saved-jobs.service';
import { JOB_LOOKUP_PORT } from './application/saved-jobs/ports/job-lookup.port';
import { GatewayRolesGuard } from './auth/guards/gateway-roles.guard';
import { GatewayJwtAuthGuard } from './auth/guards/gateway-jwt-auth.guard';
import { CandidateGrpcClient } from './infrastructure/transport/grpc/candidate-grpc.client';
import { ApplicationGrpcClient } from './infrastructure/transport/grpc/application-grpc.client';
import { CommunicationGrpcClient } from './infrastructure/transport/grpc/communication-grpc.client';
import { EmployerGrpcClient } from './infrastructure/transport/grpc/employer-grpc.client';
import { JobGrpcClient } from './infrastructure/transport/grpc/job-grpc.client';
import { WorkflowGrpcClient } from './infrastructure/transport/grpc/workflow-grpc.client';
import { AuthController } from './presentation/http/auth/auth.controller';
import { CandidateProfilesController } from './presentation/http/candidate-profiles/candidate-profiles.controller';
import { CompanyProfilesController } from './presentation/http/company-profiles/company-profiles.controller';
import { ResumesController } from './presentation/http/resumes/resumes.controller';
import { EmployerJobsController } from './presentation/http/jobs/employer-jobs.controller';
import { PublicJobsController } from './presentation/http/jobs/public-jobs.controller';
import { CandidateApplicationsController } from './presentation/http/applications/candidate-applications.controller';
import { CandidateDashboardController } from './presentation/http/dashboard/candidate-dashboard.controller';
import { EmployerApplicationsController } from './presentation/http/applications/employer-applications.controller';
import { CandidateInterviewsController } from './presentation/http/interviews/candidate-interviews.controller';
import { EmployerInterviewsController } from './presentation/http/interviews/employer-interviews.controller';
import { CandidateOffersController } from './presentation/http/offers/candidate-offers.controller';
import { EmployerOffersController } from './presentation/http/offers/employer-offers.controller';
import { EmployerDashboardController } from './presentation/http/dashboard/employer-dashboard.controller';
import { EmployerRecruiterNotesController } from './presentation/http/recruiter-notes/employer-recruiter-notes.controller';
import { NotificationsController } from './presentation/http/notifications/notifications.controller';
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

@Module({
  controllers: [
    AuthController,
    CandidateProfilesController,
    CandidateApplicationsController,
    CandidateDashboardController,
    CandidateInterviewsController,
    CandidateOffersController,
    CompanyProfilesController,
    EmployerApplicationsController,
    EmployerDashboardController,
    EmployerInterviewsController,
    EmployerOffersController,
    EmployerRecruiterNotesController,
    EmployerJobsController,
    NotificationsController,
    PublicJobsController,
    ResumesController,
    SavedJobsController,
    GatewayController
  ],
  imports: [
    createRuntimeConfigModule({ validate: validateGatewayEnvironment }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<GatewayEnvironmentVariables, true>
      ) => {
        const gatewayRuntimeConfig = getGatewayRuntimeConfig(configService);

        return [
          {
            name: 'short',
            ttl: gatewayRuntimeConfig.throttleShortTtlMs,
            limit: gatewayRuntimeConfig.throttleShortLimit
          },
          {
            name: 'medium',
            ttl: gatewayRuntimeConfig.throttleMediumTtlMs,
            limit: gatewayRuntimeConfig.throttleMediumLimit
          }
        ];
      }
    })
  ],
  providers: [
    GatewayAuthService,
    GatewayProfileService,
    GatewayResumeExportService,
    GatewayApplicationsService,
    GatewayDashboardService,
    GatewayInterviewsService,
    GatewayJobsService,
    GatewayNotificationsService,
    GatewayOffersService,
    GatewayRecruiterNotesService,
    GatewayResumesService,
    GatewaySavedJobsService,
    {
      provide: JOB_LOOKUP_PORT,
      useClass: JobGrpcLookupAdapter
    },
    GatewayJwtAuthGuard,
    GatewayRolesGuard,
    GatewayGrpcClient,
    ApplicationGrpcClient,
    CommunicationGrpcClient,
    CandidateGrpcClient,
    EmployerGrpcClient,
    IamGrpcClient,
    JobGrpcClient,
    WorkflowGrpcClient,
    {
      provide: GATEWAY_METRICS_TOKENS.registry,
      useFactory: (): MetricsRegistry => new InMemoryMetricsRegistry()
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
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
        application: {
          packageName: APPLICATION_GRPC_PACKAGE_NAME,
          protoPath: resolveGrpcProtoPath('application'),
          serviceUrl: gatewayRuntimeConfig.grpcApplicationUrl
        },
        candidate: {
          packageName: CANDIDATE_GRPC_PACKAGE_NAME,
          protoPath: resolveGrpcProtoPath('candidate'),
          serviceUrl: gatewayRuntimeConfig.grpcCandidateUrl
        },
        communication: {
          packageName: COMMUNICATION_GRPC_PACKAGE_NAME,
          protoPath: resolveGrpcProtoPath('communication'),
          serviceUrl: gatewayRuntimeConfig.grpcCommunicationUrl
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
        },
        workflow: {
          packageName: WORKFLOW_GRPC_PACKAGE_NAME,
          protoPath: resolveGrpcProtoPath('workflow'),
          serviceUrl: gatewayRuntimeConfig.grpcWorkflowUrl
        }
      })
    }
  ]
})
export class AppModule {}
