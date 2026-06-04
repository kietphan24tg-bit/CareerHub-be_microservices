import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { IAM_GRPC_PACKAGE_NAME } from '@careerhub/contracts';
import { createRuntimeConfigModule } from '@careerhub/nest-common';
import type { ConfigService } from '@nestjs/config';
import { GatewayAuthService } from './application/gateway-auth.service';
import { AuthController } from './presentation/http/auth.controller';
import { GatewayController } from './presentation/http/gateway.controller';
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

@Module({
  controllers: [AuthController, GatewayController],
  imports: [createRuntimeConfigModule({ validate: validateGatewayEnvironment })],
  providers: [
    GatewayAuthService,
    GatewayGrpcClient,
    IamGrpcClient,
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
        iam: {
          packageName: IAM_GRPC_PACKAGE_NAME,
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
          serviceUrl: gatewayRuntimeConfig.grpcIamUrl
        }
      })
    }
  ]
})
export class AppModule {}
