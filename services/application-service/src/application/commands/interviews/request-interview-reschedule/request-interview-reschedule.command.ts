import type { CandidateRescheduleRequestInput } from '../../../services/interview-operations.service';

export type RequestInterviewRescheduleCommand = CandidateRescheduleRequestInput & {
  candidateIdentityId: string;
  interviewId: string;
  requestId?: string;
};
