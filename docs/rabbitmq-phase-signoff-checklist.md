# RabbitMQ Phase Sign-Off Checklist

## Purpose

Use this checklist to close the current RabbitMQ hardening phase across:

- producer-side transactional outbox
- `communication-service` notification DLQ
- `iam-service` password reset mail retry and DLQ
- DLQ inspection and replay operations

This checklist is meant to answer one question: "Can we say the current RabbitMQ design is operationally complete for this phase?"

## Scope That Must Be True

- `application-service` is the producer of notification integration events through a real transactional outbox.
- `gateway` is not the producer for application notification events.
- `communication-service` consumes notification events and parks failed valid messages in DLQ.
- `iam-service` produces password reset events through outbox, then consumes them with bounded retry plus DLQ parking.
- `candidate-service` does not run unused outbox runtime.

Reference docs:

- [outbox-pattern.md](./outbox-pattern.md)
- [notification-consumer-dlq.md](./notification-consumer-dlq.md)
- [iam-password-reset-mail-dlq.md](./iam-password-reset-mail-dlq.md)

## 1. Config Sign-Off

All of these should be checked before rollout:

- [ ] `BROKER_DEAD_LETTER_ENABLED=true` in production-like environments for `communication-service`
- [ ] `BROKER_DEAD_LETTER_ENABLED=true` in production-like environments for `iam-service`
- [ ] `PASSWORD_RESET_MAIL_MAX_RETRIES` is explicitly set for `iam-service`
- [ ] `PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS` is explicitly set for `iam-service`
- [ ] `NOTIFICATION_MAX_RETRIES` is explicitly set for `communication-service`
- [ ] `BROKER_QUEUE_PREFIX`, `BROKER_EXCHANGE_PREFIX`, and `BROKER_DEAD_LETTER_PREFIX` are confirmed for the target environment
- [ ] SMTP configuration exists and is valid in `iam-service`
- [ ] No service is relying on implicit local fallback config by accident

Repo references:

- [services/iam-service/.env](/d:/Workspace/Microservices/CareerHub/CareerHub-be-microservices/services/iam-service/.env)
- [services/communication-service/.env](/d:/Workspace/Microservices/CareerHub/CareerHub-be-microservices/services/communication-service/.env)
- [services/iam-service/src/config/iam-env.schema.ts](../services/iam-service/src/config/iam-env.schema.ts)
- [services/communication-service/src/config/communication-env.schema.ts](../services/communication-service/src/config/communication-env.schema.ts)

## 2. Broker Topology Sign-Off

These topologies should exist after startup:

### Communication

- [ ] Main exchange: `{brokerExchangePrefix}events`
- [ ] Main queue: `{brokerQueuePrefix}communication.notifications`
- [ ] DLX: `{brokerExchangePrefix}dlq.events`
- [ ] DLQ: `{brokerQueuePrefix}dlq.communication.notifications`
- [ ] Main queue has `x-dead-letter-exchange`
- [ ] Main queue has `x-dead-letter-routing-key`

### IAM Password Reset Mail

- [ ] Main queue: `{brokerQueuePrefix}iam.password-reset-mail`
- [ ] Retry queue: `{brokerQueuePrefix}iam.password-reset-mail.retry.30s`
- [ ] Retry queue: `{brokerQueuePrefix}iam.password-reset-mail.retry.2m`
- [ ] Retry queue: `{brokerQueuePrefix}iam.password-reset-mail.retry.10m`
- [ ] DLQ: `{brokerQueuePrefix}dlq.iam.password-reset-mail`
- [ ] Retry queues dead-letter back to main exchange
- [ ] Main queue dead-letters to DLX

Useful commands:

```bash
rabbitmqadmin list queues name messages
rabbitmqadmin list exchanges name type
```

Code references:

- [rabbitmq-dead-letter-topology.ts](../infrastructure/transport/rabbitmq/rabbitmq-dead-letter-topology.ts)
- [rabbitmq-consumer-retry.ts](../infrastructure/transport/rabbitmq/rabbitmq-consumer-retry.ts)

## 3. Queue Migration Sign-Off

Before rollout to any environment that already had older queues:

- [ ] Backlog on existing queues was inspected before deletion
- [ ] Old retry queues with outdated TTL/args were deleted before restart
- [ ] Old main queue was deleted only if recreate with new DLX args was required
- [ ] Team recorded whether backlog was drained, moved, or intentionally dropped
- [ ] Service restart completed without `PRECONDITION_FAILED`

This matters because RabbitMQ does not let you mutate queue TTL or dead-letter args in place.

## 4. Producer Outbox Sign-Off

These must be true for the producer side:

- [ ] `application-service` writes business state and outbox record in the same DB transaction
- [ ] notification events are published by outbox worker, not inline from HTTP/gRPC handler path
- [ ] outbox worker marks records `processed` on success
- [ ] outbox worker increments retry and schedules next attempt on publish failure
- [ ] processed outbox retention and cleanup are enabled as intended

