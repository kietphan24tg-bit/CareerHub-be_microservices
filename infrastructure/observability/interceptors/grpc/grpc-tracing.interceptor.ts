import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor
} from '@nestjs/common';
import {
    SpanKind,
    SpanStatusCode,
    context,
    propagation
} from '@opentelemetry/api';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { bindCorrelationContext } from '../../tracing/correlation-context';
import { runWithSpanContext, startSpan } from '../../tracing/open-telemetry';
import {
    getGrpcMetadataCarrier,
    getGrpcMetadataFromExecutionContext,
    getGrpcPatternFromExecutionContext,
    getRequestIdFromGrpcMetadata,
    getRequestIdFromGrpcPayload
} from '../../../transport/grpc/grpc-request-context';

@Injectable()
export class GrpcTracingInterceptor implements NestInterceptor {
    intercept(contextHost: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (contextHost.getType<'rpc' | 'http'>() !== 'rpc') {
            return next.handle();
        }

        const metadata = getGrpcMetadataFromExecutionContext(contextHost);
        const requestPayload = contextHost.switchToRpc().getData();
        const requestId =
            getRequestIdFromGrpcMetadata(metadata) ??
            getRequestIdFromGrpcPayload(requestPayload);
        const pattern = getGrpcPatternFromExecutionContext(contextHost);
        const parentContext = metadata
            ? propagation.extract(context.active(), getGrpcMetadataCarrier(metadata))
            : context.active();
        const span = startSpan(
            pattern,
            {
                attributes: {
                    'rpc.system': 'grpc',
                    'rpc.method': pattern,
                    'careerhub.request_id': requestId ?? ''
                },
                kind: SpanKind.SERVER
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
