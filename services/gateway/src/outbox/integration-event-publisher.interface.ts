import type { IntegrationEvent } from '@careerhub/contracts';

export interface IntegrationEventPublisher {
  publish(event: IntegrationEvent): Promise<void>;
}
