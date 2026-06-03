export type IntegrationEvent<TPayload = Record<string, unknown>> = {
  name: string;
  occurredAt: string;
  payload: TPayload;
  requestId?: string;
  version: 1;
};
