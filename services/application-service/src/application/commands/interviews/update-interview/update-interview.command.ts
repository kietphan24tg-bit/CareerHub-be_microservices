import type { UpdateInterviewInput } from '../../../services/interview-operations.service';

export type UpdateInterviewCommand = UpdateInterviewInput & {
  employerIdentityId: string;
  interviewId: string;
};
