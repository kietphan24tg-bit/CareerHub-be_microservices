"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRuntimeConfig = void 0;
exports.createRuntimeConfigModule = createRuntimeConfigModule;
exports.loadRuntimeConfig = loadRuntimeConfig;
exports.getRuntimeConfig = getRuntimeConfig;
const config_1 = require("@nestjs/config");
const env_schema_1 = require("./env.schema");
function mapEnvironmentToRuntimeConfig(environment) {
    return {
        brokerDeadLetterEnabled: environment.BROKER_DEAD_LETTER_ENABLED,
        brokerDeadLetterPrefix: environment.BROKER_DEAD_LETTER_PREFIX,
        brokerDurable: environment.BROKER_DURABLE,
        brokerExchangePrefix: environment.BROKER_EXCHANGE_PREFIX,
        brokerPrefetchCount: environment.BROKER_PREFETCH_COUNT,
        brokerQueuePrefix: environment.BROKER_QUEUE_PREFIX,
        brokerUrl: environment.BROKER_URL,
        databaseUrl: environment.DATABASE_URL,
        healthEnabled: environment.HEALTH_ENABLED,
        healthLivenessPath: environment.HEALTH_LIVENESS_PATH,
        healthPath: environment.HEALTH_PATH,
        healthReadinessPath: environment.HEALTH_READINESS_PATH,
        httpLogEnabled: environment.HTTP_LOG_ENABLED,
        logFilePath: environment.LOG_FILE_PATH,
        logLevel: environment.LOG_LEVEL,
        logPretty: environment.LOG_PRETTY,
        metricsEnabled: environment.METRICS_ENABLED,
        metricsPath: environment.METRICS_PATH,
        nodeEnv: environment.NODE_ENV,
        otelEnabled: environment.OTEL_ENABLED,
        otelExporterOtlpEndpoint: environment.OTEL_EXPORTER_OTLP_ENDPOINT,
        otelExporterOtlpProtocol: environment.OTEL_EXPORTER_OTLP_PROTOCOL,
        otelServiceName: environment.OTEL_SERVICE_NAME,
        otelTracesSampler: environment.OTEL_TRACES_SAMPLER,
        otelTracesSamplerArg: environment.OTEL_TRACES_SAMPLER_ARG,
        port: environment.PORT,
        redisUrl: environment.REDIS_URL,
        serviceName: environment.SERVICE_NAME
    };
}
function createRuntimeConfigModule(options) {
    return config_1.ConfigModule.forRoot({
        cache: true,
        expandVariables: true,
        isGlobal: true,
        ...options,
        validate: options?.validate ?? env_schema_1.validateEnvironment
    });
}
function loadRuntimeConfig(env = process.env) {
    return mapEnvironmentToRuntimeConfig((0, env_schema_1.validateEnvironment)(env));
}
function getRuntimeConfig(configService) {
    return {
        brokerDeadLetterEnabled: configService.getOrThrow('BROKER_DEAD_LETTER_ENABLED'),
        brokerDeadLetterPrefix: configService.getOrThrow('BROKER_DEAD_LETTER_PREFIX'),
        brokerDurable: configService.getOrThrow('BROKER_DURABLE'),
        brokerExchangePrefix: configService.getOrThrow('BROKER_EXCHANGE_PREFIX'),
        brokerPrefetchCount: configService.getOrThrow('BROKER_PREFETCH_COUNT'),
        brokerQueuePrefix: configService.getOrThrow('BROKER_QUEUE_PREFIX'),
        brokerUrl: configService.get('BROKER_URL'),
        databaseUrl: configService.get('DATABASE_URL'),
        healthEnabled: configService.getOrThrow('HEALTH_ENABLED'),
        healthLivenessPath: configService.getOrThrow('HEALTH_LIVENESS_PATH'),
        healthPath: configService.getOrThrow('HEALTH_PATH'),
        healthReadinessPath: configService.getOrThrow('HEALTH_READINESS_PATH'),
        httpLogEnabled: configService.getOrThrow('HTTP_LOG_ENABLED'),
        logFilePath: configService.get('LOG_FILE_PATH'),
        logLevel: configService.getOrThrow('LOG_LEVEL'),
        logPretty: configService.getOrThrow('LOG_PRETTY'),
        metricsEnabled: configService.getOrThrow('METRICS_ENABLED'),
        metricsPath: configService.getOrThrow('METRICS_PATH'),
        nodeEnv: configService.getOrThrow('NODE_ENV'),
        otelEnabled: configService.getOrThrow('OTEL_ENABLED'),
        otelExporterOtlpEndpoint: configService.get('OTEL_EXPORTER_OTLP_ENDPOINT'),
        otelExporterOtlpProtocol: configService.get('OTEL_EXPORTER_OTLP_PROTOCOL'),
        otelServiceName: configService.get('OTEL_SERVICE_NAME'),
        otelTracesSampler: configService.get('OTEL_TRACES_SAMPLER'),
        otelTracesSamplerArg: configService.get('OTEL_TRACES_SAMPLER_ARG'),
        port: configService.getOrThrow('PORT'),
        redisUrl: configService.get('REDIS_URL'),
        serviceName: configService.getOrThrow('SERVICE_NAME')
    };
}
exports.createRuntimeConfig = loadRuntimeConfig;
