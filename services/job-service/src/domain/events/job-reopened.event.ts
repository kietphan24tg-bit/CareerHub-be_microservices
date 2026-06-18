import { DomainEvent, type DomainEventProps } from '@careerhub/shared-kernel';

export class JobReopenedEvent extends DomainEvent {
  constructor(props: DomainEventProps) {
    super(props);
  }
}
