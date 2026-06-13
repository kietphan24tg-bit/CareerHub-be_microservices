import { ApplicationError } from '@careerhub/infrastructure';

export class DuplicateApplicationError extends ApplicationError {
  constructor(jobId: string, candidateIdentityId: string) {
    super(
      `Application already exists for job ${jobId} and candidate ${candidateIdentityId}.`,
      {
        code: 'DUPLICATE_APPLICATION'
      }
    );
  }
}
