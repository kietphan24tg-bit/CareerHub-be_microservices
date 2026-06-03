import { DomainEvent, type DomainEventProps } from '@careerhub/shared-kernel';

export type UserRoleChangedEventProps = DomainEventProps & {
  readonly previousRole: string;
  readonly nextRole: string;
};

export class UserRoleChangedEvent extends DomainEvent {
  readonly previousRole: string;
  readonly nextRole: string;

  constructor(props: UserRoleChangedEventProps) {
    super(props);
    this.previousRole = props.previousRole;
    this.nextRole = props.nextRole;
  }
}
