import { Injectable } from '@nestjs/common';
import { ApplicationGrpcClient } from '../../infrastructure/transport/grpc/application-grpc.client';
import { CandidateGrpcClient } from '../../infrastructure/transport/grpc/candidate-grpc.client';
import { EmployerGrpcClient } from '../../infrastructure/transport/grpc/employer-grpc.client';
import { JobGrpcClient } from '../../infrastructure/transport/grpc/job-grpc.client';
import { toGatewayJobSummary } from '../jobs/mappers/gateway-job.mapper';
import type { GatewayJobSummary } from '../saved-jobs/ports/job-lookup.port';
import {
  toGatewayHttpEmployerInterviewListItem,
  toGatewayHttpInterviewDetail,
  toGrpcCancelInterviewInput,
  toGrpcCandidateInterviewResponseInput,
  toGrpcCandidateRescheduleInput,
  toGrpcCreateInterviewInput,
  toGrpcUpdateInterviewInput
} from './mappers/gateway-interview.mapper';
import type { EmployerInterviewsQueryDto } from '../../presentation/http/interviews/dto/employer-interviews-query.dto';
import type { GatewayHttpEmployerInterviewListItem } from './mappers/gateway-interview.mapper';
import type {
  CancelInterviewRequestDto,
  CandidateInterviewResponseRequestDto,
  CandidateRescheduleRequestDto,
  CreateInterviewRequestDto,
  UpdateInterviewRequestDto
} from '../../presentation/http/interviews/dto/interview-write.request.dto';

type CandidateSnapshot = {
  avatarUrl: string | null;
  fullName: string;
  headline: string | null;
  id: string;
};

type CompanySnapshot = {
  companyName: string;
  id: string;
  logoUrl: string | null;
};

const SEARCH_FETCH_PAGE_SIZE = 500;

function toIsoLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function resolveInterviewDateRange(input: Pick<EmployerInterviewsQueryDto, 'date' | 'dateFilter'>) {
  const exactDate = input.date?.trim();
  if (exactDate) {
    return { date: exactDate };
  }

  const today = new Date();
  const todayIso = toIsoLocalDate(today);

  if (input.dateFilter === 'today') {
    return {
      dateFrom: todayIso,
      dateTo: toIsoLocalDate(addDays(today, 1))
    };
  }

  if (input.dateFilter === 'thisWeek') {
    return {
      dateFrom: todayIso,
      dateTo: toIsoLocalDate(addDays(today, 7))
    };
  }

  return {};
}

