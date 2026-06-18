import { DomainEvent, type DomainEventProps } from '@careerhub/shared-kernel';

export class JobClosedEvent extends DomainEvent {
  constructor(props: DomainEventProps) {
    super(props);
  }
}
