import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { SpanKind, context, trace } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { RuntimeLogger } from './runtime-logger';
import { bindCorrelationContext } from '../tracing/correlation-context';

test('runtime logger enriches json logs with request and trace identifiers', () => {
    const provider = new NodeTracerProvider();
    provider.register();

    const tracer = trace.getTracer('runtime-logger-spec');
    const span = tracer.startSpan('log-span', {
        kind: SpanKind.INTERNAL
    });
    const originalConsoleLog = console.log;
    let capturedOutput = '';

    console.log = (message?: unknown) => {
        capturedOutput = String(message ?? '');
    };

    try {
        context.with(trace.setSpan(context.active(), span), () => {
            bindCorrelationContext({
                requestId: 'req-log-001'
            });

            const logger = new RuntimeLogger({
                level: 'info',
                pretty: false,
                serviceName: 'test-service'
            });

            logger.info('hello world');
        });
    } finally {
        span.end();
        console.log = originalConsoleLog;
    }

    const parsed = JSON.parse(capturedOutput) as {
        requestId?: string;
        spanId?: string;
        traceId?: string;
    };

    assert.equal(parsed.requestId, 'req-log-001');
    assert.equal(parsed.traceId, span.spanContext().traceId);
    assert.equal(parsed.spanId, span.spanContext().spanId);
});

test('runtime logger writes jsonl file even when pretty logging is enabled', () => {
    const logFilePath = join(
        process.cwd(),
        'dist-test-artifacts',
        'runtime-logger-pretty.jsonl'
    );

    rmSync(logFilePath, {
        force: true
    });

    const logger = new RuntimeLogger({
        filePath: logFilePath,
        level: 'info',
        pretty: true,
        serviceName: 'test-service'
    });

    logger.info('pretty file log', {
        context: 'RuntimeLoggerSpec',
        requestId: 'req-pretty-001'
    });

    assert.equal(existsSync(logFilePath), true);

    const [line] = readFileSync(logFilePath, 'utf8')
        .trim()
        .split('\n');
    const parsed = JSON.parse(line) as {
        context?: string;
        message?: string;
        requestId?: string;
        service?: string;
    };

    assert.equal(parsed.message, 'pretty file log');
    assert.equal(parsed.context, 'RuntimeLoggerSpec');
    assert.equal(parsed.requestId, 'req-pretty-001');
    assert.equal(parsed.service, 'test-service');

    rmSync(logFilePath, {
        force: true
    });
});
