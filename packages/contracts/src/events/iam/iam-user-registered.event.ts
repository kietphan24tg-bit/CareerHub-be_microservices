import type { IntegrationEvent } from '../integration-event';

export const IAM_USER_REGISTERED_EVENT_NAME = 'iam.user.registered.v1';

export type IamUserRegisteredPayload = {
  acceptedTerms: boolean;
  email: string;
  identityId: string;
  occurredAt: string;
  role: 'candidate' | 'employer';
};

export type IamUserRegisteredIntegrationEvent = IntegrationEvent<IamUserRegisteredPayload> & {
  name: typeof IAM_USER_REGISTERED_EVENT_NAME;
};
