import { z } from 'zod';
import {
  runtimeEnvironmentSchema,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/nest-common';

export const gatewayEnvironmentSchema = runtimeEnvironmentSchema.extend({
  GRPC_IAM_URL: z.string().min(1).default('0.0.0.0:50051'),
  RABBITMQ_EXCHANGE: z.string().min(1).default('careerhub.events'),
  RABBITMQ_PREFETCH: z.coerce.number().int().positive().default(10)
});

export type GatewayEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_IAM_URL: string;
  RABBITMQ_EXCHANGE: string;
  RABBITMQ_PREFETCH: number;
};

export function validateGatewayEnvironment(
  config: Record<string, unknown>
): GatewayEnvironmentVariables {
  const parsed = gatewayEnvironmentSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      message: issue.message,
      path: issue.path.join('.') || 'env'
    }));

    throw new Error(`Invalid gateway environment variables: ${JSON.stringify(issues)}`);
  }

  return {
    ...parsed.data,
    HTTP_LOG_ENABLED:
      parsed.data.HTTP_LOG_ENABLED ?? true,
    LOG_LEVEL:
      parsed.data.LOG_LEVEL ??
      (parsed.data.NODE_ENV === 'production' ? 'info' : 'debug'),
    LOG_PRETTY:
      parsed.data.LOG_PRETTY ?? parsed.data.NODE_ENV !== 'production'
  };
}
