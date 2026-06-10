export type HttpMetricRecord = {
    durationMs: number;
    method: string;
    route: string;
    statusCode: number;
};

export type HttpErrorMetricRecord = {
    method: string;
    route: string;
    statusCode: number;
};

export type RpcMetricRecord = {
    durationMs: number;
    pattern: string;
    status: 'error' | 'success';
};

export type RmqMetricRecord = {
    durationMs: number;
    exchange?: string;
    pattern: string;
    queue?: string;
    routingKey?: string;
    service?: string;
    status: 'error' | 'success';
};

export type OutboxPublishMetricRecord = {
    eventName?: string;
    service: string;
    status: 'error' | 'success';
};

export type OutboxCleanupMetricRecord = {
    deletedCount: number;
    service: string;
};

export type OutboxBacklogMetricRecord = {
  failed: number;
  oldestPendingAgeSeconds?: number;
  pending: number;
  processing: number;
  service: string;
};

export type IntegrationConsumerMetricRecord = {
  consumer: string;
  eventName: string;
  reason?: string;
  service: string;
  status: 'duplicate' | 'error' | 'processed';
};

export type IntegrationConsumerDurationMetricRecord = {
  consumer: string;
  durationMs: number;
  eventName: string;
  reason?: string;
  service: string;
  status: 'duplicate' | 'error' | 'processed';
};

export type RegisterCompensationMetricRecord = {
  action:
    | 'cancel_pending_identity'
    | 'delete_profile'
    | 'skip_already_active'
    | 'skip_profile_exists';
  flow: 'candidate' | 'employer';
  reason: 'activation_failed' | 'profile_creation_failed';
  service: string;
  status: 'failed' | 'performed' | 'skipped';
};

export interface MetricsRegistry {
    recordHttpError(record: HttpErrorMetricRecord): void;
    recordHttpRequest(record: HttpMetricRecord): void;
    recordIntegrationConsumer(record: IntegrationConsumerMetricRecord): void;
    recordIntegrationConsumerDuration?(record: IntegrationConsumerDurationMetricRecord): void;
    recordOutboxBacklog(record: OutboxBacklogMetricRecord): void;
    recordOutboxCleanup(record: OutboxCleanupMetricRecord): void;
    recordOutboxPublish(record: OutboxPublishMetricRecord): void;
    recordRegisterCompensation?(record: RegisterCompensationMetricRecord): void;
    recordRmqError(record: RmqMetricRecord): void;
    recordRmqRequest(record: RmqMetricRecord): void;
    recordRpcError(record: RpcMetricRecord): void;
    recordRpcRequest(record: RpcMetricRecord): void;
    renderPrometheus(): string;
}
