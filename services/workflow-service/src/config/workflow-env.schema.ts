import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type WorkflowEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_CANDIDATE_URL: string;
  GRPC_EMPLOYER_URL: string;
  GRPC_IAM_URL: string;
  GRPC_WORKFLOW_URL: string;
  WORKFLOW_GRPC_DEADLINE_MS: number;
  WORKFLOW_RECOVERY_BATCH_SIZE: number;
  WORKFLOW_RECOVERY_ENABLED: boolean;
  WORKFLOW_RECOVERY_POLL_INTERVAL_MS: number;
  WORKFLOW_RECOVERY_STALE_AFTER_MS: number;
};

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return fallback;
}

function parsePositiveInteger(
  value: unknown,
  fallback: number,
  variableName: string
): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${variableName} must be a positive integer`);
  }

  return parsed;
}

export function validateWorkflowEnvironment(
  config: Record<string, unknown>
): WorkflowEnvironmentVariables {
  const baseEnvironment = validateEnvironment(config);
  const grpcWorkflowUrl =
    typeof config.GRPC_WORKFLOW_URL === 'string' &&
    config.GRPC_WORKFLOW_URL.trim().length > 0
      ? config.GRPC_WORKFLOW_URL.trim()
      : '0.0.0.0:50057';
  const grpcIamUrl =
    typeof config.GRPC_IAM_URL === 'string' &&
    config.GRPC_IAM_URL.trim().length > 0
      ? config.GRPC_IAM_URL.trim()
      : '127.0.0.1:50051';
  const grpcCandidateUrl =
    typeof config.GRPC_CANDIDATE_URL === 'string' &&
    config.GRPC_CANDIDATE_URL.trim().length > 0
      ? config.GRPC_CANDIDATE_URL.trim()
      : '127.0.0.1:50052';
  const grpcEmployerUrl =
    typeof config.GRPC_EMPLOYER_URL === 'string' &&
    config.GRPC_EMPLOYER_URL.trim().length > 0
      ? config.GRPC_EMPLOYER_URL.trim()
      : '127.0.0.1:50053';
  const workflowGrpcDeadlineMs = parsePositiveInteger(
    config.WORKFLOW_GRPC_DEADLINE_MS,
    5_000,
    'WORKFLOW_GRPC_DEADLINE_MS'
  );
  const workflowRecoveryBatchSize = parsePositiveInteger(
    config.WORKFLOW_RECOVERY_BATCH_SIZE,
    10,
    'WORKFLOW_RECOVERY_BATCH_SIZE'
  );
  const workflowRecoveryEnabled = parseBoolean(
    config.WORKFLOW_RECOVERY_ENABLED,
    true
  );
  const workflowRecoveryPollIntervalMs = parsePositiveInteger(
    config.WORKFLOW_RECOVERY_POLL_INTERVAL_MS,
    15_000,
    'WORKFLOW_RECOVERY_POLL_INTERVAL_MS'
  );
  const workflowRecoveryStaleAfterMs = parsePositiveInteger(
    config.WORKFLOW_RECOVERY_STALE_AFTER_MS,
    30_000,
    'WORKFLOW_RECOVERY_STALE_AFTER_MS'
  );

  return {
    ...baseEnvironment,
    GRPC_CANDIDATE_URL: grpcCandidateUrl,
    GRPC_EMPLOYER_URL: grpcEmployerUrl,
    GRPC_IAM_URL: grpcIamUrl,
    GRPC_WORKFLOW_URL: grpcWorkflowUrl,
    WORKFLOW_GRPC_DEADLINE_MS: workflowGrpcDeadlineMs,
    WORKFLOW_RECOVERY_BATCH_SIZE: workflowRecoveryBatchSize,
    WORKFLOW_RECOVERY_ENABLED: workflowRecoveryEnabled,
    WORKFLOW_RECOVERY_POLL_INTERVAL_MS: workflowRecoveryPollIntervalMs,
    WORKFLOW_RECOVERY_STALE_AFTER_MS: workflowRecoveryStaleAfterMs
  };
}
