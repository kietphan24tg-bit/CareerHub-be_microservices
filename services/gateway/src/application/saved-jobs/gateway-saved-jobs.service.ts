import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CandidateGrpcClient } from '../../infrastructure/transport/grpc/candidate-grpc.client';
import { JobGrpcClient } from '../../infrastructure/transport/grpc/job-grpc.client';
import type { GatewayJobSummary } from './ports/job-lookup.port';
import { JOB_LOOKUP_PORT, type JobLookupPort } from './ports/job-lookup.port';

export type GatewaySavedJob = {
  id: string;
  jobId: string;
  savedAt: string;
  job?: GatewayJobSummary | null;
};

@Injectable()
export class GatewaySavedJobsService {
  constructor(
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly jobGrpcClient: JobGrpcClient,
    @Inject(JOB_LOOKUP_PORT)
    private readonly jobLookupPort: JobLookupPort
  ) {}

  async listSavedJobs(input: {
    identityId: string;
    requestId?: string;
  }): Promise<GatewaySavedJob[]> {
    const response = await this.candidateGrpcClient.listSavedJobsByIdentityId(
      {
        identity_id: input.identityId
      },
      input.requestId
    );

    const savedJobs = (response.saved_jobs ?? []).map((savedJob) => ({
      id: savedJob.id,
      jobId: savedJob.job_id,
      savedAt: savedJob.saved_at
    }));

    return this.enrichSavedJobs(savedJobs);
  }

  async saveJob(input: {
    identityId: string;
    jobId: string;
    requestId?: string;
  }): Promise<GatewaySavedJob> {
    const jobExistsResponse = await this.jobGrpcClient.jobExists(
      { job_id: input.jobId },
      input.requestId
    );

    if (!jobExistsResponse.exists) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found.'
      });
    }

    const response = await this.candidateGrpcClient.saveJob(
      {
        identity_id: input.identityId,
        job_id: input.jobId
      },
      input.requestId
    );

    const [savedJob] = await this.enrichSavedJobs([
      {
        id: response.saved_job.id,
        jobId: response.saved_job.job_id,
        savedAt: response.saved_job.saved_at
      }
    ]);

    return savedJob;
  }

  async removeSavedJob(input: {
    identityId: string;
    jobId: string;
    requestId?: string;
  }): Promise<void> {
    await this.candidateGrpcClient.removeSavedJob(
      {
        identity_id: input.identityId,
        job_id: input.jobId
      },
      input.requestId
    );
  }

  private async enrichSavedJobs(
    savedJobs: Array<Pick<GatewaySavedJob, 'id' | 'jobId' | 'savedAt'>>
  ): Promise<GatewaySavedJob[]> {
    if (savedJobs.length === 0) {
      return [];
    }

    const jobLookup = await this.jobLookupPort.findByIds(
      savedJobs.map((savedJob) => savedJob.jobId)
    );
    const hasEnrichedJobs = [...jobLookup.values()].some((job) => job !== null);

    if (!hasEnrichedJobs) {
      return savedJobs;
    }

    return savedJobs.map((savedJob) => ({
      ...savedJob,
      job: jobLookup.get(savedJob.jobId) ?? null
    }));
  }
}