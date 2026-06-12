import { ValidationError } from '@careerhub/shared-kernel';
import { ResumeNotFoundError } from '../../errors/resume-not-found.error';
import {
  mapResumeAggregateToResponse,
  type ResumeResponseShape
} from '../../mappers/resume-response.mapper';
import type { ResumeRepository } from '../../ports';
import type { UpdateResumeCommand } from './update-resume.command';

export class UpdateResumeCommandHandler {
  constructor(private readonly resumeRepository: ResumeRepository) {}

  async execute(command: UpdateResumeCommand): Promise<ResumeResponseShape> {
    if (!command.identityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    if (!command.resumeId.trim()) {
      throw new ValidationError('Resume id is required');
    }

    const resume = await this.resumeRepository.findById(command.resumeId.trim());

    if (!resume || resume.identityId !== command.identityId.trim()) {
      throw new ResumeNotFoundError(command.resumeId.trim());
    }

    resume.ensureOwnedBy(command.identityId.trim());
    resume.update({
      content: command.content,
      title: command.title
    });

    await this.resumeRepository.update(resume);

    return mapResumeAggregateToResponse(resume);
  }
}
