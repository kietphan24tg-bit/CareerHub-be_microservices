import { ValidationError } from '@careerhub/shared-kernel';
import { ApplicationNotFoundError } from '../../errors/application-not-found.error';
import type { ApplicationHistoryRecord, ApplicationRepository } from '../../ports';
import type { GetApplicationHistoryQuery } from './get-application-history.query';

export class GetApplicationHistoryQueryHandler {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(query: GetApplicationHistoryQuery): Promise<ApplicationHistoryRecord[]> {
    if (!query.applicationId.trim()) {
      throw new ValidationError('Application id is required');
    }

    const application = await this.applicationRepository.findById(
      query.applicationId.trim()
    );

    if (!application) {
      throw new ApplicationNotFoundError(query.applicationId);
    }

    return this.applicationRepository.listHistory(application.id);
  }
}
