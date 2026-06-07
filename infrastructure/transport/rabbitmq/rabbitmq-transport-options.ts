import {
    Transport,
    type ClientOptions,
    type RmqOptions
} from '@nestjs/microservices';
import { InfrastructureError } from '../../errors/infrastructure-error';
import type { RuntimeConfig } from '../../runtime/config/runtime-config';

type RabbitMqBaseEndpointOptions = {
    exchange?: string;
    exchangeType?: 'direct' | 'fanout' | 'topic' | 'headers' | (string & {});
    queue: string;
    routingKey?: string;
    wildcards?: boolean;
};

type RabbitMqMicroserviceEndpointOptions = RabbitMqBaseEndpointOptions & {
    consumerTag?: string;
    noAck?: boolean;
    noAssert?: boolean;
};

type RabbitMqClientEndpointOptions = RabbitMqBaseEndpointOptions & {
    persistent?: boolean;
};

function requireBrokerUrl(config: Pick<RuntimeConfig, 'brokerUrl'>): string {
    if (!config.brokerUrl) {
        throw new InfrastructureError('RabbitMQ broker URL is not configured', {
            code: 'BROKER_URL_NOT_CONFIGURED'
        });
    }

    return config.brokerUrl;
}

function prefixName(prefix: string, name: string): string {
    return prefix.length > 0 ? `${prefix}${name}` : name;
}

export function getRabbitMqQueueName(
    config: Pick<RuntimeConfig, 'brokerQueuePrefix'>,
    queue: string
): string {
    return prefixName(config.brokerQueuePrefix, queue);
}

export function getRabbitMqExchangeName(
    config: Pick<RuntimeConfig, 'brokerExchangePrefix'>,
    exchange: string
): string {
    return prefixName(config.brokerExchangePrefix, exchange);
}

export function getRabbitMqDeadLetterExchangeName(
    config: Pick<RuntimeConfig, 'brokerDeadLetterPrefix' | 'brokerExchangePrefix'>,
    exchange: string
): string {
    return prefixName(
        config.brokerExchangePrefix,
        `${config.brokerDeadLetterPrefix}.${exchange}`
    );
}

export function getRabbitMqDeadLetterQueueName(
    config: Pick<RuntimeConfig, 'brokerDeadLetterPrefix' | 'brokerQueuePrefix'>,
    queue: string
): string {
    return prefixName(
        config.brokerQueuePrefix,
        `${config.brokerDeadLetterPrefix}.${queue}`
    );
}

function buildQueueArguments(
    config: Pick<
        RuntimeConfig,
        | 'brokerDeadLetterEnabled'
        | 'brokerDeadLetterPrefix'
        | 'brokerExchangePrefix'
    >,
    endpoint: Pick<RabbitMqBaseEndpointOptions, 'exchange' | 'queue'>
): Record<string, string> | undefined {
    if (!config.brokerDeadLetterEnabled || !endpoint.exchange) {
        return undefined;
    }

    return {
        'x-dead-letter-exchange': getRabbitMqDeadLetterExchangeName(
            config,
            endpoint.exchange
        ),
        'x-dead-letter-routing-key': getRabbitMqDeadLetterQueueName(
            {
                brokerDeadLetterPrefix: config.brokerDeadLetterPrefix,
                brokerQueuePrefix: ''
            },
            endpoint.queue
        )
    };
}

export function buildRabbitMqMicroserviceOptions(
    config: Pick<
        RuntimeConfig,
        | 'brokerUrl'
        | 'brokerQueuePrefix'
        | 'brokerExchangePrefix'
        | 'brokerPrefetchCount'
        | 'brokerDurable'
        | 'brokerDeadLetterEnabled'
        | 'brokerDeadLetterPrefix'
    >,
    endpoint: RabbitMqMicroserviceEndpointOptions
): RmqOptions {
    const queueName = getRabbitMqQueueName(config, endpoint.queue);
    const exchangeName = endpoint.exchange
        ? getRabbitMqExchangeName(config, endpoint.exchange)
        : undefined;

    return {
        transport: Transport.RMQ,
        options: {
            consumerTag: endpoint.consumerTag,
            exchange: exchangeName,
            exchangeType: endpoint.exchangeType ?? 'topic',
            maxConnectionAttempts: -1,
            noAck: endpoint.noAck ?? false,
            noAssert: endpoint.noAssert ?? false,
            persistent: config.brokerDurable,
            prefetchCount: config.brokerPrefetchCount,
            queue: queueName,
            queueOptions: {
                arguments: buildQueueArguments(config, endpoint),
                durable: config.brokerDurable
            },
            routingKey: endpoint.routingKey,
            urls: [requireBrokerUrl(config)],
            wildcards: endpoint.wildcards ?? false
        }
    };
}

export function buildRabbitMqClientOptions(
    config: Pick<
        RuntimeConfig,
        | 'brokerUrl'
        | 'brokerQueuePrefix'
        | 'brokerExchangePrefix'
        | 'brokerDurable'
    >,
    endpoint: RabbitMqClientEndpointOptions
): ClientOptions {
    const queueName = getRabbitMqQueueName(config, endpoint.queue);
    const exchangeName = endpoint.exchange
        ? getRabbitMqExchangeName(config, endpoint.exchange)
        : undefined;

    return {
        transport: Transport.RMQ,
        options: {
            exchange: exchangeName,
            exchangeType: endpoint.exchangeType ?? 'topic',
            persistent: endpoint.persistent ?? config.brokerDurable,
            queue: queueName,
            queueOptions: {
                durable: config.brokerDurable
            },
            routingKey: endpoint.routingKey,
            urls: [requireBrokerUrl(config)],
            wildcards: endpoint.wildcards ?? false
        }
    };
}
