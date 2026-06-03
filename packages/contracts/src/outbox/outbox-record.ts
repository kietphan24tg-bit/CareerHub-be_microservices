export type OutboxStatus = 'pending' | 'processed' | 'failed';

export type OutboxRecord<TPayload = Record<string, unknown>> = {
  eventName: string;
  id: string;
  occurredAt: string;
  payload: TPayload;
  processedAt?: string;
  retryCount: number;
  status: OutboxStatus;
};
