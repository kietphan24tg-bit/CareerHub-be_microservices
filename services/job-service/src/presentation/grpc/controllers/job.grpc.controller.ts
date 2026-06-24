 import {
  JOB_GRPC_SERVICE_NAME,
  type ArchiveJobRequest,
  type ArchiveJobResponse,
  type CloseJobRequest,
  type CloseJobResponse,
  type CreateJobRequest,
  type CreateJobResponse,
  type GetEmployerDashboardJobsSummaryRequest,
  type GetEmployerDashboardJobsSummaryResponse,
  type GetEmployerJobByIdRequest,
  type GetEmployerJobByIdResponse,
  type GetJobForApplicationRequest,
  type GetJobForApplicationResponse,
  type GetPublicJobBySlugRequest,
  type GetPublicJobBySlugResponse,
  type JobExistsRequest,
  type JobExistsResponse,
  type ListEmployerJobsRequest,
  type ListEmployerJobsResponse,
  type ListJobsByIdsRequest,
  type ListJobsByIdsResponse,
  type ListPublicJobsRequest,
  type ListPublicJobsResponse,
  type PublishJobRequest,
  type PublishJobResponse,
  type ReopenJobRequest,
  type ReopenJobResponse,
  type UpdateJobRequest,
  type UpdateJobResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  ArchiveJobCommandHandler,
  CloseJobCommandHandler,
  CreateJobCommandHandler,
  GetEmployerDashboardJobsSummaryQueryHandler,
  GetEmployerJobByIdQueryHandler,
  GetJobForApplicationQueryHandler,
  GetPublicJobBySlugQueryHandler,
  JobExistsQueryHandler,
  ListEmployerJobsQueryHandler,
  ListJobsByIdsQueryHandler,
  ListPublicJobsQueryHandler,
  PublishJobCommandHandler,
  ReopenJobCommandHandler,
  UpdateJobCommandHandler,
  type JobStatus
} from '../../../application';
import { mapErrorToJobGrpcException } from '../mappers/grpc-error.mapper';
import { toGrpcJobMessage } from '../mappers/job-message.mapper';
import { resolveListPublicJobsSalaryFilter } from '../mappers/list-public-jobs-request.mapper';
import { toGrpcSavedJobSummary } from '../mappers/saved-job-summary.mapper';

