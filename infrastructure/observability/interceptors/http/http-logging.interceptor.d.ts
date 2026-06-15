import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { RuntimeConfig } from '../../../runtime/config/runtime-config';
import type { MetricsRegistry } from '../../metrics/metrics.types';
import { RuntimeLogger } from '../../logging/runtime-logger';
export declare class HttpLoggingInterceptor implements NestInterceptor {
    private readonly logger;
    private readonly metrics?;
    private readonly runtimeConfig?;
    constructor(logger: RuntimeLogger, metrics?: MetricsRegistry | undefined, runtimeConfig?: Pick<RuntimeConfig, "healthLivenessPath" | "healthPath" | "healthReadinessPath" | "httpLogEnabled" | "metricsPath"> | undefined);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
