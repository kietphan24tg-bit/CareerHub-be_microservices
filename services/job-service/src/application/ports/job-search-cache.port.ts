import type { JobRecord, ListPublicJobsFilter } from './job-repository.port';

export type JobSearchCacheValue = {
  items: JobRecord[];
  total: number;
};

export interface JobSearchCache {
  get(filter: ListPublicJobsFilter): Promise<JobSearchCacheValue | null>;
  set(filter: ListPublicJobsFilter, value: JobSearchCacheValue): Promise<void>;
  invalidateAll(): Promise<void>;
}
