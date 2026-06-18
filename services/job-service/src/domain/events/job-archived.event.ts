import { DomainEvent, type DomainEventProps } from '@careerhub/shared-kernel';

export class JobArchivedEvent extends DomainEvent {
  constructor(props: DomainEventProps) {
    super(props);
  }
}
