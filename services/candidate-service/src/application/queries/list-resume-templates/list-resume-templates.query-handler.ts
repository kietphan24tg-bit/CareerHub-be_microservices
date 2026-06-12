import type { ResumeTemplateListItemRecord, ResumeTemplateRepository } from '../../ports';

export class ListResumeTemplatesQueryHandler {
  constructor(
    private readonly resumeTemplateRepository: ResumeTemplateRepository
  ) {}

  async execute(): Promise<ResumeTemplateListItemRecord[]> {
    return this.resumeTemplateRepository.listActive();
  }
}
