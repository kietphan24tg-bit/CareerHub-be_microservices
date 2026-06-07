import type {
  EmployerProfileRecord,
  EmployerProfileRepository,
  UpdateEmployerProfilePatch
} from '../../../application';
import type { EmployerProfilePersistenceRecord } from '../prisma/employer-prisma.types';
import { EmployerPrismaService } from '../prisma/employer-prisma.service';

export class PrismaEmployerProfileRepository
  implements EmployerProfileRepository
{
  constructor(private readonly prismaService: EmployerPrismaService) {}

  private mapRecord(record: EmployerProfilePersistenceRecord): EmployerProfileRecord {
    return {
      address: record.address,
      companyName: record.companyName,
      companySize: record.companySize,
      contactName: record.contactName,
      contactPhone: record.contactPhone,
      createdAt: record.createdAt,
      description: record.description,
      foundedYear: record.foundedYear,
      id: record.id,
      identityId: record.identityId,
      industry: record.industry,
      logoUrl: record.logoUrl,
      taxCode: record.taxCode,
      updatedAt: record.updatedAt,
      website: record.website
    };
  }

  async existsByIdentityId(identityId: string): Promise<boolean> {
    return (
      await this.prismaService.prisma.employerProfile.findUnique({
        where: {
          identityId
        }
      })
    ) !== null;
  }

  async findByIdentityId(
    identityId: string
  ): Promise<EmployerProfileRecord | null> {
    const record = await this.prismaService.prisma.employerProfile.findUnique({
      where: {
        identityId
      }
    });

    return record ? this.mapRecord(record) : null;
  }

  async save(profile: {
    address: string;
    companyName: string;
    contactName: string;
    contactPhone: string;
    id: string;
    identityId: string;
    industry: string;
  }): Promise<void> {
    await this.prismaService.prisma.employerProfile.create({
      data: profile
    });
  }

  async updateByIdentityId(
    identityId: string,
    patch: UpdateEmployerProfilePatch
  ): Promise<EmployerProfileRecord | null> {
    const existing = await this.prismaService.prisma.employerProfile.findUnique({
      where: {
        identityId
      }
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prismaService.prisma.employerProfile.update({
      data: patch,
      where: {
        id: existing.id
      }
    });

    return this.mapRecord(updated);
  }
}
