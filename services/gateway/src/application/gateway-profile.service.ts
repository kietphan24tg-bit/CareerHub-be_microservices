import { Injectable } from '@nestjs/common';
import type {
  CandidateProfile,
  EmployerProfile
} from '@careerhub/contracts';
import { CandidateGrpcClient } from '../infrastructure/transport/grpc/candidate-grpc.client';
import { EmployerGrpcClient } from '../infrastructure/transport/grpc/employer-grpc.client';

type GatewayCandidateProfile = {
  address: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  fullName: string;
  githubUrl: string | null;
  headline: string | null;
  id: string;
  identityId: string;
  linkedinUrl: string | null;
  phone: string | null;
  portfolioUrl: string | null;
  updatedAt: string;
  yearsExperience: number | null;
};

type GatewayEmployerProfile = {
  address: string | null;
  companyName: string;
  companySize: string | null;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: string;
  description: string | null;
  foundedYear: number | null;
  id: string;
  identityId: string;
  industry: string | null;
  logoUrl: string | null;
  taxCode: string | null;
  updatedAt: string;
  website: string | null;
};

type UpdateCandidateProfileInput = {
  address?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  fullName?: string;
  githubUrl?: string | null;
  headline?: string | null;
  identityId: string;
  linkedinUrl?: string | null;
  phone?: string | null;
  portfolioUrl?: string | null;
  requestId?: string;
  yearsExperience?: number | null;
};

type UpdateEmployerProfileInput = {
  address?: string | null;
  companyName?: string;
  companySize?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  foundedYear?: number | null;
  identityId: string;
  industry?: string | null;
  logoUrl?: string | null;
  requestId?: string;
  taxCode?: string | null;
  website?: string | null;
};

function hasNullField(nullFields: Set<string>, fieldName: string): boolean {
  return nullFields.has(fieldName);
}

function mapNullableString(
  nullFields: Set<string>,
  fieldName: string,
  value: string
): string | null {
  return hasNullField(nullFields, fieldName) ? null : value;
}

function mapNullableNumber(
  nullFields: Set<string>,
  fieldName: string,
  value: number
): number | null {
  return hasNullField(nullFields, fieldName) ? null : value;
}

function toGatewayCandidateProfile(profile: CandidateProfile): GatewayCandidateProfile {
  const nullFields = new Set(profile.null_fields ?? []);

  return {
    address: mapNullableString(nullFields, 'address', profile.address),
    avatarUrl: mapNullableString(nullFields, 'avatar_url', profile.avatar_url),
    bio: mapNullableString(nullFields, 'bio', profile.bio),
    createdAt: profile.created_at,
    fullName: profile.full_name,
    githubUrl: mapNullableString(nullFields, 'github_url', profile.github_url),
    headline: mapNullableString(nullFields, 'headline', profile.headline),
    id: profile.id,
    identityId: profile.identity_id,
    linkedinUrl: mapNullableString(
      nullFields,
      'linkedin_url',
      profile.linkedin_url
    ),
    phone: mapNullableString(nullFields, 'phone', profile.phone),
    portfolioUrl: mapNullableString(
      nullFields,
      'portfolio_url',
      profile.portfolio_url
    ),
    updatedAt: profile.updated_at,
    yearsExperience: mapNullableNumber(
      nullFields,
      'years_experience',
      profile.years_experience
    )
  };
}

function toGatewayEmployerProfile(profile: EmployerProfile): GatewayEmployerProfile {
  const nullFields = new Set(profile.null_fields ?? []);

  return {
    address: mapNullableString(nullFields, 'address', profile.address),
    companyName: profile.company_name,
    companySize: mapNullableString(
      nullFields,
      'company_size',
      profile.company_size
    ),
    contactName: mapNullableString(
      nullFields,
      'contact_name',
      profile.contact_name
    ),
    contactPhone: mapNullableString(
      nullFields,
      'contact_phone',
      profile.contact_phone
    ),
    createdAt: profile.created_at,
    description: mapNullableString(
      nullFields,
      'description',
      profile.description
    ),
    foundedYear: mapNullableNumber(
      nullFields,
      'founded_year',
      profile.founded_year
    ),
    id: profile.id,
    identityId: profile.identity_id,
    industry: mapNullableString(nullFields, 'industry', profile.industry),
    logoUrl: mapNullableString(nullFields, 'logo_url', profile.logo_url),
    taxCode: mapNullableString(nullFields, 'tax_code', profile.tax_code),
    updatedAt: profile.updated_at,
    website: mapNullableString(nullFields, 'website', profile.website)
  };
}

