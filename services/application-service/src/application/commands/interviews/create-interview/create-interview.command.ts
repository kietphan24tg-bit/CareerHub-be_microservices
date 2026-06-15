import type { CreateInterviewInput } from '../../../services/interview-operations.service';

export type CreateInterviewCommand = CreateInterviewInput & {
  applicationId: string;
  employerIdentityId: string;
  requestId?: string;
};
