import type { EmployerProfileRepository } from '../../../application';
import { EmployerPrismaService } from '../prisma/employer-prisma.service';

export class PrismaEmployerProfileRepository
  implements EmployerProfileRepository
{
  constructor(private readonly prismaService: EmployerPrismaService) {}

  async existsByIdentityId(identityId: string): Promise<boolean> {
    return (
      await this.prismaService.prisma.employerProfile.findUnique({
        where: {
          identityId
        }
      })
    ) !== null;
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
}
