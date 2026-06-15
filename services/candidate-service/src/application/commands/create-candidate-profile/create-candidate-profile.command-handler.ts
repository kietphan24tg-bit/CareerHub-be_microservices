import { CandidateProfileAlreadyExistsError } from '../../errors/candidate-profile-already-exists.error';
import type { CandidateProfileRepository, IdGenerator } from '../../ports';
import { CandidateProfileOperationsService } from '../../services/candidate-profile-operations.service';
import type { CreateCandidateProfileCommand } from './create-candidate-profile.command';
import type { CreateCandidateProfileResult } from './create-candidate-profile.result';

export class CreateCandidateProfileCommandHandler {
  constructor(
    private readonly candidateProfileRepository: CandidateProfileRepository,
    private readonly idGenerator: IdGenerator,
    private readonly candidateProfileOperations: CandidateProfileOperationsService
  ) {}

  async execute(
    command: CreateCandidateProfileCommand
  ): Promise<CreateCandidateProfileResult> {
    const input = this.candidateProfileOperations.prepareCreateInput(command);

    if (
      await this.candidateProfileRepository.existsByIdentityId(input.identityId)
    ) {
      throw new CandidateProfileAlreadyExistsError(input.identityId);
    }

    const profileId = this.idGenerator.generate();

    await this.candidateProfileRepository.save({
      fullName: input.fullName,
      id: profileId,
      identityId: input.identityId,
      phone: input.phone
    });

    return {
      identityId: input.identityId,
      profileId
    };
  }
}
