import { InvalidTokenError } from '../../errors';
import type { TokenService } from '../../ports';
import type { CurrentIdentityResponse } from '../../auth/responses/current-identity.response';
import type { ValidateAccessTokenQuery } from './validate-access-token.query';

export class ValidateAccessTokenQueryHandler {
  constructor(private readonly tokenService: TokenService) {}

  async execute(
    query: ValidateAccessTokenQuery
  ): Promise<CurrentIdentityResponse> {
    if (!query.accessToken?.trim()) {
      throw new InvalidTokenError();
    }

    let payload;

    try {
      payload = this.tokenService.verifyAccessToken(query.accessToken);
    } catch {
      throw new InvalidTokenError();
    }

    return {
      email: payload.email,
      identityId: payload.id,
      role: payload.role
    };
  }
}
