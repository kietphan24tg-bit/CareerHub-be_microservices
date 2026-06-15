import type { CandidateProfileRepository } from './candidate-profile-repository.port';
import type { ResumeRepository } from './resume-repository.port';

export type CandidateWriteTransactionContext = {
  candidateProfileRepository: CandidateProfileRepository;
  resumeRepository: ResumeRepository;
};

export interface CandidateWriteTransaction {
  execute<T>(
    work: (context: CandidateWriteTransactionContext) => Promise<T>
  ): Promise<T>;
}
