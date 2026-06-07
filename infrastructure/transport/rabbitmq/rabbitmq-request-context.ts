import type { ExecutionContext } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import {
    ROOT_CONTEXT,
    context as otelContext,
    propagation,
    type Context,
    type TextMapGetter,
    type TextMapSetter
} from '@opentelemetry/api';
import { REQUEST_ID_HEADER } from '../../runtime/request-context/request-id';

export type RabbitMqHeaders = Record<string, unknown>;

export type RabbitMqMessageProperties = {
    headers?: RabbitMqHeaders;
};

export type RabbitMqMessage = {
    fields?: {
        consumerTag?: string;
        exchange?: string;
        routingKey?: string;
    };
    properties?: RabbitMqMessageProperties;
};

const rabbitMqHeaderGetter: TextMapGetter<RabbitMqHeaders> = {
    get(carrier, key) {
        const value = carrier[key];

        if (Array.isArray(value)) {
            return value
                .filter((item) => typeof item === 'string')
                .map((item) => item);
        }

        return typeof value === 'string' ? value : undefined;
    },
    keys(carrier) {
        return Object.keys(carrier);
    }
};

const rabbitMqHeaderSetter: TextMapSetter<RabbitMqHeaders> = {
    set(carrier, key, value) {
        carrier[key] = value;
    }
};

export function createRabbitMqHeaders(
    requestId?: string,
    parentContext: Context = otelContext.active()
): RabbitMqHeaders | undefined {
    const headers: RabbitMqHeaders = {};

    if (requestId) {
        headers[REQUEST_ID_HEADER] = requestId;
    }

    propagation.inject(parentContext, headers, rabbitMqHeaderSetter);

    return Object.keys(headers).length > 0 ? headers : undefined;
}

export function createRabbitMqMessageOptions(
    requestId?: string,
    parentContext?: Context
): RabbitMqMessageProperties | undefined {
    const headers = createRabbitMqHeaders(requestId, parentContext);

    return headers ? { headers } : undefined;
}

export function getRabbitMqHeaders(
    properties: RabbitMqMessageProperties | undefined
): RabbitMqHeaders {
    return properties?.headers ?? {};
}

export function getRequestIdFromRabbitMqProperties(
    properties: RabbitMqMessageProperties | undefined
): string | undefined {
    const headerValue = getRabbitMqHeaders(properties)[REQUEST_ID_HEADER];

    return typeof headerValue === 'string' && headerValue.length > 0
        ? headerValue
        : undefined;
}

export function extractTraceContextFromRabbitMqProperties(
    properties: RabbitMqMessageProperties | undefined
): Context {
    if (!properties?.headers) {
        return ROOT_CONTEXT;
    }

    return propagation.extract(
        ROOT_CONTEXT,
        properties.headers,
        rabbitMqHeaderGetter
    );
}

export function getRabbitMqContextFromExecutionContext(
    context: ExecutionContext
): RmqContext | undefined {
    const rpcContext = context.switchToRpc().getContext<RmqContext | undefined>();

    if (rpcContext instanceof RmqContext) {
        return rpcContext;
    }

    const secondArgument = context.getArgByIndex<RmqContext | undefined>(1);

    if (secondArgument instanceof RmqContext) {
        return secondArgument;
    }

    return undefined;
}

export function getRabbitMqMessageFromExecutionContext(
    context: ExecutionContext
): RabbitMqMessage | undefined {
    return getRabbitMqContextFromExecutionContext(context)?.getMessage() as
        | RabbitMqMessage
        | undefined;
}

export function getRabbitMqPatternFromExecutionContext(
    context: ExecutionContext
): string {
    const rabbitMqContext = getRabbitMqContextFromExecutionContext(context);
    const pattern = rabbitMqContext?.getPattern();

    if (typeof pattern === 'string' && pattern.length > 0) {
        return pattern;
    }

    const className = context.getClass().name || 'UnknownController';
    const handlerName = context.getHandler().name || 'unknown';

    return `${className}.${handlerName}`;
}

export function getRabbitMqExchangeFromExecutionContext(
    context: ExecutionContext
): string | undefined {
    return getRabbitMqMessageFromExecutionContext(context)?.fields?.exchange;
}

export function getRabbitMqRoutingKeyFromExecutionContext(
    context: ExecutionContext
): string | undefined {
    return getRabbitMqMessageFromExecutionContext(context)?.fields?.routingKey;
}

export function getRabbitMqPropertiesFromExecutionContext(
    context: ExecutionContext
): RabbitMqMessageProperties | undefined {
    return getRabbitMqMessageFromExecutionContext(context)?.properties;
}
