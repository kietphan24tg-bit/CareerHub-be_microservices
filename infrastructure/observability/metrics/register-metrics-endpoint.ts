import type { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { MetricsRegistry } from './metrics.types';

type MetricsEndpointOptions = {
    metricsPath?: string;
};

export function registerMetricsEndpoint(
    app: INestApplication,
    metricsRegistry: MetricsRegistry,
    options?: MetricsEndpointOptions
): void {
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance();
    const metricsPath = options?.metricsPath ?? '/metrics';

    instance.get(metricsPath, (_request: Request, response: Response) => {
        response.setHeader('Content-Type', 'text/plain; version=0.0.4');
        response.status(200).send(metricsRegistry.renderPrometheus());
    });
}
