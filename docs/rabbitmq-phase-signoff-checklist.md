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
rabbitmqadmin list queues name durable messages arguments
rabbitmqadmin list exchanges name type durable
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

- [x] `application-service` writes business state and outbox record in the same DB transaction
  > Verified: `prisma-application-write-transaction.ts` wraps `applicationRepository`, `outboxRepository`, and `recruitmentRepository` in a single `prisma.transaction()` call.
- [x] notification events are published by outbox worker, not inline from HTTP/gRPC handler path
  > Verified: `application-outbox.processor.ts` polls via `setInterval` in `onModuleInit`. No inline publish in HTTP/gRPC handlers.
- [x] outbox worker marks records `processed` on success
  > Verified: `outbox.processor.ts` -> `publishClaimedRecord` -> `markProcessed(record.id, new Date())` on success.
- [x] outbox worker increments retry and schedules next attempt on publish failure
  > Verified: `buildFailureRecord` returns `retryCount + 1` and `nextRetryAt` with exponential backoff (`retryDelayMs * 2^(retryCount-1)`).
- [x] processed outbox retention and cleanup are enabled as intended
  > Verified: `runCleanupCycle` deletes `processed` records older than `outboxProcessedRetentionMs` and `failed` records older than `outboxFailedRetentionMs`.

Code references:

- [docs/outbox-pattern.md](./outbox-pattern.md)
- [services/application-service/src/infrastructure/outbox](/d:/Workspace/Microservices/CareerHub/CareerHub-be-microservices/services/application-service/src/infrastructure/outbox)

## 5. Consumer Failure Semantics Sign-Off

### Communication consumer

- [x] malformed payload is acknowledged
  > Verified: JSON parse error path -> `channel.ack(message)`, reason=`malformed_payload`.
- [x] unsupported payload is acknowledged
  > Verified: `!isNotificationRequestedEvent(parsed)` path -> `channel.ack(message)`, reason=`unsupported_payload`.
- [x] valid processing failure is parked in DLQ when DLQ is enabled
  > Verified: when `brokerDeadLetterEnabled=true` and retries exhausted -> `channel.nack(message, false, false)` (requeue=false, sent to DLX).
- [x] valid processing failure does not requeue forever in production mode
  > Verified: when `brokerDeadLetterEnabled=true`, nack uses `requeue=false`. Infinite requeue only occurs when DLQ is explicitly disabled (dev mode).

Reference:

- [communication-notification.consumer.ts](../services/communication-service/src/infrastructure/messaging/communication-notification.consumer.ts)

### IAM mail consumer

- [x] malformed payload is acknowledged
  > Verified: JSON parse error path -> `channel.ack(message)`, reason=`malformed_payload`.
- [x] unsupported payload is acknowledged
  > Verified: `!isPasswordResetRequestedEvent(parsed)` path -> `channel.ack(message)`, reason=`unsupported_payload`.
- [x] duplicate or in-flight token is acknowledged
  > Verified: `!claimed` path (token already being processed) -> `channel.ack(message)`, reason=`duplicate_or_in_flight`.
- [x] transient mail failures go through bounded retry
  > Verified: `retryCount < maxRetryCount` -> `publishToRabbitMqRetryQueue` to TTL retry queue -> `channel.ack(message)`.
- [x] exhausted retries end in DLQ when DLQ is enabled
  > Verified: `retryCount >= maxRetryCount` + `brokerDeadLetterEnabled=true` -> `channel.nack(message, false, false)`.
- [x] configuration errors end in DLQ when DLQ is enabled
  > Verified: `MailConfigurationError` catch + `brokerDeadLetterEnabled=true` -> `channel.nack(message, false, false)`, reason=`dead_lettered`.

Reference:

- [iam-password-reset-mail.consumer.ts](../services/iam-service/src/infrastructure/mail/iam-password-reset-mail.consumer.ts)

## 6. Manual Verification Sign-Off

Run these checks against CloudAMQP (or a production-like environment with `BROKER_DEAD_LETTER_ENABLED=true`).

- [ ] Trigger one notification event that succeeds end-to-end
- [ ] Force one valid notification event to fail and confirm it reaches `dlq.communication.notifications`
- [ ] Trigger one password reset mail that succeeds end-to-end
- [ ] Force one transient password reset mail failure and confirm retry queue flow works
- [ ] Force one exhausted password reset mail failure and confirm it reaches `dlq.iam.password-reset-mail`
- [ ] Replay one communication DLQ message successfully
- [ ] Replay one IAM mail DLQ message successfully

### Operator setup

Export your topology prefixes once before running the checks:

```bash
export BROKER_QUEUE_PREFIX="<queue-prefix>"
export BROKER_EXCHANGE_PREFIX="<exchange-prefix>"
export BROKER_DEAD_LETTER_PREFIX="${BROKER_DEAD_LETTER_PREFIX:-dlq}"
```

Optional CloudAMQP HTTP API equivalent:

```bash
curl -u "$RABBITMQ_USER:$RABBITMQ_PASSWORD" \
  "https://$RABBITMQ_HOST/api/queues/%2F/${BROKER_QUEUE_PREFIX}dlq.communication.notifications"
```

### Notification event - success path

