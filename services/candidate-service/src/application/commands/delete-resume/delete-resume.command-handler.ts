import { ValidationError } from '@careerhub/shared-kernel';
import { ResumeNotFoundError } from '../../errors/resume-not-found.error';
import type { CandidateWriteTransaction, ResumeRepository } from '../../ports';
import type { DeleteResumeCommand } from './delete-resume.command';

export class DeleteResumeCommandHandler {
  constructor(
    private readonly resumeRepository: ResumeRepository,
    private readonly writeTransaction: CandidateWriteTransaction
  ) {}

  async execute(command: DeleteResumeCommand): Promise<void> {
    if (!command.identityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    if (!command.resumeId.trim()) {
      throw new ValidationError('Resume id is required');
    }

    const identityId = command.identityId.trim();
    const resumeId = command.resumeId.trim();
    const resume = await this.resumeRepository.findById(resumeId);

    if (!resume || resume.identityId !== identityId) {
      throw new ResumeNotFoundError(resumeId);
    }

    resume.ensureOwnedBy(identityId);

    await this.writeTransaction.execute(
      async ({ candidateProfileRepository, resumeRepository: transactionalResumeRepository }) => {
        await candidateProfileRepository.clearResumeIdIfMatches(identityId, resume.id.toString());

        if (resume.isUsing) {
          await transactionalResumeRepository.clearIsUsingByIdentityId(identityId);
        }

        await transactionalResumeRepository.deleteById(resume.id.toString());
      }
    );
  }
}
