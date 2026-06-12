import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import { ResumeAggregate } from '../../../domain/resume/resume.aggregate';
import { ResumeTemplateNotFoundError } from '../../errors/resume-template-not-found.error';
import {
  mapResumeAggregateToResponse,
  type ResumeResponseShape
} from '../../mappers/resume-response.mapper';
import type { IdGenerator, ResumeRepository, ResumeTemplateRepository } from '../../ports';
import type { CreateResumeCommand } from './create-resume.command';

export class CreateResumeCommandHandler {
  constructor(
    private readonly resumeRepository: ResumeRepository,
    private readonly resumeTemplateRepository: ResumeTemplateRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(command: CreateResumeCommand): Promise<ResumeResponseShape> {
    if (!command.identityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    if (!command.templateId.trim()) {
      throw new ValidationError('Resume template id is required');
    }

    if (!command.title.trim()) {
      throw new ValidationError('Resume title cannot be blank');
    }

    const template = await this.resumeTemplateRepository.findActiveById(
      command.templateId.trim()
    );

    if (!template) {
      throw new ResumeTemplateNotFoundError(command.templateId.trim());
    }

    const aggregate = ResumeAggregate.create({
      content: command.content,
      id: new UniqueEntityID(this.idGenerator.generate()),
      identityId: command.identityId.trim(),
      templateId: template.id,
      title: command.title.trim()
    });

    await this.resumeRepository.save(aggregate);

    return mapResumeAggregateToResponse(aggregate);
  }
}
