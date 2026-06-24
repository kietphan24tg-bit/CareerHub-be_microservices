import {
  JOB_ARCHIVED_EVENT_NAME,
  JOB_CLOSED_EVENT_NAME,
  JOB_DELETED_EVENT_NAME,
  JOB_PUBLISHED_EVENT_NAME,
  JOB_REOPENED_EVENT_NAME,
  JOB_UPDATED_EVENT_NAME,
  type JobEventPayload
} from '@careerhub/contracts';
import {
  assertRabbitMqParkingDeadLetterTopology,
  assertRabbitMqTimedRetryTopology,
  getRabbitMqRetryCount,
  getRuntimeConfig,
  publishToRabbitMqRetryQueue,
  type EnvironmentVariables,
  type MetricsRegistry,
  type RabbitMqTimedRetryTopology
} from '@careerhub/infrastructure';
import {
  connect,
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage
} from 'amqplib';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JOB_PORT_TOKENS,
  type JobRepository,
  type JobSearchIndexer
} from '../../application/ports';
import { JOB_METRICS_TOKENS } from '../metrics/job-metrics.constants';
import type { JobEnvironmentVariables } from '../../config/job-env.schema';

const OUTBOX_EVENTS_EXCHANGE = 'events';
const JOB_SEARCH_INDEX_QUEUE = 'job.search-index';
const RECONNECT_DELAY_MS = 5_000;
const CONSUMER_NAME = 'job-search-index';
const MAX_RETRY_COUNT = 5;
const RETRY_DELAY_STEPS_MS = [5_000, 30_000, 120_000] as const;

const JOB_INDEX_EVENT_NAMES = [
  JOB_PUBLISHED_EVENT_NAME,
  JOB_UPDATED_EVENT_NAME,
  JOB_CLOSED_EVENT_NAME,
  JOB_ARCHIVED_EVENT_NAME,
  JOB_REOPENED_EVENT_NAME,
  JOB_DELETED_EVENT_NAME
] as const;

type JobIndexEventName = (typeof JOB_INDEX_EVENT_NAMES)[number];

function isJobIndexEvent(
  value: unknown
): value is { name: JobIndexEventName; payload: JobEventPayload } {
  if (!value || typeof value !== 'object') return false;
  const v = value as { name?: unknown; payload?: unknown };
  return (
    typeof v.name === 'string' &&
    (JOB_INDEX_EVENT_NAMES as readonly string[]).includes(v.name) &&
    typeof v.payload === 'object' &&
    v.payload !== null &&
    typeof (v.payload as JobEventPayload).jobId === 'string'
  );
}

