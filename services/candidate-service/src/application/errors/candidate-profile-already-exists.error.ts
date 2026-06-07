import { ApplicationError } from '@careerhub/infrastructure';

export class CandidateProfileAlreadyExistsError extends ApplicationError {
  constructor(identityId: string) {
    super(`Candidate profile already exists for identity: ${identityId}`, {
      code: 'CONFLICT'
    });
  }
}
