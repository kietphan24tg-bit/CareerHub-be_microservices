import { Injectable } from '@nestjs/common';
import { IamGrpcClient } from '../../infrastructure/transport/grpc/iam-grpc.client';
import { CandidateGrpcClient } from '../../infrastructure/transport/grpc/candidate-grpc.client';
import { EmployerGrpcClient } from '../../infrastructure/transport/grpc/employer-grpc.client';
import { WorkflowGrpcClient } from '../../infrastructure/transport/grpc/workflow-grpc.client';
import type { GatewayAuthenticatedUser } from '../../auth/types/gateway-auth.types';
import {
  toGatewayCandidateProfile,
  toGatewayEmployerProfile,
  type GatewayCandidateProfile,
  type GatewayEmployerProfile
} from '../profiles/gateway-profile.service';

type CandidateRegistrationInput = {
  acceptTerms: boolean;
  email: string;
  fullName: string;
  password: string;
  phone: string;
  requestId?: string;
};

type EmployerRegistrationInput = {
  acceptTerms: boolean;
  address: string;
  companyName: string;
  companyEmail: string;
  fullName: string;
  industry: string;
  password: string;
  phone: string;
  requestId?: string;
};

type GatewayRegisterResponse = {
  email: string;
  role: string;
  userId: string;
};

type GatewayLoginResponse = {
  accessToken: string;
  rememberMe?: boolean;
  refreshToken: string;
  user: GatewayAuthenticatedUser;
};

type GatewayCurrentUserResponse = {
  companyProfile: GatewayAuthCompanyProfileResponse | null;
  profile: GatewayAuthCandidateProfileResponse | null;
  user: GatewayAuthUserResponse;
};

type GatewayAuthUserResponse = {
  email: string;
  role: string;
  userId: string;
};

type GatewayAuthCandidateProfileResponse = {
  address: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  fullName: string;
  githubUrl: string | null;
  headline: string | null;
  id: string;
  linkedinUrl: string | null;
  phone: string | null;
  portfolioUrl: string | null;
  resumeId: string | null;
  updatedAt: string;
  userId: string;
  yearsExperience: number | null;
};

type GatewayAuthCompanyProfileResponse = {
  address: string | null;
  companyName: string;
  companySize: string | null;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: string;
  description: string | null;
  foundedYear: number | null;
  id: string;
  industry: string | null;
  logoUrl: string | null;
  taxCode: string | null;
  updatedAt: string;
  userId: string;
  website: string | null;
};

type GatewayPasswordResetRequestResponse = {
  accepted: true;
};

type GatewayPasswordResetResponse = {
  passwordReset: true;
};

@Injectable()
export class GatewayAuthService {
  constructor(
    private readonly workflowGrpcClient: WorkflowGrpcClient,
    private readonly iamGrpcClient: IamGrpcClient,
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly employerGrpcClient: EmployerGrpcClient
  ) {}

  async registerCandidate(
    input: CandidateRegistrationInput
  ): Promise<GatewayRegisterResponse> {
    const response = await this.workflowGrpcClient.registerCandidate(
      {
        accept_terms: input.acceptTerms,
        email: input.email,
        full_name: input.fullName,
        password: input.password,
        phone: input.phone
      },
      input.requestId
    );

    return {
      email: response.email,
      role: response.role,
      userId: response.identity_id
    };
  }

  async registerEmployer(
    input: EmployerRegistrationInput
  ): Promise<GatewayRegisterResponse> {
    const response = await this.workflowGrpcClient.registerEmployer(
      {
        accept_terms: input.acceptTerms,
        address: input.address,
        company_email: input.companyEmail,
        company_name: input.companyName,
        full_name: input.fullName,
        industry: input.industry,
        password: input.password,
        phone: input.phone
      },
      input.requestId
    );

    return {
      email: response.email,
      role: response.role,
      userId: response.identity_id
    };
  }

  async login(
    input: {
      email: string;
      password: string;
      rememberMe?: boolean;
      requestId?: string;
    }
  ): Promise<GatewayLoginResponse> {
    const response = await this.iamGrpcClient.loginIdentity(
      {
        email: input.email,
        password: input.password,
        remember_me: input.rememberMe === true
      },
      input.requestId
    );

    return {
      accessToken: response.access_token,
      rememberMe: input.rememberMe === true,
      refreshToken: response.refresh_token,
      user: {
        email: response.email,
        id: response.identity_id,
        role: response.role
      }
    };
  }

