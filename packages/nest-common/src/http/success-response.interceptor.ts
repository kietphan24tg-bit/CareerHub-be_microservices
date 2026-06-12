import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    StreamableFile
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
    implements NestInterceptor<TData, unknown>
{
    intercept(
        context: ExecutionContext,
        next: CallHandler<TData>
    ): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle().pipe(map((data) => this.mapResponse(data)));
        }

        return next.handle().pipe(map((data) => this.mapResponse(data)));
    }

    private mapResponse(data: TData): unknown {
        if (data instanceof StreamableFile) {
            return data;
        }

        return this.wrapResponse(data);
    }

    private wrapResponse(data: TData): HttpSuccessResponse<TData> {
        if (isObject(data) && data.success === true) {
            return data as unknown as HttpSuccessResponse<TData>;
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
