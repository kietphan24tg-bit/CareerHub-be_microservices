import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor
} from '@nestjs/common';
import { catchError, Observable, tap, throwError } from 'rxjs';
import {
    getRabbitMqExchangeFromExecutionContext,
    getRabbitMqPatternFromExecutionContext,
    getRabbitMqRoutingKeyFromExecutionContext
} from '../../../transport/rabbitmq/rabbitmq-request-context';
import type { MetricsRegistry } from '../../metrics/metrics.types';

type RabbitMqMetricsOptions = {
    queue?: string;
    serviceName?: string;
};

@Injectable()
export class RabbitMqMetricsInterceptor implements NestInterceptor {
    constructor(
        private readonly metrics?: MetricsRegistry,
        private readonly options?: RabbitMqMetricsOptions
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType<'rpc' | 'http'>() !== 'rpc') {
            return next.handle();
        }

        const startedAt = Date.now();
        const pattern = getRabbitMqPatternFromExecutionContext(context);
        const exchange = getRabbitMqExchangeFromExecutionContext(context);
        const routingKey = getRabbitMqRoutingKeyFromExecutionContext(context);

        return next.handle().pipe(
            tap(() => {
                this.metrics?.recordRmqRequest({
                    durationMs: Date.now() - startedAt,
                    exchange,
                    pattern,
                    queue: this.options?.queue,
                    routingKey,
                    service: this.options?.serviceName,
                    status: 'success'
                });
            }),
            catchError((error: unknown) => {
                const durationMs = Date.now() - startedAt;
                const baseRecord = {
                    durationMs,
                    exchange,
                    pattern,
                    queue: this.options?.queue,
                    routingKey,
                    service: this.options?.serviceName,
                    status: 'error' as const
                };

                this.metrics?.recordRmqRequest(baseRecord);
                this.metrics?.recordRmqError(baseRecord);

                return throwError(() => error);
            })
        );
    }
}
