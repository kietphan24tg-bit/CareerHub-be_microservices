"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrpcTracingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const api_1 = require("@opentelemetry/api");
const rxjs_1 = require("rxjs");
const correlation_context_1 = require("../../tracing/correlation-context");
const open_telemetry_1 = require("../../tracing/open-telemetry");
const grpc_request_context_1 = require("../../../transport/grpc/grpc-request-context");
let GrpcTracingInterceptor = class GrpcTracingInterceptor {
    intercept(contextHost, next) {
        if (contextHost.getType() !== 'rpc') {
            return next.handle();
        }
        const metadata = (0, grpc_request_context_1.getGrpcMetadataFromExecutionContext)(contextHost);
        const requestPayload = contextHost.switchToRpc().getData();
        const requestId = (0, grpc_request_context_1.getRequestIdFromGrpcMetadata)(metadata) ??
            (0, grpc_request_context_1.getRequestIdFromGrpcPayload)(requestPayload);
        const pattern = (0, grpc_request_context_1.getGrpcPatternFromExecutionContext)(contextHost);
        const parentContext = metadata
            ? api_1.propagation.extract(api_1.context.active(), (0, grpc_request_context_1.getGrpcMetadataCarrier)(metadata))
            : api_1.context.active();
        const span = (0, open_telemetry_1.startSpan)(pattern, {
            attributes: {
                'rpc.system': 'grpc',
                'rpc.method': pattern,
                'careerhub.request_id': requestId ?? ''
            },
            kind: api_1.SpanKind.SERVER
        }, parentContext);
        return (0, open_telemetry_1.runWithSpanContext)(span, parentContext, () => {
            (0, correlation_context_1.bindCorrelationContext)({
                requestId
            });
            return next.handle().pipe((0, rxjs_1.tap)(() => {
                span.setStatus({
                    code: api_1.SpanStatusCode.OK
                });
                span.end();
            }), (0, rxjs_1.catchError)((error) => {
                span.recordException(error instanceof Error ? error : new Error(String(error)));
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : String(error)
                });
                span.end();
                return (0, rxjs_1.throwError)(() => error);
            }));
        });
    }
};
exports.GrpcTracingInterceptor = GrpcTracingInterceptor;
exports.GrpcTracingInterceptor = GrpcTracingInterceptor = __decorate([
    (0, common_1.Injectable)()
], GrpcTracingInterceptor);
