export type CancelInterviewCommand = {
  employerIdentityId: string;
  interviewId: string;
  reason: string;
  requestId?: string;
};
