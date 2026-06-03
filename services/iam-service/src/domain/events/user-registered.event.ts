import { DomainEvent, type DomainEventProps } from '@careerhub/shared-kernel';

export type UserRegisteredEventProps = DomainEventProps & {
  readonly acceptedTerms: boolean;
  readonly email: string;
  readonly role: string;
};

export class UserRegisteredEvent extends DomainEvent {
  readonly acceptedTerms: boolean;
  readonly email: string;
  readonly role: string;

  constructor(props: UserRegisteredEventProps) {
    super(props);
    this.acceptedTerms = props.acceptedTerms;
    this.email = props.email;
    this.role = props.role;
  }
}
