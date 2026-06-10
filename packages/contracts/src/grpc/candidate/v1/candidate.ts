export const CANDIDATE_GRPC_PACKAGE_NAME = 'careerhub.candidate.v1';
export const CANDIDATE_GRPC_SERVICE_NAME = 'CandidateService';

export type CreateCandidateProfileRequest = {
  full_name: string;
  identity_id: string;
  phone: string;
  request_id?: string;
};

export type CreateCandidateProfileResponse = {
  identity_id: string;
  profile_id: string;
};

export type DeleteCandidateProfileCompensationRequest = {
  identity_id: string;
  request_id?: string;
};

export type DeleteCandidateProfileCompensationResponse = {
  compensated: boolean;
};

export type GetCandidateProfileByIdentityIdRequest = {
  identity_id: string;
  request_id?: string;
};

export type CandidateProfile = {
  address: string;
  avatar_url: string;
  bio: string;
  created_at: string;
  full_name: string;
  github_url: string;
  headline: string;
  id: string;
  identity_id: string;
  linkedin_url: string;
  null_fields: string[];
  phone: string;
  portfolio_url: string;
  updated_at: string;
  years_experience: number;
};

export type GetCandidateProfileByIdentityIdResponse = {
  profile: CandidateProfile;
};

export type UpdateCandidateProfileRequest = {
  address?: string;
  avatar_url?: string;
  bio?: string;
  clear_fields?: string[];
  full_name?: string;
  github_url?: string;
  headline?: string;
  identity_id: string;
  linkedin_url?: string;
  phone?: string;
  portfolio_url?: string;
  request_id?: string;
  updated_fields?: string[];
  years_experience?: number;
};

export type UpdateCandidateProfileResponse = {
  profile: CandidateProfile;
};
