export type CandidateProfileRecord = {
  fullName: string;
  id: string;
  identityId: string;
  phone: string;
};

export type CreateCandidateProfileRecord = CandidateProfileRecord;

export interface CandidateProfileRepository {
  existsByIdentityId(identityId: string): Promise<boolean>;
  save(profile: CreateCandidateProfileRecord): Promise<void>;
}
