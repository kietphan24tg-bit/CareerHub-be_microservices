import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  MetricsRegistry,
  RegisterCompensationMetricRecord
} from '@careerhub/infrastructure';
import { IamGrpcClient } from '../infrastructure/transport/grpc/iam-grpc.client';
import { CandidateGrpcClient } from '../infrastructure/transport/grpc/candidate-grpc.client';
import { EmployerGrpcClient } from '../infrastructure/transport/grpc/employer-grpc.client';
import type { GatewayAuthenticatedUser } from '../auth/types/gateway-auth.types';
import {
  GATEWAY_METRICS_TOKENS
} from '../config/gateway.constants';

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

type GatewayPasswordResetRequestResponse = {
  accepted: true;
};

type GatewayPasswordResetResponse = {
  passwordReset: true;
};

@Injectable()
export class GatewayAuthService {
  private readonly logger = new Logger(GatewayAuthService.name);

  constructor(
    private readonly iamGrpcClient: IamGrpcClient,
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly employerGrpcClient: EmployerGrpcClient,
    @Inject(GATEWAY_METRICS_TOKENS.registry)
    private readonly metricsRegistry: MetricsRegistry
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

    try {
      await this.candidateGrpcClient.createCandidateProfile(
        {
          full_name: input.fullName,
          identity_id: identity.identity_id,
          phone: input.phone
        },
        input.requestId
      );
    } catch (error) {
      const profileExists = await this.candidateProfileExists(
        identity.identity_id,
        input.requestId
      );

      if (profileExists) {
        this.logger.warn(
          `Candidate profile creation reported failure but profile already exists for identity ${identity.identity_id}; skipping identity compensation`
        );
        this.recordRegisterCompensation({
          action: 'skip_profile_exists',
          flow: 'candidate',
          reason: 'profile_creation_failed',
          status: 'skipped'
        });
      } else {
        await this.cancelPendingIdentityWithLogging(
          identity.identity_id,
          input.requestId,
          'candidate profile creation failed',
          'candidate',
          'profile_creation_failed'
        );
        throw error;
      }
    }

    const activation = await this.activateIdentityWithCompensation({
      email: identity.email,
      flow: 'candidate',
      identityId: identity.identity_id,
      requestId: input.requestId,
      role: identity.role,
      rollbackProfile: async () => {
        await this.deleteCandidateProfileCompensationWithLogging(
          identity.identity_id,
          input.requestId,
          'identity activation failed after candidate profile creation'
        );
      }
    });

    return {
      email: activation.email,
      role: activation.role,
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

    try {
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
    } catch (error) {
      const profileExists = await this.employerProfileExists(
        identity.identity_id,
        input.requestId
      );

      if (profileExists) {
        this.logger.warn(
          `Employer profile creation reported failure but profile already exists for identity ${identity.identity_id}; skipping identity compensation`
        );
        this.recordRegisterCompensation({
          action: 'skip_profile_exists',
          flow: 'employer',
          reason: 'profile_creation_failed',
          status: 'skipped'
        });
      } else {
        await this.cancelPendingIdentityWithLogging(
          identity.identity_id,
          input.requestId,
          'employer profile creation failed',
          'employer',
          'profile_creation_failed'
        );
        throw error;
      }
    }

    const activation = await this.activateIdentityWithCompensation({
      email: identity.email,
      flow: 'employer',
      identityId: identity.identity_id,
      requestId: input.requestId,
      role: identity.role,
      rollbackProfile: async () => {
        await this.deleteEmployerProfileCompensationWithLogging(
          identity.identity_id,
          input.requestId,
          'identity activation failed after employer profile creation'
        );
      }
    });

    return {
      email: activation.email,
      role: activation.role,
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

  private async activateIdentityWithCompensation(input: {
    email: string;
    flow: 'candidate' | 'employer';
    identityId: string;
    requestId?: string;
    role: string;
    rollbackProfile: () => Promise<void>;
  }): Promise<{
    email: string;
    identity_id: string;
    role: string;
    status: string;
  }> {
    try {
      const response = await this.iamGrpcClient.activateIdentity(
        {
          identity_id: input.identityId
        },
        input.requestId
      );

      return {
        email: input.email,
        identity_id: response.identity_id,
        role: input.role,
        status: response.status
      };
    } catch (error) {
      const currentIdentity = await this.readCurrentIdentityOrNull(
        input.identityId,
        input.requestId
      );

      if (currentIdentity?.status === 'active') {
        this.logger.warn(
          `Identity activation reported failure but identity ${input.identityId} is already active; treating registration as successful`
        );
        this.recordRegisterCompensation({
          action: 'skip_already_active',
          flow: input.flow,
          reason: 'activation_failed',
          status: 'skipped'
        });
        return {
          email: currentIdentity.email,
          identity_id: currentIdentity.identity_id,
          role: currentIdentity.role,
          status: currentIdentity.status
        };
      }

      await input.rollbackProfile();
      await this.cancelPendingIdentityWithLogging(
        input.identityId,
        input.requestId,
        'identity activation failed',
        input.flow,
        'activation_failed'
      );
      throw error;
    }
  }

  private async candidateProfileExists(
    identityId: string,
    requestId?: string
  ): Promise<boolean> {
    try {
      await this.candidateGrpcClient.getCandidateProfileByIdentityId(
        {
          identity_id: identityId
        },
        requestId
      );
      return true;
    } catch {
      return false;
    }
  }

  private async employerProfileExists(
    identityId: string,
    requestId?: string
  ): Promise<boolean> {
    try {
      await this.employerGrpcClient.getEmployerProfileByIdentityId(
        {
          identity_id: identityId
        },
        requestId
      );
      return true;
    } catch {
      return false;
    }
  }

  private async readCurrentIdentityOrNull(
    identityId: string,
    requestId?: string
  ): Promise<{
    email: string;
    identity_id: string;
    role: string;
    status: string;
  } | null> {
    try {
      return await this.iamGrpcClient.getCurrentIdentity(
        {
          identity_id: identityId
        },
        requestId
      );
    } catch {
      return null;
    }
  }

  private async cancelPendingIdentityWithLogging(
    identityId: string,
    requestId: string | undefined,
    reason: string,
    flow: 'candidate' | 'employer',
    metricReason: 'activation_failed' | 'profile_creation_failed'
  ): Promise<void> {
    try {
      this.logger.warn(`Compensating pending identity ${identityId}: ${reason}`);
      await this.iamGrpcClient.cancelPendingIdentity(
        {
          identity_id: identityId
        },
        requestId
      );
      this.recordRegisterCompensation({
        action: 'cancel_pending_identity',
        flow,
        reason: metricReason,
        status: 'performed'
      });
    } catch (error) {
      this.recordRegisterCompensation({
        action: 'cancel_pending_identity',
        flow,
        reason: metricReason,
        status: 'failed'
      });
      this.logger.error(
        `Failed to compensate pending identity ${identityId}: ${reason}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  private async deleteCandidateProfileCompensationWithLogging(
    identityId: string,
    requestId: string | undefined,
    reason: string
  ): Promise<void> {
    try {
      this.logger.warn(`Compensating candidate profile ${identityId}: ${reason}`);
      await this.candidateGrpcClient.deleteCandidateProfileCompensation(
        {
          identity_id: identityId
        },
        requestId
      );
      this.recordRegisterCompensation({
        action: 'delete_profile',
        flow: 'candidate',
        reason: 'activation_failed',
        status: 'performed'
      });
    } catch (error) {
      this.recordRegisterCompensation({
        action: 'delete_profile',
        flow: 'candidate',
        reason: 'activation_failed',
        status: 'failed'
      });
      this.logger.error(
        `Failed to compensate candidate profile ${identityId}: ${reason}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  private async deleteEmployerProfileCompensationWithLogging(
    identityId: string,
    requestId: string | undefined,
    reason: string
  ): Promise<void> {
    try {
      this.logger.warn(`Compensating employer profile ${identityId}: ${reason}`);
      await this.employerGrpcClient.deleteEmployerProfileCompensation(
        {
          identity_id: identityId
        },
        requestId
      );
      this.recordRegisterCompensation({
        action: 'delete_profile',
        flow: 'employer',
        reason: 'activation_failed',
        status: 'performed'
      });
    } catch (error) {
      this.recordRegisterCompensation({
        action: 'delete_profile',
        flow: 'employer',
        reason: 'activation_failed',
        status: 'failed'
      });
      this.logger.error(
        `Failed to compensate employer profile ${identityId}: ${reason}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  private recordRegisterCompensation(
    record: Omit<RegisterCompensationMetricRecord, 'service'>
  ): void {
    this.metricsRegistry.recordRegisterCompensation?.({
      ...record,
      service: 'gateway'
    });
  }
}
