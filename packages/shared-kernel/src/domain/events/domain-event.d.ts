import { UniqueEntityID } from '../entities/unique-entities';
export type DomainEventMetadata = {
    /** Timestamp when this domain event occurred */
    readonly timestamp: number;
    /** ID for correlation purposes (for Integration Events,logs correlation, etc).
     */
    readonly correlationId?: string;
    /**
     * Causation id used to reconstruct execution order if needed
     */
    readonly causationId?: string;
    /**
     * User ID for debugging and logging purposes
     */
    readonly userId?: string;
};
export type DomainEventProps = {
    aggregateId: UniqueEntityID;
    metadata?: Partial<DomainEventMetadata>;
};
export declare abstract class DomainEvent {
    readonly aggregateId: UniqueEntityID;
    readonly metadata: DomainEventMetadata;
    constructor(props: DomainEventProps);
}
