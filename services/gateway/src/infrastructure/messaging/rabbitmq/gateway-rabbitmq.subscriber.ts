import { Injectable } from '@nestjs/common';
import { getRequestIdFromRabbitMqProperties } from '@careerhub/nest-common';

@Injectable()
export class GatewayRabbitMqSubscriber {
  extractRequestId(properties?: { headers?: Record<string, unknown> }): string | undefined {
    return getRequestIdFromRabbitMqProperties(properties);
  }
}
