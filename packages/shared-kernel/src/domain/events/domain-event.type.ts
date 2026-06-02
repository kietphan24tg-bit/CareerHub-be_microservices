import type { DomainEvent, DomainEventMetadata, DomainEventProps } from './domain-event';

export type { DomainEventMetadata, DomainEventProps };

export type DomainEventName = string;

export type DomainEventEnvelope<TEvent extends DomainEvent = DomainEvent> = {
    name: DomainEventName;
    event: TEvent;
    metadata: DomainEventMetadata;
};
