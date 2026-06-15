import type { HealthStatusResponse, ReadinessCheck } from './health.types';
export declare class RuntimeHealthRegistry {
    private readonly serviceName;
    private readonly readinessChecks;
    private bootstrapReady;
    constructor(serviceName: string);
    markReady(): void;
    markNotReady(): void;
    registerReadinessCheck(check: ReadinessCheck): void;
    getLivenessStatus(): HealthStatusResponse;
    getReadinessStatus(): Promise<HealthStatusResponse>;
    getHealthStatus(): Promise<HealthStatusResponse>;
    assertReady(): void;
}
