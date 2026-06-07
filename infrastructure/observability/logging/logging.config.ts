import { inspect } from 'node:util';
import type { RuntimeLogLevel } from '../../runtime/config/runtime-config';

export const HEALTH_LOG_PATH_PREFIXES = ['/health', '/metrics'] as const;

export const LOG_REDACT_PATHS = [
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
] as const;

const REDACTED_VALUE = '[Redacted]';

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function cloneForLog(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => cloneForLog(item));
    }

    if (!isObject(value)) {
        return value;
    }

    return Object.entries(value).reduce<Record<string, unknown>>(
        (accumulator, [key, nestedValue]) => {
            accumulator[key] = cloneForLog(nestedValue);
            return accumulator;
        },
        {}
    );
}

function setNestedValue(
    target: Record<string, unknown>,
    segments: readonly string[]
): void {
    let current: Record<string, unknown> | undefined = target;

    for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];

        if (!current || !(segment in current)) {
            return;
        }

        if (index === segments.length - 1) {
            current[segment] = REDACTED_VALUE;
            return;
        }

        const nextValue: unknown = current[segment];

        if (!isObject(nextValue)) {
            return;
        }

        current = nextValue;
    }
}

export function redactLogData<TValue>(value: TValue): TValue {
    if (!isObject(value) && !Array.isArray(value)) {
        return value;
    }

    const clone = cloneForLog(value) as Record<string, unknown>;

    for (const path of LOG_REDACT_PATHS) {
        setNestedValue(clone, path.split('.'));
    }

    return clone as TValue;
}

export function shouldIgnoreHttpLog(path: string | undefined): boolean {
    if (!path) {
        return false;
    }

    return HEALTH_LOG_PATH_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}?`)
    );
}

export function formatPrettyLog(
    level: RuntimeLogLevel,
    message: string,
    payload: Record<string, unknown>
): string {
    const colors = {
        context: '\x1b[38;5;3m',
        debug: '\x1b[38;5;8m',
        error: '\x1b[31m',
        info: '\x1b[32m',
        reset: '\x1b[39m',
        warn: '\x1b[33m'
    } as const;
    const pid = process.pid;
    const timestamp =
        typeof payload.timestamp === 'string'
            ? new Date(payload.timestamp).toLocaleString('en-US')
            : new Date().toLocaleString('en-US');
    const context =
        typeof payload.context === 'string' && payload.context.length > 0
            ? payload.context
            : 'RuntimeLogger';
    const levelLabel = level.toUpperCase().padStart(5, ' ');
    const levelColor =
        level === 'error'
            ? colors.error
            : level === 'warn'
              ? colors.warn
              : level === 'debug'
                ? colors.debug
                : colors.info;

    const metadata = Object.fromEntries(
        Object.entries(payload).filter(
            ([key, value]) =>
                key !== 'context' &&
                key !== 'timestamp' &&
                value !== undefined
        )
    );
    const header =
        `${levelColor}[Nest] ${pid}  - ${colors.reset}` +
        `${timestamp} ${levelColor}${levelLabel}${colors.reset} ` +
        `${colors.context}[${context}] ${colors.reset}${message}`;

    if (Object.keys(metadata).length === 0) {
        return header;
    }

    return `${header}\n${inspect(metadata, {
        breakLength: 120,
        colors: true,
        compact: false,
        depth: null
    })}`;
}
