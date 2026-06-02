import { InfrastructureError } from '../errors/infrastructure-error';
import type {
    HealthCheckResult,
    HealthStatusResponse,
    ReadinessCheck
} from './health.types';

export class RuntimeHealthRegistry {
    private readonly readinessChecks: ReadinessCheck[] = [];
    private bootstrapReady = false;

    constructor(private readonly serviceName: string) {}

    markReady(): void {
        this.bootstrapReady = true;
    }

    markNotReady(): void {
        this.bootstrapReady = false;
    }

    registerReadinessCheck(check: ReadinessCheck): void {
        this.readinessChecks.push(check);
    }

    getLivenessStatus(): HealthStatusResponse {
        return {
            checks: [
                {
                    message: 'Process is alive',
                    name: 'process',
                    status: 'up'
                }
            ],
            service: this.serviceName,
            status: 'up',
            timestamp: new Date().toISOString()
        };
    }

    async getReadinessStatus(): Promise<HealthStatusResponse> {
        const checks: HealthCheckResult[] = [
            {
                message: this.bootstrapReady
                    ? 'Bootstrap completed'
                    : 'Bootstrap not completed',
                name: 'bootstrap',
                status: this.bootstrapReady ? 'up' : 'down'
            }
        ];

        for (const readinessCheck of this.readinessChecks) {
            try {
                const details = await readinessCheck.check();

                checks.push({
                    details,
                    name: readinessCheck.name,
                    status: 'up'
                });
            } catch (error) {
                checks.push({
                    details: error instanceof Error ? error.message : error,
                    name: readinessCheck.name,
                    status: 'down'
                });
            }
        }

        const status = checks.every((check) => check.status === 'up') ? 'up' : 'down';

        return {
            checks,
            service: this.serviceName,
            status,
            timestamp: new Date().toISOString()
        };
    }

    async getHealthStatus(): Promise<HealthStatusResponse> {
        return this.getReadinessStatus();
    }

    assertReady(): void {
        if (!this.bootstrapReady) {
            throw new InfrastructureError('Service bootstrap has not completed', {
                code: 'SERVICE_NOT_READY'
            });
        }
    }
}
