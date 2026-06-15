import { type Context } from '@opentelemetry/api';
export type RabbitMqHeaders = Record<string, unknown>;
export type RabbitMqMessageProperties = {
    headers?: RabbitMqHeaders;
};
export declare function createRabbitMqHeaders(requestId?: string, parentContext?: Context): RabbitMqHeaders | undefined;
export declare function createRabbitMqMessageOptions(requestId?: string, parentContext?: Context): RabbitMqMessageProperties | undefined;
export declare function getRabbitMqHeaders(properties: RabbitMqMessageProperties | undefined): RabbitMqHeaders;
export declare function getRequestIdFromRabbitMqProperties(properties: RabbitMqMessageProperties | undefined): string | undefined;
export declare function extractTraceContextFromRabbitMqProperties(properties: RabbitMqMessageProperties | undefined): Context;
