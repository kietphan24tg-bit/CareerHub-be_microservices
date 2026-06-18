import type { Redis } from 'ioredis';
import type { EmployerDashboardCache } from '../../application/ports/employer-dashboard-cache.port';
import type {
  EmployerDashboardActivityRecord,
  EmployerDashboardPipelineRecord,
  EmployerDashboardRecruitmentData
} from '../../application/ports/employer-dashboard.port';
import type { ApplicationStatus } from '../../application/ports/application-repository.port';

const KEY_PREFIX = 'dashboard:';

function buildKey(employerIdentityId: string, localDate: string): string {
  return `${KEY_PREFIX}${employerIdentityId}:${localDate}`;
}

type SerializedPipelineRecord = Omit<EmployerDashboardPipelineRecord, 'appliedAt' | 'updatedAt'> & {
  appliedAt: string;
  updatedAt: string;
};

type SerializedActivityRecord = Omit<EmployerDashboardActivityRecord, 'createdAt'> & {
  createdAt: string;
};

type SerializedDashboardData = Omit<
  EmployerDashboardRecruitmentData,
  'pipeline' | 'recentActivities'
> & {
  pipeline: SerializedPipelineRecord[];
  recentActivities: SerializedActivityRecord[];
};

function deserialize(raw: string): EmployerDashboardRecruitmentData {
  const parsed = JSON.parse(raw) as SerializedDashboardData;
  return {
    ...parsed,
    pipeline: parsed.pipeline.map((p) => ({
      ...p,
      appliedAt: new Date(p.appliedAt),
      status: p.status as ApplicationStatus,
      updatedAt: new Date(p.updatedAt)
    })),
    recentActivities: parsed.recentActivities.map((a) => ({
      ...a,
      createdAt: new Date(a.createdAt)
    }))
  };
}

export class RedisEmployerDashboardCache implements EmployerDashboardCache {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number
  ) {}

  async get(
    employerIdentityId: string,
    localDate: string
  ): Promise<EmployerDashboardRecruitmentData | null> {
    const raw = await this.redis.get(buildKey(employerIdentityId, localDate));
    if (!raw) return null;
    try {
      return deserialize(raw);
    } catch {
      return null;
    }
  }

  async set(
    employerIdentityId: string,
    localDate: string,
    data: EmployerDashboardRecruitmentData
  ): Promise<void> {
    await this.redis.setex(buildKey(employerIdentityId, localDate), this.ttlSeconds, JSON.stringify(data));
  }

  async invalidate(employerIdentityId: string): Promise<void> {
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${KEY_PREFIX}${employerIdentityId}:*`,
        'COUNT',
        100
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}
