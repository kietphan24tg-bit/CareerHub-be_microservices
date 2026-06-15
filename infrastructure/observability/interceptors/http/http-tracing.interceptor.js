"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpTracingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const api_1 = require("@opentelemetry/api");
const rxjs_1 = require("rxjs");
const correlation_context_1 = require("../../tracing/correlation-context");
const open_telemetry_1 = require("../../tracing/open-telemetry");
const request_id_1 = require("../../../runtime/request-context/request-id");
let HttpTracingInterceptor = class HttpTracingInterceptor {
    intercept(contextHost, next) {
        if (contextHost.getType() !== 'http') {
            return next.handle();
        }
        const httpContext = contextHost.switchToHttp();
        const request = httpContext.getRequest();
        const response = httpContext.getResponse();
        const method = request.method;
        const path = request.route?.path ?? request.path ?? request.url;
        const requestId = (0, request_id_1.getRequestIdFromHttpRequest)(request);
        const span = (0, open_telemetry_1.startSpan)(`${method} ${path}`, {
            attributes: {
                'http.method': method,
                'http.route': path,
                'http.target': request.originalUrl ?? request.url,
                'careerhub.request_id': requestId ?? ''
            },
            kind: api_1.SpanKind.SERVER
        });
        const parentContext = api_1.context.active();
        return (0, open_telemetry_1.runWithSpanContext)(span, parentContext, () => {
            (0, correlation_context_1.bindCorrelationContext)({
                requestId
            });
            return next.handle().pipe((0, rxjs_1.tap)(() => {
                span.setAttribute('http.status_code', response.statusCode);
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
exports.HttpTracingInterceptor = HttpTracingInterceptor;
exports.HttpTracingInterceptor = HttpTracingInterceptor = __decorate([
    (0, common_1.Injectable)()
], HttpTracingInterceptor);