```bash
# 1. Submit a job application via gateway (triggers application-service outbox publish)
# 2. Confirm the main queue exists and receives traffic
rabbitmqadmin list queues name messages | grep "${BROKER_QUEUE_PREFIX}communication.notifications"
# 3. Watch communication-service logs for a successful outcome
```

### Notification event - force DLQ path

```bash
# 1. Temporarily break communication-service processing (for example wrong DATABASE_URL), then restart it.
# 2. Submit one application event through gateway.
# 3. Inspect the main queue and DLQ until the message is parked.
rabbitmqadmin list queues name messages | grep "${BROKER_QUEUE_PREFIX}communication.notifications"
rabbitmqadmin list queues name messages | grep "${BROKER_QUEUE_PREFIX}dlq.communication.notifications"
# 4. Inspect one parked message without removing it.
rabbitmqadmin get queue="${BROKER_QUEUE_PREFIX}dlq.communication.notifications" ackmode=ack_requeue_true count=1
# 5. Restore the broken dependency, then replay.
pnpm ops:communication-dlq list --count 5
pnpm ops:communication-dlq replay --dry-run --count 1
pnpm ops:communication-dlq replay --count 1
```

### Password reset mail - success path

```bash
# 1. POST /auth/request-password-reset with a valid email.
# 2. Confirm the main queue exists and receives traffic.
rabbitmqadmin list queues name messages | grep "${BROKER_QUEUE_PREFIX}iam.password-reset-mail"
# 3. Watch iam-service logs for "Password reset mail sent and acknowledged".
```

### Password reset mail - retry queue flow

```bash
# 1. Set MAIL_HOST to an unreachable host and restart iam-service.
# 2. Trigger one password reset request.
# 3. Inspect all retry queues and the DLQ as the message advances.
rabbitmqadmin list queues name messages arguments | grep "${BROKER_QUEUE_PREFIX}iam.password-reset-mail"
rabbitmqadmin list queues name messages arguments | grep "${BROKER_QUEUE_PREFIX}iam.password-reset-mail.retry.30s"
rabbitmqadmin list queues name messages arguments | grep "${BROKER_QUEUE_PREFIX}iam.password-reset-mail.retry.2m"
rabbitmqadmin list queues name messages arguments | grep "${BROKER_QUEUE_PREFIX}iam.password-reset-mail.retry.10m"
rabbitmqadmin list queues name messages arguments | grep "${BROKER_QUEUE_PREFIX}dlq.iam.password-reset-mail"
# 4. Inspect one parked DLQ message without removing it.
rabbitmqadmin get queue="${BROKER_QUEUE_PREFIX}dlq.iam.password-reset-mail" ackmode=ack_requeue_true count=1
```

### IAM DLQ replay

```bash
pnpm ops:iam-email-dlq list --count 5
pnpm ops:iam-email-dlq replay --dry-run --count 1
# Fix the root cause first (for example restore MAIL_HOST), then:
pnpm ops:iam-email-dlq replay --count 1
# Confirm the message leaves the DLQ and iam-service logs success.
rabbitmqadmin list queues name messages | grep "${BROKER_QUEUE_PREFIX}dlq.iam.password-reset-mail"
```

### Queue migration note

If `iam.password-reset-mail` or its retry queues existed before with different TTL args, delete them first:

```bash
rabbitmqadmin delete queue name="${BROKER_QUEUE_PREFIX}iam.password-reset-mail"
rabbitmqadmin delete queue name="${BROKER_QUEUE_PREFIX}iam.password-reset-mail.retry.30s"
rabbitmqadmin delete queue name="${BROKER_QUEUE_PREFIX}iam.password-reset-mail.retry.2m"
rabbitmqadmin delete queue name="${BROKER_QUEUE_PREFIX}iam.password-reset-mail.retry.10m"
# Then restart iam-service so queues are re-declared with the correct arguments.
```

Recommended replay order:

1. inspect
2. dry-run
3. replay one message
4. verify consumer success
5. replay a larger batch only if needed

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

- [x] producer-side events that matter are published through transactional outbox
  > Verified from code: `application-service` and `iam-service` both use transactional outbox (section 4).
- [x] no important production consumer still relies on infinite requeue as the normal failure model
  > Verified from code: both consumers nack with `requeue=false` when `BROKER_DEAD_LETTER_ENABLED=true` (section 5).
- [x] failed valid messages are durably parked in broker DLQ where required
  > Verified from code: DLQ topology is asserted on startup and consumers nack correctly (section 5).
- [ ] replay tooling exists and works for current DLQs
  > Code exists in `broker-ops`. "Works" still requires manual verification from sections 6 and 8.
- [x] rollout instructions exist for queue migration and redeclare constraints
  > Documented in section 3 and the queue migration note above.
- [ ] observability is sufficient to detect, inspect, and replay failures safely
  > Pending section 7 verification in a production-like environment.
- [ ] team knows which failures should be fixed and replayed vs acknowledged and dropped
  > Documented in `docs/notification-consumer-dlq.md` and `docs/iam-password-reset-mail-dlq.md`. Tick after team review.

## 10. What Can Wait For Next Phase

These are follow-up items, not blockers for closing the current phase:

- admin UI for DLQ replay
- automatic retry loops for communication notifications
- making IAM retry delay steps configurable from env instead of hardcoded
- cross-service standardization doc for every future RabbitMQ consumer
