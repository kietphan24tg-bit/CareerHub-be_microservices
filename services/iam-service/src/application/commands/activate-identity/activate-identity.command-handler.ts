import type {
  IdentityDisabledEvent,
  UserRegisteredEvent,
  UserRoleChangedEvent
} from '../../../domain';
import { IdentityNotFoundError } from '../../errors';
import type { IamWriteTransaction, IdGenerator } from '../../ports';
import type { CurrentIdentityResponse } from '../../auth/responses/current-identity.response';
import { mapIamDomainEventToOutboxRecord } from '../../outbox/iam-outbox-event.mapper';
import type { ActivateIdentityCommand } from './activate-identity.command';

export class ActivateIdentityCommandHandler {
  constructor(
    private readonly writeTransaction: IamWriteTransaction,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(
    command: ActivateIdentityCommand
  ): Promise<CurrentIdentityResponse> {
    return this.writeTransaction.execute(
      async ({ identityRepository, outboxRepository }) => {
        const identity = await identityRepository.findById(command.identityId);

        if (!identity) {
          throw new IdentityNotFoundError(command.identityId);
        }

        identity.enable(
          command.requestId ? { correlationId: command.requestId } : undefined
        );
        await identityRepository.update(identity);

        const domainEvents = identity.pullDomainEvents() as Array<
          UserRegisteredEvent | UserRoleChangedEvent | IdentityDisabledEvent
        >;

        for (const domainEvent of domainEvents) {
          await outboxRepository.create(
            mapIamDomainEventToOutboxRecord(domainEvent, {
              createId: () => this.idGenerator.generate()
            })
          );
        }

        return {
          email: identity.email.value,
          identityId: identity.id.toString(),
          role: identity.role.value,
          status: identity.status.value
        };
      }
    );
  }
}
