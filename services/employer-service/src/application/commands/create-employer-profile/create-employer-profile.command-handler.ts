import { ValidationError } from '@careerhub/shared-kernel';
import { EmployerProfileAlreadyExistsError } from '../../errors/employer-profile-already-exists.error';
import type { EmployerProfileRepository, IdGenerator } from '../../ports';
import type { CreateEmployerProfileCommand } from './create-employer-profile.command';
import type { CreateEmployerProfileResult } from './create-employer-profile.result';

export class CreateEmployerProfileCommandHandler {
  constructor(
    private readonly employerProfileRepository: EmployerProfileRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(
    command: CreateEmployerProfileCommand
  ): Promise<CreateEmployerProfileResult> {
    if (!command.identityId.trim()) {
      throw new ValidationError('Employer identity id is required');
    }

    if (!command.companyName.trim()) {
      throw new ValidationError('Employer company name is required');
    }

    if (!command.contactName.trim()) {
      throw new ValidationError('Employer contact name is required');
    }

    if (!command.contactPhone.trim()) {
      throw new ValidationError('Employer contact phone is required');
    }

    if (!command.industry.trim()) {
      throw new ValidationError('Employer industry is required');
    }

    if (!command.address.trim()) {
      throw new ValidationError('Employer address is required');
    }

    if (
      await this.employerProfileRepository.existsByIdentityId(command.identityId)
    ) {
      throw new EmployerProfileAlreadyExistsError(command.identityId);
    }

    const profileId = this.idGenerator.generate();

    await this.employerProfileRepository.save({
      address: command.address.trim(),
      companyName: command.companyName.trim(),
      contactName: command.contactName.trim(),
      contactPhone: command.contactPhone.trim(),
      id: profileId,
      identityId: command.identityId.trim(),
      industry: command.industry.trim()
    });

    return {
      identityId: command.identityId.trim(),
      profileId
    };
  }
}
