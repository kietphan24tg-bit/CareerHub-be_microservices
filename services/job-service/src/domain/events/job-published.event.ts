import { DomainEvent, type DomainEventProps } from '@careerhub/shared-kernel';

export class JobPublishedEvent extends DomainEvent {
  constructor(props: DomainEventProps) {
    super(props);
  }
}
