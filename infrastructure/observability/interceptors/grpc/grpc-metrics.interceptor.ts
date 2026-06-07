import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor
} from '@nestjs/common';
import { catchError, Observable, tap, throwError } from 'rxjs';
import type { MetricsRegistry } from '../../metrics/metrics.types';

function resolveRpcPattern(context: ExecutionContext): string {
    const className = context.getClass().name || 'UnknownController';
    const handlerName = context.getHandler().name || 'unknown';

    return `${className}.${handlerName}`;
}

@Injectable()
export class GrpcMetricsInterceptor implements NestInterceptor {
    constructor(private readonly metrics?: MetricsRegistry) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType<'rpc' | 'http'>() !== 'rpc') {
            return next.handle();
        }

        const startedAt = Date.now();
        const pattern = resolveRpcPattern(context);

        return next.handle().pipe(
            tap(() => {
                this.metrics?.recordRpcRequest({
                    durationMs: Date.now() - startedAt,
                    pattern,
                    status: 'success'
                });
            }),
            catchError((error: unknown) => {
                const durationMs = Date.now() - startedAt;

                this.metrics?.recordRpcRequest({
                    durationMs,
                    pattern,
                    status: 'error'
                });
                this.metrics?.recordRpcError({
                    durationMs,
                    pattern,
                    status: 'error'
                });

                return throwError(() => error);
            })
        );
    }
}
