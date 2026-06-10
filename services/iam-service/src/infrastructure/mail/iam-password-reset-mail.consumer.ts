import {
  IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
  type IamPasswordResetRequestedIntegrationEvent
} from '@careerhub/contracts';
import {
  getRabbitMqExchangeName,
  getRabbitMqQueueName,
  getRuntimeConfig,
  type EnvironmentVariables
} from '@careerhub/infrastructure';
import {
  connect,
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage
} from 'amqplib';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getIamRuntimeConfig,
  type IamEnvironmentVariables
} from '../../config';
import {
  IAM_PORT_TOKENS,
  type PasswordResetTokenRepository
} from '../../application';
import { IAM_METRICS_TOKENS } from '../metrics/iam-metrics.constants';
import { PasswordResetTokenFactory } from '../auth/password-reset-token.factory';
import { MailConfigurationError, MailService } from './mail.service';
import type { MetricsRegistry } from '@careerhub/infrastructure';
import { Inject } from '@nestjs/common';

const OUTBOX_EVENTS_EXCHANGE = 'events';
const PASSWORD_RESET_MAIL_QUEUE = 'iam.password-reset-mail';
const RECONNECT_DELAY_MS = 5_000;
const RETRY_COUNT_HEADER = 'x-careerhub-retry-count';
const PASSWORD_RESET_MAIL_CONSUMER = 'iam-password-reset-mail';

function isPasswordResetRequestedEvent(
  value: unknown
): value is IamPasswordResetRequestedIntegrationEvent {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as IamPasswordResetRequestedIntegrationEvent).name ===
      IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME &&
    typeof (value as IamPasswordResetRequestedIntegrationEvent).payload ===
      'object' &&
    typeof (value as IamPasswordResetRequestedIntegrationEvent).payload.email ===
      'string' &&
    typeof (value as IamPasswordResetRequestedIntegrationEvent).payload
      .expiresAt === 'string' &&
    typeof (value as IamPasswordResetRequestedIntegrationEvent).payload
      .identityId === 'string' &&
    typeof (value as IamPasswordResetRequestedIntegrationEvent).payload
      .resetTokenId === 'string'
  );
}

