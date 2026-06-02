import type { INestApplication } from '@nestjs/common';
import { GlobalExceptionFilter } from '../http/global-exception.filter';
import { SuccessResponseInterceptor } from '../http/success-response.interceptor';
import { registerHealthEndpoints } from '../health/register-health-endpoints';
import type { ReadinessCheck } from '../health/health.types';
import { RuntimeHealthRegistry } from '../health/health.registry';
import { HttpLoggingInterceptor } from '../logging/http-logging.interceptor';
import { RuntimeLogger } from '../logging/runtime-logger';
import { InMemoryMetricsRegistry } from '../metrics/in-memory-metrics.registry';
import type { MetricsRegistry } from '../metrics/metrics.types';
import { registerMetricsEndpoint } from '../metrics/register-metrics-endpoint';
import { createRequestIdMiddleware } from '../request/request-id';
import { createValidationPipe } from '../validation/validation-pipe.factory';
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

export function configureHttpRuntime(
    app: INestApplication,
    options: ConfigureHttpRuntimeOptions
): HttpRuntimeFoundation {
    const runtimeConfig = options.runtimeConfig;
    const logger =
        options.logger ??
        new RuntimeLogger({
            level: runtimeConfig.logLevel,
            pretty: runtimeConfig.logPretty,
            serviceName: runtimeConfig.serviceName
        });
    const metricsRegistry =
        options.metricsRegistry ?? new InMemoryMetricsRegistry();
    const healthRegistry =
        options.healthRegistry ??
        new RuntimeHealthRegistry(runtimeConfig.serviceName);

    for (const readinessCheck of options.readinessChecks ?? []) {
        healthRegistry.registerReadinessCheck(readinessCheck);
    }

    app.useLogger(logger);
    app.use(createRequestIdMiddleware());
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(
        new HttpLoggingInterceptor(logger, metricsRegistry, runtimeConfig),
        new SuccessResponseInterceptor()
    );

    registerHealthEndpoints(app, healthRegistry, {
        healthPath: options.endpointPaths?.healthPath,
        livenessPath: options.endpointPaths?.livenessPath,
        readinessPath: options.endpointPaths?.readinessPath
    });
    registerMetricsEndpoint(app, metricsRegistry, {
        metricsPath: options.endpointPaths?.metricsPath
    });

    healthRegistry.markReady();
    logger.info('HTTP runtime configured', {
        context: 'configureHttpRuntime',
        details: {
            metricsPath: options.endpointPaths?.metricsPath ?? '/metrics',
            serviceName: runtimeConfig.serviceName
        }
    });

    return {
        healthRegistry,
        logger,
        metricsRegistry,
        runtimeConfig
    };
}
