import { InvalidIdentityStateError } from '../../../domain';
import type { IdentityRepository } from '../../ports';
import type { CancelPendingIdentityCommand } from './cancel-pending-identity.command';
import type { CancelPendingIdentityResult } from './cancel-pending-identity.result';

export class CancelPendingIdentityCommandHandler {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async execute(
    command: CancelPendingIdentityCommand
  ): Promise<CancelPendingIdentityResult> {
    const identity = await this.identityRepository.findById(command.identityId);

    if (!identity) {
      return {
        cancelled: true
      };
    }

    if (!identity.status.isPendingProfile()) {
      throw new InvalidIdentityStateError(
        'Only pending profile identities can be cancelled'
      );
    }

    await this.identityRepository.deleteById(command.identityId);

    return {
      cancelled: true
    };
  }
}
