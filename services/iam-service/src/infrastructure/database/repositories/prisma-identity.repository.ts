import type { IdentityRepository } from '../../../application';
import type { Email, Identity } from '../../../domain';
import type { IamPrismaRepositoryClient } from '../prisma/iam-prisma.types';
import {
  toIdentityDomain,
  toIdentityPersistence
} from './prisma-identity.mapper';

export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly prismaClient: IamPrismaRepositoryClient) {}

  async deleteById(identityId: string): Promise<void> {
    await this.prismaClient.identity.deleteMany({
      where: {
        id: identityId
      }
    });
  }

  async existsByEmail(email: Email): Promise<boolean> {
    return (await this.findByEmail(email)) !== null;
  }

  async findByEmail(email: Email): Promise<Identity | null> {
    const identity = await this.prismaClient.identity.findUnique({
      where: {
        email: email.value
      }
    });

    return identity ? toIdentityDomain(identity) : null;
  }

  async findById(identityId: string): Promise<Identity | null> {
    const identity = await this.prismaClient.identity.findUnique({
      where: {
        id: identityId
      }
    });

    return identity ? toIdentityDomain(identity) : null;
  }

  async save(identity: Identity): Promise<void> {
    await this.prismaClient.identity.create({
      data: toIdentityPersistence(identity)
    });
  }

  async update(identity: Identity): Promise<void> {
    await this.prismaClient.identity.update({
      data: toIdentityPersistence(identity),
      where: {
        id: identity.id.toString()
      }
    });
  }
}
