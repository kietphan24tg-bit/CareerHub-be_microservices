export type HealthCheckResult = {
    details?: unknown;
    message?: string;
    name: string;
    status: 'down' | 'up';
};
export type HealthStatusResponse = {
    checks: HealthCheckResult[];
    service: string;
    status: 'down' | 'up';
    timestamp: string;
};
export type ReadinessCheck = {
    check: () => Promise<unknown> | unknown;
    name: string;
};
