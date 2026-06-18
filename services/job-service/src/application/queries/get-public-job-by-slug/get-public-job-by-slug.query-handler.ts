import { ValidationError } from '@careerhub/shared-kernel';
import { JobNotFoundError } from '../../errors/job-not-found.error';
import type {
  JobRecord,
  JobRepository,
  JobSearchRepository,
  JobSlugCache
} from '../../ports';
import type { GetPublicJobBySlugQuery } from './get-public-job-by-slug.query';

export class GetPublicJobBySlugQueryHandler {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly slugCache?: JobSlugCache,
    private readonly jobSearchRepository?: JobSearchRepository
  ) {}

  async execute(query: GetPublicJobBySlugQuery): Promise<JobRecord> {
    const slug = query.slug.trim();

    if (!slug) {
      throw new ValidationError('Job slug is required');
    }

    if (this.slugCache) {
      const cached = await this.slugCache.get(slug).catch(() => null);
      if (cached) return cached;
    }

    const job = this.jobSearchRepository
      ? await this.jobSearchRepository.getBySlug(slug)
      : await this.jobRepository.findPublicBySlug(slug);

    if (!job) {
      throw new JobNotFoundError();
    }

    if (this.slugCache) {
      await this.slugCache.set(slug, job).catch(() => undefined);
    }

    return job;
  }
}
