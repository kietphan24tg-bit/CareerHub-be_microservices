import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import type { HttpSuccessResponse } from './http-success-response';

type SuccessEnvelopeInput<TData> = {
    data?: TData;
    message?: string;
    success?: boolean;
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

@Injectable()
export class SuccessResponseInterceptor<TData = unknown>
    implements NestInterceptor<TData, HttpSuccessResponse<TData>>
{
    intercept(
        context: ExecutionContext,
        next: CallHandler<TData>
    ): Observable<HttpSuccessResponse<TData>> {
        if (context.getType() !== 'http') {
            return next.handle().pipe(map((data) => this.wrapResponse(data)));
        }

        return next.handle().pipe(map((data) => this.wrapResponse(data)));
    }

    private wrapResponse(data: TData): HttpSuccessResponse<TData> {
        if (isObject(data) && data.success === true) {
            return data as HttpSuccessResponse<TData>;
        }

        if (isObject(data)) {
            const maybeEnvelope = data as SuccessEnvelopeInput<TData>;

            if ('data' in maybeEnvelope || 'message' in maybeEnvelope) {
                return {
                    success: true,
                    data: (maybeEnvelope.data ?? data) as TData,
                    message: maybeEnvelope.message ?? 'Operation successful'
                };
            }
        }

        return {
            success: true,
            data,
            message: 'Operation successful'
        };
    }
}
