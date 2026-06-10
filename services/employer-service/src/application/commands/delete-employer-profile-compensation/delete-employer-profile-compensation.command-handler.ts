import type { EmployerProfileRepository } from '../../ports';
import type { DeleteEmployerProfileCompensationCommand } from './delete-employer-profile-compensation.command';
import type { DeleteEmployerProfileCompensationResult } from './delete-employer-profile-compensation.result';

export class DeleteEmployerProfileCompensationCommandHandler {
  constructor(
    private readonly employerProfileRepository: EmployerProfileRepository
  ) {}

  async execute(
    command: DeleteEmployerProfileCompensationCommand
  ): Promise<DeleteEmployerProfileCompensationResult> {
    await this.employerProfileRepository.deleteByIdentityId(command.identityId);

    return {
      compensated: true
    };
  }
}
