import { IdentityNotFoundError } from '../../errors';
import type { IdentityRepository } from '../../ports';
import type { CurrentIdentityResponse } from '../responses/current-identity.response';

type ActivateIdentityCommand = {
  identityId: string;
};

export class ActivateIdentityUseCase {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async execute(
    command: ActivateIdentityCommand
  ): Promise<CurrentIdentityResponse> {
    const identity = await this.identityRepository.findById(command.identityId);

    if (!identity) {
      throw new IdentityNotFoundError(command.identityId);
    }

    identity.enable();
    await this.identityRepository.update(identity);

    return {
      email: identity.email.value,
      identityId: identity.id.toString(),
      role: identity.role.value,
      status: identity.status.value
    };
  }
}
