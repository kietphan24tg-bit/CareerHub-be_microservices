import { REQUEST_ID_HEADER } from '../request/request-id';

export type RabbitMqMessageProperties = {
    headers?: Record<string, unknown>;
};

export function createRabbitMqHeaders(
    requestId?: string
): Record<string, unknown> | undefined {
    if (!requestId) {
        return undefined;
    }

    return {
        [REQUEST_ID_HEADER]: requestId
    };
}

export function getRequestIdFromRabbitMqProperties(
    properties: RabbitMqMessageProperties | undefined
): string | undefined {
    const headerValue = properties?.headers?.[REQUEST_ID_HEADER];

    return typeof headerValue === 'string' && headerValue.length > 0
        ? headerValue
        : undefined;
}
