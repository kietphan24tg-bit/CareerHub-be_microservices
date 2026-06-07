import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryMetricsRegistry } from './in-memory-metrics.registry';

test('renders HTTP and RPC metrics in Prometheus format', () => {
    const registry = new InMemoryMetricsRegistry();

    registry.recordHttpRequest({
        durationMs: 42,
        method: 'GET',
        route: '/hello',
        statusCode: 200
    });
    registry.recordHttpError({
        method: 'GET',
        route: '/hello',
        statusCode: 500
    });
    registry.recordRpcRequest({
        durationMs: 12,
        pattern: 'CandidateGrpcController.getCandidateProfileByIdentityId',
        status: 'success'
    });
    registry.recordRpcRequest({
        durationMs: 17,
        pattern: 'CandidateGrpcController.getCandidateProfileByIdentityId',
        status: 'error'
    });
    registry.recordRpcError({
        durationMs: 17,
        pattern: 'CandidateGrpcController.getCandidateProfileByIdentityId',
        status: 'error'
    });
    registry.recordRmqRequest({
        durationMs: 9,
        exchange: 'careerhub.events',
        pattern: 'gateway.cache.invalidated.v1',
        queue: 'gateway.events',
        routingKey: 'gateway.cache.invalidated.v1',
        service: 'gateway',
        status: 'success'
    });
    registry.recordRmqError({
        durationMs: 11,
        exchange: 'careerhub.events',
        pattern: 'gateway.cache.invalidated.v1',
        queue: 'gateway.events',
        routingKey: 'gateway.cache.invalidated.v1',
        service: 'gateway',
        status: 'error'
    });

    const output = registry.renderPrometheus();

    assert.match(output, /careerhub_http_requests_total/);
    assert.match(output, /careerhub_http_request_duration_ms_count/);
    assert.match(output, /careerhub_http_request_duration_ms_sum/);
    assert.match(output, /careerhub_http_errors_total/);
    assert.match(output, /careerhub_rpc_requests_total/);
    assert.match(output, /careerhub_rpc_request_duration_ms_count/);
    assert.match(output, /careerhub_rpc_request_duration_ms_sum/);
    assert.match(output, /careerhub_rpc_errors_total/);
    assert.match(output, /careerhub_rmq_messages_total/);
    assert.match(output, /careerhub_rmq_message_duration_ms_count/);
    assert.match(output, /careerhub_rmq_message_duration_ms_sum/);
    assert.match(output, /careerhub_rmq_errors_total/);
});
