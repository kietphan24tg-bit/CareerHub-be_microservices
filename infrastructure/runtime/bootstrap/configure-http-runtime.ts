import type { INestApplication } from '@nestjs/common';
import { GlobalExceptionFilter } from '../http/global-exception.filter';
import { SuccessResponseInterceptor } from '../http/success-response.interceptor';
import { registerHealthEndpoints } from '../../observability/health/register-health-endpoints';
import type { ReadinessCheck } from '../../observability/health/health.types';
import { RuntimeHealthRegistry } from '../../observability/health/health.registry';
import { HttpLoggingInterceptor } from '../../observability/interceptors/http/http-logging.interceptor';
import { HttpTracingInterceptor } from '../../observability/interceptors/http/http-tracing.interceptor';
import { RuntimeLogger } from '../../observability/logging/runtime-logger';
import { InMemoryMetricsRegistry } from '../../observability/metrics/in-memory-metrics.registry';
import type { MetricsRegistry } from '../../observability/metrics/metrics.types';
import { registerMetricsEndpoint } from '../../observability/metrics/register-metrics-endpoint';
import { createRequestIdMiddleware } from '../request-context/request-id';
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
    const endpointPaths = {
        healthPath:
            options.endpointPaths?.healthPath ?? runtimeConfig.healthPath,
        livenessPath:
            options.endpointPaths?.livenessPath ??
            runtimeConfig.healthLivenessPath,
        metricsPath:
            options.endpointPaths?.metricsPath ?? runtimeConfig.metricsPath,
        readinessPath:
            options.endpointPaths?.readinessPath ??
            runtimeConfig.healthReadinessPath
    };
    const logger =
        options.logger ??
        new RuntimeLogger({
            filePath: runtimeConfig.logFilePath,
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
        new HttpTracingInterceptor(),
        new HttpLoggingInterceptor(logger, metricsRegistry, runtimeConfig),
        new SuccessResponseInterceptor()
    );

    if (runtimeConfig.healthEnabled) {
        registerHealthEndpoints(app, healthRegistry, {
            healthPath: endpointPaths.healthPath,
            livenessPath: endpointPaths.livenessPath,
            readinessPath: endpointPaths.readinessPath
        });
    }

    if (runtimeConfig.metricsEnabled) {
        registerMetricsEndpoint(app, metricsRegistry, {
            metricsPath: endpointPaths.metricsPath
        });
    }

    healthRegistry.markReady();
    logger.info('HTTP runtime configured', {
        context: 'configureHttpRuntime',
        details: {
            healthEnabled: runtimeConfig.healthEnabled,
            healthPath: endpointPaths.healthPath,
            livenessPath: endpointPaths.livenessPath,
            metricsEnabled: runtimeConfig.metricsEnabled,
            metricsPath: endpointPaths.metricsPath,
            readinessPath: endpointPaths.readinessPath,
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
