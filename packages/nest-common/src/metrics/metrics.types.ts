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
    pattern: string;
    status: 'error' | 'success';
};

export interface MetricsRegistry {
    recordHttpError(record: HttpErrorMetricRecord): void;
    recordHttpRequest(record: HttpMetricRecord): void;
    recordRpcRequest(record: RpcMetricRecord): void;
    renderPrometheus(): string;
}
