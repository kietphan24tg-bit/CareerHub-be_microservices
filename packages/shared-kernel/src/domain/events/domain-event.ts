import { UniqueEntityID } from '../entities/unique-entities';
import { ValidationError } from '../errors/validation-error';

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

export abstract class DomainEvent {
    readonly aggregateId: UniqueEntityID;
    readonly metadata: DomainEventMetadata;

    constructor(props: DomainEventProps) {
        if (!props) {
            throw new ValidationError('Domain event props are required');
        }

        if (!props.aggregateId) {
            throw new ValidationError('Domain event aggregate id is required');
        }

        this.aggregateId = props.aggregateId;
        this.metadata = {
            correlationId: props.metadata?.correlationId,
            causationId: props.metadata?.causationId,
            timestamp: props.metadata?.timestamp ?? Date.now(),
            userId: props.metadata?.userId
        };
    }
}