  async refresh(
    input: {
      refreshToken: string;
      requestId?: string;
    }
  ): Promise<GatewayLoginResponse> {
    const response = await this.iamGrpcClient.refreshSession(
      {
        refresh_token: input.refreshToken
      },
      input.requestId
    );

    return {
      accessToken: response.access_token,
      rememberMe: response.remember_me,
      refreshToken: response.refresh_token,
      user: {
        email: response.email,
        id: response.identity_id,
        role: response.role
      }
    };
  }

  async logout(
    input: {
      refreshToken: string;
      requestId?: string;
    }
  ): Promise<{ loggedOut: boolean }> {
    const response = await this.iamGrpcClient.logoutSession(
      {
        refresh_token: input.refreshToken
      },
      input.requestId
    );

    return {
      loggedOut: response.logged_out
    };
  }

  async requestPasswordReset(input: {
    email: string;
    requestId?: string;
  }): Promise<GatewayPasswordResetRequestResponse> {
    const response = await this.iamGrpcClient.requestPasswordReset(
      {
        email: input.email
      },
      input.requestId
    );

    void response;

    return {
      accepted: true
    };
  }

  async resetPassword(input: {
    newPassword: string;
    requestId?: string;
    token: string;
  }): Promise<GatewayPasswordResetResponse> {
    const response = await this.iamGrpcClient.resetPassword(
      {
        new_password: input.newPassword,
        token: input.token
      },
      input.requestId
    );

    void response;

    return {
      passwordReset: true
    };
  }

  async getCurrentUser(
    input: {
      identityId: string;
      requestId?: string;
    }
  ): Promise<GatewayCurrentUserResponse> {
    const response = await this.iamGrpcClient.getCurrentIdentity(
      {
        identity_id: input.identityId
      },
      input.requestId
    );

    const [profile, companyProfile] = await Promise.all([
      response.role === 'candidate'
        ? this.safeLoadCandidateProfile(response.identity_id, input.requestId)
        : Promise.resolve(null),
      response.role === 'employer'
        ? this.safeLoadEmployerProfile(response.identity_id, input.requestId)
        : Promise.resolve(null)
    ]);

    return {
      companyProfile,
      profile,
      user: {
        email: response.email,
        role: response.role,
        userId: response.identity_id
      }
    };
  }

  private async safeLoadCandidateProfile(
    identityId: string,
    requestId?: string
  ): Promise<GatewayAuthCandidateProfileResponse | null> {
    try {
      const response = await this.candidateGrpcClient.getCandidateProfileByIdentityId(
        {
          identity_id: identityId
        },
        requestId
      );

      return this.toAuthCandidateProfile(
        toGatewayCandidateProfile(response.profile),
        identityId
      );
    } catch {
      return null;
    }
  }

  private async safeLoadEmployerProfile(
    identityId: string,
    requestId?: string
  ): Promise<GatewayAuthCompanyProfileResponse | null> {
    try {
      const response = await this.employerGrpcClient.getEmployerProfileByIdentityId(
        {
          identity_id: identityId
        },
        requestId
      );

      return this.toAuthCompanyProfile(
        toGatewayEmployerProfile(response.profile),
        identityId
      );
    } catch {
      return null;
    }
  }

  private toAuthCandidateProfile(
    profile: GatewayCandidateProfile,
    identityId: string
  ): GatewayAuthCandidateProfileResponse {
    return {
      address: profile.address,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      createdAt: profile.createdAt,
      fullName: profile.fullName,
      githubUrl: profile.githubUrl,
      headline: profile.headline,
      id: profile.id,
      linkedinUrl: profile.linkedinUrl,
      phone: profile.phone,
      portfolioUrl: profile.portfolioUrl,
      resumeId: profile.resumeId,
      updatedAt: profile.updatedAt,
      userId: identityId,
      yearsExperience: profile.yearsExperience
    };
  }

  private toAuthCompanyProfile(
    profile: GatewayEmployerProfile,
    identityId: string
  ): GatewayAuthCompanyProfileResponse {
    return {
      address: profile.address,
      companyName: profile.companyName,
      companySize: profile.companySize,
      contactName: profile.contactName,
      contactPhone: profile.contactPhone,
      createdAt: profile.createdAt,
      description: profile.description,
      foundedYear: profile.foundedYear,
      id: profile.id,
      industry: profile.industry,
      logoUrl: profile.logoUrl,
      taxCode: profile.taxCode,
      updatedAt: profile.updatedAt,
      userId: identityId,
      website: profile.website
    };
  }

}
