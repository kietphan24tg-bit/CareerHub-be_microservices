import type { Email, Identity } from '../../../domain';

export interface IdentityRepository {
  deleteById(identityId: string): Promise<void>;
  existsByEmail(email: Email): Promise<boolean>;
  findByEmail(email: Email): Promise<Identity | null>;
  findById(identityId: string): Promise<Identity | null>;
  save(identity: Identity): Promise<void>;
  update(identity: Identity): Promise<void>;
}
