import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import { ResumeAggregate } from '../../../domain/resume/resume.aggregate';
import { ResumeTemplateNotFoundError } from '../../errors/resume-template-not-found.error';
import {
  mapResumeAggregateToResponse,
  type ResumeResponseShape
} from '../../mappers/resume-response.mapper';
import type {
  CandidateProfileRepository,
  IdGenerator,
  ResumeRepository,
  ResumeTemplateRepository
} from '../../ports';
import type { CreateOrGetTemplateDraftCommand } from './create-or-get-template-draft.command';

export class CreateOrGetTemplateDraftCommandHandler {
  constructor(
    private readonly resumeRepository: ResumeRepository,
    private readonly resumeTemplateRepository: ResumeTemplateRepository,
    private readonly candidateProfileRepository: CandidateProfileRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(
    command: CreateOrGetTemplateDraftCommand
  ): Promise<ResumeResponseShape> {
    if (!command.identityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    if (!command.templateId.trim()) {
      throw new ValidationError('Resume template id is required');
    }

    const identityId = command.identityId.trim();
    const templateId = command.templateId.trim();
    const existing = await this.resumeRepository.findByIdentityAndTemplateId(
      identityId,
      templateId
    );

    if (existing) {
      return mapResumeAggregateToResponse(existing);
    }

    const template = await this.resumeTemplateRepository.findActiveById(templateId);

    if (!template) {
      throw new ResumeTemplateNotFoundError(templateId);
    }

    const profile =
      await this.candidateProfileRepository.findByIdentityId(identityId);

    const aggregate = ResumeAggregate.createDraft({
      id: new UniqueEntityID(this.idGenerator.generate()),
      identityId,
      profile,
      templateId: template.id,
      templateName: template.name
    });

    await this.resumeRepository.save(aggregate);

    return mapResumeAggregateToResponse(aggregate);
  }
}
