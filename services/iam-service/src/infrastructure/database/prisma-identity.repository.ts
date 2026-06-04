import type { IdentityRepository } from '../../application';
import type { Email, Identity } from '../../domain';
import { IamPrismaService } from './iam-prisma.service';
import { toIdentityPersistence } from './prisma-identity.mapper';

export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly prismaService: IamPrismaService) {}

  async existsByEmail(email: Email): Promise<boolean> {
    const identity = await this.prismaService.prisma.identity.findUnique({
      select: {
        id: true
      },
      where: {
        email: email.value
      }
    });

    return identity !== null;
  }

  async save(identity: Identity): Promise<void> {
    await this.prismaService.prisma.identity.create({
      data: toIdentityPersistence(identity)
    });
  }
}
