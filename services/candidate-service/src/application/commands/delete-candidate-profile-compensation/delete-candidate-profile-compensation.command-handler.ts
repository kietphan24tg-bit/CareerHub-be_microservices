import { ValidationError } from '@careerhub/shared-kernel';
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
    if (!command.identityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    // Compensation is idempotent: a missing profile is a valid no-op
    // (the profile may never have been created, or was already removed).
    const deleted = await this.candidateProfileRepository.deleteByIdentityId(
      command.identityId.trim()
    );

    return {
      compensated: true,
      deleted
    };
  }
}
