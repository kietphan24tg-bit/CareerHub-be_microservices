import type { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RuntimeHealthRegistry } from './health.registry';

type HealthEndpointOptions = {
    healthPath?: string;
    livenessPath?: string;
    readinessPath?: string;
};

export function registerHealthEndpoints(
    app: INestApplication,
    healthRegistry: RuntimeHealthRegistry,
    options?: HealthEndpointOptions
): void {
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance();
    const healthPath = options?.healthPath ?? '/health';
    const livenessPath = options?.livenessPath ?? '/health/live';
    const readinessPath = options?.readinessPath ?? '/health/ready';

    instance.get(livenessPath, (_request: Request, response: Response) => {
        response.status(200).json(healthRegistry.getLivenessStatus());
    });

    instance.get(readinessPath, async (_request: Request, response: Response) => {
        const readiness = await healthRegistry.getReadinessStatus();
        response.status(readiness.status === 'up' ? 200 : 503).json(readiness);
    });

    instance.get(healthPath, async (_request: Request, response: Response) => {
        const health = await healthRegistry.getHealthStatus();
        response.status(health.status === 'up' ? 200 : 503).json(health);
    });
}
