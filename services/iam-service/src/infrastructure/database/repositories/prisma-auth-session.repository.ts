import type {
  AuthSessionRecord,
  AuthSessionRepository,
  CreateAuthSessionInput
} from '../../../application';
import type { IamPrismaRepositoryClient } from '../prisma/iam-prisma.types';

export class PrismaAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly prismaClient: IamPrismaRepositoryClient) {}

  async create(input: CreateAuthSessionInput): Promise<void> {
    await this.prismaClient.authSession.create({
      data: input
    });
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null> {
    const session = await this.prismaClient.authSession.findUnique({
      where: {
        tokenHash
      }
    });

    if (!session) {
      return null;
    }

    return {
      expiresAt: session.expiresAt,
      id: session.id,
      identityId: session.identityId,
      rememberMe: session.rememberMe,
      revokedAt: session.revokedAt ?? undefined,
      tokenHash: session.tokenHash,
      updatedAt: session.updatedAt
    };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prismaClient.authSession.update({
      data: {
        revokedAt: new Date()
      },
      where: {
        id: sessionId
      }
    });
  }

  async revokeByIdentityId(identityId: string, revokedAt: Date): Promise<number> {
    const result = await this.prismaClient.authSession.updateMany({
      data: {
        revokedAt
      },
      where: {
        identityId,
        revokedAt: null
      }
    });

    return result.count;
  }

  async rotate(
    sessionId: string,
    input: Pick<CreateAuthSessionInput, 'expiresAt' | 'tokenHash'>
  ): Promise<void> {
    await this.prismaClient.authSession.update({
      data: {
        expiresAt: input.expiresAt,
        revokedAt: null,
        tokenHash: input.tokenHash
      },
      where: {
        id: sessionId
      }
    });
  }
}
