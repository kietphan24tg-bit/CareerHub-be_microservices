import {
    AggregateRoot,
    type CreateEntityProps,
    type DomainEventMetadata,
    UniqueEntityID,
    ValidationError
} from '@careerhub/shared-kernel';
import { IdentityDisabledError, InvalidIdentityStateError } from '../errors';
import {
    IdentityDisabledEvent,
    UserRegisteredEvent,
    UserRoleChangedEvent
} from '../events';
import { Email, IdentityStatus, PasswordHash, Role } from '../value-objects';

export type IdentityProps = {
    acceptedTerms: boolean;
    email: Email;
    passwordHash: PasswordHash;
    role: Role;
    status: IdentityStatus;
};

export type RegisterIdentityProps = {
    acceptedTerms: boolean;
    id: UniqueEntityID;
    email: Email;
    passwordHash: PasswordHash;
    role: Role;
    createdAt?: Date;
    metadata?: Partial<DomainEventMetadata>;
};

type ReconstituteIdentityProps = CreateEntityProps<IdentityProps>;

export class Identity extends AggregateRoot<IdentityProps> {
    private readonly propsRef: IdentityProps;

    private constructor(props: ReconstituteIdentityProps) {
        super(props);
        this.propsRef = props.props;
    }

    static register(props: RegisterIdentityProps): Identity {
        return new Identity({
            id: props.id,
            createdAt: props.createdAt ?? new Date(),
            updatedAt: props.createdAt ?? new Date(),
            props: {
                acceptedTerms: props.acceptedTerms,
                email: props.email,
                passwordHash: props.passwordHash,
                role: props.role,
                status: IdentityStatus.pendingProfile()
            }
        });
    }

    static reconstitute(props: ReconstituteIdentityProps): Identity {
        return new Identity(props);
    }

    get email(): Email {
        return this.propsRef.email;
    }

    get acceptedTerms(): boolean {
        return this.propsRef.acceptedTerms;
    }

    get passwordHash(): PasswordHash {
        return this.propsRef.passwordHash;
    }

    get role(): Role {
        return this.propsRef.role;
    }

    get status(): IdentityStatus {
        return this.propsRef.status;
    }

    changeRole(nextRole: Role, metadata?: Partial<DomainEventMetadata>): void {
        const props = this.propsRef;

        if (props.role.equals(nextRole)) {
            return;
        }

        const previousRole = props.role;
        this.replaceProps({
            ...props,
            role: nextRole
        });

        this.addDomainEvent(
            new UserRoleChangedEvent({
                aggregateId: this.id,
                previousRole: previousRole.value,
                nextRole: nextRole.value,
                metadata
            })
        );
    }

    disable(metadata?: Partial<DomainEventMetadata>): void {
        const props = this.propsRef;

        if (props.status.isDisabled()) {
            throw new InvalidIdentityStateError('Identity is already disabled');
        }

        const previousStatus = props.status;
        this.replaceProps({
            ...props,
            status: IdentityStatus.disabled()
        });

        this.addDomainEvent(
            new IdentityDisabledEvent({
                aggregateId: this.id,
                previousStatus: previousStatus.value,
                metadata
            })
        );
    }

    enable(metadata?: Partial<DomainEventMetadata>): void {
        const props = this.propsRef;

        if (props.status.isActive()) {
            throw new InvalidIdentityStateError('Identity is already active');
        }

        const previousStatus = props.status;
        this.replaceProps({
            ...props,
            status: IdentityStatus.active()
        });

        if (previousStatus.isPendingProfile()) {
            this.addDomainEvent(
                new UserRegisteredEvent({
                    aggregateId: this.id,
                    acceptedTerms: this.acceptedTerms,
                    email: this.email.value,
                    metadata,
                    role: this.role.value
                })
            );
        }
    }

    changePassword(nextPasswordHash: PasswordHash): void {
        const props = this.propsRef;

        if (props.status.isDisabled()) {
            throw new IdentityDisabledError();
        }

        if (props.passwordHash.equals(nextPasswordHash)) {
            return;
        }

        this.replaceProps({
            ...props,
            passwordHash: nextPasswordHash
        });
    }

    validate(): void {
        const props = this.getProps();

        if (props.acceptedTerms !== true) {
            throw new ValidationError(
                'Identity accepted terms must be true'
            );
        }

        if (!(props.email instanceof Email)) {
            throw new ValidationError(
                'Identity email must be an Email value object'
            );
        }

        if (!(props.passwordHash instanceof PasswordHash)) {
            throw new ValidationError(
                'Identity password hash must be a PasswordHash value object'
            );
        }

        if (!(props.role instanceof Role)) {
            throw new ValidationError(
                'Identity role must be a Role value object'
            );
        }

        if (!(props.status instanceof IdentityStatus)) {
            throw new ValidationError(
                'Identity status must be an IdentityStatus value object'
            );
        }
    }

    private replaceProps(props: IdentityProps): void {
        this.propsRef.acceptedTerms = props.acceptedTerms;
        this.propsRef.email = props.email;
        this.propsRef.passwordHash = props.passwordHash;
        this.propsRef.role = props.role;
        this.propsRef.status = props.status;
    }
}
