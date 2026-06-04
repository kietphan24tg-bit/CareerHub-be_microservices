import type { ConfigService } from '@nestjs/config';
import type { IamEnvironmentVariables } from './iam-env.schema';

export type IamRuntimeConfig = {
  grpcIamUrl: string;
};

export function getIamRuntimeConfig(
  configService: Pick<
    ConfigService<IamEnvironmentVariables, true>,
    'getOrThrow'
  >
): IamRuntimeConfig {
  return {
    grpcIamUrl: configService.getOrThrow('GRPC_IAM_URL')
  };
}
