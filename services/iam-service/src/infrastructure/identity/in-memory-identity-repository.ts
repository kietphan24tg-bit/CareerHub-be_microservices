import type { IdentityRepository } from '../../application';
import type { Email, Identity } from '../../domain';

export class InMemoryIdentityRepository implements IdentityRepository {
  private readonly identitiesByEmail = new Map<string, Identity>();
  private readonly identitiesById = new Map<string, Identity>();

  async existsByEmail(email: Email): Promise<boolean> {
    return this.identitiesByEmail.has(email.value);
  }

  async save(identity: Identity): Promise<void> {
    this.identitiesByEmail.set(identity.email.value, identity);
    this.identitiesById.set(identity.id.toString(), identity);
  }
}
