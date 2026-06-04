import { Injectable } from '@nestjs/common';
import { IamGrpcClient } from '../infrastructure/transport/grpc/iam-grpc.client';

type CandidateRegistrationInput = {
  acceptTerms: boolean;
  email: string;
  password: string;
  requestId?: string;
};

type EmployerRegistrationInput = {
  acceptTerms: boolean;
  companyEmail: string;
  password: string;
  requestId?: string;
};

type GatewayRegisterResponse = {
  email: string;
  role: string;
  userId: string;
};

@Injectable()
export class GatewayAuthService {
  constructor(private readonly iamGrpcClient: IamGrpcClient) {}

  async registerCandidate(
    input: CandidateRegistrationInput
  ): Promise<GatewayRegisterResponse> {
    const response = await this.iamGrpcClient.registerIdentity(
      {
        accepted_terms: input.acceptTerms,
        email: input.email,
        password: input.password,
        role: 'candidate'
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
    const response = await this.iamGrpcClient.registerIdentity(
      {
        accepted_terms: input.acceptTerms,
        email: input.companyEmail,
        password: input.password,
        role: 'employer'
      },
      input.requestId
    );

    return {
      email: response.email,
      role: response.role,
      userId: response.identity_id
    };
  }
}
