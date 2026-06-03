import { Inject, Injectable } from '@nestjs/common';
import type { IntegrationEvent } from '@careerhub/contracts';
import { createRabbitMqHeaders } from '@careerhub/nest-common';
import type {
  RabbitMqGatewayMessagingConfig,
  RabbitMqPublishContext
} from './rabbitmq.types';
import { GATEWAY_RUNTIME_CONFIG } from '../../../config/gateway.constants';
import type { GatewayRuntimeConfig } from '../../../config/gateway-runtime-config';

@Injectable()
export class GatewayRabbitMqPublisher {
  private readonly config: RabbitMqGatewayMessagingConfig;

  constructor(
    @Inject(GATEWAY_RUNTIME_CONFIG)
    gatewayRuntimeConfig: GatewayRuntimeConfig
  ) {
    this.config = {
      exchange: gatewayRuntimeConfig.rabbitMqExchange,
      prefetch: gatewayRuntimeConfig.rabbitMqPrefetch,
      url: process.env.BROKER_URL
    };
  }

  async publish(
    event: IntegrationEvent,
    context: RabbitMqPublishContext
  ): Promise<{
    exchange: string;
    message: string;
    routingKey: string;
  }> {
    const routingKey = `${context.service}.${context.aggregate}.${event.name.split('.').slice(-2).join('.')}`;
    const message = JSON.stringify(event);
    const headers = createRabbitMqHeaders(event.requestId);

    return {
      exchange: this.config.exchange,
      message: JSON.stringify({
        headers,
        payload: message,
        prefetch: this.config.prefetch,
        url: this.config.url
      }),
      routingKey
    };
  }
}
