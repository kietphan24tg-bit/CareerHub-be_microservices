import { ValidationError } from '@careerhub/shared-kernel';
import { ApplicationNotFoundError } from '../../errors/application-not-found.error';
import { ForbiddenApplicationAccessError } from '../../errors/forbidden-application-access.error';
import type { ApplicationRecord, ApplicationRepository } from '../../ports';
import type { GetCandidateApplicationByIdQuery } from './get-candidate-application-by-id.query';

export class GetCandidateApplicationByIdQueryHandler {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(query: GetCandidateApplicationByIdQuery): Promise<ApplicationRecord> {
    if (!query.applicationId.trim()) {
      throw new ValidationError('Application id is required');
    }

    if (!query.candidateIdentityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    const application = await this.applicationRepository.findById(
      query.applicationId.trim()
    );

    if (!application) {
      throw new ApplicationNotFoundError(query.applicationId);
    }

    if (application.candidateIdentityId !== query.candidateIdentityId.trim()) {
      throw new ForbiddenApplicationAccessError(application.id);
    }

    return application;
  }
}
