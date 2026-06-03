import type { Email, Identity } from '../../domain';

export interface IdentityRepository {
  existsByEmail(email: Email): Promise<boolean>;
  save(identity: Identity): Promise<void>;
}
