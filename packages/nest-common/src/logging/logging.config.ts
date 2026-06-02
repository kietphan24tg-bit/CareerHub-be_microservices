import { inspect } from 'node:util';

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

        const nextValue = current[segment];

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
    message: string,
    payload: Record<string, unknown>
): string {
    if (Object.keys(payload).length === 0) {
        return message;
    }

    return `${message} ${inspect(payload, {
        breakLength: Infinity,
        compact: true,
        depth: null
    })}`;
}
