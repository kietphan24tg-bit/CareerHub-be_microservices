import { ValidationError } from '@careerhub/shared-kernel';
import { IdentityNotFoundError } from '../../errors';
import type { CurrentIdentityResponse } from '../../auth/responses/current-identity.response';
import type { IdentityRepository } from '../../ports';
import type { GetCurrentIdentityQuery } from './get-current-identity.query';

export class GetCurrentIdentityQueryHandler {
  constructor(private readonly identityRepository: IdentityRepository) {}

  async execute(query: GetCurrentIdentityQuery): Promise<CurrentIdentityResponse> {
    const identityId = query.identityId.trim();

    if (!identityId) {
      throw new ValidationError('Identity id is required');
    }

    const identity = await this.identityRepository.findById(identityId);

    if (!identity) {
      throw new IdentityNotFoundError(identityId);
    }

    return {
      email: identity.email.value,
      identityId: identity.id.toString(),
      role: identity.role.value,
      status: identity.status.value
    };
  }
}
