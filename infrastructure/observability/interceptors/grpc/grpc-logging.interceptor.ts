import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor
} from '@nestjs/common';
import { catchError, Observable, tap, throwError } from 'rxjs';
import {
    getGrpcMetadataFromExecutionContext,
    getGrpcPatternFromExecutionContext,
    getRequestIdFromGrpcMetadata,
    getRequestIdFromGrpcPayload
} from '../../../transport/grpc/grpc-request-context';
import { RuntimeLogger } from '../../logging/runtime-logger';

@Injectable()
export class GrpcLoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: RuntimeLogger) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType<'rpc' | 'http'>() !== 'rpc') {
            return next.handle();
        }

        const startedAt = Date.now();
        const metadata = getGrpcMetadataFromExecutionContext(context);
        const requestPayload = context.switchToRpc().getData();
        const requestId =
            getRequestIdFromGrpcMetadata(metadata) ??
            getRequestIdFromGrpcPayload(requestPayload);
        const pattern = getGrpcPatternFromExecutionContext(context);
        const baseLogContext = {
            context: 'GrpcLoggingInterceptor',
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
