import { ValidationError } from '@careerhub/shared-kernel';
import { CandidateProfileAlreadyExistsError } from '../../errors/candidate-profile-already-exists.error';
import type { CandidateProfileRepository, IdGenerator } from '../../ports';
import type { CreateCandidateProfileCommand } from './create-candidate-profile.command';
import type { CreateCandidateProfileResult } from './create-candidate-profile.result';

export class CreateCandidateProfileCommandHandler {
  constructor(
    private readonly candidateProfileRepository: CandidateProfileRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(
    command: CreateCandidateProfileCommand
  ): Promise<CreateCandidateProfileResult> {
    if (!command.identityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    if (!command.fullName.trim()) {
      throw new ValidationError('Candidate full name is required');
    }

    if (!command.phone.trim()) {
      throw new ValidationError('Candidate phone is required');
    }

    if (
      await this.candidateProfileRepository.existsByIdentityId(command.identityId)
    ) {
      throw new CandidateProfileAlreadyExistsError(command.identityId);
    }

    const profileId = this.idGenerator.generate();

    await this.candidateProfileRepository.save({
      fullName: command.fullName.trim(),
      id: profileId,
      identityId: command.identityId.trim(),
      phone: command.phone.trim()
    });

    return {
      identityId: command.identityId.trim(),
      profileId
    };
  }
}