Code references:

- [docs/outbox-pattern.md](./outbox-pattern.md)
- [services/application-service/src/infrastructure/outbox](/d:/Workspace/Microservices/CareerHub/CareerHub-be-microservices/services/application-service/src/infrastructure/outbox)

## 5. Consumer Failure Semantics Sign-Off

### Communication consumer

- [ ] malformed payload is acknowledged
- [ ] unsupported payload is acknowledged
- [ ] valid processing failure is parked in DLQ when DLQ is enabled
- [ ] valid processing failure does not requeue forever in production mode

Reference:

- [communication-notification.consumer.ts](../services/communication-service/src/infrastructure/messaging/communication-notification.consumer.ts)

### IAM mail consumer

- [ ] malformed payload is acknowledged
- [ ] unsupported payload is acknowledged
- [ ] duplicate or in-flight token is acknowledged
- [ ] transient mail failures go through bounded retry
- [ ] exhausted retries end in DLQ when DLQ is enabled
- [ ] configuration errors end in DLQ when DLQ is enabled

Reference:

- [iam-password-reset-mail.consumer.ts](../services/iam-service/src/infrastructure/mail/iam-password-reset-mail.consumer.ts)

## 6. Manual Verification Sign-Off

Run these checks in a non-prod environment:

- [ ] Trigger one notification event that succeeds end-to-end
- [ ] Force one valid notification event to fail and confirm it reaches `dlq.communication.notifications`
- [ ] Trigger one password reset mail that succeeds end-to-end
- [ ] Force one transient password reset mail failure and confirm retry queue flow works
- [ ] Force one exhausted password reset mail failure and confirm it reaches `dlq.iam.password-reset-mail`
- [ ] Replay one communication DLQ message successfully
- [ ] Replay one IAM mail DLQ message successfully

Local live-test note:

- Password reset live verification now uses an in-process SMTP sink in the gateway test harness instead of MailHog.
- If `iam.password-reset-mail` was redeclared with older queue arguments, delete the stale queue before rerunning live verification.

Recommended replay order:

1. inspect
2. dry-run
3. replay one message
4. verify consumer success
5. replay larger batch only if needed

## 7. Observability Sign-Off

- [ ] `dead_lettered` metric is visible for `communication-service`
- [ ] `dead_lettered` metric is visible for `iam-service`
- [ ] RabbitMQ queue-depth metric is visible for both DLQs in Prometheus/Grafana
- [ ] DLQ alerts are enabled and routed to the right team
- [ ] Operators know how to search logs by `messageId`, `sourceEventId`, and `eventName`
- [ ] Operators know the fallback inspection path through RabbitMQ UI or `rabbitmqadmin`

Reference:

- [infrastructure/observability/stack/prometheus/alerts/careerhub-observability.rules.yml](../infrastructure/observability/stack/prometheus/alerts/careerhub-observability.rules.yml)
- [infrastructure/observability/stack/prometheus/prometheus.cloudamqp.yml.template](../infrastructure/observability/stack/prometheus/prometheus.cloudamqp.yml.template)
- [docs/notification-consumer-dlq.md](./notification-consumer-dlq.md)

## 8. Replay Operations Sign-Off

- [ ] `pnpm ops:communication-dlq list --count 5` works
- [ ] `pnpm ops:communication-dlq replay --dry-run --count 1` works
- [ ] `pnpm ops:iam-email-dlq list --count 5` works
- [ ] `pnpm ops:iam-email-dlq replay --dry-run --count 1` works
- [ ] Operators understand replay only happens after root cause is fixed
- [ ] Operators understand replay one first, then batch

CLI references:

- [packages/broker-ops/src/communication-dlq/cli.ts](../packages/broker-ops/src/communication-dlq/cli.ts)
- [packages/broker-ops/src/iam-email-dlq/cli.ts](../packages/broker-ops/src/iam-email-dlq/cli.ts)

## 9. Definition Of Done

This RabbitMQ phase is done when all statements below are true:

- [ ] producer-side events that matter are published through transactional outbox
- [ ] no important production consumer still relies on infinite requeue as the normal failure model
- [ ] failed valid messages are durably parked in broker DLQ where required
- [ ] replay tooling exists and works for current DLQs
- [ ] rollout instructions exist for queue migration and redeclare constraints
- [ ] observability is sufficient to detect, inspect, and replay failures safely
- [ ] team knows which failures should be fixed and replayed vs acknowledged and dropped

## 10. What Can Wait For Next Phase

These are follow-up items, not blockers for closing the current phase:

- admin UI for DLQ replay
- automatic retry loops for communication notifications
- making IAM retry delay steps configurable from env instead of hardcoded
- cross-service standardization doc for every future RabbitMQ consumer
