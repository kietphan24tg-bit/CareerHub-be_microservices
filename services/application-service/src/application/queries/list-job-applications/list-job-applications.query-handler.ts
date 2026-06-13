import { ValidationError } from '@careerhub/shared-kernel';
import type { ApplicationRecord, ApplicationRepository } from '../../ports';
import type { ListJobApplicationsQuery } from './list-job-applications.query';

export type ListJobApplicationsResult = {
  items: ApplicationRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export class ListJobApplicationsQueryHandler {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(query: ListJobApplicationsQuery): Promise<ListJobApplicationsResult> {
    if (!query.employerIdentityId.trim()) {
      throw new ValidationError('Employer identity id is required');
    }

    if (!query.jobId.trim()) {
      throw new ValidationError('Job id is required');
    }

    const page = query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize > 0 ? Math.min(query.pageSize, 50) : 20;
    const result = await this.applicationRepository.listJobApplications({
      employerIdentityId: query.employerIdentityId.trim(),
      jobId: query.jobId.trim(),
      page,
      pageSize,
      status: query.status
    });

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
