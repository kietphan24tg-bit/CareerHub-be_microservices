import { createHash, randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { ValidationError } from '@careerhub/shared-kernel';
import type {
  AuthenticatedIdentity,
  TokenService
} from '../../application';

type JwtPayload = {
  email: string;
  exp: number;
  iat: number;
  role: string;
  sub: string;
};

type JwtTokenServiceOptions = {
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
};

const DURATION_PATTERN = /^(?<value>\d+)(?<unit>ms|s|m|h|d)$/;
const DURATION_MULTIPLIERS = {
  d: 24 * 60 * 60 * 1000,
  h: 60 * 60 * 1000,
  m: 60 * 1000,
  ms: 1,
  s: 1000
} as const;
function createValidationError(message: string): ValidationError {
  return new ValidationError(message);
}

function isJwtPayload(value: unknown): value is JwtPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.sub === 'string' &&
    candidate.sub.length > 0 &&
    typeof candidate.email === 'string' &&
    candidate.email.length > 0 &&
    typeof candidate.role === 'string' &&
    candidate.role.length > 0 &&
    typeof candidate.iat === 'number' &&
    Number.isFinite(candidate.iat) &&
    typeof candidate.exp === 'number' &&
    Number.isFinite(candidate.exp)
  );
}

function parseDurationToMs(value: string): number {
  const match = DURATION_PATTERN.exec(value.trim());

  if (!match?.groups) {
    throw new ValidationError(`Unsupported duration format: ${value}`);
  }

  const unit = match.groups.unit as keyof typeof DURATION_MULTIPLIERS;
  return Number(match.groups.value) * DURATION_MULTIPLIERS[unit];
}

export class JwtTokenService implements TokenService {
  private readonly accessTokenExpiresInMs: number;
  private readonly refreshTokenExpiresInMs: number;

  constructor(
    private readonly jwtService: JwtService,
    options: JwtTokenServiceOptions
  ) {
    this.accessTokenExpiresInMs = parseDurationToMs(options.accessTokenExpiresIn);
    this.refreshTokenExpiresInMs = parseDurationToMs(options.refreshTokenExpiresIn);
  }

  createRefreshToken(): string {
    return randomBytes(48).toString('hex');
  }

  getAccessTokenExpiresInMs(): number {
    return this.accessTokenExpiresInMs;
  }

  getRefreshTokenExpiresInMs(): number {
    return this.refreshTokenExpiresInMs;
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  issueAccessToken(identity: AuthenticatedIdentity): string {
    const payload = {
      email: identity.email,
      role: identity.role,
      sub: identity.id
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.getAccessTokenExpiresInSeconds()
    });
  }

  verifyAccessToken(token: string): AuthenticatedIdentity {
    let payload: unknown;

    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw createValidationError('Access token is invalid');
    }

    if (!isJwtPayload(payload)) {
      throw createValidationError('Access token is invalid');
    }

    return {
      email: payload.email,
      id: payload.sub,
      role: payload.role
    };
  }

  private getAccessTokenExpiresInSeconds(): number {
    return Math.floor(this.accessTokenExpiresInMs / 1000);
  }
}
