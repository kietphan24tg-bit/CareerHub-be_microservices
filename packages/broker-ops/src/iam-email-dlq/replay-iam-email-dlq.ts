import {
  IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME
} from '@careerhub/contracts';
import {
  getRabbitMqParkingDeadLetterTopology,
  loadRuntimeConfig,
  type RuntimeConfig
} from '@careerhub/infrastructure';
import { connect, type ConfirmChannel, type GetMessage } from 'amqplib';
import {
  messageMatchesId,
  parseDlqMessage,
  type ParsedDlqMessage
} from '../communication-dlq/dlq-message-utils';

export const IAM_EVENTS_EXCHANGE = 'events';
export const IAM_PASSWORD_RESET_MAIL_QUEUE = 'iam.password-reset-mail';

export type IamEmailReplayOutcome =
  | 'dry_run'
  | 'not_found'
  | 'publish_failed'
  | 'replayed'
  | 'skipped';

export type IamEmailReplayResult = {
  outcome: IamEmailReplayOutcome;
  parsed?: ParsedDlqMessage;
  error?: string;
};

export type IamEmailPeekResult = {
  messages: ParsedDlqMessage[];
  queueDepth: number;
};

export type IamEmailDlqReplayOptions = {
  count?: number;
  dryRun?: boolean;
  maxScan?: number;
  messageId?: string;
  runtimeConfig?: RuntimeConfig;
};

type ReplayDependencies = {
  ack: (message: GetMessage) => void;
  checkQueue: (queueName: string) => Promise<{ messageCount: number }>;
  get: (queueName: string) => Promise<GetMessage | false>;
  nack: (message: GetMessage, requeue: boolean) => void;
  publish: (
    exchange: string,
    routingKey: string,
    content: Buffer,
    properties: GetMessage['properties']
  ) => Promise<void>;
};

function resolveTopology(runtimeConfig: RuntimeConfig) {
  return getRabbitMqParkingDeadLetterTopology(
    runtimeConfig,
    IAM_EVENTS_EXCHANGE,
    IAM_PASSWORD_RESET_MAIL_QUEUE
  );
}

export async function peekIamEmailDlq(
  options: IamEmailDlqReplayOptions,
  dependencies?: Partial<ReplayDependencies>
): Promise<IamEmailPeekResult> {
  const runtimeConfig = options.runtimeConfig ?? loadRuntimeConfig();
  const topology = resolveTopology(runtimeConfig);
  const count = Math.max(1, options.count ?? 10);

  if (dependencies) {
    const queueInfo = await dependencies.checkQueue!(topology.deadLetterQueue);
    const batch: GetMessage[] = [];

    for (let index = 0; index < count; index += 1) {
      const message = await dependencies.get!(topology.deadLetterQueue);
      if (!message) {
        break;
      }
      batch.push(message);
    }

    const messages: ParsedDlqMessage[] = [];
    for (const message of batch) {
      messages.push(parseDlqMessage(message, IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME));
      dependencies.nack!(message, true);
    }

    return { messages, queueDepth: queueInfo.messageCount };
  }

  const connection = await connect(runtimeConfig.brokerUrl as string);
  const channel = await connection.createConfirmChannel();

  try {
    const queueInfo = await channel.checkQueue(topology.deadLetterQueue);
    const batch: GetMessage[] = [];

    for (let index = 0; index < count; index += 1) {
      const message = await channel.get(topology.deadLetterQueue, { noAck: false });
      if (!message) {
        break;
      }
      batch.push(message);
    }

    const messages: ParsedDlqMessage[] = [];
    for (const message of batch) {
      messages.push(parseDlqMessage(message, IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME));
      channel.nack(message, false, true);
    }

    return { messages, queueDepth: queueInfo.messageCount };
  } finally {
    await channel.close().catch(() => undefined);
    await connection.close().catch(() => undefined);
  }
}

async function publishWithConfirm(
  channel: ConfirmChannel,
  exchange: string,
  routingKey: string,
  message: GetMessage
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    channel.publish(
      exchange,
      routingKey,
      message.content,
      {
        contentType: message.properties.contentType ?? 'application/json',
        headers: message.properties.headers,
        messageId: message.properties.messageId,
        timestamp: message.properties.timestamp,
        type: message.properties.type
      },
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
}

async function replaySingleMessage(
  topology: ReturnType<typeof resolveTopology>,
  message: GetMessage,
  dryRun: boolean,
  dependencies: ReplayDependencies
): Promise<IamEmailReplayResult> {
  const parsed = parseDlqMessage(message, IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME);

  if (dryRun) {
    dependencies.nack(message, true);
    return { outcome: 'dry_run', parsed };
  }

  try {
    await dependencies.publish(
      topology.exchange,
      IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
      message.content,
      message.properties
    );
    dependencies.ack(message);
    return { outcome: 'replayed', parsed };
  } catch (error) {
    dependencies.nack(message, true);
    return {
      error: error instanceof Error ? error.message : 'publish failed',
      outcome: 'publish_failed',
      parsed
    };
  }
}

export async function replayIamEmailDlq(
  options: IamEmailDlqReplayOptions,
  dependencies?: Partial<ReplayDependencies>
): Promise<IamEmailReplayResult[]> {
  const runtimeConfig = options.runtimeConfig ?? loadRuntimeConfig();
  const topology = resolveTopology(runtimeConfig);
  const results: IamEmailReplayResult[] = [];

  if (dependencies) {
    if (options.messageId) {
      const maxScan = options.maxScan ?? 1000;
      let scanned = 0;
      let found = false;
      const skipped: GetMessage[] = [];

      while (scanned < maxScan) {
        const message = await dependencies.get!(topology.deadLetterQueue);
        if (!message) {
          break;
        }

        scanned += 1;

        if (messageMatchesId(message, options.messageId)) {
          found = true;
          results.push(
            await replaySingleMessage(
              topology,
              message,
              options.dryRun ?? false,
              dependencies as ReplayDependencies
            )
          );
          break;
        }

        skipped.push(message);
      }

      for (const msg of skipped) {
        dependencies.nack!(msg, true);
      }

      if (!found) {
        results.push({ outcome: 'not_found' });
      }

      return results;
    }

    const replayCount = Math.max(1, options.count ?? 1);
    for (let index = 0; index < replayCount; index += 1) {
      const message = await dependencies.get!(topology.deadLetterQueue);
      if (!message) {
        break;
      }

      results.push(
        await replaySingleMessage(
          topology,
          message,
          options.dryRun ?? false,
          dependencies as ReplayDependencies
        )
      );
    }

    return results;
  }

  const connection = await connect(runtimeConfig.brokerUrl as string);
  const channel = await connection.createConfirmChannel();

  const liveDependencies: ReplayDependencies = {
    ack: (message) => {
      channel.ack(message);
    },
    checkQueue: (queueName) => channel.checkQueue(queueName),
    get: (queueName) => channel.get(queueName, { noAck: false }),
    nack: (message, requeue) => {
      channel.nack(message, false, requeue);
    },
    publish: (exchange, routingKey, content, properties) =>
      publishWithConfirm(channel, exchange, routingKey, {
        content,
        fields: {
          deliveryTag: 0,
          exchange,
          redelivered: false,
          routingKey
        },
        properties
      } as GetMessage)
  };

  try {
    return await replayIamEmailDlq(options, liveDependencies);
  } finally {
    await channel.close().catch(() => undefined);
    await connection.close().catch(() => undefined);
  }
}

export function getIamEmailDlqTopology(runtimeConfig?: RuntimeConfig) {
  return resolveTopology(runtimeConfig ?? loadRuntimeConfig());
}
