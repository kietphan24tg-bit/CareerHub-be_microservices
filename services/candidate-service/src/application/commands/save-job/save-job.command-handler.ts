import { ValidationError } from '@careerhub/shared-kernel';
import type { IdGenerator, SavedJobRecord, SavedJobRepository } from '../../ports';
import type { SaveJobCommand } from './save-job.command';

export class SaveJobCommandHandler {
  constructor(
    private readonly savedJobRepository: SavedJobRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(command: SaveJobCommand): Promise<SavedJobRecord> {
    if (!command.identityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    if (!command.jobId.trim()) {
      throw new ValidationError('Job id is required');
    }

    const identityId = command.identityId.trim();
    const jobId = command.jobId.trim();
    const existing = await this.savedJobRepository.findByIdentityAndJobId(
      identityId,
      jobId
    );

    if (existing) {
      return existing;
    }

    return this.savedJobRepository.save({
      createdAt: new Date(),
      id: this.idGenerator.generate(),
      identityId,
      jobId
    });
  }
}
