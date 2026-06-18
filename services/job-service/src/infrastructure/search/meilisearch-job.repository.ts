import { MeiliSearch } from 'meilisearch';
import type {
  JobRecord,
  JobSearchIndexer,
  JobSearchRepository,
  ListPublicJobsFilter
} from '../../application/ports';

const INDEX_UID = 'jobs';

type JobDocument = {
  applicationCount: number;
  benefits: string[];
  id: string;
  category: string | null;
  city: string | null;
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  companyLogoUrl: string | null;
  companyWebsite: string | null;
  country: string | null;
  createdAt: number;
  currency: string | null;
  description: string | null;
  employerIdentityId: string;
  employmentType: string | null;
  expiresAt: number | null;
  isRemote: boolean;
  level: string | null;
  requirements: string[];
  responsibilities: string[];
  salaryMax: number | null;
  salaryMin: number | null;
  slug: string;
  status: string;
  title: string;
  updatedAt: number;
};

function toDocument(job: JobRecord): JobDocument {
  return {
    id: job.id,
    title: job.title,
    slug: job.slug,
    description: job.description,
    category: job.category,
    city: job.city,
    companyId: job.companyId,
    companyIndustry: job.companyIndustry,
    companyLogoUrl: job.companyLogoUrl,
    companyName: job.companyName,
    companyWebsite: job.companyWebsite,
    country: job.country,
    currency: job.currency,
    employerIdentityId: job.employerIdentityId,
    employmentType: job.employmentType,
    isRemote: job.isRemote,
    level: job.level,
    salaryMax: job.salaryMax,
    salaryMin: job.salaryMin,
    status: job.status,
    benefits: job.benefits,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    applicationCount: job.applicationCount,
    createdAt: new Date(job.createdAt).getTime(),
    updatedAt: new Date(job.updatedAt).getTime(),
    expiresAt: job.expiresAt ? new Date(job.expiresAt).getTime() : null
  };
}

function fromDocument(doc: JobDocument): JobRecord {
  return {
    applicationCount: doc.applicationCount,
    benefits: doc.benefits,
    category: doc.category,
    city: doc.city,
    companyId: doc.companyId,
    companyIndustry: doc.companyIndustry,
    companyLogoUrl: doc.companyLogoUrl,
    companyName: doc.companyName,
    companyWebsite: doc.companyWebsite,
    country: doc.country,
    createdAt: new Date(doc.createdAt),
    currency: doc.currency,
    description: doc.description,
    employerIdentityId: doc.employerIdentityId,
    employmentType: doc.employmentType,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : null,
    id: doc.id,
    isRemote: doc.isRemote,
    level: doc.level,
    requirements: doc.requirements,
    responsibilities: doc.responsibilities,
    salaryMax: doc.salaryMax,
    salaryMin: doc.salaryMin,
    slug: doc.slug,
    status: doc.status as JobRecord['status'],
    title: doc.title,
    updatedAt: new Date(doc.updatedAt)
  };
}

function buildFilter(filter: ListPublicJobsFilter): string {
  const parts: string[] = [];

  if (filter.category) {
    parts.push(`category = "${filter.category}"`);
  }

  if (filter.companyIndustry) {
    parts.push(`companyIndustry = "${filter.companyIndustry}"`);
  }

  if (filter.employmentType) {
    parts.push(`employmentType = "${filter.employmentType}"`);
  }

  if (filter.remoteOnly) {
    parts.push('isRemote = true');
  }

  if (filter.salaryMin !== undefined) {
    parts.push(`salaryMax >= ${filter.salaryMin}`);
  }

  if (filter.salaryMax !== undefined) {
    parts.push(`salaryMin <= ${filter.salaryMax}`);
  }

  if (filter.location) {
    const escaped = filter.location.replace(/"/g, '\\"');
    parts.push(`(city = "${escaped}" OR country = "${escaped}")`);
  }

  parts.push('status = "published"');

  return parts.join(' AND ');
}

function buildSort(sort: ListPublicJobsFilter['sort']): string[] {
  switch (sort) {
    case 'salary_asc':
      return ['salaryMin:asc'];
    case 'salary_desc':
      return ['salaryMax:desc'];
    case 'newest':
    default:
      return ['createdAt:desc'];
  }
}

export class MeilisearchJobRepository implements JobSearchRepository, JobSearchIndexer {
  private readonly client: MeiliSearch;
  private readonly settingsPromise: Promise<void>;

  constructor(host: string, apiKey: string) {
    this.client = new MeiliSearch({ host, apiKey });
    this.settingsPromise = this.ensureIndexSettings();
  }

  async getBySlug(slug: string): Promise<JobRecord | null> {
    await this.settingsPromise;
    const index = this.client.index<JobDocument>(INDEX_UID);
    const result = await index.search('', {
      filter: [`slug = "${slug.replace(/"/g, '\\"')}"`, 'status = "published"'],
      limit: 1
    });

    const [first] = result.hits;
    return first ? fromDocument(first) : null;
  }

  async search(filter: ListPublicJobsFilter): Promise<{ items: JobRecord[]; total: number }> {
    await this.settingsPromise;
    const index = this.client.index<JobDocument>(INDEX_UID);
    const offset = (filter.page - 1) * filter.pageSize;

    const result = await index.search(filter.keyword ?? '', {
      limit: filter.pageSize,
      offset,
      filter: buildFilter(filter) || undefined,
      sort: buildSort(filter.sort)
    });

    return {
      items: result.hits.map(fromDocument),
      total: result.estimatedTotalHits ?? result.hits.length
    };
  }

  async index(job: JobRecord): Promise<void> {
    await this.settingsPromise;
    const index = this.client.index<JobDocument>(INDEX_UID);
    await index.addDocuments([toDocument(job)]);
  }

  async update(job: JobRecord): Promise<void> {
    await this.settingsPromise;
    const index = this.client.index<JobDocument>(INDEX_UID);
    await index.updateDocuments([toDocument(job)]);
  }

  async remove(jobId: string): Promise<void> {
    await this.settingsPromise;
    const index = this.client.index<JobDocument>(INDEX_UID);
    await index.deleteDocument(jobId);
  }

  private async ensureIndexSettings(): Promise<void> {
    const index = this.client.index<JobDocument>(INDEX_UID);
    await index.updateSearchableAttributes([
      'title',
      'description',
      'companyName',
      'category',
      'city',
      'country'
    ]);
    await index.updateFilterableAttributes([
      'status',
      'slug',
      'employmentType',
      'level',
      'category',
      'companyIndustry',
      'isRemote',
      'salaryMin',
      'salaryMax',
      'city',
      'country'
    ]);
    await index.updateSortableAttributes(['createdAt', 'salaryMin', 'salaryMax']);
  }
}
