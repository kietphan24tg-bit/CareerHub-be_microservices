import { z } from 'zod';
import { InfrastructureError } from '../errors/infrastructure-error';

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
    DATABASE_URL: z.string().url().optional(),
    HTTP_LOG_ENABLED: booleanLikeSchema.optional(),
    LOG_LEVEL: runtimeLogLevelSchema.optional(),
    LOG_PRETTY: booleanLikeSchema.optional(),
    NODE_ENV: runtimeNodeEnvSchema.default('development'),
    PORT: z.coerce.number().int().positive().max(65535).default(3000),

    SERVICE_NAME: z.string().min(1, 'SERVICE_NAME is required.')
});

type RuntimeEnvironmentSchema = z.infer<typeof runtimeEnvironmentSchema>;

export type EnvironmentVariables = RuntimeEnvironmentSchema & {
    HTTP_LOG_ENABLED: boolean;
    LOG_LEVEL: z.infer<typeof runtimeLogLevelSchema>;
    LOG_PRETTY: boolean;
};

export function validateEnvironment(
    config: Record<string, unknown>
): EnvironmentVariables {
    const parsed = runtimeEnvironmentSchema.safeParse(config);

    if (parsed.success) {
        return {
            ...parsed.data,
            HTTP_LOG_ENABLED: parsed.data.HTTP_LOG_ENABLED ?? true,
            LOG_LEVEL:
                parsed.data.LOG_LEVEL ??
                (parsed.data.NODE_ENV === 'production' ? 'info' : 'debug'),
            LOG_PRETTY:
                parsed.data.LOG_PRETTY ?? parsed.data.NODE_ENV !== 'production'
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
