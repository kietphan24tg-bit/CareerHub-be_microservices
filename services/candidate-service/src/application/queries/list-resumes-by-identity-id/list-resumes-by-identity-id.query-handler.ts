import { ValidationError } from '@careerhub/shared-kernel';
import {
  mapResumeAggregateToResponse,
  type ResumeResponseShape
} from '../../mappers/resume-response.mapper';
import type { ResumeRepository } from '../../ports';
import type { ListResumesByIdentityIdQuery } from './list-resumes-by-identity-id.query';

export class ListResumesByIdentityIdQueryHandler {
  constructor(private readonly resumeRepository: ResumeRepository) {}

  async execute(query: ListResumesByIdentityIdQuery): Promise<ResumeResponseShape[]> {
    if (!query.identityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    const resumes = await this.resumeRepository.findByIdentityId(query.identityId.trim());

    return resumes.map(mapResumeAggregateToResponse);
  }
}
