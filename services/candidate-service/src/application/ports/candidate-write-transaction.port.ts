import type { CandidateProfileRepository } from './candidate-profile-repository.port';
import type { CandidateOutboxRepository } from './outbox-repository.port';

export type CandidateWriteTransactionContext = {
  candidateProfileRepository: CandidateProfileRepository;
  outboxRepository: CandidateOutboxRepository;
};

export interface CandidateWriteTransaction {
  execute<T>(
    work: (context: CandidateWriteTransactionContext) => Promise<T>
  ): Promise<T>;
}
