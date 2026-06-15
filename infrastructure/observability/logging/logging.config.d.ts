import type { RuntimeLogLevel } from '../../runtime/config/runtime-config';
export declare const LOG_REDACT_PATHS: readonly ["details.authorization", "details.cookie", "details.password", "details.refreshToken", "details.secret", "details.token", "details.accessToken", "details.databaseUrl", "details.brokerUrl", "details.redisUrl"];
export declare function redactLogData<TValue>(value: TValue): TValue;
type IgnoredHttpPaths = {
    healthPath?: string;
    livenessPath?: string;
    metricsPath?: string;
    readinessPath?: string;
};
export declare function shouldIgnoreHttpLog(path: string | undefined, ignoredPaths?: IgnoredHttpPaths): boolean;
export declare function formatPrettyLog(level: RuntimeLogLevel, message: string, payload: Record<string, unknown>): string;
export {};
