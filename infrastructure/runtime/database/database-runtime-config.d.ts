import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.schema';
import type { DatabaseRuntimeConfig } from './database.types';
export declare function createDatabaseRuntimeConfig(env?: NodeJS.ProcessEnv): DatabaseRuntimeConfig;
export declare function getDatabaseRuntimeConfig(configService: Pick<ConfigService<EnvironmentVariables, true>, 'get' | 'getOrThrow'>): DatabaseRuntimeConfig;
