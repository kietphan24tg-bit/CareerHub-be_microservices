import { DomainEvent, type DomainEventProps } from '@careerhub/shared-kernel';

export class JobUpdatedEvent extends DomainEvent {
  constructor(props: DomainEventProps) {
    super(props);
  }
}
