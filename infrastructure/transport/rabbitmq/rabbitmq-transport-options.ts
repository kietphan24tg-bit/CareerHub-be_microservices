import type { RuntimeConfig } from '../../runtime/config/runtime-config';

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