function buildUpdatedFieldPayload(
  entries: Array<[string, unknown, string]>
): {
  clear_fields: string[];
  updated_fields: string[];
} & Record<string, unknown> {
  const updatedFields: string[] = [];
  const clearFields: string[] = [];
  const payload: Record<string, unknown> = {};

  for (const [camelField, value, snakeField] of entries) {
    if (value === undefined) {
      continue;
    }

    if (value === null) {
      clearFields.push(snakeField);
      continue;
    }

    updatedFields.push(snakeField);
    payload[snakeField] = value;
  }

  return {
    ...payload,
    clear_fields: clearFields,
    updated_fields: updatedFields
  };
}

@Injectable()
export class GatewayProfileService {
  constructor(
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly employerGrpcClient: EmployerGrpcClient
  ) {}

  async getCandidateProfile(
    input: {
      identityId: string;
      requestId?: string;
    }
  ): Promise<GatewayCandidateProfile> {
    const response =
      await this.candidateGrpcClient.getCandidateProfileByIdentityId(
        {
          identity_id: input.identityId
        },
        input.requestId
      );

    return toGatewayCandidateProfile(response.profile);
  }

  async updateCandidateProfile(
    input: UpdateCandidateProfileInput
  ): Promise<GatewayCandidateProfile> {
    const response = await this.candidateGrpcClient.updateCandidateProfile(
      {
        ...buildUpdatedFieldPayload([
          ['fullName', input.fullName, 'full_name'],
          ['avatarUrl', input.avatarUrl, 'avatar_url'],
          ['phone', input.phone, 'phone'],
          ['headline', input.headline, 'headline'],
          ['bio', input.bio, 'bio'],
          ['address', input.address, 'address'],
          ['githubUrl', input.githubUrl, 'github_url'],
          ['linkedinUrl', input.linkedinUrl, 'linkedin_url'],
          ['portfolioUrl', input.portfolioUrl, 'portfolio_url'],
          ['yearsExperience', input.yearsExperience, 'years_experience']
        ]),
        identity_id: input.identityId
      },
      input.requestId
    );

    return toGatewayCandidateProfile(response.profile);
  }

  async getEmployerProfile(
    input: {
      identityId: string;
      requestId?: string;
    }
  ): Promise<GatewayEmployerProfile> {
    const response =
      await this.employerGrpcClient.getEmployerProfileByIdentityId(
        {
          identity_id: input.identityId
        },
        input.requestId
      );

    return toGatewayEmployerProfile(response.profile);
  }

  async updateEmployerProfile(
    input: UpdateEmployerProfileInput
  ): Promise<GatewayEmployerProfile> {
    const response = await this.employerGrpcClient.updateEmployerProfile(
      {
        ...buildUpdatedFieldPayload([
          ['companyName', input.companyName, 'company_name'],
          ['logoUrl', input.logoUrl, 'logo_url'],
          ['website', input.website, 'website'],
          ['industry', input.industry, 'industry'],
          ['companySize', input.companySize, 'company_size'],
          ['foundedYear', input.foundedYear, 'founded_year'],
          ['description', input.description, 'description'],
          ['address', input.address, 'address'],
          ['taxCode', input.taxCode, 'tax_code'],
          ['contactName', input.contactName, 'contact_name'],
          ['contactPhone', input.contactPhone, 'contact_phone']
        ]),
        identity_id: input.identityId
      },
      input.requestId
    );

    return toGatewayEmployerProfile(response.profile);
  }
}