function matchesInterviewSearch(
  item: GatewayHttpEmployerInterviewListItem,
  search?: string
) {
  const normalized = search?.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    item.candidate.fullName,
    item.job.title,
    item.round,
    item.platform,
    item.locationDetail,
    item.fullAddress,
    ...item.interviewers.map((interviewer) => interviewer.name)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

@Injectable()
export class GatewayInterviewsService {
  constructor(
    private readonly applicationGrpcClient: ApplicationGrpcClient,
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly employerGrpcClient: EmployerGrpcClient,
    private readonly jobGrpcClient: JobGrpcClient
  ) {}

  async listEmployerInterviews(
    input: EmployerInterviewsQueryDto & { identityId: string; requestId?: string }
  ) {
    const dateRange = resolveInterviewDateRange(input);
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const hasSearch = Boolean(input.search?.trim());
    const grpcRequest = {
      date: dateRange.date,
      date_from: dateRange.dateFrom,
      date_to: dateRange.dateTo,
      employer_identity_id: input.identityId,
      page: hasSearch ? 1 : page,
      page_size: hasSearch ? SEARCH_FETCH_PAGE_SIZE : pageSize,
      status: input.status && input.status !== 'all' ? input.status : undefined,
      type: input.type && input.type !== 'all' ? input.type : undefined
    };

    const response = await this.applicationGrpcClient.listEmployerInterviews(
      grpcRequest,
      input.requestId
    );
    const interviews = response.items ?? [];
    const enriched = await this.enrichEmployerInterviewList(interviews, input.identityId, input.requestId);

    if (!hasSearch) {
      return {
        items: enriched,
        meta: {
          page: response.meta?.page ?? page,
          pageSize: response.meta?.page_size ?? pageSize,
          total: response.meta?.total ?? enriched.length
        }
      };
    }

    const filtered = enriched.filter((item) => matchesInterviewSearch(item, input.search));
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      meta: {
        page,
        pageSize,
        total: filtered.length
      }
    };
  }

  private async enrichEmployerInterviewList(
    interviews: NonNullable<
      Awaited<ReturnType<ApplicationGrpcClient['listEmployerInterviews']>>['items']
    >,
    identityId: string,
    requestId?: string
  ) {
    const [jobLookup, candidateLookup, company] = await Promise.all([
      this.loadJobLookup(
        interviews.map((item) => item.job_id).filter((id): id is string => Boolean(id)),
        requestId
      ),
      this.loadCandidateLookup(
        interviews.map((item) => item.candidate_identity_id).filter((id): id is string => Boolean(id)),
        requestId
      ),
      this.loadCompanySnapshot(identityId, requestId)
    ]);

    return interviews.map((interview) =>
      toGatewayHttpEmployerInterviewListItem({
        candidate: candidateLookup.get(interview.candidate_identity_id ?? '') ?? null,
        company,
        interview,
        job: jobLookup.get(interview.job_id ?? '') ?? null
      })
    );
  }

  async createInterview(input: {
    applicationId: string;
    dto: CreateInterviewRequestDto;
    identityId: string;
    requestId?: string;
  }) {
    const response = await this.applicationGrpcClient.createInterview(
      {
        application_id: input.applicationId,
        employer_identity_id: input.identityId,
        input: toGrpcCreateInterviewInput(input.dto)
      },
      input.requestId
    );

    return this.toInterviewDetail(response.interview, input.identityId, input.requestId);
  }

  async updateInterview(input: {
    dto: UpdateInterviewRequestDto;
    identityId: string;
    interviewId: string;
    requestId?: string;
  }) {
    const response = await this.applicationGrpcClient.updateInterview(
      {
        employer_identity_id: input.identityId,
        input: toGrpcUpdateInterviewInput(input.dto),
        interview_id: input.interviewId
      },
      input.requestId
    );

    return this.toInterviewDetail(response.interview, input.identityId, input.requestId);
  }

  async cancelInterview(input: {
    dto: CancelInterviewRequestDto;
    identityId: string;
    interviewId: string;
    requestId?: string;
  }) {
    const response = await this.applicationGrpcClient.cancelInterview(
      {
        employer_identity_id: input.identityId,
        input: toGrpcCancelInterviewInput(input.dto),
        interview_id: input.interviewId
      },
      input.requestId
    );

    return this.toInterviewDetail(response.interview, input.identityId, input.requestId);
  }

  async getCandidateInterview(input: {
    applicationId: string;
    identityId: string;
    requestId?: string;
  }) {
    const response = await this.applicationGrpcClient.getCandidateInterview(
      {
        application_id: input.applicationId,
        candidate_identity_id: input.identityId
      },
      input.requestId
    );

    return this.toInterviewDetail(response.interview, response.interview.employer_identity_id, input.requestId);
  }

  async confirmInterview(input: {
    dto: CandidateInterviewResponseRequestDto;
    identityId: string;
    interviewId: string;
    requestId?: string;
  }) {
    const response = await this.applicationGrpcClient.confirmInterview(
      {
        candidate_identity_id: input.identityId,
        input: toGrpcCandidateInterviewResponseInput(input.dto),
        interview_id: input.interviewId
      },
      input.requestId
    );

    return this.toInterviewDetail(response.interview, response.interview.employer_identity_id, input.requestId);
  }

  async declineInterview(input: {
    dto: CandidateInterviewResponseRequestDto;
    identityId: string;
    interviewId: string;
    requestId?: string;
  }) {
    const response = await this.applicationGrpcClient.declineInterview(
      {
        candidate_identity_id: input.identityId,
        input: toGrpcCandidateInterviewResponseInput(input.dto),
        interview_id: input.interviewId
      },
      input.requestId
    );

    return this.toInterviewDetail(response.interview, response.interview.employer_identity_id, input.requestId);
  }

  async requestReschedule(input: {
    dto: CandidateRescheduleRequestDto;
    identityId: string;
    interviewId: string;
    requestId?: string;
  }) {
    const response = await this.applicationGrpcClient.requestInterviewReschedule(
      {
        candidate_identity_id: input.identityId,
        input: toGrpcCandidateRescheduleInput(input.dto),
        interview_id: input.interviewId
      },
      input.requestId
    );

    return this.toInterviewDetail(response.interview, response.interview.employer_identity_id, input.requestId);
  }

  private async toInterviewDetail(
    interview: NonNullable<Awaited<ReturnType<ApplicationGrpcClient['createInterview']>>['interview']>,
    employerIdentityId: string | undefined,
    requestId?: string
  ) {
    const [jobLookup, company] = await Promise.all([
      this.loadJobLookup(
        [interview.job_id].filter((id): id is string => Boolean(id)),
        requestId
      ),
      employerIdentityId
        ? this.loadCompanySnapshot(employerIdentityId, requestId)
        : Promise.resolve(null)
    ]);

    return toGatewayHttpInterviewDetail({
      company,
      interview,
      job: jobLookup.get(interview.job_id ?? '') ?? null
    });
  }

  private async loadJobLookup(jobIds: string[], requestId?: string) {
    const uniqueJobIds = [...new Set(jobIds.filter((jobId) => jobId.trim().length > 0))];
    const lookup = new Map<string, GatewayJobSummary | null>();

    if (uniqueJobIds.length === 0) {
      return lookup;
    }

    const response = await this.jobGrpcClient.listJobsByIds({ job_ids: uniqueJobIds }, requestId);

    for (const jobId of uniqueJobIds) {
      lookup.set(jobId, null);
    }

    for (const item of response.items ?? []) {
      lookup.set(item.id, toGatewayJobSummary(item));
    }

    return lookup;
  }

  private async loadCandidateLookup(candidateIds: string[], requestId?: string) {
    const uniqueCandidateIds = [...new Set(candidateIds.filter((id) => id.trim().length > 0))];
    const lookup = new Map<string, CandidateSnapshot | null>();

    await Promise.all(
      uniqueCandidateIds.map(async (candidateId) => {
        try {
          const response = await this.candidateGrpcClient.getCandidateProfileByIdentityId(
            { identity_id: candidateId },
            requestId
          );
          const profile = response.profile;

          lookup.set(candidateId, {
            avatarUrl: profile.avatar_url || null,
            fullName: profile.full_name,
            headline: profile.headline || null,
            id: candidateId
          });
        } catch {
          lookup.set(candidateId, null);
        }
      })
    );

    return lookup;
  }

  private async loadCompanySnapshot(
    employerIdentityId: string,
    requestId?: string
  ): Promise<CompanySnapshot | null> {
    try {
      const response = await this.employerGrpcClient.getEmployerProfileByIdentityId(
        { identity_id: employerIdentityId },
        requestId
      );
      const profile = response.profile;

      return {
        companyName: profile.company_name,
        id: employerIdentityId,
        logoUrl: profile.logo_url || null
      };
    } catch {
      return null;
    }
  }
}
