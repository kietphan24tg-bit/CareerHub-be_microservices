import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { MetricsRegistry } from '../../metrics/metrics.types';
export declare class GrpcMetricsInterceptor implements NestInterceptor {
    private readonly metrics?;
    constructor(metrics?: MetricsRegistry | undefined);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
