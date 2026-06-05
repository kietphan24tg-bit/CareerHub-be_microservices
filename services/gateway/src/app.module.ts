import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  CANDIDATE_GRPC_PACKAGE_NAME,
  EMPLOYER_GRPC_PACKAGE_NAME,
  IAM_GRPC_PACKAGE_NAME
} from '@careerhub/contracts';
import { createRuntimeConfigModule } from '@careerhub/nest-common';
import { ConfigService } from '@nestjs/config';
import { GatewayAuthService } from './application/gateway-auth.service';
import { GatewayRolesGuard } from './auth/guards/gateway-roles.guard';
import { GatewayJwtAuthGuard } from './auth/guards/gateway-jwt-auth.guard';
import { CandidateGrpcClient } from './infrastructure/transport/grpc/candidate-grpc.client';
import { EmployerGrpcClient } from './infrastructure/transport/grpc/employer-grpc.client';
import { AuthController } from './presentation/http/controllers/auth.controller';
import { GatewayController } from './presentation/http/controllers/gateway.controller';
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
import { GATEWAY_RUNTIME_CONFIG } from './config/gateway.constants';

function resolveGrpcProtoPath(serviceName: 'candidate' | 'employer' | 'iam'): string {
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
  controllers: [AuthController, GatewayController],
  imports: [createRuntimeConfigModule({ validate: validateGatewayEnvironment })],
  providers: [
    GatewayAuthService,
    GatewayJwtAuthGuard,
    GatewayRolesGuard,
    GatewayGrpcClient,
    CandidateGrpcClient,
    EmployerGrpcClient,
    IamGrpcClient,
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
        }
      })
    }
  ]
})
export class AppModule {}
