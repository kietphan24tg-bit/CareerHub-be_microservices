import { Injectable } from '@nestjs/common';
import type { GatewayCacheInvalidatedEvent } from '@careerhub/contracts';
import { GatewayRabbitMqPublisher } from '../infrastructure/messaging/rabbitmq/gateway-rabbitmq.publisher';

@Injectable()
export class GatewayService {
  constructor(private readonly publisher: GatewayRabbitMqPublisher) {}

  async publishTechnicalEvent(requestId?: string): Promise<GatewayCacheInvalidatedEvent> {
    const event: GatewayCacheInvalidatedEvent = {
      name: 'gateway.cache.invalidated.v1',
      occurredAt: new Date().toISOString(),
      payload: {
        cacheKey: 'gateway:bootstrap',
        reason: 'manual-trigger'
      },
      requestId,
      version: 1
    };

    await this.publisher.publish(event, {
      aggregate: 'cache',
      service: 'gateway'
    });

    return event;
  }
}
