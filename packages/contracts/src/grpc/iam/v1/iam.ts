export const IAM_GRPC_PACKAGE_NAME = 'careerhub.iam.v1';
export const IAM_GRPC_SERVICE_NAME = 'IamService';

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

export type ValidateAccessTokenRequest = {
  access_token: string;
  request_id?: string;
};

export type ValidateAccessTokenResponse = {
  role: string;
  user_id: string;
  valid: boolean;
};
