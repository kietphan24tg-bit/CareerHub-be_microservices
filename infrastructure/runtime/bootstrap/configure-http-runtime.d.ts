import type { INestApplication } from '@nestjs/common';
import type { ReadinessCheck } from '../../observability/health/health.types';
import { RuntimeHealthRegistry } from '../../observability/health/health.registry';
import { RuntimeLogger } from '../../observability/logging/runtime-logger';
import type { MetricsRegistry } from '../../observability/metrics/metrics.types';
import type { RuntimeConfig } from '../config/runtime-config';
type RuntimeEndpointPaths = {
    healthPath?: string;
    livenessPath?: string;
    metricsPath?: string;
    readinessPath?: string;
};
export type ConfigureHttpRuntimeOptions = {
    endpointPaths?: RuntimeEndpointPaths;
    healthRegistry?: RuntimeHealthRegistry;
    logger?: RuntimeLogger;
    metricsRegistry?: MetricsRegistry;
    readinessChecks?: ReadinessCheck[];
    runtimeConfig: RuntimeConfig;
};
export type HttpRuntimeFoundation = {
    healthRegistry: RuntimeHealthRegistry;
    logger: RuntimeLogger;
    metricsRegistry: MetricsRegistry;
    runtimeConfig: RuntimeConfig;
};
export declare function configureHttpRuntime(app: INestApplication, options: ConfigureHttpRuntimeOptions): HttpRuntimeFoundation;
export {};