@Injectable()
export class IamPasswordResetMailConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly claimTimeoutMs: number;
  private readonly logger = new Logger(IamPasswordResetMailConsumer.name);
  private readonly maxRetryCount: number;
  private readonly runtimeConfig: ReturnType<typeof getRuntimeConfig>;
  private channel?: ConfirmChannel;
  private connecting = false;
  private connection?: ChannelModel;
  private consumerTag?: string;
  private reconnectTimer?: NodeJS.Timeout;
  private shuttingDown = false;

  constructor(
    private readonly mailService: MailService,
    private readonly passwordResetTokenFactory: PasswordResetTokenFactory,
    @Inject(IAM_PORT_TOKENS.passwordResetTokenRepository)
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    @Inject(IAM_METRICS_TOKENS.registry)
    private readonly metricsRegistry: MetricsRegistry,
    configService: ConfigService<IamEnvironmentVariables & EnvironmentVariables, true>
  ) {
    const iamRuntimeConfig = getIamRuntimeConfig(configService);
    this.claimTimeoutMs = iamRuntimeConfig.passwordResetMailClaimTimeoutMs;
    this.maxRetryCount = iamRuntimeConfig.passwordResetMailMaxRetries;
    this.runtimeConfig = getRuntimeConfig(configService);
  }

  isEnabled(): boolean {
    return (
      typeof this.runtimeConfig.brokerUrl === 'string' &&
      this.runtimeConfig.brokerUrl.length > 0
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.log('Password reset mail consumer is disabled; broker URL is missing');
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
    if (this.connecting || this.shuttingDown) {
      return;
    }

    this.connecting = true;

    try {
      await this.closeConnection();
      await this.startConsumer();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown RabbitMQ consumer error';
      this.logger.warn(`Failed to start password reset mail consumer: ${errorMessage}`);
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
      this.logger.warn('Password reset mail RabbitMQ connection closed');
      this.connection = undefined;
      this.channel = undefined;
      this.consumerTag = undefined;
      this.scheduleReconnect();
    });
    connection.on('error', (error: Error) => {
      this.logger.warn(
        `Password reset mail RabbitMQ connection error: ${error.message}`
      );
    });
    channel.on('close', () => {
      this.logger.warn('Password reset mail RabbitMQ channel closed');
      this.channel = undefined;
      this.consumerTag = undefined;
      this.scheduleReconnect();
    });
    channel.on('error', (error: Error) => {
      this.logger.warn(`Password reset mail RabbitMQ channel error: ${error.message}`);
    });

    const exchange = getRabbitMqExchangeName(
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE
    );
    const queue = getRabbitMqQueueName(
      this.runtimeConfig,
      PASSWORD_RESET_MAIL_QUEUE
    );
    await channel.assertExchange(exchange, 'topic', {
      durable: this.runtimeConfig.brokerDurable
    });
    await channel.assertQueue(queue, {
      durable: this.runtimeConfig.brokerDurable
    });
    await channel.bindQueue(
      queue,
      exchange,
      IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME
    );
    await channel.prefetch(this.runtimeConfig.brokerPrefetchCount);

    const consumeResult = await channel.consume(
      queue,
      (message) => {
        void this.handleMessage(channel, message);
      },
      {
        noAck: false
      }
    );

    this.consumerTag = consumeResult.consumerTag;
    this.logger.log(
      `Password reset mail consumer subscribed to ${IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME}`
    );
  }

  private async handleMessage(
    channel: ConfirmChannel,
    message: ConsumeMessage | null
  ): Promise<void> {
    if (!message) {
      return;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(message.content.toString('utf8')) as unknown;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Invalid JSON payload';
      this.logger.warn(`Ignoring malformed password reset mail event: ${errorMessage}`);
      this.metricsRegistry.recordIntegrationConsumer({
        consumer: PASSWORD_RESET_MAIL_CONSUMER,
        eventName: 'unknown',
        service: this.runtimeConfig.serviceName,
        status: 'error'
      });
      channel.ack(message);
      return;
    }

    if (!isPasswordResetRequestedEvent(parsed)) {
      this.logger.warn('Ignoring unsupported password reset mail event payload');
      this.metricsRegistry.recordIntegrationConsumer({
        consumer: PASSWORD_RESET_MAIL_CONSUMER,
        eventName:
          typeof (parsed as { name?: unknown }).name === 'string'
            ? (parsed as { name: string }).name
            : 'unknown',
        service: this.runtimeConfig.serviceName,
        status: 'error'
      });
      channel.ack(message);
      return;
    }

    const now = new Date();
    const claimed = await this.passwordResetTokenRepository.claimMailDelivery(
      parsed.payload.resetTokenId,
      now,
      new Date(now.getTime() - this.claimTimeoutMs)
    );

    if (!claimed) {
      this.logger.log(
        `Skipping duplicate or in-flight password reset mail event for token ${parsed.payload.resetTokenId}`
      );
      channel.ack(message);
      return;
    }

    try {
      const resetToken = this.passwordResetTokenFactory.createToken({
        expiresAt: parsed.payload.expiresAt,
        identityId: parsed.payload.identityId,
        tokenId: parsed.payload.resetTokenId
      });

      await this.mailService.sendPasswordResetMail({
        email: parsed.payload.email,
        expiresAt: parsed.payload.expiresAt,
        identityId: parsed.payload.identityId,
        resetToken
      });
      await this.passwordResetTokenRepository.markMailSent(
        parsed.payload.resetTokenId,
        new Date()
      );
      this.metricsRegistry.recordIntegrationConsumer({
        consumer: PASSWORD_RESET_MAIL_CONSUMER,
        eventName: parsed.name,
        service: this.runtimeConfig.serviceName,
        status: 'processed'
      });
      channel.ack(message);
    } catch (error) {
      if (error instanceof MailConfigurationError) {
        await this.passwordResetTokenRepository.clearMailDeliveryClaim(
          parsed.payload.resetTokenId
        );
        this.logger.error(
          `Password reset mail is not configured; acknowledging event without retry: ${error.message}`
        );
        this.metricsRegistry.recordIntegrationConsumer({
          consumer: PASSWORD_RESET_MAIL_CONSUMER,
          eventName: parsed.name,
          service: this.runtimeConfig.serviceName,
          status: 'error'
        });
        channel.ack(message);
        return;
      }

      const retryCount = this.getRetryCount(message);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown password reset mail error';
      this.metricsRegistry.recordIntegrationConsumer({
        consumer: PASSWORD_RESET_MAIL_CONSUMER,
        eventName: parsed.name,
        service: this.runtimeConfig.serviceName,
        status: 'error'
      });

      if (retryCount >= this.maxRetryCount) {
        await this.passwordResetTokenRepository.clearMailDeliveryClaim(
          parsed.payload.resetTokenId
        );
        this.logger.error(
          `Password reset mail retries exhausted for message ${message.properties.messageId ?? 'unknown'} after ${retryCount} retries; acknowledging event: ${errorMessage}`
        );
        channel.ack(message);
        return;
      }

      try {
        await this.republishForRetry(channel, message, parsed.name, retryCount + 1);
        await this.passwordResetTokenRepository.clearMailDeliveryClaim(
          parsed.payload.resetTokenId
        );
        this.logger.warn(
          `Retrying password reset mail event ${message.properties.messageId ?? 'unknown'} attempt ${retryCount + 1}/${this.maxRetryCount}: ${errorMessage}`
        );
        channel.ack(message);
      } catch (republishError) {
        await this.passwordResetTokenRepository.clearMailDeliveryClaim(
          parsed.payload.resetTokenId
        );
        const republishErrorMessage =
          republishError instanceof Error
            ? republishError.message
            : 'Unknown retry scheduling error';
        this.logger.warn(
          `Failed to schedule password reset mail retry: ${republishErrorMessage}`
        );
        channel.nack(message, false, true);
      }
    }
  }

  private getRetryCount(message: ConsumeMessage): number {
    const value = message.properties.headers?.[RETRY_COUNT_HEADER];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && Number.isFinite(Number(value))) {
      return Number(value);
    }

    return 0;
  }

  private async republishForRetry(
    channel: ConfirmChannel,
    message: ConsumeMessage,
    eventName: string,
    retryCount: number
  ): Promise<void> {
    const exchange = getRabbitMqExchangeName(
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE
    );
    const headers = {
      ...(message.properties.headers ?? {}),
      [RETRY_COUNT_HEADER]: retryCount
    };

    channel.publish(exchange, eventName, message.content, {
      contentType: message.properties.contentType ?? 'application/json',
      deliveryMode: this.runtimeConfig.brokerDurable ? 2 : 1,
      headers,
      messageId: message.properties.messageId,
      timestamp: Date.now(),
      type: message.properties.type ?? eventName
    });

    await channel.waitForConfirms();
  }

  private scheduleReconnect(): void {
    if (this.shuttingDown || this.reconnectTimer) {
      return;
    }

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

    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
  }
}
