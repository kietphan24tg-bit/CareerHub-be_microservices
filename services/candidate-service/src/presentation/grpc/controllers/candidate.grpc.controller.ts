import {
  CANDIDATE_GRPC_SERVICE_NAME,
  type CandidateProfile,
  type CreateCandidateProfileRequest,
  type CreateCandidateProfileResponse,
  type DeleteCandidateProfileCompensationRequest,
  type DeleteCandidateProfileCompensationResponse,
  type GetCandidateProfileByIdentityIdRequest,
  type GetCandidateProfileByIdentityIdResponse,
  type ListSavedJobsByIdentityIdRequest,
  type ListSavedJobsByIdentityIdResponse,
  type RemoveSavedJobRequest,
  type RemoveSavedJobResponse,
  type SaveJobRequest,
  type SaveJobResponse,
  type SavedJob,
  type UpdateCandidateProfileRequest,
  type UpdateCandidateProfileResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  CreateCandidateProfileCommandHandler,
  DeleteCandidateProfileCompensationCommandHandler,
  GetCandidateProfileByIdentityIdQueryHandler,
  ListSavedJobsByIdentityIdQueryHandler,
  RemoveSavedJobCommandHandler,
  SaveJobCommandHandler,
  UpdateCandidateProfileCommandHandler,
  type CandidateProfileRecord,
  type SavedJobRecord
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
  collectNullable('resume_id', profile.resumeId);

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
    resume_id: profile.resumeId ?? '',
    updated_at: profile.updatedAt.toISOString(),
    years_experience: profile.yearsExperience ?? 0
  } as unknown as CandidateProfile;
}

function toGrpcSavedJob(savedJob: SavedJobRecord): SavedJob {
  return {
    id: savedJob.id,
    identity_id: savedJob.identityId,
    job_id: savedJob.jobId,
    saved_at: savedJob.createdAt.toISOString()
  } as unknown as SavedJob;
}

@Controller()
export class CandidateGrpcController {
  constructor(
    private readonly createCandidateProfileCommandHandler: CreateCandidateProfileCommandHandler,
    private readonly deleteCandidateProfileCompensationCommandHandler: DeleteCandidateProfileCompensationCommandHandler,
    private readonly getCandidateProfileByIdentityIdQueryHandler: GetCandidateProfileByIdentityIdQueryHandler,
    private readonly listSavedJobsByIdentityIdQueryHandler: ListSavedJobsByIdentityIdQueryHandler,
    private readonly removeSavedJobCommandHandler: RemoveSavedJobCommandHandler,
    private readonly saveJobCommandHandler: SaveJobCommandHandler,
    private readonly updateCandidateProfileCommandHandler: UpdateCandidateProfileCommandHandler
  ) {}

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'CreateCandidateProfile')
  async createCandidateProfile(
    request: CreateCandidateProfileRequest
  ): Promise<CreateCandidateProfileResponse> {
    try {
      const result = await this.createCandidateProfileCommandHandler.execute({
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

  @GrpcMethod(
    CANDIDATE_GRPC_SERVICE_NAME,
    'DeleteCandidateProfileCompensation'
  )
  async deleteCandidateProfileCompensation(
    request: DeleteCandidateProfileCompensationRequest
  ): Promise<DeleteCandidateProfileCompensationResponse> {
    try {
      const result =
        await this.deleteCandidateProfileCompensationCommandHandler.execute({
          identityId: request.identity_id
        });

      return {
        compensated: result.compensated
      } as unknown as DeleteCandidateProfileCompensationResponse;
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
        await this.getCandidateProfileByIdentityIdQueryHandler.execute({
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
      const profile = await this.updateCandidateProfileCommandHandler.execute({
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
            : undefined,
        resumeId: updatedFields.has('resume_id')
          ? request.resume_id
          : clearFields.has('resume_id')
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

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'ListSavedJobsByIdentityId')
  async listSavedJobsByIdentityId(
    request: ListSavedJobsByIdentityIdRequest
  ): Promise<ListSavedJobsByIdentityIdResponse> {
    try {
      const savedJobs =
        await this.listSavedJobsByIdentityIdQueryHandler.execute({
          identityId: request.identity_id
        });

      return {
        saved_jobs: savedJobs.map(toGrpcSavedJob)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'SaveJob')
  async saveJob(request: SaveJobRequest): Promise<SaveJobResponse> {
    try {
      const savedJob = await this.saveJobCommandHandler.execute({
        identityId: request.identity_id,
        jobId: request.job_id
      });

      return {
        saved_job: toGrpcSavedJob(savedJob)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'RemoveSavedJob')
  async removeSavedJob(
    request: RemoveSavedJobRequest
  ): Promise<RemoveSavedJobResponse> {
    try {
      await this.removeSavedJobCommandHandler.execute({
        identityId: request.identity_id,
        jobId: request.job_id
      });

      return {
        removed: true
      } as unknown as RemoveSavedJobResponse;
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }
}
