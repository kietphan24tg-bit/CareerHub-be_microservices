import type { ConfirmChannel } from 'amqplib';
import type { RuntimeConfig } from '../../runtime/config/runtime-config';
export type RabbitMqParkingDeadLetterTopology = {
    deadLetterExchange: string;
    deadLetterQueue: string;
    deadLetterRoutingKey: string;
    exchange: string;
    queue: string;
};
export declare function getRabbitMqParkingDeadLetterTopology(config: Pick<RuntimeConfig, 'brokerDeadLetterEnabled' | 'brokerDeadLetterPrefix' | 'brokerExchangePrefix' | 'brokerQueuePrefix'>, exchange: string, queue: string): RabbitMqParkingDeadLetterTopology;
export declare function assertRabbitMqParkingDeadLetterTopology(channel: ConfirmChannel, config: Pick<RuntimeConfig, 'brokerDeadLetterEnabled' | 'brokerDeadLetterPrefix' | 'brokerDurable' | 'brokerExchangePrefix' | 'brokerQueuePrefix'>, exchange: string, queue: string): Promise<RabbitMqParkingDeadLetterTopology>;
