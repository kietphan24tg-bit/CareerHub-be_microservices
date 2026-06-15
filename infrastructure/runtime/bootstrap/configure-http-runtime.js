"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureHttpRuntime = configureHttpRuntime;
const global_exception_filter_1 = require("../http/global-exception.filter");
const success_response_interceptor_1 = require("../http/success-response.interceptor");
const register_health_endpoints_1 = require("../../observability/health/register-health-endpoints");
const health_registry_1 = require("../../observability/health/health.registry");
const http_logging_interceptor_1 = require("../../observability/interceptors/http/http-logging.interceptor");
const http_tracing_interceptor_1 = require("../../observability/interceptors/http/http-tracing.interceptor");
const runtime_logger_1 = require("../../observability/logging/runtime-logger");
const in_memory_metrics_registry_1 = require("../../observability/metrics/in-memory-metrics.registry");
const register_metrics_endpoint_1 = require("../../observability/metrics/register-metrics-endpoint");
const request_id_1 = require("../request-context/request-id");
const validation_pipe_factory_1 = require("../validation/validation-pipe.factory");
function configureHttpRuntime(app, options) {
    const runtimeConfig = options.runtimeConfig;
    const endpointPaths = {
        healthPath: options.endpointPaths?.healthPath ?? runtimeConfig.healthPath,
        livenessPath: options.endpointPaths?.livenessPath ??
            runtimeConfig.healthLivenessPath,
        metricsPath: options.endpointPaths?.metricsPath ?? runtimeConfig.metricsPath,
        readinessPath: options.endpointPaths?.readinessPath ??
            runtimeConfig.healthReadinessPath
    };
    const logger = options.logger ??
        new runtime_logger_1.RuntimeLogger({
            filePath: runtimeConfig.logFilePath,
            level: runtimeConfig.logLevel,
            pretty: runtimeConfig.logPretty,
            serviceName: runtimeConfig.serviceName
        });
    const metricsRegistry = options.metricsRegistry ?? new in_memory_metrics_registry_1.InMemoryMetricsRegistry();
    const healthRegistry = options.healthRegistry ??
        new health_registry_1.RuntimeHealthRegistry(runtimeConfig.serviceName);
    for (const readinessCheck of options.readinessChecks ?? []) {
        healthRegistry.registerReadinessCheck(readinessCheck);
    }
    app.useLogger(logger);
    app.use((0, request_id_1.createRequestIdMiddleware)());
    app.useGlobalPipes((0, validation_pipe_factory_1.createValidationPipe)());
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    app.useGlobalInterceptors(new http_tracing_interceptor_1.HttpTracingInterceptor(), new http_logging_interceptor_1.HttpLoggingInterceptor(logger, metricsRegistry, runtimeConfig), new success_response_interceptor_1.SuccessResponseInterceptor());
    if (runtimeConfig.healthEnabled) {
        (0, register_health_endpoints_1.registerHealthEndpoints)(app, healthRegistry, {
            healthPath: endpointPaths.healthPath,
            livenessPath: endpointPaths.livenessPath,
            readinessPath: endpointPaths.readinessPath
        });
    }
    if (runtimeConfig.metricsEnabled) {
        (0, register_metrics_endpoint_1.registerMetricsEndpoint)(app, metricsRegistry, {
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
