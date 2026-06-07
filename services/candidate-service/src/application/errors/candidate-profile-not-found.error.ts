import { ApplicationError } from '@careerhub/infrastructure';

export class CandidateProfileNotFoundError extends ApplicationError {
  constructor(identityId: string) {
    super(`Candidate profile not found for identity: ${identityId}`, {
      code: 'NOT_FOUND'
    });
  }
}
