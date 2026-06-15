"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_REDACT_PATHS = void 0;
exports.redactLogData = redactLogData;
exports.shouldIgnoreHttpLog = shouldIgnoreHttpLog;
exports.formatPrettyLog = formatPrettyLog;
const node_util_1 = require("node:util");
exports.LOG_REDACT_PATHS = [
    'details.authorization',
    'details.cookie',
    'details.password',
    'details.refreshToken',
    'details.secret',
    'details.token',
    'details.accessToken',
    'details.databaseUrl',
    'details.brokerUrl',
    'details.redisUrl'
];
const REDACTED_VALUE = '[Redacted]';
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
function cloneForLog(value) {
    if (Array.isArray(value)) {
        return value.map((item) => cloneForLog(item));
    }
    if (!isObject(value)) {
        return value;
    }
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
        accumulator[key] = cloneForLog(nestedValue);
        return accumulator;
    }, {});
}
function setNestedValue(target, segments) {
    let current = target;
    for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        if (!current || !(segment in current)) {
            return;
        }
        if (index === segments.length - 1) {
            current[segment] = REDACTED_VALUE;
            return;
        }
        const nextValue = current[segment];
        if (!isObject(nextValue)) {
            return;
        }
        current = nextValue;
    }
}
function redactLogData(value) {
    if (!isObject(value) && !Array.isArray(value)) {
        return value;
    }
    const clone = cloneForLog(value);
    for (const path of exports.LOG_REDACT_PATHS) {
        setNestedValue(clone, path.split('.'));
    }
    return clone;
}
function matchesPathPrefix(path, candidate) {
    if (!candidate) {
        return false;
    }
    return path === candidate || path.startsWith(`${candidate}?`);
}
function shouldIgnoreHttpLog(path, ignoredPaths) {
    if (!path) {
        return false;
    }
    const candidates = [
        ignoredPaths?.healthPath ?? '/health',
        ignoredPaths?.livenessPath ?? '/health/live',
        ignoredPaths?.metricsPath ?? '/metrics',
        ignoredPaths?.readinessPath ?? '/health/ready'
    ];
    return candidates.some(candidate => matchesPathPrefix(path, candidate));
}
function formatPrettyLog(level, message, payload) {
    const colors = {
        context: '\x1b[38;5;3m',
        debug: '\x1b[38;5;8m',
        error: '\x1b[31m',
        info: '\x1b[32m',
        reset: '\x1b[39m',
        warn: '\x1b[33m'
    };
    const pid = process.pid;
    const timestamp = typeof payload.timestamp === 'string'
        ? new Date(payload.timestamp).toLocaleString('en-US')
        : new Date().toLocaleString('en-US');
    const context = typeof payload.context === 'string' && payload.context.length > 0
        ? payload.context
        : 'RuntimeLogger';
    const levelLabel = level.toUpperCase().padStart(5, ' ');
    const levelColor = level === 'error'
        ? colors.error
        : level === 'warn'
            ? colors.warn
            : level === 'debug'
                ? colors.debug
                : colors.info;
    const metadata = Object.fromEntries(Object.entries(payload).filter(([key, value]) => key !== 'context' &&
        key !== 'timestamp' &&
        value !== undefined));
    const header = `${levelColor}[Nest] ${pid}  - ${colors.reset}` +
        `${timestamp} ${levelColor}${levelLabel}${colors.reset} ` +
        `${colors.context}[${context}] ${colors.reset}${message}`;
    if (Object.keys(metadata).length === 0) {
        return header;
    }
    return `${header}\n${(0, node_util_1.inspect)(metadata, {
        breakLength: 120,
        colors: true,
        compact: false,
        depth: null
    })}`;
}
