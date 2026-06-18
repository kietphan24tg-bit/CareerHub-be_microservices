import type { JobRecord, ListPublicJobsFilter } from './job-repository.port';

export interface JobSearchRepository {
  getBySlug(slug: string): Promise<JobRecord | null>;
  search(filter: ListPublicJobsFilter): Promise<{ items: JobRecord[]; total: number }>;
}

export interface JobSearchIndexer {
  index(job: JobRecord): Promise<void>;
  update(job: JobRecord): Promise<void>;
  remove(jobId: string): Promise<void>;
}
