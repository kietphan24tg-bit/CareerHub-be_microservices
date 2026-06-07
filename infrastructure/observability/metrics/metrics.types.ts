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

export interface MetricsRegistry {
    recordHttpError(record: HttpErrorMetricRecord): void;
    recordHttpRequest(record: HttpMetricRecord): void;
    recordRmqError(record: RmqMetricRecord): void;
    recordRmqRequest(record: RmqMetricRecord): void;
    recordRpcError(record: RpcMetricRecord): void;
    recordRpcRequest(record: RpcMetricRecord): void;
    renderPrometheus(): string;
}
