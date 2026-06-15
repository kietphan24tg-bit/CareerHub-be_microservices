import type { INestApplication } from '@nestjs/common';
import type { MetricsRegistry } from './metrics.types';
type MetricsEndpointOptions = {
    metricsPath?: string;
};
export declare function registerMetricsEndpoint(app: INestApplication, metricsRegistry: MetricsRegistry, options?: MetricsEndpointOptions): void;
export {};
