export type SavedJobRecord = {
  createdAt: Date;
  id: string;
  identityId: string;
  jobId: string;
};

export interface SavedJobRepository {
  deleteByIdentityAndJobId(identityId: string, jobId: string): Promise<void>;
  findByIdentityAndJobId(
    identityId: string,
    jobId: string
  ): Promise<SavedJobRecord | null>;
  findByIdentityId(identityId: string): Promise<SavedJobRecord[]>;
  save(record: SavedJobRecord): Promise<SavedJobRecord>;
}
