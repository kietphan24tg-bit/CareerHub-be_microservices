import { InvalidRefreshTokenError } from '../../errors';
import type { AuthSessionRepository, TokenService } from '../../ports';
import type { LogoutSessionCommand } from './logout-session.command';

export class LogoutSessionCommandHandler {
  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly tokenService: TokenService
  ) {}

  async execute(command: LogoutSessionCommand): Promise<{ loggedOut: boolean }> {
    const tokenHash = this.tokenService.hashRefreshToken(command.refreshToken);
    const session = await this.authSessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      throw new InvalidRefreshTokenError();
    }

    await this.authSessionRepository.revoke(session.id);

    return {
      loggedOut: true
    };
  }
}
