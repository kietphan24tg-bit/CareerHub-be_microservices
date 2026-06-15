import type { CandidateInterviewResponseInput } from '../../../services/interview-operations.service';

export type DeclineInterviewCommand = CandidateInterviewResponseInput & {
  candidateIdentityId: string;
  interviewId: string;
  requestId?: string;
};
