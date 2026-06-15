import { z } from 'zod';
export declare const runtimeNodeEnvSchema: z.ZodEnum<{
    development: "development";
    test: "test";
    production: "production";
}>;
export declare const runtimeLogLevelSchema: z.ZodEnum<{
    debug: "debug";
    info: "info";
    warn: "warn";
    error: "error";
}>;
export declare const runtimeEnvironmentSchema: z.ZodObject<{
    BROKER_URL: z.ZodOptional<z.ZodString>;
    BROKER_QUEUE_PREFIX: z.ZodOptional<z.ZodString>;
    BROKER_EXCHANGE_PREFIX: z.ZodOptional<z.ZodString>;
    BROKER_PREFETCH_COUNT: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    BROKER_DURABLE: z.ZodOptional<z.ZodPreprocess<z.ZodBoolean>>;
    BROKER_DEAD_LETTER_ENABLED: z.ZodOptional<z.ZodPreprocess<z.ZodBoolean>>;
    BROKER_DEAD_LETTER_PREFIX: z.ZodOptional<z.ZodString>;
    DATABASE_URL: z.ZodOptional<z.ZodString>;
    HEALTH_ENABLED: z.ZodOptional<z.ZodPreprocess<z.ZodBoolean>>;
    HEALTH_LIVENESS_PATH: z.ZodOptional<z.ZodString>;
    HEALTH_PATH: z.ZodOptional<z.ZodString>;
    HEALTH_READINESS_PATH: z.ZodOptional<z.ZodString>;
    HTTP_LOG_ENABLED: z.ZodOptional<z.ZodPreprocess<z.ZodBoolean>>;
    LOG_FILE_PATH: z.ZodOptional<z.ZodString>;
    LOG_LEVEL: z.ZodOptional<z.ZodEnum<{
        debug: "debug";
        info: "info";
        warn: "warn";
        error: "error";
    }>>;
    LOG_PRETTY: z.ZodOptional<z.ZodPreprocess<z.ZodBoolean>>;
    METRICS_ENABLED: z.ZodOptional<z.ZodPreprocess<z.ZodBoolean>>;
    METRICS_PATH: z.ZodOptional<z.ZodString>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        test: "test";
        production: "production";
    }>>;
    OTEL_ENABLED: z.ZodOptional<z.ZodPreprocess<z.ZodBoolean>>;
    OTEL_EXPORTER_OTLP_ENDPOINT: z.ZodOptional<z.ZodString>;
    OTEL_EXPORTER_OTLP_PROTOCOL: z.ZodOptional<z.ZodEnum<{
        "http/protobuf": "http/protobuf";
    }>>;
    OTEL_SERVICE_NAME: z.ZodOptional<z.ZodString>;
    OTEL_TRACES_SAMPLER: z.ZodOptional<z.ZodEnum<{
        always_off: "always_off";
        always_on: "always_on";
        parentbased_always_on: "parentbased_always_on";
        traceidratio: "traceidratio";
    }>>;
    OTEL_TRACES_SAMPLER_ARG: z.ZodOptional<z.ZodString>;
    PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    SERVICE_NAME: z.ZodString;
}, z.core.$strip>;
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
export declare function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables;
export {};
