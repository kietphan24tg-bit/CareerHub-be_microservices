import type { CandidateProfileRepository } from '../../../application';
import { CandidatePrismaService } from '../prisma/candidate-prisma.service';

export class PrismaCandidateProfileRepository
  implements CandidateProfileRepository
{
  constructor(private readonly prismaService: CandidatePrismaService) {}

  async existsByIdentityId(identityId: string): Promise<boolean> {
    return (
      await this.prismaService.prisma.candidateProfile.findUnique({
        where: {
          identityId
        }
      })
    ) !== null;
  }

  async save(profile: {
    fullName: string;
    id: string;
    identityId: string;
    phone: string;
  }): Promise<void> {
    await this.prismaService.prisma.candidateProfile.create({
      data: profile
    });
  }
}
