import { Email } from '../../../domain';
import { InvalidCredentialsError } from '../../errors';
import type {
  AuthSessionRepository,
  IdentityRepository,
  PasswordHasher,
  TokenService
} from '../../ports';
import type { IdGenerator } from '../../ports/identity/id-generator.port';
import type { AuthSessionResponse } from '../../auth/responses/auth-session.response';
import type { LoginIdentityCommand } from './login-identity.command';

export class LoginIdentityCommandHandler {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly tokenService: TokenService,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(command: LoginIdentityCommand): Promise<AuthSessionResponse> {
    const email = new Email(command.email);
    const identity = await this.identityRepository.findByEmail(email);

    if (!identity || !identity.status.isActive()) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(
      command.password,
      identity.passwordHash.value
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const accessToken = this.tokenService.issueAccessToken({
      email: identity.email.value,
      id: identity.id.toString(),
      role: identity.role.value
    });
    const refreshToken = this.tokenService.createRefreshToken();

    await this.authSessionRepository.create({
      expiresAt: new Date(
        Date.now() + this.tokenService.getRefreshTokenExpiresInMs()
      ),
      id: this.idGenerator.generate(),
      identityId: identity.id.toString(),
      rememberMe: command.rememberMe === true,
      tokenHash: this.tokenService.hashRefreshToken(refreshToken)
    });

    return {
      accessToken,
      email: identity.email.value,
      identityId: identity.id.toString(),
      refreshToken,
      role: identity.role.value
    };
  }
}
