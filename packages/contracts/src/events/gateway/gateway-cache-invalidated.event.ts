import type { IntegrationEvent } from '../integration-event';

export type GatewayCacheInvalidatedPayload = {
  cacheKey: string;
  reason: string;
};

export type GatewayCacheInvalidatedEvent = IntegrationEvent<GatewayCacheInvalidatedPayload> & {
  name: 'gateway.cache.invalidated.v1';
};
 