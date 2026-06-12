import { ValidationError } from '@careerhub/shared-kernel';
import { ResumeNotFoundError } from '../../errors/resume-not-found.error';
import { ResumeTemplateNotFoundError } from '../../errors/resume-template-not-found.error';
import {
  mapResumeAggregateToResponse,
  type ResumeResponseShape
} from '../../mappers/resume-response.mapper';
import type { ResumeRepository, ResumeTemplateRecord, ResumeTemplateRepository } from '../../ports';
import type { GetResumeExportPayloadQuery } from './get-resume-export-payload.query';

export type ResumeExportPayload = {
  resume: ResumeResponseShape;
  template: ResumeTemplateRecord;
};

export class GetResumeExportPayloadQueryHandler {
  constructor(
    private readonly resumeRepository: ResumeRepository,
    private readonly resumeTemplateRepository: ResumeTemplateRepository
  ) {}

  async execute(query: GetResumeExportPayloadQuery): Promise<ResumeExportPayload> {
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

    if (!resume.templateId) {
      throw new ResumeTemplateNotFoundError('missing');
    }

    const template = await this.resumeTemplateRepository.findActiveById(
      resume.templateId
    );

    if (!template) {
      throw new ResumeTemplateNotFoundError(resume.templateId);
    }

    return {
      resume: mapResumeAggregateToResponse(resume),
      template
    };
  }
}
