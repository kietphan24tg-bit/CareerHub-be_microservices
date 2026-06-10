export const IAM_GRPC_PACKAGE_NAME = 'careerhub.iam.v1';
export const IAM_GRPC_SERVICE_NAME = 'IamService';

export type ActivateIdentityRequest = {
  identity_id: string;
  request_id?: string;
};

export type ActivateIdentityResponse = {
  identity_id: string;
  status: string;
};

export type CancelPendingIdentityRequest = {
  identity_id: string;
  request_id?: string;
};

export type CancelPendingIdentityResponse = {
  cancelled: boolean;
};

export type RegisterIdentityRequest = {
  accepted_terms: boolean;
  email: string;
  password: string;
  request_id?: string;
  role: string;
};

export type RegisterIdentityResponse = {
  created_at: string;
  email: string;
  identity_id: string;
  role: string;
  status: string;
};

export type LoginIdentityRequest = {
  email: string;
  password: string;
  remember_me?: boolean;
  request_id?: string;
};

export type LoginIdentityResponse = {
  access_token: string;
  email: string;
  identity_id: string;
  refresh_token: string;
  role: string;
};

export type RefreshSessionRequest = {
  refresh_token: string;
  request_id?: string;
};

export type RefreshSessionResponse = LoginIdentityResponse;

export type LogoutSessionRequest = {
  refresh_token: string;
  request_id?: string;
};

export type LogoutSessionResponse = {
  logged_out: boolean;
};

export type RequestPasswordResetRequest = {
  email: string;
  request_id?: string;
};

export type RequestPasswordResetResponse = {
  accepted: boolean;
};

export type ResetPasswordRequest = {
  new_password: string;
  request_id?: string;
  token: string;
};

export type ResetPasswordResponse = {
  password_reset: boolean;
};

export type ValidateAccessTokenRequest = {
  access_token: string;
  request_id?: string;
};

export type ValidateAccessTokenResponse = {
  email: string;
  role: string;
  user_id: string;
  valid: boolean;
};

export type GetCurrentIdentityRequest = {
  identity_id: string;
  request_id?: string;
};

export type GetCurrentIdentityResponse = {
  email: string;
  identity_id: string;
  role: string;
  status: string;
};
