import { createHash } from 'node:crypto';
import type { Redis } from 'ioredis';
import type {
  JobSearchCache,
  JobSearchCacheValue,
  JobRecord,
  ListPublicJobsFilter
} from '../../application/ports';

const KEY_PREFIX = 'job:search:';

function normalizeFilter(filter: ListPublicJobsFilter): Record<string, unknown> {
  return {
    category: filter.category ?? null,
    companyIndustry: filter.companyIndustry ?? null,
    employmentType: filter.employmentType ?? null,
    keyword: filter.keyword ?? null,
    location: filter.location ?? null,
    page: filter.page,
    pageSize: filter.pageSize,
    remoteOnly: filter.remoteOnly ?? false,
    salaryMax: filter.salaryMax ?? null,
    salaryMin: filter.salaryMin ?? null,
    sort: filter.sort ?? 'newest'
  };
}

function buildCacheKey(filter: ListPublicJobsFilter): string {
  const digest = createHash('sha256')
    .update(JSON.stringify(normalizeFilter(filter)))
    .digest('hex');

  return `${KEY_PREFIX}${digest}`;
}

function hydrateJobRecord(job: JobRecord): JobRecord {
  return {
    ...job,
    createdAt: new Date(job.createdAt),
    expiresAt: job.expiresAt ? new Date(job.expiresAt) : null,
    updatedAt: new Date(job.updatedAt)
  };
}

export class RedisJobSearchCache implements JobSearchCache {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number
  ) {}

  async get(filter: ListPublicJobsFilter): Promise<JobSearchCacheValue | null> {
    const raw = await this.redis.get(buildCacheKey(filter));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as JobSearchCacheValue;
      return {
        items: parsed.items.map(hydrateJobRecord),
        total: parsed.total
      };
    } catch {
      return null;
    }
  }

  async set(filter: ListPublicJobsFilter, value: JobSearchCacheValue): Promise<void> {
    await this.redis.setex(buildCacheKey(filter), this.ttlSeconds, JSON.stringify(value));
  }

  async invalidateAll(): Promise<void> {
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', `${KEY_PREFIX}*`, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}
