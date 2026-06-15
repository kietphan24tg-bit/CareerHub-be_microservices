import { ValidationError } from '@careerhub/shared-kernel';
import type { CreateCandidateProfileCommand } from '../commands/create-candidate-profile/create-candidate-profile.command';
import type { UpdateCandidateProfileCommand } from '../commands/update-candidate-profile/update-candidate-profile.command';
import { ResumeNotFoundError } from '../errors/resume-not-found.error';
import type { ResumeRepository, UpdateCandidateProfilePatch } from '../ports';

export type NormalizedCreateCandidateProfileInput = {
  fullName: string;
  identityId: string;
  phone: string;
};

export type ResumeIdChange =
  | { kind: 'none' }
  | { kind: 'clear' }
  | { kind: 'set'; resumeId: string };

export type PreparedUpdateCandidateProfile = {
  identityId: string;
  patch: UpdateCandidateProfilePatch;
  resumeIdChange: ResumeIdChange;
};

function normalizeRequired(value: string, message: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new ValidationError(message);
  }

  return normalized;
}

function normalizeNullableString(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveResumeIdChange(
  resumeId: string | null | undefined
): ResumeIdChange {
  if (resumeId === undefined) {
    return { kind: 'none' };
  }

  if (resumeId === null) {
    return { kind: 'clear' };
  }

  const normalizedResumeId = resumeId.trim();

  if (!normalizedResumeId) {
    throw new ValidationError('Candidate resume id cannot be blank');
  }

  return { kind: 'set', resumeId: normalizedResumeId };
}

export class CandidateProfileOperationsService {
  prepareCreateInput(
    command: CreateCandidateProfileCommand
  ): NormalizedCreateCandidateProfileInput {
    return {
      fullName: normalizeRequired(
        command.fullName,
        'Candidate full name is required'
      ),
      identityId: normalizeRequired(
        command.identityId,
        'Candidate identity id is required'
      ),
      phone: normalizeRequired(command.phone, 'Candidate phone is required')
    };
  }

  prepareUpdateInput(
    command: UpdateCandidateProfileCommand
  ): PreparedUpdateCandidateProfile {
    const identityId = normalizeRequired(
      command.identityId,
      'Candidate identity id is required'
    );
    const patch: UpdateCandidateProfilePatch = {};

    if (command.fullName !== undefined) {
      patch.fullName = normalizeRequired(
        command.fullName,
        'Candidate full name cannot be blank'
      );
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
        throw new ValidationError(
          'Candidate years experience must be greater than or equal to 0'
        );
      }

      patch.yearsExperience = command.yearsExperience;
    }

    const resumeIdChange = resolveResumeIdChange(command.resumeId);

    if (Object.keys(patch).length === 0 && resumeIdChange.kind === 'none') {
      throw new ValidationError(
        'At least one candidate profile field must be provided'
      );
    }

    return {
      identityId,
      patch,
      resumeIdChange
    };
  }

  async syncResumeIdChange(
    identityId: string,
    resumeIdChange: ResumeIdChange,
    resumeRepository: ResumeRepository,
    patch: UpdateCandidateProfilePatch
  ): Promise<void> {
    if (resumeIdChange.kind === 'none') {
      return;
    }

    if (resumeIdChange.kind === 'clear') {
      await resumeRepository.clearIsUsingByIdentityId(identityId);
      patch.resumeId = null;
      return;
    }

    const resume = await resumeRepository.findById(resumeIdChange.resumeId);

    if (!resume || resume.identityId !== identityId) {
      throw new ResumeNotFoundError(resumeIdChange.resumeId);
    }

    await resumeRepository.clearIsUsingByIdentityId(
      identityId,
      resumeIdChange.resumeId
    );
    resume.markAsUsing();
    await resumeRepository.update(resume);
    patch.resumeId = resumeIdChange.resumeId;
  }
}
