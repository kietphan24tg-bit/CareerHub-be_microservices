import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { RuntimeConfig } from '../../runtime/config/runtime-config';
import { getRabbitMqExchangeName, getRabbitMqQueueName } from './rabbitmq-transport-options';

export const RABBITMQ_RETRY_COUNT_HEADER = 'x-careerhub-retry-count';

export type RabbitMqTimedRetryTopology = {
  mainExchange: string;
  retryQueues: string[];
};

export function getRabbitMqRetryCount(message: ConsumeMessage): number {
  const value = message.properties.headers?.[RABBITMQ_RETRY_COUNT_HEADER];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return 0;
}

function formatDelayLabel(delayMs: number): string {
  return delayMs >= 60_000 ? `${delayMs / 60_000}m` : `${delayMs / 1000}s`;
}

export function getRabbitMqRetryQueueName(
  config: Pick<RuntimeConfig, 'brokerQueuePrefix'>,
  queue: string,
  delayMs: number
): string {
  return getRabbitMqQueueName(config, `${queue}.retry.${formatDelayLabel(delayMs)}`);
}

/**
 * Asserts TTL-based retry queues for a single-routing-key consumer (e.g. email).
 * Each retry queue has x-message-ttl and dead-letters back to the main exchange
 * with the original event routing key after the delay expires.
 *
 * No-ops and returns empty retryQueues when brokerDeadLetterEnabled=false.
 * Caller should log a warning in that case.
 *
 * NOTE: Changing delayStepsMs requires deleting existing retry queues before deploy
 * (RabbitMQ throws PRECONDITION_FAILED if queue exists with different x-message-ttl).
 */
export async function assertRabbitMqTimedRetryTopology(
  channel: ConfirmChannel,
  config: Pick<
    RuntimeConfig,
    | 'brokerDeadLetterEnabled'
    | 'brokerDurable'
    | 'brokerExchangePrefix'
    | 'brokerQueuePrefix'
  >,
  exchange: string,
  queue: string,
  routingKey: string,
  delayStepsMs: readonly number[]
): Promise<RabbitMqTimedRetryTopology> {
  const mainExchange = getRabbitMqExchangeName(config, exchange);
  const retryQueues: string[] = [];

  if (config.brokerDeadLetterEnabled) {
    for (const delayMs of delayStepsMs) {
      const retryQueueName = getRabbitMqRetryQueueName(config, queue, delayMs);
      await channel.assertQueue(retryQueueName, {
        durable: config.brokerDurable,
        arguments: {
          'x-dead-letter-exchange': mainExchange,
          'x-dead-letter-routing-key': routingKey,
          'x-message-ttl': delayMs
        }
      });
      retryQueues.push(retryQueueName);
    }
  }

  return { mainExchange, retryQueues };
}

/**
 * Publishes a failed message to the appropriate TTL retry queue based on newRetryCount.
 * newRetryCount=1 → retryQueues[0] (shortest delay), newRetryCount=2 → retryQueues[1], etc.
 *
 * After the TTL expires, RabbitMQ dead-letters the message back to the main exchange
 * with the original routing key, returning it to the main consumer queue.
 */
export async function publishToRabbitMqRetryQueue(
  channel: ConfirmChannel,
  config: Pick<RuntimeConfig, 'brokerDurable'>,
  message: ConsumeMessage,
  topology: RabbitMqTimedRetryTopology,
  newRetryCount: number
): Promise<void> {
  const retryQueue = topology.retryQueues[newRetryCount - 1];

  if (!retryQueue) {
    throw new Error(
      `No retry queue configured for retry count ${newRetryCount} (${topology.retryQueues.length} queues available)`
    );
  }

  const headers = {
    ...(message.properties.headers ?? {}),
    [RABBITMQ_RETRY_COUNT_HEADER]: newRetryCount
  };

  channel.publish('', retryQueue, message.content, {
    contentType: message.properties.contentType ?? 'application/json',
    deliveryMode: config.brokerDurable ? 2 : 1,
    headers,
    messageId: message.properties.messageId,
    timestamp: Date.now(),
    type: message.properties.type
  });

  await channel.waitForConfirms();
}

/**
 * Republishes a failed message back to the main exchange for immediate retry.
 * Used by consumers where operation is idempotent and no delay is needed
 * (e.g. notification consumer with createNotificationIfNew).
 */
export async function republishRabbitMqMessageForRetry(
  channel: ConfirmChannel,
  config: Pick<RuntimeConfig, 'brokerDurable' | 'brokerExchangePrefix'>,
  message: ConsumeMessage,
  exchange: string,
  newRetryCount: number
): Promise<void> {
  const resolvedExchange = getRabbitMqExchangeName(config, exchange);
  const routingKey = message.properties.type ?? '';
  const headers = {
    ...(message.properties.headers ?? {}),
    [RABBITMQ_RETRY_COUNT_HEADER]: newRetryCount
  };

  channel.publish(resolvedExchange, routingKey, message.content, {
    contentType: message.properties.contentType ?? 'application/json',
    deliveryMode: config.brokerDurable ? 2 : 1,
    headers,
    messageId: message.properties.messageId,
    timestamp: Date.now(),
    type: message.properties.type
  });

  await channel.waitForConfirms();
}
