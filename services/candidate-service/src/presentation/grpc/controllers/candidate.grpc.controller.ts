import {
  CANDIDATE_GRPC_SERVICE_NAME,
  type CandidateProfile,
  type CreateCandidateProfileRequest,
  type CreateCandidateProfileResponse,
  type GetCandidateProfileByIdentityIdRequest,
  type GetCandidateProfileByIdentityIdResponse,
  type UpdateCandidateProfileRequest,
  type UpdateCandidateProfileResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  CreateCandidateProfileUseCase,
  GetCandidateProfileByIdentityIdUseCase,
  UpdateCandidateProfileUseCase,
  type CandidateProfileRecord
} from '../../../application';
import { mapErrorToCandidateGrpcException } from '../mappers/grpc-error.mapper';

function toGrpcCandidateProfile(profile: CandidateProfileRecord): CandidateProfile {
  const nullFields: string[] = [];

  const collectNullable = (fieldName: string, value: string | number | null) => {
    if (value === null) {
      nullFields.push(fieldName);
    }
  };

  collectNullable('avatar_url', profile.avatarUrl);
  collectNullable('phone', profile.phone);
  collectNullable('headline', profile.headline);
  collectNullable('bio', profile.bio);
  collectNullable('address', profile.address);
  collectNullable('github_url', profile.githubUrl);
  collectNullable('linkedin_url', profile.linkedinUrl);
  collectNullable('portfolio_url', profile.portfolioUrl);
  collectNullable('years_experience', profile.yearsExperience);

  return {
    address: profile.address ?? '',
    avatar_url: profile.avatarUrl ?? '',
    bio: profile.bio ?? '',
    created_at: profile.createdAt.toISOString(),
    full_name: profile.fullName,
    github_url: profile.githubUrl ?? '',
    headline: profile.headline ?? '',
    id: profile.id,
    identity_id: profile.identityId,
    linkedin_url: profile.linkedinUrl ?? '',
    null_fields: nullFields,
    phone: profile.phone ?? '',
    portfolio_url: profile.portfolioUrl ?? '',
    updated_at: profile.updatedAt.toISOString(),
    years_experience: profile.yearsExperience ?? 0
  } as unknown as CandidateProfile;
}

@Controller()
export class CandidateGrpcController {
  constructor(
    private readonly createCandidateProfileUseCase: CreateCandidateProfileUseCase,
    private readonly getCandidateProfileByIdentityIdUseCase: GetCandidateProfileByIdentityIdUseCase,
    private readonly updateCandidateProfileUseCase: UpdateCandidateProfileUseCase
  ) {}

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'CreateCandidateProfile')
  async createCandidateProfile(
    request: CreateCandidateProfileRequest
  ): Promise<CreateCandidateProfileResponse> {
    try {
      const result = await this.createCandidateProfileUseCase.execute({
        fullName: request.full_name,
        identityId: request.identity_id,
        phone: request.phone
      });

      return {
        identity_id: result.identityId,
        profile_id: result.profileId
      } as unknown as CreateCandidateProfileResponse;
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'GetCandidateProfileByIdentityId')
  async getCandidateProfileByIdentityId(
    request: GetCandidateProfileByIdentityIdRequest
  ): Promise<GetCandidateProfileByIdentityIdResponse> {
    try {
      const profile =
        await this.getCandidateProfileByIdentityIdUseCase.execute({
          identityId: request.identity_id
        });

      return {
        profile: toGrpcCandidateProfile(profile)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'UpdateCandidateProfile')
  async updateCandidateProfile(
    request: UpdateCandidateProfileRequest
  ): Promise<UpdateCandidateProfileResponse> {
    try {
      const updatedFields = new Set(request.updated_fields ?? []);
      const clearFields = new Set(request.clear_fields ?? []);
      const profile = await this.updateCandidateProfileUseCase.execute({
        address: updatedFields.has('address')
          ? request.address
          : clearFields.has('address')
            ? null
            : undefined,
        avatarUrl: updatedFields.has('avatar_url')
          ? request.avatar_url
          : clearFields.has('avatar_url')
            ? null
            : undefined,
        bio: updatedFields.has('bio')
          ? request.bio
          : clearFields.has('bio')
            ? null
            : undefined,
        fullName: updatedFields.has('full_name') ? request.full_name : undefined,
        githubUrl: updatedFields.has('github_url')
          ? request.github_url
          : clearFields.has('github_url')
            ? null
            : undefined,
        headline: updatedFields.has('headline')
          ? request.headline
          : clearFields.has('headline')
            ? null
            : undefined,
        identityId: request.identity_id,
        linkedinUrl: updatedFields.has('linkedin_url')
          ? request.linkedin_url
          : clearFields.has('linkedin_url')
            ? null
            : undefined,
        phone: updatedFields.has('phone')
          ? request.phone
          : clearFields.has('phone')
            ? null
            : undefined,
        portfolioUrl: updatedFields.has('portfolio_url')
          ? request.portfolio_url
          : clearFields.has('portfolio_url')
            ? null
            : undefined,
        yearsExperience: updatedFields.has('years_experience')
          ? request.years_experience
          : clearFields.has('years_experience')
            ? null
            : undefined
      });

      return {
        profile: toGrpcCandidateProfile(profile)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }
}
