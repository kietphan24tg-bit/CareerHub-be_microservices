import type { CandidateProfileRepository } from './candidate-profile-repository.port';
import type { CandidateOutboxRepository } from './outbox-repository.port';
import type { ResumeRepository } from './resume-repository.port';

export type CandidateWriteTransactionContext = {
  candidateProfileRepository: CandidateProfileRepository;
  outboxRepository: CandidateOutboxRepository;
  resumeRepository: ResumeRepository;
};

export interface CandidateWriteTransaction {
  execute<T>(
    work: (context: CandidateWriteTransactionContext) => Promise<T>
  ): Promise<T>;
}
