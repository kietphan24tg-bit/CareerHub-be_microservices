import type {
  CreateJobData,
  JobRecord,
  JobRepository,
  JobStatus,
  ListEmployerJobsFilter,
  ListPublicJobsFilter,
  UpdateJobPatch
} from '../../../application';
import { parseJobList, stringifyJobList } from '../../../application/utils/job-list-json';
import { JobPrismaService } from '../prisma/job-prisma.service';
import type {
  JobOrderByInput,
  JobPersistenceRecord,
  JobWhereInput
} from '../prisma/job-prisma.types';

function mapDecimal(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof value.toNumber === 'function'
  ) {
    return value.toNumber() as number;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? null : numericValue;
}

function mapRecord(record: JobPersistenceRecord): JobRecord {
  return {
    applicationCount: 0,
    benefits: parseJobList(record.benefitsJson),
    category: record.category,
    city: record.city,
    companyId: record.companyId,
    companyIndustry: record.companyIndustry,
    companyLogoUrl: record.companyLogoUrl,
    companyName: record.companyName,
    companyWebsite: record.companyWebsite,
    country: record.country,
    createdAt: record.createdAt,
    currency: record.currency,
    description: record.description,
    employerIdentityId: record.employerIdentityId,
    employmentType: record.employmentType,
    experienceLevel: record.experienceLevel,
    expiresAt: record.expiresAt,
    id: record.id,
    isRemote: record.isRemote,
    level: record.level,
    requirements: parseJobList(record.requirementsJson),
    responsibilities: parseJobList(record.responsibilitiesJson),
    salaryMax: mapDecimal(record.salaryMax),
    salaryMin: mapDecimal(record.salaryMin),
    saturdayPolicy: record.saturdayPolicy,
    slug: record.slug,
    status: record.status as JobStatus,
    title: record.title,
    updatedAt: record.updatedAt
  };
}

function buildPublicVisibilityWhere(now = new Date()): JobWhereInput {
  return {
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    status: 'published'
  };
}

function buildPublicJobWhere(
  filter: ListPublicJobsFilter,
  now = new Date()
): JobWhereInput {
  const keyword = filter.keyword?.trim();
  const location = filter.location?.trim();
  const andConditions: JobWhereInput[] = [
    {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    }
  ];

  if (keyword) {
    andConditions.push({
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { category: { contains: keyword, mode: 'insensitive' } },
        { companyName: { contains: keyword, mode: 'insensitive' } }
      ]
    });
  }

  if (location) {
    andConditions.push({
      OR: [
        { city: { contains: location, mode: 'insensitive' } },
        { country: { contains: location, mode: 'insensitive' } }
      ]
    });
  }

  return {
    AND: andConditions,
    status: 'published',
    ...(filter.employmentType ? { employmentType: filter.employmentType } : {}),
    ...(filter.category
      ? { category: { contains: filter.category, mode: 'insensitive' } }
      : {}),
    ...(filter.companyIndustry
      ? {
          companyIndustry: {
            contains: filter.companyIndustry,
            mode: 'insensitive'
          }
        }
      : {}),
    ...(filter.remoteOnly ? { isRemote: true } : {}),
    ...(filter.salaryMin !== undefined
      ? { salaryMax: { gte: filter.salaryMin } }
      : {}),
    ...(filter.salaryMax !== undefined
      ? { salaryMin: { lte: filter.salaryMax } }
      : {}),
    ...(filter.saturdayPolicy ? { saturdayPolicy: filter.saturdayPolicy } : {}),
    ...(filter.experienceLevel ? { experienceLevel: filter.experienceLevel } : {})
  };
}

function resolvePublicOrderBy(
  sort: ListPublicJobsFilter['sort']
): JobOrderByInput {
  if (sort === 'salary_asc') {
    return [{ salaryMin: 'asc' }, { createdAt: 'desc' }];
  }

  if (sort === 'salary_desc') {
    return [{ salaryMax: 'desc' }, { createdAt: 'desc' }];
  }

  return [{ createdAt: 'desc' }];
}

function mapUpdatePatch(patch: UpdateJobPatch) {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
    ...(patch.description !== undefined
      ? { description: patch.description }
      : {}),
    ...(patch.responsibilities !== undefined
      ? { responsibilitiesJson: stringifyJobList(patch.responsibilities ?? []) }
      : {}),
    ...(patch.requirements !== undefined
      ? { requirementsJson: stringifyJobList(patch.requirements ?? []) }
      : {}),
    ...(patch.benefits !== undefined
      ? { benefitsJson: stringifyJobList(patch.benefits ?? []) }
      : {}),
    ...(patch.employmentType !== undefined
      ? { employmentType: patch.employmentType }
      : {}),
    ...(patch.experienceLevel !== undefined
      ? { experienceLevel: patch.experienceLevel }
      : {}),
    ...(patch.level !== undefined ? { level: patch.level } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.city !== undefined ? { city: patch.city } : {}),
    ...(patch.country !== undefined ? { country: patch.country } : {}),
    ...(patch.isRemote !== undefined ? { isRemote: patch.isRemote } : {}),
    ...(patch.salaryMin !== undefined ? { salaryMin: patch.salaryMin } : {}),
    ...(patch.salaryMax !== undefined ? { salaryMax: patch.salaryMax } : {}),
    ...(patch.saturdayPolicy !== undefined
      ? { saturdayPolicy: patch.saturdayPolicy }
      : {}),
    ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
    ...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {})
  };
}

export class PrismaJobRepository implements JobRepository {
  constructor(private readonly prismaService: JobPrismaService) {}

