import type {
  CandidateProfileRecord,
  CandidateProfileRepository,
  UpdateCandidateProfilePatch
} from '../../../application';
import type { CandidateProfilePersistenceRecord } from '../prisma/candidate-prisma.types';
import { CandidatePrismaService } from '../prisma/candidate-prisma.service';

export class PrismaCandidateProfileRepository
  implements CandidateProfileRepository
{
  constructor(private readonly prismaService: CandidatePrismaService) {}

  private mapRecord(record: CandidateProfilePersistenceRecord): CandidateProfileRecord {
    return {
      address: record.address,
      avatarUrl: record.avatarUrl,
      bio: record.bio,
      createdAt: record.createdAt,
      fullName: record.fullName,
      githubUrl: record.githubUrl,
      headline: record.headline,
      id: record.id,
      identityId: record.identityId,
      linkedinUrl: record.linkedinUrl,
      phone: record.phone,
      portfolioUrl: record.portfolioUrl,
      updatedAt: record.updatedAt,
      yearsExperience: record.yearsExperience
    };
  }

  async existsByIdentityId(identityId: string): Promise<boolean> {
    return (
      await this.prismaService.prisma.candidateProfile.findUnique({
        where: {
          identityId
        }
      })
    ) !== null;
  }

  async findByIdentityId(
    identityId: string
  ): Promise<CandidateProfileRecord | null> {
    const record = await this.prismaService.prisma.candidateProfile.findUnique({
      where: {
        identityId
      }
    });

    return record ? this.mapRecord(record) : null;
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

  async updateByIdentityId(
    identityId: string,
    patch: UpdateCandidateProfilePatch
  ): Promise<CandidateProfileRecord | null> {
    const existing = await this.prismaService.prisma.candidateProfile.findUnique({
      where: {
        identityId
      }
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prismaService.prisma.candidateProfile.update({
      data: patch,
      where: {
        id: existing.id
      }
    });

    return this.mapRecord(updated);
  }
}
