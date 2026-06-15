import type { ApplicationStatus } from '../../ports';

export type UpdateApplicationStatusCommand = {
  applicationId: string;
  employerIdentityId: string;
  note?: string | null;
  requestId?: string;
  status: ApplicationStatus;
};
