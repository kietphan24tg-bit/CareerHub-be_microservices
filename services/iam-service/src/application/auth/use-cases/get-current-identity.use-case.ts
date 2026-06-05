import {
  IdentityNotFoundError,
  type IdentityRepository
} from '../../index';
import type { CurrentIdentityResponse } from '../responses/current-identity.response';

type GetCurrentIdentityCommand = {
  identityId: string;
};

export class GetCurrentIdentityUseCase {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async execute(
    command: GetCurrentIdentityCommand
  ): Promise<CurrentIdentityResponse> {
    const identity = await this.identityRepository.findById(command.identityId);

    if (!identity) {
      throw new IdentityNotFoundError(command.identityId);
    }

    return {
      email: identity.email.value,
      identityId: identity.id.toString(),
      role: identity.role.value,
      status: identity.status.value
    };
  }
}
