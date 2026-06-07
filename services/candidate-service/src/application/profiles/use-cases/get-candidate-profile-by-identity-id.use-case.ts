import { ValidationError } from '@careerhub/shared-kernel';
import type { CandidateProfileRecord, CandidateProfileRepository } from '../../ports';
import { CandidateProfileNotFoundError } from '../../errors/candidate-profile-not-found.error';

type GetCandidateProfileByIdentityIdCommand = {
  identityId: string;
};

export class GetCandidateProfileByIdentityIdUseCase {
  constructor(
    private readonly candidateProfileRepository: CandidateProfileRepository
  ) {}

  async execute(
    command: GetCandidateProfileByIdentityIdCommand
  ): Promise<CandidateProfileRecord> {
    const identityId = command.identityId.trim();

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
