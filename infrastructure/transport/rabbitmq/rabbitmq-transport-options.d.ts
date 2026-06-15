import type { RuntimeConfig } from '../../runtime/config/runtime-config';
export declare function getRabbitMqQueueName(config: Pick<RuntimeConfig, 'brokerQueuePrefix'>, queue: string): string;
export declare function getRabbitMqExchangeName(config: Pick<RuntimeConfig, 'brokerExchangePrefix'>, exchange: string): string;
export declare function getRabbitMqDeadLetterExchangeName(config: Pick<RuntimeConfig, 'brokerDeadLetterPrefix' | 'brokerExchangePrefix'>, exchange: string): string;
export declare function getRabbitMqDeadLetterQueueName(config: Pick<RuntimeConfig, 'brokerDeadLetterPrefix' | 'brokerQueuePrefix'>, queue: string): string;
