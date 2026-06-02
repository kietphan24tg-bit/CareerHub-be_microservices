import { ConfigModule, type ConfigModuleOptions, type ConfigService } from '@nestjs/config';
import {
    validateEnvironment,
    type EnvironmentVariables
} from './env.schema';

export type RuntimeNodeEnv = EnvironmentVariables['NODE_ENV'];
export type RuntimeLogLevel = EnvironmentVariables['LOG_LEVEL'];

export type RuntimeConfig = {
    brokerUrl?: string;
    databaseUrl?: string;
    httpLogEnabled: boolean;
    logLevel: RuntimeLogLevel;
    logPretty: boolean;
    nodeEnv: RuntimeNodeEnv;
    port: number;
    redisUrl?: string;
    serviceName: string;
};

type RuntimeConfigModuleOptions = Omit<ConfigModuleOptions, 'validate'>;

function mapEnvironmentToRuntimeConfig(
    environment: EnvironmentVariables
): RuntimeConfig {
    return {
        brokerUrl: environment.BROKER_URL,
        databaseUrl: environment.DATABASE_URL,
        httpLogEnabled: environment.HTTP_LOG_ENABLED,
        logLevel: environment.LOG_LEVEL,
        logPretty: environment.LOG_PRETTY,
        nodeEnv: environment.NODE_ENV,
        port: environment.PORT,
        redisUrl: environment.REDIS_URL,
        serviceName: environment.SERVICE_NAME
    };
}

export function createRuntimeConfigModule(
    options?: RuntimeConfigModuleOptions
): ReturnType<typeof ConfigModule.forRoot> {
    return ConfigModule.forRoot({
        cache: true,
        expandVariables: true,
        isGlobal: true,
        ...options,
        validate: validateEnvironment
    });
}

export function loadRuntimeConfig(
    env: NodeJS.ProcessEnv = process.env
): RuntimeConfig {
    return mapEnvironmentToRuntimeConfig(validateEnvironment(env));
}

export function getRuntimeConfig(
    configService: Pick<
        ConfigService<EnvironmentVariables, true>,
        'get' | 'getOrThrow'
    >
): RuntimeConfig {
    return {
        brokerUrl: configService.get('BROKER_URL'),
        databaseUrl: configService.get('DATABASE_URL'),
        httpLogEnabled: configService.getOrThrow('HTTP_LOG_ENABLED'),
        logLevel: configService.getOrThrow('LOG_LEVEL'),
        logPretty: configService.getOrThrow('LOG_PRETTY'),
        nodeEnv: configService.getOrThrow('NODE_ENV'),
        port: configService.getOrThrow('PORT'),
        redisUrl: configService.get('REDIS_URL'),
        serviceName: configService.getOrThrow('SERVICE_NAME')
    };
}

export const createRuntimeConfig = loadRuntimeConfig;
