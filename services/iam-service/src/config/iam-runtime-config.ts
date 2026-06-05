import type { ConfigService } from '@nestjs/config';
import type { IamEnvironmentVariables } from './iam-env.schema';

export type IamRuntimeConfig = {
  grpcIamUrl: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  jwtSecret: string;
};

export function getIamRuntimeConfig(
  configService: Pick<
    ConfigService<IamEnvironmentVariables, true>,
    'getOrThrow'
  >
): IamRuntimeConfig {
  return {
    grpcIamUrl: configService.getOrThrow('GRPC_IAM_URL'),
    jwtExpiresIn: configService.getOrThrow('JWT_EXPIRES_IN'),
    jwtRefreshExpiresIn: configService.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
    jwtSecret: configService.getOrThrow('JWT_SECRET')
  };
}
