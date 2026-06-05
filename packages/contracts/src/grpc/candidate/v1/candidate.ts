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
