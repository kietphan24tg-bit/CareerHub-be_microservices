import { z } from 'zod';
import {
  runtimeEnvironmentSchema,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/nest-common';

export const iamEnvironmentSchema = runtimeEnvironmentSchema.extend({
  GRPC_IAM_URL: z.string().min(1).default('0.0.0.0:50051')
});

export type IamEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_IAM_URL: string;
};

export function validateIamEnvironment(
  config: Record<string, unknown>
): IamEnvironmentVariables {
  const parsed = iamEnvironmentSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      message: issue.message,
      path: issue.path.join('.') || 'env'
    }));

    throw new Error(`Invalid iam environment variables: ${JSON.stringify(issues)}`);
  }

  return {
    ...parsed.data,
    HTTP_LOG_ENABLED: parsed.data.HTTP_LOG_ENABLED ?? true,
    LOG_LEVEL:
      parsed.data.LOG_LEVEL ??
      (parsed.data.NODE_ENV === 'production' ? 'info' : 'debug'),
    LOG_PRETTY:
      parsed.data.LOG_PRETTY ?? parsed.data.NODE_ENV !== 'production'
  };
}
