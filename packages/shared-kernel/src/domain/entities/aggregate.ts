import { DomainEvent } from '../events/domain-event';
import { Entity } from './entities';

export abstract class AggregateRoot<Props> extends Entity<Props> {
    #domainEvents: DomainEvent[] = [];

    get domainEvents(): DomainEvent[] {
        return [...this.#domainEvents];
    }

    protected addDomainEvent(domainEvent: DomainEvent | DomainEvent[]): void {
        if (Array.isArray(domainEvent)) {
            this.#domainEvents.push(...domainEvent);
        } else {
            this.#domainEvents.push(domainEvent);
        }
    }

    clearDomainEvents(): void {
        this.#domainEvents = [];
    }

    pullDomainEvents(): DomainEvent[] {
        const events = [...this.#domainEvents];
        this.clearDomainEvents();
        return events;
    }
}
