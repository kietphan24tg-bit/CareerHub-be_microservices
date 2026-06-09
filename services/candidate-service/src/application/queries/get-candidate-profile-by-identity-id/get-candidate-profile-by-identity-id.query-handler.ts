import { ValidationError } from '@careerhub/shared-kernel';
import type { CandidateProfileRecord, CandidateProfileRepository } from '../../ports';
import { CandidateProfileNotFoundError } from '../../errors/candidate-profile-not-found.error';
import type { GetCandidateProfileByIdentityIdQuery } from './get-candidate-profile-by-identity-id.query';

export class GetCandidateProfileByIdentityIdQueryHandler {
  constructor(
    private readonly candidateProfileRepository: CandidateProfileRepository
  ) {}

  async execute(
    query: GetCandidateProfileByIdentityIdQuery
  ): Promise<CandidateProfileRecord> {
    const identityId = query.identityId.trim();

    if (!identityId) {
      throw new ValidationError('Candidate identity id is required');
    }

    const profile =
      await this.candidateProfileRepository.findByIdentityId(identityId);

    if (!profile) {
      throw new CandidateProfileNotFoundError(identityId);
    }

    return profile;
  }
}
