import type {
  JobRecord,
  JobRepository,
  JobSearchCache,
  JobSearchRepository
} from '../../ports';
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
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly jobSearchRepository?: JobSearchRepository,
    private readonly jobSearchCache?: JobSearchCache
  ) {}

  async execute(query: ListPublicJobsQuery): Promise<ListPublicJobsResult> {
    const page = query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize > 0 ? Math.min(query.pageSize, 50) : 20;
    const filter = { ...query, page, pageSize };

    if (this.jobSearchRepository && this.jobSearchCache) {
      const cached = await this.jobSearchCache.get(filter).catch(() => null);
      if (cached) {
        return {
          items: cached.items,
          meta: {
            page,
            pageSize,
            total: cached.total
          }
        };
      }
    }

    const result = this.jobSearchRepository
      ? await this.jobSearchRepository.search(filter)
      : await this.jobRepository.listPublic(filter);

    if (this.jobSearchRepository && this.jobSearchCache) {
      await this.jobSearchCache.set(filter, result).catch(() => undefined);
    }

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
