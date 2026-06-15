import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RuntimeLogger } from '../../logging/runtime-logger';
export declare class GrpcLoggingInterceptor implements NestInterceptor {
    private readonly logger;
    constructor(logger: RuntimeLogger);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
