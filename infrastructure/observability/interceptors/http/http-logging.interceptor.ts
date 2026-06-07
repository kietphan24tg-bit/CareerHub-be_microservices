import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor
} from '@nestjs/common';
import { catchError, Observable, tap, throwError } from 'rxjs';
import type { RuntimeConfig } from '../../../runtime/config/runtime-config';
import type { MetricsRegistry } from '../../metrics/metrics.types';
import { getRequestIdFromHttpRequest } from '../../../runtime/request-context/request-id';
import { mapErrorToHttpException } from '../../../runtime/http/http-error.mapper';
import { shouldIgnoreHttpLog } from '../../logging/logging.config';
import { RuntimeLogger } from '../../logging/runtime-logger';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
    constructor(
        private readonly logger: RuntimeLogger,
        private readonly metrics?: MetricsRegistry,
        private readonly runtimeConfig?: Pick<RuntimeConfig, 'httpLogEnabled'>
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        const response = httpContext.getResponse();
        const startedAt = Date.now();
        const requestId = getRequestIdFromHttpRequest(request);
        const method = request.method;
        const path = request.originalUrl ?? request.url;
        const route = request.route?.path ?? request.path ?? path;
        const shouldLog = this.runtimeConfig?.httpLogEnabled !== false && !shouldIgnoreHttpLog(path);
        const baseLogContext = {
            context: 'HttpLoggingInterceptor',
            method,
            path,
            requestId,
            userAgent:
                typeof request.headers['user-agent'] === 'string'
                    ? request.headers['user-agent']
                    : Array.isArray(request.headers['user-agent'])
                      ? request.headers['user-agent'][0]
                      : undefined
        };

        if (shouldLog) {
            this.logger.logHttpRequestStart(baseLogContext);
        }

        return next.handle().pipe(
            tap(() => {
                const latencyMs = Date.now() - startedAt;
                const statusCode = response.statusCode;

                this.metrics?.recordHttpRequest({
                    durationMs: latencyMs,
                    method,
                    route,
                    statusCode
                });
                if (shouldLog) {
                    this.logger.logHttpRequestComplete({
                        ...baseLogContext,
                        latencyMs,
                        statusCode
                    });
                }
            }),
            catchError((error: unknown) => {
                const latencyMs = Date.now() - startedAt;
                const statusCode = mapErrorToHttpException(error).getStatus();

                this.metrics?.recordHttpRequest({
                    durationMs: latencyMs,
                    method,
                    route,
                    statusCode
                });
                this.metrics?.recordHttpError({
                    method,
                    route,
                    statusCode
                });
                if (shouldLog) {
                    this.logger.logHttpRequestError({
                        ...baseLogContext,
                        error,
                        latencyMs,
                        statusCode
                    });
                }

                return throwError(() => error);
            })
        );
    }
}
