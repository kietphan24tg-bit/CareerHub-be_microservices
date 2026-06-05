import type { IdentityRepository } from '../../../application';
import type { Email, Identity } from '../../../domain';
import { IamPrismaService } from '../prisma/iam-prisma.service';
import { toIdentityDomain, toIdentityPersistence } from './prisma-identity.mapper';

export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly prismaService: IamPrismaService) {}

  async existsByEmail(email: Email): Promise<boolean> {
    return (await this.findByEmail(email)) !== null;
  }

  async findByEmail(email: Email): Promise<Identity | null> {
    const identity = await this.prismaService.prisma.identity.findUnique({
      where: {
        email: email.value
      }
    });

    return identity ? toIdentityDomain(identity) : null;
  }

  async findById(identityId: string): Promise<Identity | null> {
    const identity = await this.prismaService.prisma.identity.findUnique({
      where: {
        id: identityId
      }
    });

    return identity ? toIdentityDomain(identity) : null;
  }

  async save(identity: Identity): Promise<void> {
    await this.prismaService.prisma.identity.create({
      data: toIdentityPersistence(identity)
    });
  }

  async update(identity: Identity): Promise<void> {
    await this.prismaService.prisma.identity.update({
      data: toIdentityPersistence(identity),
      where: {
        id: identity.id.toString()
      }
    });
  }
}
