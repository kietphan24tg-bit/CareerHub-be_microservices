import type { JobMessage } from '@careerhub/contracts';
import { Injectable } from '@nestjs/common';
import { ApplicationGrpcClient } from '../../infrastructure/transport/grpc/application-grpc.client';
import { EmployerGrpcClient } from '../../infrastructure/transport/grpc/employer-grpc.client';
import { JobGrpcClient } from '../../infrastructure/transport/grpc/job-grpc.client';
import {
  toGatewayHttpJob,
  toGatewayHttpPageMeta,
  type GatewayHttpJob
} from './mappers/gateway-job.mapper';

type EmployerCompanyContext = {
  companyId: string;
  companyIndustry: string | null;
  companyLogoUrl: string | null;
  companyName: string;
  companyWebsite: string | null;
};

@Injectable()
export class GatewayJobsService {
  constructor(
    private readonly jobGrpcClient: JobGrpcClient,
    private readonly employerGrpcClient: EmployerGrpcClient,
    private readonly applicationGrpcClient: ApplicationGrpcClient
  ) {}

  async listPublicJobs(input: {
    category?: string;
    companyIndustry?: string;
    employmentType?: string;
    keyword?: string;
    location?: string;
    page?: number;
    pageSize?: number;
    remoteOnly?: boolean;
    requestId?: string;
    salaryMax?: number;
    salaryMin?: number;
    sort?: string;
  }) {
    const response = await this.jobGrpcClient.listPublicJobs(
      {
        category: input.category,
        company_industry: input.companyIndustry,
        employment_type: input.employmentType,
        keyword: input.keyword,
        location: input.location,
        page: input.page,
        page_size: input.pageSize,
        remote_only: input.remoteOnly,
        salary_max: input.salaryMax,
        salary_min: input.salaryMin,
        sort: input.sort
      },
      input.requestId
    );

    return {
      items: (response.items ?? []).map(toGatewayHttpJob),
      meta: response.meta ? toGatewayHttpPageMeta(response.meta) : undefined
    };
  }

  async getPublicJobBySlug(input: { requestId?: string; slug: string }): Promise<GatewayHttpJob> {
    const response = await this.jobGrpcClient.getPublicJobBySlug(
      { slug: input.slug },
      input.requestId
    );

    return toGatewayHttpJob(response.job);
  }

  async listEmployerJobs(input: {
    identityId: string;
    page?: number;
    pageSize?: number;
    requestId?: string;
    status?: string;
  }) {
    const response = await this.jobGrpcClient.listEmployerJobs(
      {
        employer_identity_id: input.identityId,
        page: input.page,
        page_size: input.pageSize,
        status: input.status
      },
      input.requestId
    );
    const enrichedItems = await this.enrichJobApplicationCounts(
      response.items ?? [],
      input.requestId
    );

    return {
      items: enrichedItems.map(toGatewayHttpJob),
      meta: response.meta ? toGatewayHttpPageMeta(response.meta) : undefined
    };
  }

  async getEmployerJob(input: {
    identityId: string;
    jobId: string;
    requestId?: string;
  }): Promise<GatewayHttpJob> {
    const response = await this.jobGrpcClient.getEmployerJobById(
      {
        employer_identity_id: input.identityId,
        job_id: input.jobId
      },
      input.requestId
    );

    const [job] = await this.enrichJobApplicationCounts([response.job], input.requestId);
    return toGatewayHttpJob(job);
  }

  async createEmployerJob(input: {
    benefits?: string[];
    category?: string;
    city?: string;
    country?: string;
    currency?: string;
    description?: string;
    employmentType?: string;
    expiresAt?: string;
    identityId: string;
    isRemote?: boolean;
    level?: string;
    requestId?: string;
    requirements?: string[];
    responsibilities?: string[];
    salaryMax?: number;
    salaryMin?: number;
    title: string;
  }): Promise<GatewayHttpJob> {
    const company = await this.resolveEmployerCompany(input.identityId, input.requestId);
    const response = await this.jobGrpcClient.createJob(
      {
        benefits: input.benefits,
        category: input.category,
        city: input.city,
        company_id: company.companyId,
        company_industry: company.companyIndustry ?? undefined,
        company_logo_url: company.companyLogoUrl ?? undefined,
        company_name: company.companyName,
        company_website: company.companyWebsite ?? undefined,
        country: input.country,
        currency: input.currency,
        description: input.description,
        employer_identity_id: input.identityId,
        employment_type: input.employmentType,
        expires_at: input.expiresAt,
        is_remote: input.isRemote,
        level: input.level,
        requirements: input.requirements,
        responsibilities: input.responsibilities,
        salary_max: input.salaryMax,
        salary_min: input.salaryMin,
        title: input.title
      },
      input.requestId
    );

    return toGatewayHttpJob(response.job);
  }

