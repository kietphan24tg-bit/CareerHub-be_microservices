import { ValidationError } from '@careerhub/shared-kernel';
import { ApplicationNotFoundError } from '../../errors/application-not-found.error';
import { ForbiddenApplicationAccessError } from '../../errors/forbidden-application-access.error';
import type { ApplicationRecord, ApplicationRepository } from '../../ports';
import type { GetEmployerApplicationByIdQuery } from './get-employer-application-by-id.query';

export class GetEmployerApplicationByIdQueryHandler {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(query: GetEmployerApplicationByIdQuery): Promise<ApplicationRecord> {
    if (!query.applicationId.trim()) {
      throw new ValidationError('Application id is required');
    }

    if (!query.employerIdentityId.trim()) {
      throw new ValidationError('Employer identity id is required');
    }

    const application = await this.applicationRepository.findById(
      query.applicationId.trim()
    );

    if (!application) {
      throw new ApplicationNotFoundError(query.applicationId);
    }

    if (application.employerIdentityId !== query.employerIdentityId.trim()) {
      throw new ForbiddenApplicationAccessError(application.id);
    }

    return application;
  }
}
