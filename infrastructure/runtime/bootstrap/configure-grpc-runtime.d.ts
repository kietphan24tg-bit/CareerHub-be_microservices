import type { NestInterceptor } from '@nestjs/common';
import type { HttpRuntimeFoundation } from './configure-http-runtime';
type InterceptorTarget = {
    useGlobalInterceptors(...interceptors: NestInterceptor[]): unknown;
};
export declare function configureGrpcRuntime(target: InterceptorTarget, foundation: Pick<HttpRuntimeFoundation, 'logger' | 'metricsRegistry'>): void;
export {};
