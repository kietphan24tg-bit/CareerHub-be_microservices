import { ValidationError } from '@careerhub/shared-kernel';
import type { SavedJobRecord, SavedJobRepository } from '../../ports';
import type { ListSavedJobsByIdentityIdQuery } from './list-saved-jobs-by-identity-id.query';

export class ListSavedJobsByIdentityIdQueryHandler {
  constructor(private readonly savedJobRepository: SavedJobRepository) {}

  async execute(query: ListSavedJobsByIdentityIdQuery): Promise<SavedJobRecord[]> {
    if (!query.identityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    return this.savedJobRepository.findByIdentityId(query.identityId.trim());
  }
}