  async create(data: CreateJobData): Promise<JobRecord> {
    const record = await this.prismaService.prisma.job.create({
      data: {
        benefitsJson: stringifyJobList(data.benefits),
        category: data.category,
        city: data.city,
        companyId: data.companyId,
        companyIndustry: data.companyIndustry,
        companyLogoUrl: data.companyLogoUrl,
        companyName: data.companyName,
        companyWebsite: data.companyWebsite,
        country: data.country,
        currency: data.currency,
        description: data.description,
        employerIdentityId: data.employerIdentityId,
        employmentType: data.employmentType,
        experienceLevel: data.experienceLevel,
        expiresAt: data.expiresAt,
        id: data.id,
        isRemote: data.isRemote,
        level: data.level,
        requirementsJson: stringifyJobList(data.requirements),
        responsibilitiesJson: stringifyJobList(data.responsibilities),
        salaryMax: data.salaryMax,
        salaryMin: data.salaryMin,
        saturdayPolicy: data.saturdayPolicy,
        slug: data.slug,
        status: 'draft',
        title: data.title
      }
    });

    return mapRecord(record);
  }

  async existsById(jobId: string): Promise<boolean> {
    const record = await this.prismaService.prisma.job.findUnique({
      where: { id: jobId }
    });

    return record !== null;
  }

  async findById(jobId: string): Promise<JobRecord | null> {
    const record = await this.prismaService.prisma.job.findUnique({
      where: { id: jobId }
    });

    return record ? mapRecord(record) : null;
  }

  async findByIdAndEmployer(
    jobId: string,
    employerIdentityId: string
  ): Promise<JobRecord | null> {
    const record = await this.prismaService.prisma.job.findFirst({
      where: {
        employerIdentityId,
        id: jobId
      }
    });

    return record ? mapRecord(record) : null;
  }

  async findByIds(jobIds: string[]): Promise<JobRecord[]> {
    if (jobIds.length === 0) {
      return [];
    }

    const records = await this.prismaService.prisma.job.findMany({
      where: {
        id: {
          in: jobIds
        }
      }
    });

    return records.map(mapRecord);
  }

  async findPublicBySlug(slug: string): Promise<JobRecord | null> {
    const record = await this.prismaService.prisma.job.findFirst({
      where: {
        ...buildPublicVisibilityWhere(),
        slug
      }
    });

    return record ? mapRecord(record) : null;
  }

  async listEmployer(
    filter: ListEmployerJobsFilter
  ): Promise<{ items: JobRecord[]; total: number }> {
    const where: JobWhereInput = {
      employerIdentityId: filter.employerIdentityId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.category ? { category: filter.category } : {})
    };

    const [items, total] = await Promise.all([
      this.prismaService.prisma.job.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        where
      }),
      this.prismaService.prisma.job.count({ where })
    ]);

    return {
      items: items.map(mapRecord),
      total
    };
  }

  async listPublic(
    filter: ListPublicJobsFilter
  ): Promise<{ items: JobRecord[]; total: number }> {
    const where = buildPublicJobWhere(filter);

    const [items, total] = await Promise.all([
      this.prismaService.prisma.job.findMany({
        orderBy: resolvePublicOrderBy(filter.sort),
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        where
      }),
      this.prismaService.prisma.job.count({ where })
    ]);

    return {
      items: items.map(mapRecord),
      total
    };
  }

  async slugExists(slug: string, excludeJobId?: string): Promise<boolean> {
    const record = await this.prismaService.prisma.job.findUnique({
      where: { slug }
    });

    return Boolean(record && record.id !== excludeJobId);
  }

  async saveStatus(
    jobId: string,
    employerIdentityId: string,
    expectedStatus: JobStatus,
    nextStatus: JobStatus
  ): Promise<JobRecord | null> {
    // Optimistic-lock: chỉ ghi khi status trong DB vẫn đúng bằng trạng thái
    // mà aggregate đã đọc. Đây là guard chống sửa đồng thời (concern hạ tầng),
    // KHÔNG phải luật nghiệp vụ — luật chuyển trạng thái nằm ở Job aggregate.
    const updated = await this.prismaService.prisma.job.updateMany({
      data: {
        status: nextStatus,
        updatedAt: new Date()
      },
      where: {
        employerIdentityId,
        id: jobId,
        status: expectedStatus
      }
    });

    if (updated.count === 0) {
      return null;
    }

    return this.findByIdAndEmployer(jobId, employerIdentityId);
  }

  async update(
    jobId: string,
    employerIdentityId: string,
    patch: UpdateJobPatch
  ): Promise<JobRecord | null> {
    const existing = await this.findByIdAndEmployer(jobId, employerIdentityId);

    if (!existing) {
      return null;
    }

    const record = await this.prismaService.prisma.job.update({
      data: mapUpdatePatch(patch),
      where: { id: existing.id }
    });

    return mapRecord(record);
  }

  async countPublishedByEmployer(employerIdentityId: string): Promise<number> {
    return this.prismaService.prisma.job.count({
      where: {
        employerIdentityId,
        status: 'published'
      }
    });
  }

  async listEmployerDashboardPriorityJobs(
    employerIdentityId: string,
    limit: number
  ): Promise<JobRecord[]> {
    const records = await this.prismaService.prisma.job.findMany({
      orderBy: [{ expiresAt: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }],
      take: limit,
      where: {
        employerIdentityId,
        status: {
          not: 'archived'
        }
      }
    });

    return records.map(mapRecord);
  }

  async deleteByIdAndEmployer(
    jobId: string,
    employerIdentityId: string
  ): Promise<boolean> {
    const result = await this.prismaService.prisma.job.deleteMany({
      where: {
        id: jobId,
        employerIdentityId
      }
    });

    return result.count > 0;
  }
}
