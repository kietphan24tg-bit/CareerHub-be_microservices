import { ValidationError } from '@careerhub/shared-kernel';
import { ResumeNotFoundError } from '../../errors/resume-not-found.error';
import {
  mapResumeAggregateToResponse,
  type ResumeResponseShape
} from '../../mappers/resume-response.mapper';
import type { ResumeRepository } from '../../ports';
import type { GetResumeByIdQuery } from './get-resume-by-id.query';

export class GetResumeByIdQueryHandler {
  constructor(private readonly resumeRepository: ResumeRepository) {}

  async execute(query: GetResumeByIdQuery): Promise<ResumeResponseShape> {
    if (!query.identityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    if (!query.resumeId.trim()) {
      throw new ValidationError('Resume id is required');
    }

    const resume = await this.resumeRepository.findById(query.resumeId.trim());

    if (!resume || resume.identityId !== query.identityId.trim()) {
      throw new ResumeNotFoundError(query.resumeId.trim());
    }

    return mapResumeAggregateToResponse(resume);
  }
}
