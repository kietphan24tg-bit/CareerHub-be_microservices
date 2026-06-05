import { Injectable } from '@nestjs/common';
import { IamGrpcClient } from '../infrastructure/transport/grpc/iam-grpc.client';
import { CandidateGrpcClient } from '../infrastructure/transport/grpc/candidate-grpc.client';
import { EmployerGrpcClient } from '../infrastructure/transport/grpc/employer-grpc.client';
import type { GatewayAuthenticatedUser } from '../auth/types/gateway-auth.types';

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
  refreshToken: string;
  user: GatewayAuthenticatedUser;
};

type GatewayCurrentIdentityResponse = GatewayAuthenticatedUser & {
  status: string;
};

@Injectable()
export class GatewayAuthService {
  constructor(
    private readonly iamGrpcClient: IamGrpcClient,
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly employerGrpcClient: EmployerGrpcClient
  ) {}

  async registerCandidate(
    input: CandidateRegistrationInput
  ): Promise<GatewayRegisterResponse> {
    const identity = await this.iamGrpcClient.registerIdentity(
      {
        accepted_terms: input.acceptTerms,
        email: input.email,
        password: input.password,
        role: 'candidate'
      },
      input.requestId
    );

    await this.candidateGrpcClient.createCandidateProfile(
      {
        full_name: input.fullName,
        identity_id: identity.identity_id,
        phone: input.phone
      },
      input.requestId
    );

    const activation = await this.iamGrpcClient.activateIdentity(
      {
        identity_id: identity.identity_id
      },
      input.requestId
    );

    return {
      email: identity.email,
      role: identity.role,
      userId: activation.identity_id
    };
  }

  async registerEmployer(
    input: EmployerRegistrationInput
  ): Promise<GatewayRegisterResponse> {
    const identity = await this.iamGrpcClient.registerIdentity(
      {
        accepted_terms: input.acceptTerms,
        email: input.companyEmail,
        password: input.password,
        role: 'employer'
      },
      input.requestId
    );

    await this.employerGrpcClient.createEmployerProfile(
      {
        address: input.address,
        company_name: input.companyName,
        contact_name: input.fullName,
        contact_phone: input.phone,
        identity_id: identity.identity_id,
        industry: input.industry
      },
      input.requestId
    );

    const activation = await this.iamGrpcClient.activateIdentity(
      {
        identity_id: identity.identity_id
      },
      input.requestId
    );

    return {
      email: identity.email,
      role: identity.role,
      userId: activation.identity_id
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

  async getCurrentIdentity(
    input: {
      identityId: string;
      requestId?: string;
    }
  ): Promise<GatewayCurrentIdentityResponse> {
    const response = await this.iamGrpcClient.getCurrentIdentity(
      {
        identity_id: input.identityId
      },
      input.requestId
    );

    return {
      email: response.email,
      id: response.identity_id,
      role: response.role,
      status: response.status
    };
  }
}
