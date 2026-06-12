import type { JobRecord, JobRepository } from '../../ports';
import type { ListPublicJobsQuery } from './list-public-jobs.query';

export type ListPublicJobsResult = {
  items: JobRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export class ListPublicJobsQueryHandler {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(query: ListPublicJobsQuery): Promise<ListPublicJobsResult> {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize > 0 ? Math.min(query.pageSize, 50) : 20;
    const result = await this.jobRepository.listPublic({
      ...query,
      page,
      pageSize
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
