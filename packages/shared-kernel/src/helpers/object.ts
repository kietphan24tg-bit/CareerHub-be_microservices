function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function convertPropsToObject<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((item) => convertPropsToObject(item)) as T;
    }

    if (isPlainObject(value)) {
        const obj = value as Record<string, unknown>;

        if (typeof obj.toObject === 'function') {
            return obj.toObject() as T;
        }

        const result = Object.entries(obj).reduce<Record<string, unknown>>(
            (acc, [key, nestedValue]) => {
                acc[key] = convertPropsToObject(nestedValue);
                return acc;
            },
            {}
        );

        return result as T;
    }

    return value;
}
