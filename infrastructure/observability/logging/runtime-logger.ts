import { ConsoleLogger, type LoggerService, type LogLevel } from '@nestjs/common';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { inspect } from 'node:util';
import type { RuntimeLogLevel } from '../../runtime/config/runtime-config';
import {
    getActiveTraceIdentifiers,
    getCorrelationContext
} from '../tracing/correlation-context';
import { redactLogData } from './logging.config';

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
    error(
        message: string,
        error?: unknown,
        context?: Omit<LogContext, 'context' | 'error'>
    ): void;
    info(message: string, context?: Omit<LogContext, 'context'>): void;
    warn(message: string, context?: Omit<LogContext, 'context'>): void;
}

type SerializedError = {
    message: string;
    name: string;
    stack?: string;
};

type LogEntry = {
    context?: string;
    details?: unknown;
    error?: SerializedError;
    latencyMs?: number;
    level: RuntimeLogLevel;
    message: string;
    method?: string;
    path?: string;
    pattern?: string;
    requestId?: string;
    role?: string;
    service: string;
    spanId?: string;
    statusCode?: number;
    timestamp: string;
    traceId?: string;
    userAgent?: string;
    userId?: string | number;
};

const LOG_LEVEL_WEIGHT: Record<RuntimeLogLevel, number> = {
    debug: 10,
    error: 40,
    info: 20,
    warn: 30
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function serializeError(error: unknown): SerializedError | undefined {
    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            stack: error.stack
        };
    }

    if (isObject(error)) {
        return {
            message:
                typeof error.message === 'string'
                    ? error.message
                    : 'Unknown object error',
            name: typeof error.name === 'string' ? error.name : 'UnknownError'
        };
    }

    if (typeof error === 'string') {
        return {
            message: error,
            name: 'Error'
        };
    }

    return undefined;
}

export class RuntimeLogger implements LoggerService {
    private readonly filePath?: string;
    private readonly minimumLevel: RuntimeLogLevel;
    private readonly prettyLogger?: ConsoleLogger;
    private readonly pretty: boolean;
    private readonly serviceName: string;

    constructor(options: RuntimeLoggerOptions) {
        this.filePath = options.filePath ? resolve(options.filePath) : undefined;
        this.minimumLevel = options.level ?? 'info';
        this.pretty = options.pretty ?? false;
        this.serviceName = options.serviceName;
        this.prettyLogger = this.pretty
            ? new ConsoleLogger(this.serviceName, {
                  logLevels: this.resolveLogLevels(this.minimumLevel)
              })
            : undefined;
    }

    scoped(context: string): ScopedRuntimeLogger {
        return {
            debug: (message, logContext) =>
                this.write('debug', message, {
                    ...logContext,
                    context
                }),
            error: (message, error, logContext) =>
                this.write('error', message, {
                    ...logContext,
                    context,
                    error
                }),
            info: (message, logContext) =>
                this.write('info', message, {
                    ...logContext,
                    context
                }),
            warn: (message, logContext) =>
                this.write('warn', message, {
                    ...logContext,
                    context
                })
        };
    }

    log(message: unknown, ...optionalParams: unknown[]): void {
        this.info(String(message), {
            context: this.extractContext(optionalParams)
        });
    }

    error(message: unknown, ...optionalParams: unknown[]): void {
        const [trace, context] = optionalParams;

        this.write('error', String(message), {
            context: typeof context === 'string' ? context : undefined,
            error: typeof trace === 'string'
                ? {
                      message: String(message),
                      name: 'Error',
                      stack: trace
                  }
                : undefined
        });
    }

    warn(message: unknown, ...optionalParams: unknown[]): void {
        this.write('warn', String(message), {
            context: this.extractContext(optionalParams)
        });
    }

    debug(message: unknown, ...optionalParams: unknown[]): void {
        this.write('debug', String(message), {
            context: this.extractContext(optionalParams)
        });
    }

    verbose(message: unknown, ...optionalParams: unknown[]): void {
        this.write('debug', String(message), {
            context: this.extractContext(optionalParams)
        });
    }

    info(message: string, context?: LogContext): void {
        this.write('info', message, context);
    }

    logHttpRequestStart(context: LogContext): void {
        this.info('HTTP request started', context);
    }

