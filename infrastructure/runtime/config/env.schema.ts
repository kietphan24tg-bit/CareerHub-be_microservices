import { z } from 'zod';
import { InfrastructureError } from '../../errors/infrastructure-error';

const booleanLikeSchema = z.preprocess(value => {
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
}, z.boolean());

export const runtimeNodeEnvSchema = z.enum([
    'development',
    'test',
    'production'
]);
export const runtimeLogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

export const runtimeEnvironmentSchema = z.object({
    BROKER_URL: z.string().url().optional().superRefine((url, ctx) => {
        if (url && process.env.NODE_ENV === 'production' && !url.startsWith('amqps://')) {
            ctx.addIssue({
                code: 'custom',
                message: 'BROKER_URL must use amqps:// in production'
            });
        }
    }),
    BROKER_QUEUE_PREFIX: z.string().optional(),
    BROKER_EXCHANGE_PREFIX: z.string().optional(),
    BROKER_PREFETCH_COUNT: z.coerce.number().int().positive().optional(),
    BROKER_DURABLE: booleanLikeSchema.optional(),
    BROKER_DEAD_LETTER_ENABLED: booleanLikeSchema.optional(),
    BROKER_DEAD_LETTER_PREFIX: z.string().optional(),
    DATABASE_URL: z.string().url().optional(),
    HEALTH_ENABLED: booleanLikeSchema.optional(),
    HEALTH_LIVENESS_PATH: z.string().min(1).optional(),
    HEALTH_PATH: z.string().min(1).optional(),
    HEALTH_READINESS_PATH: z.string().min(1).optional(),
    HTTP_LOG_ENABLED: booleanLikeSchema.optional(),
    LOG_FILE_PATH: z.string().optional(),
    LOG_LEVEL: runtimeLogLevelSchema.optional(),
    LOG_PRETTY: booleanLikeSchema.optional(),
    METRICS_ENABLED: booleanLikeSchema.optional(),
    METRICS_PATH: z.string().min(1).optional(),
    NODE_ENV: runtimeNodeEnvSchema.default('development'),
    OTEL_ENABLED: booleanLikeSchema.optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    OTEL_EXPORTER_OTLP_PROTOCOL: z.enum(['http/protobuf']).optional(),
    OTEL_SERVICE_NAME: z.string().min(1).optional(),
    OTEL_TRACES_SAMPLER: z
        .enum(['always_off', 'always_on', 'parentbased_always_on', 'traceidratio'])
        .optional(),
    OTEL_TRACES_SAMPLER_ARG: z.string().optional(),
    PORT: z.coerce.number().int().positive().max(65535).default(3000),
    REDIS_URL: z.string().url().optional(),
    SERVICE_NAME: z.string().min(1, 'SERVICE_NAME is required.')
});

type RuntimeEnvironmentSchema = z.infer<typeof runtimeEnvironmentSchema>;

export type EnvironmentVariables = RuntimeEnvironmentSchema & {
    BROKER_DEAD_LETTER_ENABLED: boolean;
    BROKER_DURABLE: boolean;
    BROKER_PREFETCH_COUNT: number;
    BROKER_EXCHANGE_PREFIX: string;
    BROKER_QUEUE_PREFIX: string;
    BROKER_DEAD_LETTER_PREFIX: string;
    HEALTH_ENABLED: boolean;
    HEALTH_LIVENESS_PATH: string;
    HEALTH_PATH: string;
    HEALTH_READINESS_PATH: string;
    HTTP_LOG_ENABLED: boolean;
    LOG_LEVEL: z.infer<typeof runtimeLogLevelSchema>;
    LOG_PRETTY: boolean;
    METRICS_ENABLED: boolean;
    METRICS_PATH: string;
    OTEL_ENABLED: boolean;
};

export function validateEnvironment(
    config: Record<string, unknown>
): EnvironmentVariables {
    const parsed = runtimeEnvironmentSchema.safeParse(config);

    if (parsed.success) {
        return {
            ...parsed.data,
            BROKER_DEAD_LETTER_ENABLED:
                parsed.data.BROKER_DEAD_LETTER_ENABLED ?? true,
            BROKER_DEAD_LETTER_PREFIX:
                parsed.data.BROKER_DEAD_LETTER_PREFIX?.trim() || 'dlq',
            BROKER_DURABLE: parsed.data.BROKER_DURABLE ?? true,
            BROKER_EXCHANGE_PREFIX:
                parsed.data.BROKER_EXCHANGE_PREFIX?.trim() || '',
            BROKER_PREFETCH_COUNT: parsed.data.BROKER_PREFETCH_COUNT ?? 10,
            BROKER_QUEUE_PREFIX: parsed.data.BROKER_QUEUE_PREFIX?.trim() || '',
            HEALTH_ENABLED: parsed.data.HEALTH_ENABLED ?? true,
            HEALTH_LIVENESS_PATH:
                parsed.data.HEALTH_LIVENESS_PATH?.trim() || '/health/live',
            HEALTH_PATH: parsed.data.HEALTH_PATH?.trim() || '/health',
            HEALTH_READINESS_PATH:
                parsed.data.HEALTH_READINESS_PATH?.trim() || '/health/ready',
            HTTP_LOG_ENABLED: parsed.data.HTTP_LOG_ENABLED ?? true,
            LOG_LEVEL:
                parsed.data.LOG_LEVEL ??
                (parsed.data.NODE_ENV === 'production' ? 'info' : 'debug'),
            OTEL_ENABLED: parsed.data.OTEL_ENABLED ?? true,
            LOG_PRETTY:
                parsed.data.LOG_PRETTY ?? parsed.data.NODE_ENV !== 'production',
            METRICS_ENABLED: parsed.data.METRICS_ENABLED ?? true,
            METRICS_PATH: parsed.data.METRICS_PATH?.trim() || '/metrics'
        };
    }

    const issues = parsed.error.issues.map(issue => ({
        message: issue.message,
        path: issue.path.join('.') || 'env'
    }));

    throw new InfrastructureError('Invalid environment variables', {
        code: 'INVALID_CONFIGURATION',
        details: issues
    });
}
