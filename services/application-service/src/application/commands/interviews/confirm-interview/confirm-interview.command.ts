import type { CandidateInterviewResponseInput } from '../../../services/interview-operations.service';

export type ConfirmInterviewCommand = CandidateInterviewResponseInput & {
  candidateIdentityId: string;
  interviewId: string;
};
