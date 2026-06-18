import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { CandidateGrpcClient } from '../../infrastructure/transport/grpc/candidate-grpc.client';
import { JobGrpcClient } from '../../infrastructure/transport/grpc/job-grpc.client';
import { ApplicationGrpcClient } from '../../infrastructure/transport/grpc/application-grpc.client';
import {
  buildCandidateApplicationsSummary,
  mapDisplayGroup,
  toAtsBoardJob,
  toAtsStageContext,
  toCandidateApplicationDetail,
  toCandidateApplicationListItem,
  toGatewayHttpApplicationPageMeta,
  toGatewayHttpApplicationWriteResponse,
  toGatewayHttpApplicationTimelineItem,
  type GatewayHttpApplicationWriteResponse,
  type GatewayHttpEmployerAtsApplication
} from './mappers/gateway-application.mapper';
import type { GatewayJobSummary } from '../saved-jobs/ports/job-lookup.port';
import { toGatewayJobSummary, toGatewayHttpJob } from '../jobs/mappers/gateway-job.mapper';
import type { ApplicationMessage } from '@careerhub/contracts';

type CandidateProfileSnapshot = {
  address: string | null;
  fullName: string | null;
  headline: string | null;
  resumeId: string | null;
  yearsExperience: number | null;
};

type ResumeSnapshot = {
  address: string | null;
  fullName: string | null;
  headline: string | null;
  skills: string[];
  title: string;
};

@Injectable()
export class GatewayApplicationsService {
  constructor(
    private readonly applicationGrpcClient: ApplicationGrpcClient,
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly jobGrpcClient: JobGrpcClient
  ) {}

  async applyToJob(input: {
    coverLetter?: string;
    identityId: string;
    jobId: string;
    requestId?: string;
    resumeId: string;
  }): Promise<GatewayHttpApplicationWriteResponse> {
    const job = await this.jobGrpcClient.getJobForApplication(
      { job_id: input.jobId },
      input.requestId
    );

    this.ensureJobOpenForApplication(job.status, job.expires_at, job.null_fields ?? []);
    await this.candidateGrpcClient.getResumeById(
      {
        identity_id: input.identityId,
        resume_id: input.resumeId
      },
      input.requestId
    );

    const response = await this.applicationGrpcClient.applyToJob(
      {
        candidate_identity_id: input.identityId,
        cover_letter: input.coverLetter,
        employer_identity_id: job.employer_identity_id,
        job_id: input.jobId,
        resume_id: input.resumeId
      },
      input.requestId
    );

    return toGatewayHttpApplicationWriteResponse(response.application);
  }

  async listCandidateApplications(input: {
    identityId: string;
    page?: number;
    pageSize?: number;
    requestId?: string;
    sort?: string;
    status?: string;
  }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const sort = input.sort ?? 'newest';
    const status = input.status ?? 'all';
    const response = await this.applicationGrpcClient.listCandidateApplications(
      {
        candidate_identity_id: input.identityId,
        page,
        page_size: pageSize,
        sort,
        status
      },
      input.requestId
    );
    const jobLookup = await this.loadJobSummaryLookup(
      (response.items ?? []).map((item) => item.job_id),
      input.requestId
    );
    const meta = response.meta
      ? {
          ...toGatewayHttpApplicationPageMeta(response.meta),
          filter: status,
          sort
        }
      : {
          filter: status,
          page,
          pageSize,
          sort,
          total: 0
        };
    const summary = response.summary ?? {
      all: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      reviewed: 0,
      withdrawn: 0
    };

    return {
      items: (response.items ?? []).map((application) =>
        toCandidateApplicationListItem({
          application,
          job: jobLookup.get(application.job_id) ?? null
        })
      ),
      meta,
      summary: buildCandidateApplicationsSummary(summary)
    };
  }

  async getCandidateApplication(input: {
    applicationId: string;
    identityId: string;
    requestId?: string;
  }) {
    const [applicationResponse, historyResponse] = await Promise.all([
      this.applicationGrpcClient.getCandidateApplicationById(
        {
          application_id: input.applicationId,
          candidate_identity_id: input.identityId
        },
        input.requestId
      ),
      this.applicationGrpcClient.getApplicationHistory(
        { application_id: input.applicationId },
        input.requestId
      )
    ]);
    const application = applicationResponse.application;
    const [jobLookup, resume] = await Promise.all([
      this.loadJobSummaryLookup([application.job_id], input.requestId),
      this.loadResumeSummary(input.identityId, application.resume_id, input.requestId)
    ]);

    return toCandidateApplicationDetail({
      application,
      history: historyResponse.items ?? [],
      job: jobLookup.get(application.job_id) ?? null,
      resume
    });
  }

