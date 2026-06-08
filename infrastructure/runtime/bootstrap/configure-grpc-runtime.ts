import type { NestInterceptor } from '@nestjs/common';
import { GrpcLoggingInterceptor } from '../../observability/interceptors/grpc/grpc-logging.interceptor';
import { GrpcMetricsInterceptor } from '../../observability/interceptors/grpc/grpc-metrics.interceptor';
import { GrpcTracingInterceptor } from '../../observability/interceptors/grpc/grpc-tracing.interceptor';
import type { HttpRuntimeFoundation } from './configure-http-runtime';

type InterceptorTarget = {
    useGlobalInterceptors(
        ...interceptors: NestInterceptor[]
    ): unknown;
};

export function configureGrpcRuntime(
    target: InterceptorTarget,
    foundation: Pick<HttpRuntimeFoundation, 'logger' | 'metricsRegistry'>
): void {
    target.useGlobalInterceptors(
        new GrpcTracingInterceptor(),
        new GrpcLoggingInterceptor(foundation.logger),
        new GrpcMetricsInterceptor(foundation.metricsRegistry)
    );
}
