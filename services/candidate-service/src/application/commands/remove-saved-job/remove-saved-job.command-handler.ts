import { ValidationError } from '@careerhub/shared-kernel';
import type { SavedJobRepository } from '../../ports';
import type { RemoveSavedJobCommand } from './remove-saved-job.command';

export class RemoveSavedJobCommandHandler {
  constructor(private readonly savedJobRepository: SavedJobRepository) {}

  async execute(command: RemoveSavedJobCommand): Promise<void> {
    if (!command.identityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    if (!command.jobId.trim()) {
      throw new ValidationError('Job id is required');
    }

    await this.savedJobRepository.deleteByIdentityAndJobId(
      command.identityId.trim(),
      command.jobId.trim()
    );
  }
}
