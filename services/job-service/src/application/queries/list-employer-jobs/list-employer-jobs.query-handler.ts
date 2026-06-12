import { ValidationError } from '@careerhub/shared-kernel';
import type { JobRecord, JobRepository } from '../../ports';
import type { ListEmployerJobsQuery } from './list-employer-jobs.query';

export type ListEmployerJobsResult = {
  items: JobRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export class ListEmployerJobsQueryHandler {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(query: ListEmployerJobsQuery): Promise<ListEmployerJobsResult> {
    if (!query.employerIdentityId.trim()) {
      throw new ValidationError('Employer identity id is required');
    }

    const page = query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize > 0 ? Math.min(query.pageSize, 50) : 20;
    const result = await this.jobRepository.listEmployer({
      employerIdentityId: query.employerIdentityId.trim(),
      page,
      pageSize,
      status: query.status
    });

    return {
      items: result.items,
      meta: {
        page,
        pageSize,
        total: result.total
      }
    };
  }
}