  async withdrawApplication(input: {
    applicationId: string;
    identityId: string;
    requestId?: string;
  }): Promise<GatewayHttpApplicationWriteResponse> {
    const response = await this.applicationGrpcClient.withdrawApplication(
      {
        application_id: input.applicationId,
        candidate_identity_id: input.identityId
      },
      input.requestId
    );

    return toGatewayHttpApplicationWriteResponse(response.application);
  }

  async listJobApplications(input: {
    identityId: string;
    jobId: string;
    page?: number;
    pageSize?: number;
    requestId?: string;
    status?: string;
  }) {
    const response = await this.applicationGrpcClient.listJobApplications(
      {
        employer_identity_id: input.identityId,
        job_id: input.jobId,
        page: input.page,
        page_size: input.pageSize,
        status: input.status
      },
      input.requestId
    );

    return {
      items: (response.items ?? []).map(toGatewayHttpApplicationWriteResponse),
      meta: response.meta
        ? toGatewayHttpApplicationPageMeta(response.meta)
        : undefined
    };
  }

  async getEmployerApplication(input: {
    applicationId: string;
    identityId: string;
    requestId?: string;
  }) {
    const [applicationResponse, historyResponse] = await Promise.all([
      this.applicationGrpcClient.getEmployerApplicationById(
        {
          application_id: input.applicationId,
          employer_identity_id: input.identityId
        },
        input.requestId
      ),
      this.applicationGrpcClient.getApplicationHistory(
        { application_id: input.applicationId },
        input.requestId
      )
    ]);

    return {
      ...toGatewayHttpApplicationWriteResponse(applicationResponse.application),
      displayGroup: mapDisplayGroup(applicationResponse.application.status),
      history: (historyResponse.items ?? []).map(toGatewayHttpApplicationTimelineItem),
      interview: applicationResponse.application.interview ?? null,
      offer: applicationResponse.application.offer ?? null
    };
  }

  async updateApplicationStatus(input: {
    applicationId: string;
    identityId: string;
    note?: string | null;
    requestId?: string;
    status: string;
  }): Promise<GatewayHttpApplicationWriteResponse> {
    const existing = await this.applicationGrpcClient.getEmployerApplicationById(
      {
        application_id: input.applicationId,
        employer_identity_id: input.identityId
      },
      input.requestId
    );
    const response = await this.applicationGrpcClient.updateApplicationStatus(
      {
        application_id: input.applicationId,
        employer_identity_id: input.identityId,
        note: input.note ?? undefined,
        status: input.status
      },
      input.requestId
    );

    return toGatewayHttpApplicationWriteResponse(response.application);
  }

  async getApplicationHistory(input: { applicationId: string; requestId?: string }) {
    const response = await this.applicationGrpcClient.getApplicationHistory(
      { application_id: input.applicationId },
      input.requestId
    );

    return (response.items ?? []).map(toGatewayHttpApplicationTimelineItem);
  }

  async getAtsBoard(input: {
    identityId: string;
    jobId: string;
    page?: number;
    pageSize?: number;
    requestId?: string;
  }) {
    const [jobResponse, applicationsResponse] = await Promise.all([
      this.jobGrpcClient.getEmployerJobById(
        {
          employer_identity_id: input.identityId,
          job_id: input.jobId
        },
        input.requestId
      ),
      this.applicationGrpcClient.listJobApplications(
        {
          employer_identity_id: input.identityId,
          job_id: input.jobId,
          page: input.page,
          page_size: input.pageSize
        },
        input.requestId
      )
    ]);

    const applications = await Promise.all(
      (applicationsResponse.items ?? []).map((application) =>
        this.toAtsApplication(application, input.requestId)
      )
    );
    const job = toGatewayHttpJob(jobResponse.job);

    return {
      applications,
      job: toAtsBoardJob({
        city: job.city,
        country: job.country,
        currency: job.currency,
        id: job.id,
        isRemote: job.isRemote,
        salaryMax: job.salaryMax,
        salaryMin: job.salaryMin,
        status: job.status,
        title: job.title
      })
    };
  }

  private async loadJobSummaryLookup(
    jobIds: string[],
    requestId?: string
  ): Promise<Map<string, GatewayJobSummary | null>> {
    const uniqueJobIds = [...new Set(jobIds.filter((jobId) => jobId.trim().length > 0))];

    if (uniqueJobIds.length === 0) {
      return new Map();
    }

    const response = await this.jobGrpcClient.listJobsByIds(
      {
        job_ids: uniqueJobIds
      },
      requestId
    );
    const lookup = new Map<string, GatewayJobSummary | null>();

    for (const jobId of uniqueJobIds) {
      lookup.set(jobId, null);
    }

    for (const item of response.items ?? []) {
      lookup.set(item.id, toGatewayJobSummary(item));
    }

    return lookup;
  }

