import { ValidationError } from '@careerhub/shared-kernel';
import type {
  EmployerProfileRecord,
  EmployerProfileRepository,
  UpdateEmployerProfilePatch
} from '../../ports';
import { EmployerProfileNotFoundError } from '../../errors/employer-profile-not-found.error';

type UpdateEmployerProfileCommand = {
  address?: string | null;
  companyName?: string;
  companySize?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  foundedYear?: number | null;
  identityId: string;
  industry?: string | null;
  logoUrl?: string | null;
  taxCode?: string | null;
  website?: string | null;
};

function normalizeNullableString(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export class UpdateEmployerProfileUseCase {
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

    const patch: UpdateEmployerProfilePatch = {};

    if (command.companyName !== undefined) {
      const companyName = command.companyName.trim();

      if (!companyName) {
        throw new ValidationError('Employer company name cannot be blank');
      }

      patch.companyName = companyName;
    }

    if (command.logoUrl !== undefined) {
      patch.logoUrl = normalizeNullableString(command.logoUrl);
    }

    if (command.website !== undefined) {
      patch.website = normalizeNullableString(command.website);
    }

    if (command.industry !== undefined) {
      patch.industry = normalizeNullableString(command.industry);
    }

    if (command.companySize !== undefined) {
      patch.companySize = normalizeNullableString(command.companySize);
    }

    if (command.foundedYear !== undefined) {
      if (
        command.foundedYear !== null &&
        (command.foundedYear < 1800 || command.foundedYear > 2100)
      ) {
        throw new ValidationError('Employer founded year must be between 1800 and 2100');
      }

      patch.foundedYear = command.foundedYear;
    }

    if (command.description !== undefined) {
      patch.description = normalizeNullableString(command.description);
    }

    if (command.address !== undefined) {
      patch.address = normalizeNullableString(command.address);
    }

    if (command.taxCode !== undefined) {
      patch.taxCode = normalizeNullableString(command.taxCode);
    }

    if (command.contactName !== undefined) {
      patch.contactName = normalizeNullableString(command.contactName);
    }

    if (command.contactPhone !== undefined) {
      patch.contactPhone = normalizeNullableString(command.contactPhone);
    }

    if (Object.keys(patch).length === 0) {
      throw new ValidationError('At least one employer profile field must be provided');
    }

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
