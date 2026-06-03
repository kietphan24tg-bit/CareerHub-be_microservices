import { Module } from '@nestjs/common';
import { createRuntimeConfigModule } from '@careerhub/nest-common';
import type { ConfigService } from '@nestjs/config';
import { GatewayController } from './presentation/http/gateway.controller';
import { GatewayService } from './application/gateway.service';
import { GRPC_CLIENT_OPTIONS } from './infrastructure/transport/grpc/grpc.constants';
import { GatewayGrpcClient } from './infrastructure/transport/grpc/gateway-grpc.client';
import { GatewayRabbitMqPublisher } from './infrastructure/messaging/rabbitmq/gateway-rabbitmq.publisher';
import { GatewayRabbitMqSubscriber } from './infrastructure/messaging/rabbitmq/gateway-rabbitmq.subscriber';
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
  controllers: [GatewayController],
  imports: [createRuntimeConfigModule({ validate: validateGatewayEnvironment })],
  providers: [
    GatewayService,
    GatewayGrpcClient,
    GatewayRabbitMqPublisher,
    GatewayRabbitMqSubscriber,
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
          packageName: 'careerhub.iam.v1',
          protoPath: 'packages/contracts/src/grpc/iam.proto',
          serviceUrl: gatewayRuntimeConfig.grpcIamUrl
        }
      })
    }
  ]
})
export class AppModule {}
