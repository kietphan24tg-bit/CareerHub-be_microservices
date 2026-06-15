"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMetricsEndpoint = registerMetricsEndpoint;
function registerMetricsEndpoint(app, metricsRegistry, options) {
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance();
    const metricsPath = options?.metricsPath ?? '/metrics';
    instance.get(metricsPath, (_request, response) => {
        response.setHeader('Content-Type', 'text/plain; version=0.0.4');
        response.status(200).send(metricsRegistry.renderPrometheus());
    });
}
