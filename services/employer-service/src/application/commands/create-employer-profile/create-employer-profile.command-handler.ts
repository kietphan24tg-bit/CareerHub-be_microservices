import { EmployerProfileAlreadyExistsError } from '../../errors/employer-profile-already-exists.error';
import type { EmployerProfileRepository, IdGenerator } from '../../ports';
import { EmployerProfileAggregate } from '../../../domain/employer-profile';
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
    const profile = EmployerProfileAggregate.create({
      address: command.address,
      companyName: command.companyName,
      contactName: command.contactName,
      contactPhone: command.contactPhone,
      id: this.idGenerator.generate(),
      identityId: command.identityId,
      industry: command.industry
    });

    if (
      await this.employerProfileRepository.existsByIdentityId(profile.identityId)
    ) {
      throw new EmployerProfileAlreadyExistsError(profile.identityId);
    }

    await this.employerProfileRepository.save(profile.toCreateRecord());

    return {
      identityId: profile.identityId,
      profileId: profile.id.toString()
    };
  }
}
