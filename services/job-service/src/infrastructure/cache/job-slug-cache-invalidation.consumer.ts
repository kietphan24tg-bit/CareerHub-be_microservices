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
  type JobSearchCache,
  type JobSlugCache
} from '../../application/ports';
import { JOB_METRICS_TOKENS } from '../metrics/job-metrics.constants';
import type { JobEnvironmentVariables } from '../../config/job-env.schema';

const OUTBOX_EVENTS_EXCHANGE = 'events';
const SLUG_CACHE_INVALIDATION_QUEUE = 'job.slug-cache-invalidation';
const RECONNECT_DELAY_MS = 5_000;
const CONSUMER_NAME = 'job-slug-cache-invalidation';
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_STEPS_MS = [5_000, 15_000, 60_000] as const;

const JOB_CACHE_EVENT_NAMES = [
  JOB_PUBLISHED_EVENT_NAME,
  JOB_UPDATED_EVENT_NAME,
  JOB_CLOSED_EVENT_NAME,
  JOB_ARCHIVED_EVENT_NAME,
  JOB_REOPENED_EVENT_NAME,
  JOB_DELETED_EVENT_NAME
] as const;

type JobCacheEventName = (typeof JOB_CACHE_EVENT_NAMES)[number];

function isJobCacheEvent(
  value: unknown
): value is { name: JobCacheEventName; payload: JobEventPayload } {
  if (!value || typeof value !== 'object') return false;
  const v = value as { name?: unknown; payload?: unknown };
  return (
    typeof v.name === 'string' &&
    (JOB_CACHE_EVENT_NAMES as readonly string[]).includes(v.name) &&
    typeof v.payload === 'object' &&
    v.payload !== null &&
    typeof (v.payload as JobEventPayload).slug === 'string'
  );
}

@Injectable()
export class JobSlugCacheInvalidationConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobSlugCacheInvalidationConsumer.name);
  private readonly runtimeConfig: ReturnType<typeof getRuntimeConfig>;
  private channel?: ConfirmChannel;
  private connecting = false;
  private connection?: ChannelModel;
  private consumerTag?: string;
  private reconnectTimer?: NodeJS.Timeout;
  private retryTopology?: RabbitMqTimedRetryTopology;
  private shuttingDown = false;

  constructor(
    @Optional() @Inject(JOB_PORT_TOKENS.slugCache)
    private readonly slugCache: JobSlugCache | null,
    @Optional() @Inject(JOB_PORT_TOKENS.jobSearchCache)
    private readonly jobSearchCache: JobSearchCache | null,
    @Inject(JOB_METRICS_TOKENS.registry)
    private readonly metricsRegistry: MetricsRegistry,
    configService: ConfigService<JobEnvironmentVariables & EnvironmentVariables, true>
  ) {
    this.runtimeConfig = getRuntimeConfig(configService);
  }

  isEnabled(): boolean {
    return (
      (!!this.slugCache || !!this.jobSearchCache) &&
      typeof this.runtimeConfig.brokerUrl === 'string' &&
      this.runtimeConfig.brokerUrl.length > 0
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.log(
        'Job cache invalidation consumer disabled; caches or broker URL missing'
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
      this.logger.warn(`Failed to start slug cache invalidation consumer: ${msg}`);
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
      this.logger.warn(`Slug cache invalidation RabbitMQ connection error: ${err.message}`);
    });
    channel.on('close', () => {
      this.channel = undefined;
      this.consumerTag = undefined;
      this.retryTopology = undefined;
      this.scheduleReconnect();
    });
    channel.on('error', (err: Error) => {
      this.logger.warn(`Slug cache invalidation RabbitMQ channel error: ${err.message}`);
    });

    const topology = await assertRabbitMqParkingDeadLetterTopology(
      channel,
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE,
      SLUG_CACHE_INVALIDATION_QUEUE
    );

    this.retryTopology = await assertRabbitMqTimedRetryTopology(
      channel,
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE,
      SLUG_CACHE_INVALIDATION_QUEUE,
      JOB_PUBLISHED_EVENT_NAME,
      RETRY_DELAY_STEPS_MS
    );

    for (const eventName of JOB_CACHE_EVENT_NAMES) {
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
      `Job slug cache invalidation consumer subscribed to ${JOB_CACHE_EVENT_NAMES.join(', ')}`
    );
  }

  private async handleMessage(
    channel: ConfirmChannel,
    message: ConsumeMessage | null
  ): Promise<void> {
    if (!message || (!this.slugCache && !this.jobSearchCache)) return;

    const startedAt = Date.now();
    let parsed: unknown;

    try {
      parsed = JSON.parse(message.content.toString('utf8')) as unknown;
    } catch {
      this.logger.warn('Slug cache invalidation: malformed JSON payload');
      this.metricsRegistry.recordIntegrationConsumer({
        consumer: CONSUMER_NAME,
        eventName: 'unknown',
        reason: 'malformed_payload',
        service: this.runtimeConfig.serviceName,
        status: 'error'
      });
      channel.ack(message);
      return;
    }

    if (!isJobCacheEvent(parsed)) {
      const eventName =
        typeof (parsed as { name?: unknown }).name === 'string'
          ? (parsed as { name: string }).name
          : 'unknown';
      this.logger.warn(
        `Slug cache invalidation: unsupported event "${eventName}", acknowledging and skipping`
      );
      this.metricsRegistry.recordIntegrationConsumer({
        consumer: CONSUMER_NAME,
        eventName,
        reason: 'unsupported_payload',
        service: this.runtimeConfig.serviceName,
        status: 'error'
      });
      channel.ack(message);
      return;
    }

    const { slug } = parsed.payload;
    const retryCount = getRabbitMqRetryCount(message);

    try {
      await Promise.all([
        this.slugCache?.del(slug),
        this.jobSearchCache?.invalidateAll()
      ]);
      this.logger.debug(`Job cache invalidated for slug: ${slug}`);
      this.metricsRegistry.recordIntegrationConsumer({
        consumer: CONSUMER_NAME,
        eventName: parsed.name,
        reason: 'cache_invalidated',
        service: this.runtimeConfig.serviceName,
        status: 'processed'
      });
      this.metricsRegistry.recordIntegrationConsumerDuration?.({
        consumer: CONSUMER_NAME,
        durationMs: Date.now() - startedAt,
        eventName: parsed.name,
        reason: 'cache_invalidated',
        service: this.runtimeConfig.serviceName,
        status: 'processed'
      });
      channel.ack(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (retryCount >= MAX_RETRY_COUNT) {
        this.logger.error(
          `Slug cache invalidation retries exhausted for slug "${slug}" after ${retryCount} attempts: ${errorMessage}`
        );
        this.metricsRegistry.recordIntegrationConsumer({
          consumer: CONSUMER_NAME,
          eventName: parsed.name,
          reason: 'retry_exhausted',
          service: this.runtimeConfig.serviceName,
          status: 'error'
        });

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
          `Slug cache invalidation retry (immediate requeue) for slug "${slug}" attempt ${retryCount + 1}: ${errorMessage}`
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
          `Retrying slug cache invalidation for slug "${slug}" attempt ${retryCount + 1}: ${errorMessage}`
        );
        channel.ack(message);
      } catch {
        channel.nack(message, false, false);
      }
    }
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
