import type { Redis } from 'ioredis';
import type { JobRecord } from '../../application/ports/job-repository.port';
import type { JobSlugCache } from '../../application/ports/job-slug-cache.port';

const KEY_PREFIX = 'job:slug:';

function hydrateJobRecord(job: JobRecord): JobRecord {
  return {
    ...job,
    createdAt: new Date(job.createdAt),
    expiresAt: job.expiresAt ? new Date(job.expiresAt) : null,
    updatedAt: new Date(job.updatedAt)
  };
}

export class RedisJobSlugCache implements JobSlugCache {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number
  ) {}

  async get(slug: string): Promise<JobRecord | null> {
    const raw = await this.redis.get(`${KEY_PREFIX}${slug}`);
    if (!raw) return null;
    try {
      return hydrateJobRecord(JSON.parse(raw) as JobRecord);
    } catch {
      return null;
    }
  }

  async set(slug: string, job: JobRecord): Promise<void> {
    await this.redis.setex(`${KEY_PREFIX}${slug}`, this.ttlSeconds, JSON.stringify(job));
  }

  async del(slug: string): Promise<void> {
    await this.redis.del(`${KEY_PREFIX}${slug}`);
  }
}
