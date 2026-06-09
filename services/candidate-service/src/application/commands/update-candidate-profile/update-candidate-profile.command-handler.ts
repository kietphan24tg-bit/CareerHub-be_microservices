import { ValidationError } from '@careerhub/shared-kernel';
import type {
  CandidateProfileRecord,
  CandidateWriteTransaction,
  UpdateCandidateProfilePatch
} from '../../ports';
import { CandidateProfileNotFoundError } from '../../errors/candidate-profile-not-found.error';
import type { IdGenerator } from '../../ports';
import {
  mapCandidateIntegrationEventToOutboxRecord,
  mapCandidateProfileUpdatedIntegrationEvent
} from '../../outbox/candidate-outbox-event.mapper';
import type { UpdateCandidateProfileCommand } from './update-candidate-profile.command';

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

export class UpdateCandidateProfileCommandHandler {
  constructor(
    private readonly writeTransaction: CandidateWriteTransaction,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(
    command: UpdateCandidateProfileCommand
  ): Promise<CandidateProfileRecord> {
    const identityId = command.identityId.trim();

    if (!identityId) {
      throw new ValidationError('Candidate identity id is required');
    }

    const patch: UpdateCandidateProfilePatch = {};

    if (command.fullName !== undefined) {
      const fullName = command.fullName.trim();

      if (!fullName) {
        throw new ValidationError('Candidate full name cannot be blank');
      }

      patch.fullName = fullName;
    }

    if (command.avatarUrl !== undefined) {
      patch.avatarUrl = normalizeNullableString(command.avatarUrl);
    }

    if (command.phone !== undefined) {
      patch.phone = normalizeNullableString(command.phone);
    }

    if (command.headline !== undefined) {
      patch.headline = normalizeNullableString(command.headline);
    }

    if (command.bio !== undefined) {
      patch.bio = normalizeNullableString(command.bio);
    }

    if (command.address !== undefined) {
      patch.address = normalizeNullableString(command.address);
    }

    if (command.githubUrl !== undefined) {
      patch.githubUrl = normalizeNullableString(command.githubUrl);
    }

    if (command.linkedinUrl !== undefined) {
      patch.linkedinUrl = normalizeNullableString(command.linkedinUrl);
    }

    if (command.portfolioUrl !== undefined) {
      patch.portfolioUrl = normalizeNullableString(command.portfolioUrl);
    }

    if (command.yearsExperience !== undefined) {
      if (command.yearsExperience !== null && command.yearsExperience < 0) {
        throw new ValidationError('Candidate years experience must be greater than or equal to 0');
      }

      patch.yearsExperience = command.yearsExperience;
    }

    if (Object.keys(patch).length === 0) {
      throw new ValidationError('At least one candidate profile field must be provided');
    }

    return this.writeTransaction.execute(
      async ({ candidateProfileRepository, outboxRepository }) => {
        const updated = await candidateProfileRepository.updateByIdentityId(
          identityId,
          patch
        );

        if (!updated) {
          throw new CandidateProfileNotFoundError(identityId);
        }

        await outboxRepository.create(
          mapCandidateIntegrationEventToOutboxRecord(
            mapCandidateProfileUpdatedIntegrationEvent(
              updated,
              patch,
              command.requestId
            ),
            {
              createId: () => this.idGenerator.generate()
            }
          )
        );

        return updated;
      }
    );
  }
}
