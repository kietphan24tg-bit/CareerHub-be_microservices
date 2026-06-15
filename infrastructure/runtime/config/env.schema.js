"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtimeEnvironmentSchema = exports.runtimeLogLevelSchema = exports.runtimeNodeEnvSchema = void 0;
exports.validateEnvironment = validateEnvironment;
const zod_1 = require("zod");
const infrastructure_error_1 = require("../../errors/infrastructure-error");
const booleanLikeSchema = zod_1.z.preprocess(value => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalized)) {
            return true;
        }
        if (['0', 'false', 'no', 'off'].includes(normalized)) {
            return false;
        }
    }
    return value;
}, zod_1.z.boolean());
exports.runtimeNodeEnvSchema = zod_1.z.enum([
    'development',
    'test',
    'production'
]);
exports.runtimeLogLevelSchema = zod_1.z.enum(['debug', 'info', 'warn', 'error']);
exports.runtimeEnvironmentSchema = zod_1.z.object({
    BROKER_URL: zod_1.z.string().url().optional(),
    BROKER_QUEUE_PREFIX: zod_1.z.string().optional(),
    BROKER_EXCHANGE_PREFIX: zod_1.z.string().optional(),
    BROKER_PREFETCH_COUNT: zod_1.z.coerce.number().int().positive().optional(),
    BROKER_DURABLE: booleanLikeSchema.optional(),
    BROKER_DEAD_LETTER_ENABLED: booleanLikeSchema.optional(),
    BROKER_DEAD_LETTER_PREFIX: zod_1.z.string().optional(),
    DATABASE_URL: zod_1.z.string().url().optional(),
    HEALTH_ENABLED: booleanLikeSchema.optional(),
    HEALTH_LIVENESS_PATH: zod_1.z.string().min(1).optional(),
    HEALTH_PATH: zod_1.z.string().min(1).optional(),
    HEALTH_READINESS_PATH: zod_1.z.string().min(1).optional(),
    HTTP_LOG_ENABLED: booleanLikeSchema.optional(),
    LOG_FILE_PATH: zod_1.z.string().optional(),
    LOG_LEVEL: exports.runtimeLogLevelSchema.optional(),
    LOG_PRETTY: booleanLikeSchema.optional(),
    METRICS_ENABLED: booleanLikeSchema.optional(),
    METRICS_PATH: zod_1.z.string().min(1).optional(),
    NODE_ENV: exports.runtimeNodeEnvSchema.default('development'),
    OTEL_ENABLED: booleanLikeSchema.optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: zod_1.z.string().url().optional(),
    OTEL_EXPORTER_OTLP_PROTOCOL: zod_1.z.enum(['http/protobuf']).optional(),
    OTEL_SERVICE_NAME: zod_1.z.string().min(1).optional(),
    OTEL_TRACES_SAMPLER: zod_1.z
        .enum(['always_off', 'always_on', 'parentbased_always_on', 'traceidratio'])
        .optional(),
    OTEL_TRACES_SAMPLER_ARG: zod_1.z.string().optional(),
    PORT: zod_1.z.coerce.number().int().positive().max(65535).default(3000),
    REDIS_URL: zod_1.z.string().url().optional(),
    SERVICE_NAME: zod_1.z.string().min(1, 'SERVICE_NAME is required.')
});
function validateEnvironment(config) {
    const parsed = exports.runtimeEnvironmentSchema.safeParse(config);
    if (parsed.success) {
        return {
            ...parsed.data,
            BROKER_DEAD_LETTER_ENABLED: parsed.data.BROKER_DEAD_LETTER_ENABLED ?? true,
            BROKER_DEAD_LETTER_PREFIX: parsed.data.BROKER_DEAD_LETTER_PREFIX?.trim() || 'dlq',
            BROKER_DURABLE: parsed.data.BROKER_DURABLE ?? true,
            BROKER_EXCHANGE_PREFIX: parsed.data.BROKER_EXCHANGE_PREFIX?.trim() || '',
            BROKER_PREFETCH_COUNT: parsed.data.BROKER_PREFETCH_COUNT ?? 10,
            BROKER_QUEUE_PREFIX: parsed.data.BROKER_QUEUE_PREFIX?.trim() || '',
            HEALTH_ENABLED: parsed.data.HEALTH_ENABLED ?? true,
            HEALTH_LIVENESS_PATH: parsed.data.HEALTH_LIVENESS_PATH?.trim() || '/health/live',
            HEALTH_PATH: parsed.data.HEALTH_PATH?.trim() || '/health',
            HEALTH_READINESS_PATH: parsed.data.HEALTH_READINESS_PATH?.trim() || '/health/ready',
            HTTP_LOG_ENABLED: parsed.data.HTTP_LOG_ENABLED ?? true,
            LOG_LEVEL: parsed.data.LOG_LEVEL ??
                (parsed.data.NODE_ENV === 'production' ? 'info' : 'debug'),
            OTEL_ENABLED: parsed.data.OTEL_ENABLED ?? true,
            LOG_PRETTY: parsed.data.LOG_PRETTY ?? parsed.data.NODE_ENV !== 'production',
            METRICS_ENABLED: parsed.data.METRICS_ENABLED ?? true,
            METRICS_PATH: parsed.data.METRICS_PATH?.trim() || '/metrics'
        };
    }
    const issues = parsed.error.issues.map(issue => ({
        message: issue.message,
        path: issue.path.join('.') || 'env'
    }));
    throw new infrastructure_error_1.InfrastructureError('Invalid environment variables', {
        code: 'INVALID_CONFIGURATION',
        details: issues
    });
}
