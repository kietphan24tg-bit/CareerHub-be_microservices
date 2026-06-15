export type OutboxStatus = 'pending' | 'processing' | 'processed' | 'failed';
export type OutboxRecord<TPayload = Record<string, unknown>> = {
    eventName: string;
    id: string;
    lastError?: string;
    nextRetryAt?: string;
    occurredAt: string;
    payload: TPayload;
    processingAt?: string;
    processedAt?: string;
    retryCount: number;
    status: OutboxStatus;
};
