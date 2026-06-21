import type { ConfigService } from '@nestjs/config';
import type { WorkflowEnvironmentVariables } from './workflow-env.schema';

export type WorkflowRuntimeConfig = {
  grpcCandidateUrl: string;
  grpcDeadlineMs: number;
  grpcEmployerUrl: string;
  grpcIamUrl: string;
  grpcWorkflowUrl: string;
  registrationSagaRecoveryBatchSize: number;
  registrationSagaRecoveryEnabled: boolean;
  registrationSagaRecoveryPollIntervalMs: number;
  registrationSagaRecoveryStaleAfterMs: number;
};

export function getWorkflowRuntimeConfig(
  configService: Pick<
    ConfigService<WorkflowEnvironmentVariables, true>,
    'getOrThrow'
  >
): WorkflowRuntimeConfig {
  return {
    grpcCandidateUrl: configService.getOrThrow('GRPC_CANDIDATE_URL'),
    grpcDeadlineMs: configService.getOrThrow('WORKFLOW_GRPC_DEADLINE_MS'),
    grpcEmployerUrl: configService.getOrThrow('GRPC_EMPLOYER_URL'),
    grpcIamUrl: configService.getOrThrow('GRPC_IAM_URL'),
    grpcWorkflowUrl: configService.getOrThrow('GRPC_WORKFLOW_URL'),
    registrationSagaRecoveryBatchSize: configService.getOrThrow(
      'WORKFLOW_RECOVERY_BATCH_SIZE'
    ),
    registrationSagaRecoveryEnabled: configService.getOrThrow(
      'WORKFLOW_RECOVERY_ENABLED'
    ),
    registrationSagaRecoveryPollIntervalMs: configService.getOrThrow(
      'WORKFLOW_RECOVERY_POLL_INTERVAL_MS'
    ),
    registrationSagaRecoveryStaleAfterMs: configService.getOrThrow(
      'WORKFLOW_RECOVERY_STALE_AFTER_MS'
    )
  };
}
