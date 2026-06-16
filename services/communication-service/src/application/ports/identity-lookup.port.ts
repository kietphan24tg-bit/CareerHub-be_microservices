export type IdentityLookup = {
  findEmailByIdentityId(identityId: string, requestId?: string): Promise<string | null>;
};
