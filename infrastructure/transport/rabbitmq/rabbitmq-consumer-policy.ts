import type { ExecutionContext } from '@nestjs/common';
import { ApplicationError } from '../../errors/application-error';
import { getRabbitMqContextFromExecutionContext } from './rabbitmq-request-context';

export type RabbitMqConsumerDisposition = 'reject' | 'requeue';

export function resolveRabbitMqConsumerDisposition(
    error: unknown
): RabbitMqConsumerDisposition {
    return error instanceof ApplicationError ? 'reject' : 'requeue';
}

export function applyRabbitMqConsumerDisposition(
    context: ExecutionContext,
    error: unknown
): RabbitMqConsumerDisposition {
    const rabbitMqContext = getRabbitMqContextFromExecutionContext(context);
    const channel = rabbitMqContext?.getChannelRef();
    const message = rabbitMqContext?.getMessage();
    const disposition = resolveRabbitMqConsumerDisposition(error);

    if (
        !channel ||
        typeof channel.nack !== 'function' ||
        !message
    ) {
        return disposition;
    }

    channel.nack(message, false, disposition === 'requeue');
    return disposition;
}

export function acknowledgeRabbitMqMessage(context: ExecutionContext): void {
    const rabbitMqContext = getRabbitMqContextFromExecutionContext(context);
    const channel = rabbitMqContext?.getChannelRef();
    const message = rabbitMqContext?.getMessage();

    if (channel && typeof channel.ack === 'function' && message) {
        channel.ack(message);
    }
}
