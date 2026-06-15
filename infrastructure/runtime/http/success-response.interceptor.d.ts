import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class SuccessResponseInterceptor<TData = unknown> implements NestInterceptor<TData, unknown> {
    intercept(context: ExecutionContext, next: CallHandler<TData>): Observable<unknown>;
    private mapResponse;
    private wrapResponse;
}