@Controller()
export class JobGrpcController {
  constructor(
    private readonly archiveJobCommandHandler: ArchiveJobCommandHandler,
    private readonly closeJobCommandHandler: CloseJobCommandHandler,
    private readonly createJobCommandHandler: CreateJobCommandHandler,
    private readonly getEmployerDashboardJobsSummaryQueryHandler: GetEmployerDashboardJobsSummaryQueryHandler,
    private readonly getEmployerJobByIdQueryHandler: GetEmployerJobByIdQueryHandler,
    private readonly getJobForApplicationQueryHandler: GetJobForApplicationQueryHandler,
    private readonly getPublicJobBySlugQueryHandler: GetPublicJobBySlugQueryHandler,
    private readonly jobExistsQueryHandler: JobExistsQueryHandler,
    private readonly listEmployerJobsQueryHandler: ListEmployerJobsQueryHandler,
    private readonly listJobsByIdsQueryHandler: ListJobsByIdsQueryHandler,
    private readonly listPublicJobsQueryHandler: ListPublicJobsQueryHandler,
    private readonly publishJobCommandHandler: PublishJobCommandHandler,
    private readonly reopenJobCommandHandler: ReopenJobCommandHandler,
    private readonly updateJobCommandHandler: UpdateJobCommandHandler
  ) {}

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'ListPublicJobs')
  async listPublicJobs(
    request: ListPublicJobsRequest
  ): Promise<ListPublicJobsResponse> {
    try {
      const salaryFilter = resolveListPublicJobsSalaryFilter(request);
      const result = await this.listPublicJobsQueryHandler.execute({
        category: request.category,
        companyIndustry: request.company_industry,
        employmentType: request.employment_type,
        experienceLevel: request.experience_level,
        keyword: request.keyword,
        location: request.location,
        page: request.page ?? 1,
        pageSize: request.page_size ?? 20,
        remoteOnly: request.remote_only,
        ...salaryFilter,
        saturdayPolicy: request.saturday_policy,
        sort: (request.sort as 'newest' | 'salary_asc' | 'salary_desc' | undefined) ??
          'newest'
      });

      return {
        items: result.items.map(toGrpcJobMessage),
        meta: {
          page: result.meta.page,
          page_size: result.meta.pageSize,
          total: result.meta.total
        }
      } as unknown as ListPublicJobsResponse;
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'GetPublicJobBySlug')
  async getPublicJobBySlug(
    request: GetPublicJobBySlugRequest
  ): Promise<GetPublicJobBySlugResponse> {
    try {
      const job = await this.getPublicJobBySlugQueryHandler.execute({
        slug: request.slug
      });

      return {
        job: toGrpcJobMessage(job)
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'ListEmployerJobs')
  async listEmployerJobs(
    request: ListEmployerJobsRequest
  ): Promise<ListEmployerJobsResponse> {
    try {
      const result = await this.listEmployerJobsQueryHandler.execute({
        category: request.category,
        employerIdentityId: request.employer_identity_id,
        page: request.page ?? 1,
        pageSize: request.page_size ?? 20,
        status: request.status as JobStatus | undefined
      });

      return {
        items: result.items.map(toGrpcJobMessage),
        meta: {
          page: result.meta.page,
          page_size: result.meta.pageSize,
          total: result.meta.total
        }
      } as unknown as ListEmployerJobsResponse;
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'GetEmployerJobById')
  async getEmployerJobById(
    request: GetEmployerJobByIdRequest
  ): Promise<GetEmployerJobByIdResponse> {
    try {
      const job = await this.getEmployerJobByIdQueryHandler.execute({
        employerIdentityId: request.employer_identity_id,
        jobId: request.job_id
      });

      return {
        job: toGrpcJobMessage(job)
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'GetJobForApplication')
  async getJobForApplication(
    request: GetJobForApplicationRequest
  ): Promise<GetJobForApplicationResponse> {
    try {
      const job = await this.getJobForApplicationQueryHandler.execute({
        jobId: request.job_id
      });
      const nullFields: string[] = [];

      if (!job.expiresAt) {
        nullFields.push('expires_at');
      }

      return {
        employer_identity_id: job.employerIdentityId,
        expires_at: job.expiresAt?.toISOString() ?? '',
        job_id: job.id,
        null_fields: nullFields,
        status: job.status
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'CreateJob')
  async createJob(request: CreateJobRequest): Promise<CreateJobResponse> {
    try {
      const job = await this.createJobCommandHandler.execute({
        benefits: request.benefits,
        category: request.category,
        city: request.city,
        companyId: request.company_id,
        companyIndustry: request.company_industry,
        companyLogoUrl: request.company_logo_url,
        companyName: request.company_name,
        companyWebsite: request.company_website,
        country: request.country,
        currency: request.currency,
        description: request.description,
        employerIdentityId: request.employer_identity_id,
        employmentType: request.employment_type,
        experienceLevel: request.experience_level,
        expiresAt: request.expires_at,
        isRemote: request.is_remote,
        level: request.level,
        requirements: request.requirements,
        responsibilities: request.responsibilities,
        salaryMax: request.salary_max,
        salaryMin: request.salary_min,
        saturdayPolicy: request.saturday_policy,
        title: request.title
      });

      return {
        job: toGrpcJobMessage(job)
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'UpdateJob')
  async updateJob(request: UpdateJobRequest): Promise<UpdateJobResponse> {
    try {
      const updatedFields = new Set(request.updated_fields ?? []);
      const clearFields = new Set(request.clear_fields ?? []);
      const job = await this.updateJobCommandHandler.execute({
        benefits: updatedFields.has('benefits') ? request.benefits : undefined,
        category: updatedFields.has('category')
          ? request.category
          : clearFields.has('category')
            ? null
            : undefined,
        city: updatedFields.has('city')
          ? request.city
          : clearFields.has('city')
            ? null
            : undefined,
        country: updatedFields.has('country')
          ? request.country
          : clearFields.has('country')
            ? null
            : undefined,
        currency: updatedFields.has('currency')
          ? request.currency
          : clearFields.has('currency')
            ? null
            : undefined,
        description: updatedFields.has('description')
          ? request.description
          : clearFields.has('description')
            ? null
            : undefined,
        employerIdentityId: request.employer_identity_id,
        employmentType: updatedFields.has('employment_type')
          ? request.employment_type
          : clearFields.has('employment_type')
            ? null
            : undefined,
        experienceLevel: updatedFields.has('experience_level')
          ? request.experience_level
          : clearFields.has('experience_level')
            ? 'unspecified'
            : undefined,
        expiresAt: updatedFields.has('expires_at')
          ? request.expires_at
          : clearFields.has('expires_at')
            ? null
            : undefined,
        isRemote: updatedFields.has('is_remote') ? request.is_remote : undefined,
        jobId: request.job_id,
        level: updatedFields.has('level')
          ? request.level
          : clearFields.has('level')
            ? null
            : undefined,
        requirements: updatedFields.has('requirements')
          ? request.requirements
          : undefined,
        responsibilities: updatedFields.has('responsibilities')
          ? request.responsibilities
          : undefined,
        salaryMax: updatedFields.has('salary_max') ? request.salary_max : undefined,
        salaryMin: updatedFields.has('salary_min') ? request.salary_min : undefined,
        saturdayPolicy: updatedFields.has('saturday_policy')
          ? request.saturday_policy
          : clearFields.has('saturday_policy')
            ? 'unspecified'
            : undefined,
        title: updatedFields.has('title') ? request.title : undefined
      });

      return {
        job: toGrpcJobMessage(job)
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'PublishJob')
  async publishJob(request: PublishJobRequest): Promise<PublishJobResponse> {
    try {
      const job = await this.publishJobCommandHandler.execute({
        employerIdentityId: request.employer_identity_id,
        jobId: request.job_id
      });

      return {
        job: toGrpcJobMessage(job)
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'CloseJob')
  async closeJob(request: CloseJobRequest): Promise<CloseJobResponse> {
    try {
      const job = await this.closeJobCommandHandler.execute({
        employerIdentityId: request.employer_identity_id,
        jobId: request.job_id
      });

      return {
        job: toGrpcJobMessage(job)
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'ArchiveJob')
  async archiveJob(request: ArchiveJobRequest): Promise<ArchiveJobResponse> {
    try {
      const job = await this.archiveJobCommandHandler.execute({
        employerIdentityId: request.employer_identity_id,
        jobId: request.job_id
      });

      return {
        job: toGrpcJobMessage(job)
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'ReopenJob')
  async reopenJob(request: ReopenJobRequest): Promise<ReopenJobResponse> {
    try {
      const job = await this.reopenJobCommandHandler.execute({
        employerIdentityId: request.employer_identity_id,
        jobId: request.job_id
      });

      return {
        job: toGrpcJobMessage(job)
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'ListJobsByIds')
  async listJobsByIds(
    request: ListJobsByIdsRequest
  ): Promise<ListJobsByIdsResponse> {
    try {
      const jobs = await this.listJobsByIdsQueryHandler.execute({
        jobIds: request.job_ids ?? []
      });

      return {
        items: jobs.map(toGrpcSavedJobSummary)
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'JobExists')
  async jobExists(request: JobExistsRequest): Promise<JobExistsResponse> {
    try {
      const exists = await this.jobExistsQueryHandler.execute({
        jobId: request.job_id
      });

      return {
        exists
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }

  @GrpcMethod(JOB_GRPC_SERVICE_NAME, 'GetEmployerDashboardJobsSummary')
  async getEmployerDashboardJobsSummary(
    request: GetEmployerDashboardJobsSummaryRequest
  ): Promise<GetEmployerDashboardJobsSummaryResponse> {
    try {
      const summary = await this.getEmployerDashboardJobsSummaryQueryHandler.execute({
        employerIdentityId: request.employer_identity_id
      });

      return {
        active_jobs: summary.activeJobs,
        priority_jobs: summary.priorityJobs.map((job) => ({
          category: job.category ?? '',
          city: job.city ?? '',
          country: job.country ?? '',
          expires_at: job.expiresAt?.toISOString() ?? '',
          id: job.id,
          is_remote: job.isRemote,
          slug: job.slug,
          status: job.status,
          title: job.title
        }))
      };
    } catch (error) {
      throw mapErrorToJobGrpcException(error);
    }
  }
}
