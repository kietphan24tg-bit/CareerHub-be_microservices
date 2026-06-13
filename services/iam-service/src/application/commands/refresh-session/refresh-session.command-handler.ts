import {
  InvalidRefreshTokenError,
  InvalidTokenError
} from '../../errors';
import type {
  AuthSessionRepository,
  IdentityRepository,
  TokenService
} from '../../ports';
import type { AuthSessionResponse } from '../../auth/responses/auth-session.response';
import type { RefreshSessionCommand } from './refresh-session.command';

export class RefreshSessionCommandHandler {
  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly identityRepository: IdentityRepository,
    private readonly tokenService: TokenService
  ) {}

  async execute(command: RefreshSessionCommand): Promise<AuthSessionResponse> {
    const tokenHash = this.tokenService.hashRefreshToken(command.refreshToken);
    const session = await this.authSessionRepository.findByTokenHash(tokenHash);

    if (!session || session.revokedAt) {
      throw new InvalidRefreshTokenError();
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new InvalidRefreshTokenError('Refresh token expired');
    }

    const identity = await this.identityRepository.findById(session.identityId);

    if (!identity || !identity.status.isActive()) {
      throw new InvalidTokenError();
    }

    const nextRefreshToken = this.tokenService.createRefreshToken();

    await this.authSessionRepository.rotate(session.id, {
      expiresAt: new Date(
        Date.now() + this.tokenService.getRefreshTokenExpiresInMs()
      ),
      tokenHash: this.tokenService.hashRefreshToken(nextRefreshToken)
    });

    return {
      accessToken: this.tokenService.issueAccessToken({
        email: identity.email.value,
        id: identity.id.toString(),
        role: identity.role.value
      }),
      email: identity.email.value,
      identityId: identity.id.toString(),
      rememberMe: session.rememberMe,
      refreshToken: nextRefreshToken,
      role: identity.role.value
    };
  }
}
