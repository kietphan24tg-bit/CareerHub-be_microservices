import type {
  CandidateProfileRecord,
  CandidateProfileRepository,
  CandidateWriteTransaction
} from '../../ports';
import { CandidateProfileNotFoundError } from '../../errors/candidate-profile-not-found.error';
import { CandidateProfileOperationsService } from '../../services/candidate-profile-operations.service';
import type { UpdateCandidateProfileCommand } from './update-candidate-profile.command';

export class UpdateCandidateProfileCommandHandler {
  constructor(
    private readonly candidateProfileRepository: CandidateProfileRepository,
    private readonly writeTransaction: CandidateWriteTransaction,
    private readonly candidateProfileOperations: CandidateProfileOperationsService
  ) {}

  async execute(
    command: UpdateCandidateProfileCommand
  ): Promise<CandidateProfileRecord> {
    const { identityId, patch, resumeIdChange } =
      this.candidateProfileOperations.prepareUpdateInput(command);

    if (resumeIdChange.kind === 'none') {
      const updated = await this.candidateProfileRepository.updateByIdentityId(
        identityId,
        patch
      );

      if (!updated) {
        throw new CandidateProfileNotFoundError(identityId);
      }

      return updated;
    }

    return this.writeTransaction.execute(
      async ({ candidateProfileRepository, resumeRepository }) => {
        await this.candidateProfileOperations.syncResumeIdChange(
          identityId,
          resumeIdChange,
          resumeRepository,
          patch
        );

        const updated = await candidateProfileRepository.updateByIdentityId(
          identityId,
          patch
        );

        if (!updated) {
          throw new CandidateProfileNotFoundError(identityId);
        }

        return updated;
      }
    );
  }
}
