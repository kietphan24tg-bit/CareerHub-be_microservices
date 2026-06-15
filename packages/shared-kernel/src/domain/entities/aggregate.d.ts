import { DomainEvent } from '../events/domain-event';
import { Entity } from './entities';
export declare abstract class AggregateRoot<Props> extends Entity<Props> {
    #private;
    get domainEvents(): DomainEvent[];
    protected addDomainEvent(domainEvent: DomainEvent | DomainEvent[]): void;
    clearDomainEvents(): void;
    pullDomainEvents(): DomainEvent[];
}