    logHttpRequestComplete(context: LogContext): void {
        this.info('HTTP request completed', context);
    }

    logHttpRequestError(context: LogContext): void {
        this.write('error', 'HTTP request failed', context);
    }

    logRpcRequestStart(context: LogContext): void {
        this.info('RPC request started', context);
    }

    logRpcRequestComplete(context: LogContext): void {
        this.info('RPC request completed', context);
    }

    logRpcRequestError(context: LogContext): void {
        this.write('error', 'RPC request failed', context);
    }

    private shouldLog(level: RuntimeLogLevel): boolean {
        return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[this.minimumLevel];
    }

    private extractContext(optionalParams: unknown[]): string | undefined {
        const firstStringParam = optionalParams.find(
            (param) => typeof param === 'string'
        );

        return typeof firstStringParam === 'string'
            ? firstStringParam
            : undefined;
    }

    private resolveLogLevels(minimumLevel: RuntimeLogLevel): LogLevel[] {
        const orderedLevels: RuntimeLogLevel[] = ['debug', 'info', 'warn', 'error'];
        const minimumWeight = LOG_LEVEL_WEIGHT[minimumLevel];

        return orderedLevels
            .filter((level) => LOG_LEVEL_WEIGHT[level] >= minimumWeight)
            .flatMap<LogLevel>((level) =>
                level === 'info' ? ['log'] : [level]
            );
    }

    private formatMetadata(entry: LogEntry): string | undefined {
        const metadata = Object.fromEntries(
            Object.entries({
                details: entry.details,
                latencyMs: entry.latencyMs,
                method: entry.method,
                path: entry.path,
                pattern: entry.pattern,
                requestId: entry.requestId,
                role: entry.role,
                service: entry.service,
                spanId: entry.spanId,
                statusCode: entry.statusCode,
                timestamp: entry.timestamp,
                traceId: entry.traceId,
                userAgent: entry.userAgent,
                userId: entry.userId
            }).filter(([, value]) => value !== undefined)
        );

        if (Object.keys(metadata).length === 0) {
            return undefined;
        }

        return inspect(metadata, {
            breakLength: 120,
            colors: true,
            compact: false,
            depth: null
        });
    }

    private write(level: RuntimeLogLevel, message: string, context?: LogContext): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const traceIdentifiers = getActiveTraceIdentifiers();
        const entry: LogEntry = {
            context: context?.context,
            details: redactLogData(context?.details),
            error: serializeError(context?.error),
            latencyMs: context?.latencyMs,
            level,
            message,
            method: context?.method,
            path: context?.path,
            pattern: context?.pattern,
            requestId: context?.requestId ?? getCorrelationContext().requestId,
            role: context?.role,
            service: context?.service ?? this.serviceName,
            spanId: context?.spanId ?? traceIdentifiers.spanId,
            statusCode: context?.statusCode,
            timestamp: new Date().toISOString(),
            traceId: context?.traceId ?? traceIdentifiers.traceId,
            userAgent: context?.userAgent,
            userId: context?.userId
        };

        if (this.pretty && this.prettyLogger) {
            const composedMessage = [message, this.formatMetadata(entry)]
                .filter((part) => part !== undefined)
                .join('\n');
            const loggerContext = entry.context ?? this.serviceName;

            if (level === 'error') {
                this.prettyLogger.error(
                    composedMessage,
                    entry.error?.stack,
                    loggerContext
                );
                return;
            }

            if (level === 'warn') {
                this.prettyLogger.warn(composedMessage, loggerContext);
                return;
            }

            if (level === 'debug') {
                this.prettyLogger.debug(composedMessage, loggerContext);
                return;
            }

            this.prettyLogger.log(composedMessage, loggerContext);
            return;
        }

        const output = JSON.stringify(entry);
        this.writeToFile(output);

        if (level === 'error') {
            console.error(output);
            return;
        }

        if (level === 'warn') {
            console.warn(output);
            return;
        }

        console.log(output);
    }

    private writeToFile(output: string): void {
        if (!this.filePath) {
            return;
        }

        const directory = dirname(this.filePath);

        if (!existsSync(directory)) {
            mkdirSync(directory, {
                recursive: true
            });
        }

        appendFileSync(this.filePath, `${output}\n`, 'utf8');
    }
}
