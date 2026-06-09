import { ValidationError } from '@careerhub/shared-kernel';
import type { EmployerProfileRecord, EmployerProfileRepository } from '../../ports';
import { EmployerProfileNotFoundError } from '../../errors/employer-profile-not-found.error';
import type { GetEmployerProfileByIdentityIdQuery } from './get-employer-profile-by-identity-id.query';

export class GetEmployerProfileByIdentityIdQueryHandler {
  constructor(
    private readonly employerProfileRepository: EmployerProfileRepository
  ) {}

  async execute(
    query: GetEmployerProfileByIdentityIdQuery
  ): Promise<EmployerProfileRecord> {
    const identityId = query.identityId.trim();

    if (!identityId) {
      throw new ValidationError('Employer identity id is required');
    }

    const profile = await this.employerProfileRepository.findByIdentityId(
      identityId
    );

    if (!profile) {
      throw new EmployerProfileNotFoundError(identityId);
    }

    return profile;
  }
}
