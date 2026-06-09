import type { IntegrationEvent } from '../integration-event';

export const IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME =
  'iam.password-reset-requested.v1';

export type IamPasswordResetRequestedPayload = {
  email: string;
  expiresAt: string;
  identityId: string;
  occurredAt: string;
  resetTokenId: string;
};

export type IamPasswordResetRequestedIntegrationEvent =
  IntegrationEvent<IamPasswordResetRequestedPayload> & {
    name: typeof IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME;
  };