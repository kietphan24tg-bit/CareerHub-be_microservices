import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import {
  Identity,
  Email,
  PasswordHash,
  Role
} from '../../../domain';
import { IdentityAlreadyExistsError } from '../../errors';
import type {
  IdGenerator,
  IamWriteTransaction,
  IdentityRepository,
  PasswordHasher
} from '../../ports';
import type { RegisterIdentityCommand } from './register-identity.command';
import type { RegisterIdentityResult } from './register-identity.result';

export class RegisterIdentityCommandHandler {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly writeTransaction: IamWriteTransaction,
    private readonly idGenerator: IdGenerator,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(command: RegisterIdentityCommand): Promise<RegisterIdentityResult> {
    const email = new Email(command.email);
    const role = new Role(command.role);

    if (command.acceptedTerms !== true) {
      throw new ValidationError('Identity accepted terms must be true');
    }

    if (await this.identityRepository.existsByEmail(email)) {
      throw new IdentityAlreadyExistsError(email.value);
    }

    const passwordHash = new PasswordHash(
      await this.passwordHasher.hash(command.password)
    );

    return this.writeTransaction.execute(
      async ({ identityRepository }) => {
        const identity = Identity.register({
          acceptedTerms: command.acceptedTerms,
          email,
          id: new UniqueEntityID(this.idGenerator.generate()),
          metadata: command.requestId
            ? { correlationId: command.requestId }
            : undefined,
          passwordHash,
          role
        });

        await identityRepository.save(identity);

        const domainEvents = identity.pullDomainEvents();

        return {
          createdAt: identity.createdAt?.toISOString() ?? new Date().toISOString(),
          domainEvents,
          email: identity.email.value,
          identityId: identity.id.toString(),
          role: identity.role.value,
          status: identity.status.value
        };
      }
    );
  }
}
