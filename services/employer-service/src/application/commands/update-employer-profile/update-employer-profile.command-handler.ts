import { ValidationError } from '@careerhub/shared-kernel';
import type {
  EmployerProfileRecord,
  EmployerProfileRepository,
  UpdateEmployerProfilePatch
} from '../../ports';
import { EmployerProfileNotFoundError } from '../../errors/employer-profile-not-found.error';
import { EmployerProfileAggregate } from '../../../domain/employer-profile';
import type { UpdateEmployerProfileCommand } from './update-employer-profile.command';

export class UpdateEmployerProfileCommandHandler {
  constructor(
    private readonly employerProfileRepository: EmployerProfileRepository
  ) {}

  async execute(
    command: UpdateEmployerProfileCommand
  ): Promise<EmployerProfileRecord> {
    const identityId = command.identityId.trim();

    if (!identityId) {
      throw new ValidationError('Employer identity id is required');
    }

    const existingProfile = await this.employerProfileRepository.findByIdentityId(identityId);

    if (!existingProfile) {
      throw new EmployerProfileNotFoundError(identityId);
    }

    const touchedFields: Array<keyof UpdateEmployerProfilePatch> = [];

    if (command.companyName !== undefined) {
      touchedFields.push('companyName');
    }

    if (command.logoUrl !== undefined) {
      touchedFields.push('logoUrl');
    }

    if (command.website !== undefined) {
      touchedFields.push('website');
    }

    if (command.industry !== undefined) {
      touchedFields.push('industry');
    }

    if (command.companySize !== undefined) {
      touchedFields.push('companySize');
    }

    if (command.foundedYear !== undefined) {
      touchedFields.push('foundedYear');
    }

    if (command.description !== undefined) {
      touchedFields.push('description');
    }

    if (command.address !== undefined) {
      touchedFields.push('address');
    }

    if (command.taxCode !== undefined) {
      touchedFields.push('taxCode');
    }

    if (command.contactName !== undefined) {
      touchedFields.push('contactName');
    }

    if (command.contactPhone !== undefined) {
      touchedFields.push('contactPhone');
    }

    if (touchedFields.length === 0) {
      throw new ValidationError(
        'At least one employer profile field must be provided'
      );
    }

    const aggregate = EmployerProfileAggregate.reconstitute(existingProfile);
    aggregate.update({
      address: command.address,
      companyName: command.companyName,
      companySize: command.companySize,
      contactName: command.contactName,
      contactPhone: command.contactPhone,
      description: command.description,
      foundedYear: command.foundedYear,
      industry: command.industry,
      logoUrl: command.logoUrl,
      taxCode: command.taxCode,
      website: command.website
    });
    const patch = aggregate.toUpdatePatch(touchedFields);

    const updated = await this.employerProfileRepository.updateByIdentityId(
      identityId,
      patch
    );

    if (!updated) {
      throw new EmployerProfileNotFoundError(identityId);
    }

    return updated;
  }
}
