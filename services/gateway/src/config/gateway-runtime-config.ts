import type { ConfigService } from '@nestjs/config';
import type { GatewayEnvironmentVariables } from './gateway-env.schema';

export type GatewayRuntimeConfig = {
  authRefreshCookieDomain?: string;
  authRefreshCookieName: string;
  authRefreshCookieSecure: boolean;
  corsOrigin?: string;
  grpcApplicationUrl: string;
  grpcCandidateUrl: string;
  grpcCommunicationUrl: string;
  grpcEmployerUrl: string;
  grpcIamUrl: string;
  grpcJobUrl: string;
  jwtRefreshExpiresIn: string;
  throttleMediumLimit: number;
  throttleMediumTtlMs: number;
  throttleShortLimit: number;
  throttleShortTtlMs: number;
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
    corsOrigin: configService.get('CORS_ORIGIN'),
    grpcApplicationUrl: configService.getOrThrow('GRPC_APPLICATION_URL'),
    grpcCandidateUrl: configService.getOrThrow('GRPC_CANDIDATE_URL'),
    grpcCommunicationUrl: configService.getOrThrow('GRPC_COMMUNICATION_URL'),
    grpcEmployerUrl: configService.getOrThrow('GRPC_EMPLOYER_URL'),
    grpcIamUrl: configService.getOrThrow('GRPC_IAM_URL'),
    grpcJobUrl: configService.getOrThrow('GRPC_JOB_URL'),
    jwtRefreshExpiresIn: configService.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
    throttleMediumLimit: configService.getOrThrow('THROTTLE_MEDIUM_LIMIT'),
    throttleMediumTtlMs: configService.getOrThrow('THROTTLE_MEDIUM_TTL_MS'),
    throttleShortLimit: configService.getOrThrow('THROTTLE_SHORT_LIMIT'),
    throttleShortTtlMs: configService.getOrThrow('THROTTLE_SHORT_TTL_MS')
  };
}
