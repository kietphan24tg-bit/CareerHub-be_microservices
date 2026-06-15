import type { PrismaReadinessTarget, PrismaReadinessCheck } from '../database.types';
export declare function createDatabaseReadinessCheck(clientOrService: PrismaReadinessTarget, name?: string): PrismaReadinessCheck;
