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
import type { IamEnvironmentVariables } from '../../config';
import { PasswordResetTokenFactory } from '../auth/password-reset-token.factory';
import { MailService } from './mail.service';

const OUTBOX_EVENTS_EXCHANGE = 'events';
const PASSWORD_RESET_MAIL_QUEUE = 'iam.password-reset-mail';
const RECONNECT_DELAY_MS = 5_000;

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
  private readonly logger = new Logger(IamPasswordResetMailConsumer.name);
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
    configService: ConfigService<IamEnvironmentVariables & EnvironmentVariables, true>
  ) {
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

    try {
      const parsed = JSON.parse(message.content.toString('utf8')) as unknown;

      if (!isPasswordResetRequestedEvent(parsed)) {
        this.logger.warn('Ignoring unsupported password reset mail event payload');
        channel.ack(message);
        return;
      }

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
      channel.ack(message);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown password reset mail error';
      this.logger.warn(`Failed to process password reset mail event: ${errorMessage}`);
      channel.nack(message, false, true);
    }
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