@Injectable()
export class JobSearchIndexConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobSearchIndexConsumer.name);
  private readonly runtimeConfig: ReturnType<typeof getRuntimeConfig>;
  private channel?: ConfirmChannel;
  private connecting = false;
  private connection?: ChannelModel;
  private consumerTag?: string;
  private reconnectTimer?: NodeJS.Timeout;
  private retryTopology?: RabbitMqTimedRetryTopology;
  private shuttingDown = false;

  constructor(
    @Inject(JOB_PORT_TOKENS.jobRepository)
    private readonly jobRepository: JobRepository,
    @Optional() @Inject(JOB_PORT_TOKENS.jobSearchIndexer)
    private readonly jobSearchIndexer: JobSearchIndexer | null,
    @Inject(JOB_METRICS_TOKENS.registry)
    private readonly metricsRegistry: MetricsRegistry,
    configService: ConfigService<JobEnvironmentVariables & EnvironmentVariables, true>
  ) {
    this.runtimeConfig = getRuntimeConfig(configService);
  }

  isEnabled(): boolean {
    return (
      !!this.jobSearchIndexer &&
      typeof this.runtimeConfig.brokerUrl === 'string' &&
      this.runtimeConfig.brokerUrl.length > 0
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.log(
        'Job search index consumer disabled; Meilisearch or broker URL missing'
      );
      return;
    }

    await this.connectAndSubscribe();
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.channel && this.consumerTag) {
      await this.channel.cancel(this.consumerTag).catch(() => undefined);
    }

    await this.closeConnection();
  }

  private async connectAndSubscribe(): Promise<void> {
    if (this.connecting || this.shuttingDown) return;
    this.connecting = true;

    try {
      await this.closeConnection();
      await this.startConsumer();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to start job search index consumer: ${msg}`);
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  private async startConsumer(): Promise<void> {
    this.connection = await connect(this.runtimeConfig.brokerUrl as string);
    this.channel = await this.connection.createConfirmChannel();
    const connection = this.connection;
    const channel = this.channel;

    connection.on('close', () => {
      this.connection = undefined;
      this.channel = undefined;
      this.consumerTag = undefined;
      this.retryTopology = undefined;
      this.scheduleReconnect();
    });
    connection.on('error', (err: Error) => {
      this.logger.warn(`Job search index RabbitMQ connection error: ${err.message}`);
    });
    channel.on('close', () => {
      this.channel = undefined;
      this.consumerTag = undefined;
      this.retryTopology = undefined;
      this.scheduleReconnect();
    });
    channel.on('error', (err: Error) => {
      this.logger.warn(`Job search index RabbitMQ channel error: ${err.message}`);
    });

    const topology = await assertRabbitMqParkingDeadLetterTopology(
      channel,
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE,
      JOB_SEARCH_INDEX_QUEUE
    );

    this.retryTopology = await assertRabbitMqTimedRetryTopology(
      channel,
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE,
      JOB_SEARCH_INDEX_QUEUE,
      JOB_PUBLISHED_EVENT_NAME,
      RETRY_DELAY_STEPS_MS
    );

    for (const eventName of JOB_INDEX_EVENT_NAMES) {
      await channel.bindQueue(topology.queue, topology.exchange, eventName);
    }

    await channel.prefetch(this.runtimeConfig.brokerPrefetchCount);

    const consumeResult = await channel.consume(
      topology.queue,
      (message) => {
        void this.handleMessage(channel, message);
      },
      { noAck: false }
    );

    this.consumerTag = consumeResult.consumerTag;
    this.logger.log(
      `Job search index consumer subscribed to ${JOB_INDEX_EVENT_NAMES.join(', ')}`
    );
  }

  private async handleMessage(
    channel: ConfirmChannel,
    message: ConsumeMessage | null
  ): Promise<void> {
    if (!message || !this.jobSearchIndexer) return;

    const startedAt = Date.now();
    let parsed: unknown;

    try {
      parsed = JSON.parse(message.content.toString('utf8')) as unknown;
    } catch {
      this.logger.warn('Job search index: malformed JSON payload');
      this.recordOutcome('unknown', 'malformed_payload', 'error', Date.now() - startedAt);
      channel.ack(message);
      return;
    }

    if (!isJobIndexEvent(parsed)) {
      const eventName =
        typeof (parsed as { name?: unknown }).name === 'string'
          ? (parsed as { name: string }).name
          : 'unknown';
      this.logger.warn(`Job search index: unsupported event "${eventName}", skipping`);
      this.recordOutcome(eventName, 'unsupported_payload', 'error', Date.now() - startedAt);
      channel.ack(message);
      return;
    }

    const { jobId } = parsed.payload;
    const eventName = parsed.name;
    const retryCount = getRabbitMqRetryCount(message);

    try {
      if (
        eventName === JOB_CLOSED_EVENT_NAME ||
        eventName === JOB_ARCHIVED_EVENT_NAME ||
        eventName === JOB_DELETED_EVENT_NAME
      ) {
        await this.jobSearchIndexer.remove(jobId);
        this.logger.debug(`Job removed from search index: ${jobId}`);
      } else {
        const job = await this.jobRepository.findById(jobId);

        if (!job) {
          this.logger.warn(`Job ${jobId} not found for search indexing, acknowledging`);
          this.recordOutcome(eventName, 'job_not_found', 'error', Date.now() - startedAt);
          channel.ack(message);
          return;
        }

        if (eventName === JOB_PUBLISHED_EVENT_NAME) {
          await this.jobSearchIndexer.index(job);
          this.logger.debug(`Job indexed in search: ${jobId}`);
        } else {
          await this.jobSearchIndexer.update(job);
          this.logger.debug(`Job updated in search index: ${jobId}`);
        }
      }

      this.recordOutcome(eventName, 'indexed', 'processed', Date.now() - startedAt);
      channel.ack(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (retryCount >= MAX_RETRY_COUNT) {
        this.logger.error(
          `Job search index retries exhausted for ${jobId} after ${retryCount} attempts: ${errorMessage}`
        );
        this.recordOutcome(eventName, 'retry_exhausted', 'error', Date.now() - startedAt);

        if (this.runtimeConfig.brokerDeadLetterEnabled) {
          channel.nack(message, false, false);
        } else {
          channel.ack(message);
        }
        return;
      }

      const retryTopology = this.retryTopology;

      if (!retryTopology || !this.runtimeConfig.brokerDeadLetterEnabled) {
        this.logger.warn(
          `Job search index retry (immediate requeue) for ${jobId} attempt ${retryCount + 1}: ${errorMessage}`
        );
        channel.nack(message, false, true);
        return;
      }

      try {
        await publishToRabbitMqRetryQueue(
          channel,
          this.runtimeConfig,
          message,
          retryTopology,
          retryCount + 1
        );
        this.logger.warn(
          `Retrying job search index for ${jobId} attempt ${retryCount + 1}: ${errorMessage}`
        );
        channel.ack(message);
      } catch {
        channel.nack(message, false, false);
      }
    }
  }

  private recordOutcome(
    eventName: string,
    reason: string,
    status: 'dead_lettered' | 'duplicate' | 'error' | 'processed',
    durationMs: number
  ): void {
    this.metricsRegistry.recordIntegrationConsumer({
      consumer: CONSUMER_NAME,
      eventName,
      reason,
      service: this.runtimeConfig.serviceName,
      status
    });
    this.metricsRegistry.recordIntegrationConsumerDuration?.({
      consumer: CONSUMER_NAME,
      durationMs,
      eventName,
      reason,
      service: this.runtimeConfig.serviceName,
      status
    });
  }

  private scheduleReconnect(): void {
    if (this.shuttingDown || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connectAndSubscribe();
    }, RECONNECT_DELAY_MS);
  }

  private async closeConnection(): Promise<void> {
    const channel = this.channel;
    const connection = this.connection;
    this.channel = undefined;
    this.connection = undefined;
    this.consumerTag = undefined;
    this.retryTopology = undefined;
    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
  }
}
