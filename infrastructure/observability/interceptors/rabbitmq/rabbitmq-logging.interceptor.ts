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
    getRabbitMqPropertiesFromExecutionContext,
    getRabbitMqRoutingKeyFromExecutionContext,
    getRequestIdFromRabbitMqProperties
} from '../../../transport/rabbitmq/rabbitmq-request-context';
import { RuntimeLogger } from '../../logging/runtime-logger';

type RabbitMqLoggingOptions = {
    queue?: string;
};

@Injectable()
export class RabbitMqLoggingInterceptor implements NestInterceptor {
    constructor(
        private readonly logger: RuntimeLogger,
        private readonly options?: RabbitMqLoggingOptions
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType<'rpc' | 'http'>() !== 'rpc') {
            return next.handle();
        }

        const properties = getRabbitMqPropertiesFromExecutionContext(context);
        const startedAt = Date.now();
        const requestId = getRequestIdFromRabbitMqProperties(properties);
        const pattern = getRabbitMqPatternFromExecutionContext(context);
        const exchange = getRabbitMqExchangeFromExecutionContext(context);
        const routingKey = getRabbitMqRoutingKeyFromExecutionContext(context);
        const baseLogContext = {
            context: 'RabbitMqLoggingInterceptor',
            details: {
                exchange,
                queue: this.options?.queue,
                routingKey
            },
            pattern,
            requestId
        };

        this.logger.logRpcRequestStart(baseLogContext);

        return next.handle().pipe(
            tap(() => {
                this.logger.logRpcRequestComplete({
                    ...baseLogContext,
                    latencyMs: Date.now() - startedAt
                });
            }),
            catchError((error: unknown) => {
                this.logger.logRpcRequestError({
                    ...baseLogContext,
                    error,
                    latencyMs: Date.now() - startedAt
                });

                return throwError(() => error);
            })
        );
    }
}
