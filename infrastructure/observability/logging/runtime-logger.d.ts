import { type LoggerService } from '@nestjs/common';
import type { RuntimeLogLevel } from '../../runtime/config/runtime-config';
export type LogContext = {
    context?: string;
    details?: unknown;
    error?: unknown;
    latencyMs?: number;
    method?: string;
    path?: string;
    pattern?: string;
    requestId?: string;
    role?: string;
    userAgent?: string;
    userId?: string | number;
    service?: string;
    spanId?: string;
    statusCode?: number;
    traceId?: string;
};
type RuntimeLoggerOptions = {
    filePath?: string;
    level?: RuntimeLogLevel;
    pretty?: boolean;
    serviceName: string;
};
export interface ScopedRuntimeLogger {
    debug(message: string, context?: Omit<LogContext, 'context'>): void;
    error(message: string, error?: unknown, context?: Omit<LogContext, 'context' | 'error'>): void;
    info(message: string, context?: Omit<LogContext, 'context'>): void;
    warn(message: string, context?: Omit<LogContext, 'context'>): void;
}
export declare class RuntimeLogger implements LoggerService {
    private readonly filePath?;
    private readonly minimumLevel;
    private readonly prettyLogger?;
    private readonly pretty;
    private readonly serviceName;
    constructor(options: RuntimeLoggerOptions);
    scoped(context: string): ScopedRuntimeLogger;
    log(message: unknown, ...optionalParams: unknown[]): void;
    error(message: unknown, ...optionalParams: unknown[]): void;
    warn(message: unknown, ...optionalParams: unknown[]): void;
    debug(message: unknown, ...optionalParams: unknown[]): void;
    verbose(message: unknown, ...optionalParams: unknown[]): void;
    info(message: string, context?: LogContext): void;
    logHttpRequestStart(context: LogContext): void;
    logHttpRequestComplete(context: LogContext): void;
    logHttpRequestError(context: LogContext): void;
    logRpcRequestStart(context: LogContext): void;
    logRpcRequestComplete(context: LogContext): void;
    logRpcRequestError(context: LogContext): void;
    private shouldLog;
    private extractContext;
    private resolveLogLevels;
    private formatMetadata;
    private write;
    private writeToFile;
}
export {};
