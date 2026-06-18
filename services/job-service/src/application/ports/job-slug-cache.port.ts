import type { JobRecord } from './job-repository.port';

export interface JobSlugCache {
  get(slug: string): Promise<JobRecord | null>;
  set(slug: string, job: JobRecord): Promise<void>;
  del(slug: string): Promise<void>;
}
