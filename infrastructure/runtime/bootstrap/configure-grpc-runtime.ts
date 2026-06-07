import type { INestMicroservice } from '@nestjs/common';
import { GrpcLoggingInterceptor } from '../../observability/interceptors/grpc/grpc-logging.interceptor';
import { GrpcMetricsInterceptor } from '../../observability/interceptors/grpc/grpc-metrics.interceptor';
import { GrpcTracingInterceptor } from '../../observability/interceptors/grpc/grpc-tracing.interceptor';
import type { HttpRuntimeFoundation } from './configure-http-runtime';

export function configureGrpcRuntime(
    microservice: INestMicroservice,
    foundation: Pick<HttpRuntimeFoundation, 'logger' | 'metricsRegistry'>
): void {
    microservice.useGlobalInterceptors(
        new GrpcTracingInterceptor(),
        new GrpcLoggingInterceptor(foundation.logger),
        new GrpcMetricsInterceptor(foundation.metricsRegistry)
    );
}
