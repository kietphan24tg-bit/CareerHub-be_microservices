import type { ConfigService } from '@nestjs/config';
import type { GatewayEnvironmentVariables } from './gateway-env.schema';

export type GatewayRuntimeConfig = {
  authRefreshCookieDomain?: string;
  authRefreshCookieName: string;
  authRefreshCookieSecure: boolean;
  grpcCandidateUrl: string;
  grpcEmployerUrl: string;
  grpcIamUrl: string;
  grpcJobUrl: string;
  jwtRefreshExpiresIn: string;
};

export function getGatewayRuntimeConfig(
  configService: Pick<
    ConfigService<GatewayEnvironmentVariables, true>,
    'get' | 'getOrThrow'
  >
): GatewayRuntimeConfig {
  return {
    authRefreshCookieDomain: configService.get('AUTH_REFRESH_COOKIE_DOMAIN'),
    authRefreshCookieName: configService.getOrThrow('AUTH_REFRESH_COOKIE_NAME'),
    authRefreshCookieSecure: configService.getOrThrow('AUTH_REFRESH_COOKIE_SECURE'),
    grpcCandidateUrl: configService.getOrThrow('GRPC_CANDIDATE_URL'),
    grpcEmployerUrl: configService.getOrThrow('GRPC_EMPLOYER_URL'),
    grpcIamUrl: configService.getOrThrow('GRPC_IAM_URL'),
    grpcJobUrl: configService.getOrThrow('GRPC_JOB_URL'),
    jwtRefreshExpiresIn: configService.getOrThrow('JWT_REFRESH_EXPIRES_IN')
  };
}
