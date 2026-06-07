import type { INestMicroservice } from '@nestjs/common';
import { RabbitMqLoggingInterceptor } from '../../observability/interceptors/rabbitmq/rabbitmq-logging.interceptor';
import { RabbitMqMetricsInterceptor } from '../../observability/interceptors/rabbitmq/rabbitmq-metrics.interceptor';
import { RabbitMqTracingInterceptor } from '../../observability/interceptors/rabbitmq/rabbitmq-tracing.interceptor';
import type { HttpRuntimeFoundation } from './configure-http-runtime';

type ConfigureRabbitMqRuntimeOptions = {
    queue?: string;
    serviceName?: string;
};

export function configureRabbitMqRuntime(
    microservice: INestMicroservice,
    foundation: Pick<HttpRuntimeFoundation, 'logger' | 'metricsRegistry'>,
    options?: ConfigureRabbitMqRuntimeOptions
): void {
    microservice.useGlobalInterceptors(
        new RabbitMqTracingInterceptor(),
        new RabbitMqLoggingInterceptor(foundation.logger, {
            queue: options?.queue
        }),
        new RabbitMqMetricsInterceptor(foundation.metricsRegistry, {
            queue: options?.queue,
            serviceName: options?.serviceName
        })
    );
}
