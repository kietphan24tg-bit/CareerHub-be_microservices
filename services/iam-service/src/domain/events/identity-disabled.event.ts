import { DomainEvent, type DomainEventProps } from '@careerhub/shared-kernel';

export type IdentityDisabledEventProps = DomainEventProps & {
  readonly previousStatus: string;
};

export class IdentityDisabledEvent extends DomainEvent {
  readonly previousStatus: string;

  constructor(props: IdentityDisabledEventProps) {
    super(props);
    this.previousStatus = props.previousStatus;
  }
}
