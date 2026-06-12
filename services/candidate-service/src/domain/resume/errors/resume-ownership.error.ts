import { DomainError } from '@careerhub/shared-kernel';

export class ResumeOwnershipError extends DomainError {
  constructor(resumeId: string) {
    super(`Resume does not belong to the current candidate: ${resumeId}`, {
      code: 'RESUME_OWNERSHIP'
    });
  }
}
