import type {
  AuthSessionRecord,
  AuthSessionRepository,
  CreateAuthSessionInput
} from '../../../application';
import { IamPrismaService } from '../prisma/iam-prisma.service';

export class PrismaAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly prismaService: IamPrismaService) {}

  async create(input: CreateAuthSessionInput): Promise<void> {
    await this.prismaService.prisma.authSession.create({
      data: input
    });
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null> {
    const session = await this.prismaService.prisma.authSession.findUnique({
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
    await this.prismaService.prisma.authSession.update({
      data: {
        revokedAt: new Date()
      },
      where: {
        id: sessionId
      }
    });
  }

  async rotate(
    sessionId: string,
    input: Pick<CreateAuthSessionInput, 'expiresAt' | 'tokenHash'>
  ): Promise<void> {
    await this.prismaService.prisma.authSession.update({
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
