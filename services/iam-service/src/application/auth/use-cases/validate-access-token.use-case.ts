import { InvalidTokenError } from '../../errors';
import type { TokenService } from '../../ports';
import type { CurrentIdentityResponse } from '../responses/current-identity.response';

type ValidateAccessTokenCommand = {
  accessToken: string;
};

export class ValidateAccessTokenUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute(
    command: ValidateAccessTokenCommand
  ): Promise<CurrentIdentityResponse> {
    if (!command.accessToken?.trim()) {
      throw new InvalidTokenError();
    }

    let payload;

    try {
      payload = this.tokenService.verifyAccessToken(command.accessToken);
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