  private async loadResumeSummary(
    identityId: string,
    resumeId: string,
    requestId?: string
  ): Promise<{ id: string; title: string } | null> {
    if (!resumeId) {
      return null;
    }

    try {
      const response = await this.candidateGrpcClient.getResumeById(
        {
          identity_id: identityId,
          resume_id: resumeId
        },
        requestId
      );

      return {
        id: response.resume.id,
        title: response.resume.title
      };
    } catch {
      return null;
    }
  }

  private async toAtsApplication(
    application: ApplicationMessage,
    requestId?: string
  ): Promise<GatewayHttpEmployerAtsApplication> {
    const profile = await this.loadCandidateProfileSnapshot(
      application.candidate_identity_id,
      requestId
    );
    const applicationResumeId = application.resume_id.trim();
    const profileResumeId = profile.resumeId?.trim() ?? '';
    const applicationResumePromise = applicationResumeId
      ? this.loadResumeSnapshot(
          application.candidate_identity_id,
          applicationResumeId,
          requestId
        )
      : Promise.resolve<ResumeSnapshot | null>(null);
    const profileResumePromise =
      profileResumeId && profileResumeId !== applicationResumeId
        ? this.loadResumeSnapshot(
            application.candidate_identity_id,
            profileResumeId,
            requestId
          )
        : Promise.resolve<ResumeSnapshot | null>(null);
    const notesPromise = this.applicationGrpcClient.listRecruiterNotes(
      {
        application_id: application.id,
        employer_identity_id: application.employer_identity_id
      },
      requestId
    );

    const [applicationResume, profileResume, notesResponse] = await Promise.all([
      applicationResumePromise,
      profileResumePromise,
      notesPromise
    ]);
    const resume = applicationResume ?? profileResume;
    const latestNote = notesResponse.items?.[0]?.body?.trim() || null;
    const candidateName = profile.fullName ?? resume?.fullName ?? null;
    const headline = profile.headline ?? resume?.headline ?? null;
    const location = profile.address ?? resume?.address ?? null;

    return {
      applicationId: this.toSafeInteger(application.id),
      candidateId: this.toSafeInteger(application.candidate_identity_id),
      candidateName,
      headline,
      location,
      skills: resume?.skills ?? [],
      stage: application.status,
      stageContext: toAtsStageContext(application, latestNote),
      updatedAt: application.updated_at,
      yearsExperience: profile.yearsExperience
    };
  }

  private async loadCandidateProfileSnapshot(
    identityId: string,
    requestId?: string
  ): Promise<CandidateProfileSnapshot> {
    try {
      const response = await this.candidateGrpcClient.getCandidateProfileByIdentityId(
        {
          identity_id: identityId
        },
        requestId
      );
      const nullFields = new Set(response.profile.null_fields ?? []);

      return {
        address: nullFields.has('address') ? null : response.profile.address,
        fullName: response.profile.full_name,
        headline: nullFields.has('headline') ? null : response.profile.headline,
        resumeId: nullFields.has('resume_id') ? null : response.profile.resume_id,
        yearsExperience: nullFields.has('years_experience')
          ? null
          : response.profile.years_experience
      };
    } catch {
      return {
        address: null,
        fullName: null,
        headline: null,
        resumeId: null,
        yearsExperience: null
      };
    }
  }

  private async loadResumeSnapshot(
    identityId: string,
    resumeId: string,
    requestId?: string
  ): Promise<ResumeSnapshot | null> {
    if (!resumeId.trim()) {
      return null;
    }

    try {
      const response = await this.candidateGrpcClient.getResumeById(
        {
          identity_id: identityId,
          resume_id: resumeId
        },
        requestId
      );
      const content = this.parseResumeContent(response.resume.content_json);

      return {
        address: this.readNullableString(content.address),
        fullName: this.readNullableString(content.fullName),
        headline: this.readNullableString(content.headline),
        skills: this.readResumeSkills(content.skills),
        title: response.resume.title
      };
    } catch {
      return null;
    }
  }

  private parseResumeContent(contentJson: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(contentJson) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private readNullableString(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private readResumeSkills(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) =>
        item && typeof item === 'object' && typeof item.name === 'string'
          ? item.name.trim()
          : null
      )
      .filter((item): item is string => Boolean(item));
  }

  private toSafeInteger(value: string) {
    const numericValue = Number(value);
    return Number.isSafeInteger(numericValue) ? numericValue : 0;
  }
  private ensureJobOpenForApplication(
    status: string,
    expiresAt: string,
    nullFields: string[]
  ) {
    const isPublished = status.toLowerCase() === 'published';
    const hasNoExpiry = nullFields.includes('expires_at') || !expiresAt;
    const isNotExpired = hasNoExpiry || new Date(expiresAt).getTime() > Date.now();

    if (!isPublished || !isNotExpired) {
      throw new UnprocessableEntityException({
        code: 'JOB_NOT_OPEN',
        message: 'Job is not open for applications.'
      });
    }
  }
}
