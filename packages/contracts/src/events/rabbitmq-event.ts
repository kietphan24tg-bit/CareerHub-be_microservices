import type { IntegrationEvent } from './integration-event';

export type IntegrationEventName = `${string}.v${number}`;

export type RabbitMqRoutingKey<TName extends IntegrationEventName = IntegrationEventName> =
    TName;

export function createIntegrationEvent<
    TPayload,
    TName extends IntegrationEventName
>(
    name: TName,
    payload: TPayload,
    requestId?: string
): IntegrationEvent<TPayload> & { name: TName } {
    return {
        name,
        occurredAt: new Date().toISOString(),
        payload,
        requestId,
        version: 1
    };
}

export function toRabbitMqRoutingKey<TName extends IntegrationEventName>(
    eventName: TName
): RabbitMqRoutingKey<TName> {
    return eventName;
}
