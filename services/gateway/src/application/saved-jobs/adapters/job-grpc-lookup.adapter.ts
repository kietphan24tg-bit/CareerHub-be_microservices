import { Injectable } from '@nestjs/common';
import { JobGrpcClient } from '../../../infrastructure/transport/grpc/job-grpc.client';
import { toGatewayJobSummary } from '../../jobs/mappers/gateway-job.mapper';
import type { GatewayJobSummary, JobLookupPort } from '../ports/job-lookup.port';

@Injectable()
export class JobGrpcLookupAdapter implements JobLookupPort {
  constructor(private readonly jobGrpcClient: JobGrpcClient) {}

  async findByIds(jobIds: string[]): Promise<Map<string, GatewayJobSummary | null>> {
    const lookup = new Map<string, GatewayJobSummary | null>(
      jobIds.map((jobId) => [jobId, null])
    );

    if (jobIds.length === 0) {
      return lookup;
    }

    const response = await this.jobGrpcClient.listJobsByIds({
      job_ids: jobIds
    });

    for (const job of response.items ?? []) {
      lookup.set(job.id, toGatewayJobSummary(job));
    }

    return lookup;
  }
}
