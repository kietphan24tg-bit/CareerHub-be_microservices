import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor
} from '@nestjs/common';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { bindCorrelationContext } from '../../tracing/correlation-context';
import { runWithSpanContext, startSpan } from '../../tracing/open-telemetry';
import {
    extractTraceContextFromRabbitMqProperties,
    getRabbitMqExchangeFromExecutionContext,
    getRabbitMqPatternFromExecutionContext,
    getRabbitMqPropertiesFromExecutionContext,
    getRabbitMqRoutingKeyFromExecutionContext,
    getRequestIdFromRabbitMqProperties
} from '../../../transport/rabbitmq/rabbitmq-request-context';

@Injectable()
export class RabbitMqTracingInterceptor implements NestInterceptor {
    intercept(contextHost: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (contextHost.getType<'rpc' | 'http'>() !== 'rpc') {
            return next.handle();
        }

        const properties = getRabbitMqPropertiesFromExecutionContext(contextHost);
        const requestId = getRequestIdFromRabbitMqProperties(properties);
        const pattern = getRabbitMqPatternFromExecutionContext(contextHost);
        const exchange = getRabbitMqExchangeFromExecutionContext(contextHost);
        const routingKey = getRabbitMqRoutingKeyFromExecutionContext(contextHost);
        const parentContext = extractTraceContextFromRabbitMqProperties(properties);
        const span = startSpan(
            pattern,
            {
                attributes: {
                    'careerhub.request_id': requestId ?? '',
                    'messaging.destination.name': exchange ?? '',
                    'messaging.operation': 'process',
                    'messaging.rabbitmq.routing_key': routingKey ?? pattern,
                    'messaging.system': 'rabbitmq'
                },
                kind: SpanKind.CONSUMER
            },
            parentContext
        );

        return runWithSpanContext(span, parentContext, () => {
            bindCorrelationContext({
                requestId
            });

            return next.handle().pipe(
                tap(() => {
                    span.setStatus({
                        code: SpanStatusCode.OK
                    });
                    span.end();
                }),
                catchError((error: unknown) => {
                    span.recordException(
                        error instanceof Error ? error : new Error(String(error))
                    );
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message:
                            error instanceof Error ? error.message : String(error)
                    });
                    span.end();

                    return throwError(() => error);
                })
            );
        });
    }
}
