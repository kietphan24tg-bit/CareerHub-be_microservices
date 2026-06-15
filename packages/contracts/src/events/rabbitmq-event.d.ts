import type { IntegrationEvent } from './integration-event';
export type IntegrationEventName = `${string}.v${number}`;
export type RabbitMqRoutingKey<TName extends IntegrationEventName = IntegrationEventName> = TName;
export declare function createIntegrationEvent<TPayload, TName extends IntegrationEventName>(name: TName, payload: TPayload, requestId?: string): IntegrationEvent<TPayload> & {
    name: TName;
};
export declare function toRabbitMqRoutingKey<TName extends IntegrationEventName>(eventName: TName): RabbitMqRoutingKey<TName>;
