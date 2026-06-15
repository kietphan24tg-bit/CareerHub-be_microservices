"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeLogger = void 0;
const common_1 = require("@nestjs/common");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_util_1 = require("node:util");
const correlation_context_1 = require("../tracing/correlation-context");
const logging_config_1 = require("./logging.config");
const LOG_LEVEL_WEIGHT = {
    debug: 10,
    error: 40,
    info: 20,
    warn: 30
};
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
function serializeError(error) {
    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            stack: error.stack
        };
    }
    if (isObject(error)) {
        return {
            message: typeof error.message === 'string'
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
class RuntimeLogger {
    filePath;
    minimumLevel;
    prettyLogger;
    pretty;
    serviceName;
    constructor(options) {
        this.filePath = options.filePath ? (0, node_path_1.resolve)(options.filePath) : undefined;
        this.minimumLevel = options.level ?? 'info';
        this.pretty = options.pretty ?? false;
        this.serviceName = options.serviceName;
        this.prettyLogger = this.pretty
            ? new common_1.ConsoleLogger(this.serviceName, {
                logLevels: this.resolveLogLevels(this.minimumLevel)
            })
            : undefined;
    }
    scoped(context) {
        return {
            debug: (message, logContext) => this.write('debug', message, {
                ...logContext,
                context
            }),
            error: (message, error, logContext) => this.write('error', message, {
                ...logContext,
                context,
                error
            }),
            info: (message, logContext) => this.write('info', message, {
                ...logContext,
                context
            }),
            warn: (message, logContext) => this.write('warn', message, {
                ...logContext,
                context
            })
        };
    }
    log(message, ...optionalParams) {
        this.info(String(message), {
            context: this.extractContext(optionalParams)
        });
    }
    error(message, ...optionalParams) {
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
    warn(message, ...optionalParams) {
        this.write('warn', String(message), {
            context: this.extractContext(optionalParams)
        });
    }
    debug(message, ...optionalParams) {
        this.write('debug', String(message), {
            context: this.extractContext(optionalParams)
        });
    }
    verbose(message, ...optionalParams) {
        this.write('debug', String(message), {
            context: this.extractContext(optionalParams)
        });
    }
    info(message, context) {
        this.write('info', message, context);
    }
    logHttpRequestStart(context) {
        this.info('HTTP request started', context);
    }
    logHttpRequestComplete(context) {
        this.info('HTTP request completed', context);
    }
    logHttpRequestError(context) {
        this.write('error', 'HTTP request failed', context);
    }
    logRpcRequestStart(context) {
        this.info('RPC request started', context);
    }
    logRpcRequestComplete(context) {
        this.info('RPC request completed', context);
    }
    logRpcRequestError(context) {
        this.write('error', 'RPC request failed', context);
    }
    shouldLog(level) {
        return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[this.minimumLevel];
    }
    extractContext(optionalParams) {
        const firstStringParam = optionalParams.find((param) => typeof param === 'string');
        return typeof firstStringParam === 'string'
            ? firstStringParam
            : undefined;
    }
    resolveLogLevels(minimumLevel) {
        const orderedLevels = ['debug', 'info', 'warn', 'error'];
        const minimumWeight = LOG_LEVEL_WEIGHT[minimumLevel];
        return orderedLevels
            .filter((level) => LOG_LEVEL_WEIGHT[level] >= minimumWeight)
            .flatMap((level) => level === 'info' ? ['log'] : [level]);
    }
    formatMetadata(entry) {
        const metadata = Object.fromEntries(Object.entries({
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
        }).filter(([, value]) => value !== undefined));
        if (Object.keys(metadata).length === 0) {
            return undefined;
        }
        return (0, node_util_1.inspect)(metadata, {
            breakLength: 120,
            colors: true,
            compact: false,
            depth: null
        });
    }
    write(level, message, context) {
        if (!this.shouldLog(level)) {
            return;
        }
        const traceIdentifiers = (0, correlation_context_1.getActiveTraceIdentifiers)();
        const entry = {
            context: context?.context,
            details: (0, logging_config_1.redactLogData)(context?.details),
            error: serializeError(context?.error),
            latencyMs: context?.latencyMs,
            level,
            message,
            method: context?.method,
            path: context?.path,
            pattern: context?.pattern,
            requestId: context?.requestId ?? (0, correlation_context_1.getCorrelationContext)().requestId,
            role: context?.role,
            service: context?.service ?? this.serviceName,
            spanId: context?.spanId ?? traceIdentifiers.spanId,
            statusCode: context?.statusCode,
            timestamp: new Date().toISOString(),
            traceId: context?.traceId ?? traceIdentifiers.traceId,
            userAgent: context?.userAgent,
            userId: context?.userId
        };
        const output = JSON.stringify(entry);
        this.writeToFile(output);
        if (this.pretty && this.prettyLogger) {
            const composedMessage = [message, this.formatMetadata(entry)]
                .filter((part) => part !== undefined)
                .join('\n');
            const loggerContext = entry.context ?? this.serviceName;
            if (level === 'error') {
                this.prettyLogger.error(composedMessage, entry.error?.stack, loggerContext);
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
    writeToFile(output) {
        if (!this.filePath) {
            return;
        }
        const directory = (0, node_path_1.dirname)(this.filePath);
        if (!(0, node_fs_1.existsSync)(directory)) {
            (0, node_fs_1.mkdirSync)(directory, {
                recursive: true
            });
        }
        (0, node_fs_1.appendFileSync)(this.filePath, `${output}\n`, 'utf8');
    }
}
exports.RuntimeLogger = RuntimeLogger;
