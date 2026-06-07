import type { ConfigService } from '@nestjs/config';
import { InfrastructureError } from '../../errors/infrastructure-error';
import type { EnvironmentVariables } from '../config/env.schema';
import type { DatabaseRuntimeConfig } from './database.types';

function assertDatabaseUrl(databaseUrl: string | undefined): string {
    if (!databaseUrl?.trim()) {
        throw new InfrastructureError('DATABASE_URL is required', {
            code: 'INVALID_DATABASE_CONFIGURATION'
        });
    }

    return databaseUrl;
}

export function createDatabaseRuntimeConfig(
    env: NodeJS.ProcessEnv = process.env
): DatabaseRuntimeConfig {
    return {
        databaseUrl: assertDatabaseUrl(env.DATABASE_URL)
    };
}

export function getDatabaseRuntimeConfig(
    configService: Pick<
        ConfigService<EnvironmentVariables, true>,
        'get' | 'getOrThrow'
    >
): DatabaseRuntimeConfig {
    return {
        databaseUrl: assertDatabaseUrl(configService.get('DATABASE_URL'))
    };
}
