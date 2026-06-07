import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor
} from '@nestjs/common';
import { SpanKind, SpanStatusCode, context } from '@opentelemetry/api';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { bindCorrelationContext } from '../../tracing/correlation-context';
import { startSpan, runWithSpanContext } from '../../tracing/open-telemetry';
import { getRequestIdFromHttpRequest } from '../../../runtime/request-context/request-id';

@Injectable()
export class HttpTracingInterceptor implements NestInterceptor {
    intercept(contextHost: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (contextHost.getType() !== 'http') {
            return next.handle();
        }

        const httpContext = contextHost.switchToHttp();
        const request = httpContext.getRequest();
        const response = httpContext.getResponse();
        const method = request.method;
        const path = request.route?.path ?? request.path ?? request.url;
        const requestId = getRequestIdFromHttpRequest(request);
        const span = startSpan(`${method} ${path}`, {
            attributes: {
                'http.method': method,
                'http.route': path,
                'http.target': request.originalUrl ?? request.url,
                'careerhub.request_id': requestId ?? ''
            },
            kind: SpanKind.SERVER
        });
        const parentContext = context.active();

        return runWithSpanContext(span, parentContext, () => {
            bindCorrelationContext({
                requestId
            });

            return next.handle().pipe(
                tap(() => {
                    span.setAttribute(
                        'http.status_code',
                        response.statusCode
                    );
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
