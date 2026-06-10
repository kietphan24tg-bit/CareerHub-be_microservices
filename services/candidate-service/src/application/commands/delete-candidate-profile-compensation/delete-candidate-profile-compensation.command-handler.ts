import type { CandidateProfileRepository } from '../../ports';
import type { DeleteCandidateProfileCompensationCommand } from './delete-candidate-profile-compensation.command';
import type { DeleteCandidateProfileCompensationResult } from './delete-candidate-profile-compensation.result';

export class DeleteCandidateProfileCompensationCommandHandler {
  constructor(
    private readonly candidateProfileRepository: CandidateProfileRepository
  ) {}

  async execute(
    command: DeleteCandidateProfileCompensationCommand
  ): Promise<DeleteCandidateProfileCompensationResult> {
    await this.candidateProfileRepository.deleteByIdentityId(command.identityId);

    return {
      compensated: true
    };
  }
}
