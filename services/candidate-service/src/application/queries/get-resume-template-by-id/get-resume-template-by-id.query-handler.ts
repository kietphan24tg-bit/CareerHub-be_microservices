import { ValidationError } from '@careerhub/shared-kernel';
import { ResumeTemplateNotFoundError } from '../../errors/resume-template-not-found.error';
import type { ResumeTemplateRecord, ResumeTemplateRepository } from '../../ports';
import type { GetResumeTemplateByIdQuery } from './get-resume-template-by-id.query';

export class GetResumeTemplateByIdQueryHandler {
  constructor(
    private readonly resumeTemplateRepository: ResumeTemplateRepository
  ) {}

  async execute(query: GetResumeTemplateByIdQuery): Promise<ResumeTemplateRecord> {
    if (!query.templateId.trim()) {
      throw new ValidationError('Resume template id is required');
    }

    const template = await this.resumeTemplateRepository.findActiveById(
      query.templateId.trim()
    );

    if (!template) {
      throw new ResumeTemplateNotFoundError(query.templateId.trim());
    }

    return template;
  }
}