  async updateEmployerJob(input: {
    benefits?: string[];
    category?: string | null;
    city?: string | null;
    country?: string | null;
    currency?: string | null;
    description?: string | null;
    employmentType?: string | null;
    expiresAt?: string | null;
    identityId: string;
    isRemote?: boolean;
    jobId: string;
    level?: string | null;
    requestId?: string;
    requirements?: string[];
    responsibilities?: string[];
    salaryMax?: number | null;
    salaryMin?: number | null;
    title?: string;
  }): Promise<GatewayHttpJob> {
    const { clearFields, updatedFields } = this.collectFieldChanges(input);
    const response = await this.jobGrpcClient.updateJob(
      {
        benefits: input.benefits,
        category: input.category ?? undefined,
        city: input.city ?? undefined,
        clear_fields: clearFields,
        country: input.country ?? undefined,
        currency: input.currency ?? undefined,
        description: input.description ?? undefined,
        employer_identity_id: input.identityId,
        employment_type: input.employmentType ?? undefined,
        expires_at: input.expiresAt ?? undefined,
        is_remote: input.isRemote,
        job_id: input.jobId,
        level: input.level ?? undefined,
        requirements: input.requirements,
        responsibilities: input.responsibilities,
        salary_max: input.salaryMax ?? undefined,
        salary_min: input.salaryMin ?? undefined,
        title: input.title,
        updated_fields: updatedFields
      },
      input.requestId
    );

    return toGatewayHttpJob(response.job);
  }

  async publishEmployerJob(input: {
    identityId: string;
    jobId: string;
    requestId?: string;
  }): Promise<GatewayHttpJob> {
    return this.transitionEmployerJob('publish', input);
  }

  async closeEmployerJob(input: {
    identityId: string;
    jobId: string;
    requestId?: string;
  }): Promise<GatewayHttpJob> {
    return this.transitionEmployerJob('close', input);
  }

  async archiveEmployerJob(input: {
    identityId: string;
    jobId: string;
    requestId?: string;
  }): Promise<GatewayHttpJob> {
    return this.transitionEmployerJob('archive', input);
  }

  async reopenEmployerJob(input: {
    identityId: string;
    jobId: string;
    requestId?: string;
  }): Promise<GatewayHttpJob> {
    return this.transitionEmployerJob('reopen', input);
  }

  private async transitionEmployerJob(
    action: 'publish' | 'close' | 'archive' | 'reopen',
    input: { identityId: string; jobId: string; requestId?: string }
  ): Promise<GatewayHttpJob> {
    const request = {
      employer_identity_id: input.identityId,
      job_id: input.jobId
    };

    const response =
      action === 'publish'
        ? await this.jobGrpcClient.publishJob(request, input.requestId)
        : action === 'close'
          ? await this.jobGrpcClient.closeJob(request, input.requestId)
          : action === 'archive'
            ? await this.jobGrpcClient.archiveJob(request, input.requestId)
            : await this.jobGrpcClient.reopenJob(request, input.requestId);

    return toGatewayHttpJob(response.job);
  }

  private async resolveEmployerCompany(
    identityId: string,
    requestId?: string
  ): Promise<EmployerCompanyContext> {
    const response = await this.employerGrpcClient.getEmployerProfileByIdentityId(
      { identity_id: identityId },
      requestId
    );
    const profile = response.profile;
    const nullFields = profile.null_fields ?? [];

    return {
      companyId: profile.id,
      companyIndustry: nullFields.includes('industry') ? null : profile.industry || null,
      companyLogoUrl: nullFields.includes('logo_url') ? null : profile.logo_url || null,
      companyName: profile.company_name,
      companyWebsite: nullFields.includes('website') ? null : profile.website || null
    };
  }

  private collectFieldChanges(input: Record<string, unknown>) {
    const fieldMap: Record<string, string> = {
      benefits: 'benefits',
      category: 'category',
      city: 'city',
      country: 'country',
      currency: 'currency',
      description: 'description',
      employmentType: 'employment_type',
      expiresAt: 'expires_at',
      isRemote: 'is_remote',
      level: 'level',
      requirements: 'requirements',
      responsibilities: 'responsibilities',
      salaryMax: 'salary_max',
      salaryMin: 'salary_min',
      title: 'title'
    };

    const updatedFields: string[] = [];
    const clearFields: string[] = [];

    for (const [inputKey, grpcField] of Object.entries(fieldMap)) {
      const value = input[inputKey];

      if (value === undefined) {
        continue;
      }

      if (value === null) {
        clearFields.push(grpcField);
        continue;
      }

      updatedFields.push(grpcField);
    }

    return {
      clearFields,
      updatedFields
    };
  }

  private async enrichJobApplicationCounts(
    jobs: JobMessage[],
    requestId?: string
  ): Promise<JobMessage[]> {
    if (jobs.length === 0) {
      return jobs;
    }

    const response = await this.applicationGrpcClient.getApplicationCountsByJobIds(
      {
        job_ids: jobs.map((job) => job.id)
      },
      requestId
    );
    const countsByJobId = new Map(
      (response.items ?? []).map((item) => [item.job_id, item.count])
    );

    return jobs.map((job) => ({
      ...job,
      application_count: countsByJobId.get(job.id) ?? 0
    }));
  }
}
