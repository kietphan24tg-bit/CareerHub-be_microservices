import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class HttpTracingInterceptor implements NestInterceptor {
    intercept(contextHost: ExecutionContext, next: CallHandler): Observable<unknown>;
}
