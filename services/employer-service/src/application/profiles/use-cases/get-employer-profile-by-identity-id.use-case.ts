import { ValidationError } from '@careerhub/shared-kernel';
import type { EmployerProfileRecord, EmployerProfileRepository } from '../../ports';
import { EmployerProfileNotFoundError } from '../../errors/employer-profile-not-found.error';

type GetEmployerProfileByIdentityIdCommand = {
  identityId: string;
};

export class GetEmployerProfileByIdentityIdUseCase {
  constructor(
    private readonly employerProfileRepository: EmployerProfileRepository
  ) {}

  async execute(
    command: GetEmployerProfileByIdentityIdCommand
  ): Promise<EmployerProfileRecord> {
    const identityId = command.identityId.trim();

    if (!identityId) {
      throw new ValidationError('Employer identity id is required');
    }

    const profile = await this.employerProfileRepository.findByIdentityId(identityId);

    if (!profile) {
      throw new EmployerProfileNotFoundError(identityId);
    }

    return profile;
  }
}
