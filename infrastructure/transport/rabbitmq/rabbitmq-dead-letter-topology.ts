import type { ConfirmChannel } from 'amqplib';
import type { RuntimeConfig } from '../../runtime/config/runtime-config';
import {
  getRabbitMqDeadLetterExchangeName,
  getRabbitMqDeadLetterQueueName,
  getRabbitMqExchangeName,
  getRabbitMqQueueName
} from './rabbitmq-transport-options';

export type RabbitMqParkingDeadLetterTopology = {
  deadLetterExchange: string;
  deadLetterQueue: string;
  deadLetterRoutingKey: string;
  exchange: string;
  queue: string;
};

export function getRabbitMqParkingDeadLetterTopology(
  config: Pick<
    RuntimeConfig,
    | 'brokerDeadLetterEnabled'
    | 'brokerDeadLetterPrefix'
    | 'brokerExchangePrefix'
    | 'brokerQueuePrefix'
  >,
  exchange: string,
  queue: string
): RabbitMqParkingDeadLetterTopology {
  const resolvedExchange = getRabbitMqExchangeName(config, exchange);
  const resolvedQueue = getRabbitMqQueueName(config, queue);
  const deadLetterQueue = getRabbitMqDeadLetterQueueName(config, queue);

  return {
    deadLetterExchange: getRabbitMqDeadLetterExchangeName(config, exchange),
    deadLetterQueue,
    deadLetterRoutingKey: deadLetterQueue,
    exchange: resolvedExchange,
    queue: resolvedQueue
  };
}

export async function assertRabbitMqParkingDeadLetterTopology(
  channel: ConfirmChannel,
  config: Pick<
    RuntimeConfig,
    | 'brokerDeadLetterEnabled'
    | 'brokerDeadLetterPrefix'
    | 'brokerDurable'
    | 'brokerExchangePrefix'
    | 'brokerQueuePrefix'
  >,
  exchange: string,
  queue: string
): Promise<RabbitMqParkingDeadLetterTopology> {
  const topology = getRabbitMqParkingDeadLetterTopology(config, exchange, queue);

  await channel.assertExchange(topology.exchange, 'topic', {
    durable: config.brokerDurable
  });

  if (config.brokerDeadLetterEnabled) {
    await channel.assertExchange(topology.deadLetterExchange, 'topic', {
      durable: config.brokerDurable
    });
    await channel.assertQueue(topology.deadLetterQueue, {
      durable: config.brokerDurable
    });
    await channel.bindQueue(
      topology.deadLetterQueue,
      topology.deadLetterExchange,
      topology.deadLetterRoutingKey
    );
    await channel.assertQueue(topology.queue, {
      durable: config.brokerDurable,
      arguments: {
        'x-dead-letter-exchange': topology.deadLetterExchange,
        'x-dead-letter-routing-key': topology.deadLetterRoutingKey
      }
    });
  } else {
    await channel.assertQueue(topology.queue, {
      durable: config.brokerDurable
    });
  }

  return topology;
}
