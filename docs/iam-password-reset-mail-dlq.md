# IAM Password Reset Mail Retry And DLQ

## Purpose

`iam-service` publishes `iam.password-reset-requested.v1` through its transactional outbox, then consumes that event with the embedded password reset mail consumer. This document covers the broker topology, failure behavior, deploy caveats, and DLQ replay workflow for that consumer.

## How It Works

1. `POST /auth/forgot-password` creates a reset token record and writes an outbox event in the same transaction.
2. IAM outbox runtime publishes `iam.password-reset-requested.v1` to the main exchange `events`.
3. `IamPasswordResetMailConsumer` subscribes to queue `iam.password-reset-mail`.
4. The consumer derives the raw reset token in memory and attempts SMTP delivery.
5. If delivery fails transiently, the consumer republishes the message to delayed retry queues.
6. If retries are exhausted, or the error is not safely retryable, the consumer parks the valid message in DLQ.

The current retry delay steps are hardcoded in [iam-password-reset-mail.consumer.ts](../services/iam-service/src/infrastructure/mail/iam-password-reset-mail.consumer.ts) as `30s -> 2m -> 10m`.

## Required Runtime Variables

The IAM consumer uses these env vars directly:

| Variable | Purpose |
| --- | --- |
| `BROKER_URL` | RabbitMQ connection URL |
| `BROKER_DEAD_LETTER_ENABLED` | Enables retry queues and DLQ parking. Production should keep this `true`. |
| `BROKER_QUEUE_PREFIX` | Optional queue prefix |
| `BROKER_EXCHANGE_PREFIX` | Optional exchange prefix |
| `BROKER_DEAD_LETTER_PREFIX` | Dead-letter prefix, default `dlq` |
| `PASSWORD_RESET_MAIL_MAX_RETRIES` | Maximum retry attempts before DLQ parking |
| `PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS` | Stale in-flight claim timeout |
| `MAIL_HOST` | SMTP host |
| `MAIL_PORT` | SMTP port |
| `MAIL_USER` | SMTP username |
| `MAIL_PASSWORD` | SMTP password |
| `MAIL_SECURE` | SMTP TLS flag |
| `MAIL_FROM_ADDRESS` | Sender address |
| `MAIL_FROM_NAME` | Sender display name |
| `PASSWORD_RESET_SECRET` | Secret for generating raw reset link token |
| `RESET_PASSWORD_URL_BASE` | Frontend reset page base URL |

Examples are included in [.env.example](../.env.example).

## Topology

When `BROKER_DEAD_LETTER_ENABLED=true`:

| Resource | Name pattern |
| --- | --- |
| Main exchange | `{brokerExchangePrefix}events` |
| Main queue | `{brokerQueuePrefix}iam.password-reset-mail` |
| Retry queue 1 | `{brokerQueuePrefix}iam.password-reset-mail.retry.30s` |
| Retry queue 2 | `{brokerQueuePrefix}iam.password-reset-mail.retry.2m` |
| Retry queue 3 | `{brokerQueuePrefix}iam.password-reset-mail.retry.10m` |
| DLX | `{brokerExchangePrefix}dlq.events` |
| DLQ | `{brokerQueuePrefix}dlq.iam.password-reset-mail` |

Retry queues use TTL and dead-letter back to the main exchange. The main queue dead-letters to the DLX when the consumer explicitly rejects a valid message with `requeue=false`.

When `BROKER_DEAD_LETTER_ENABLED=false`:

- retry queues are not asserted
- DLQ is not asserted
- retryable failures fall back to immediate requeue on the main queue
- exhausted or config-error messages are acknowledged instead of parked

That fallback is acceptable for local troubleshooting only, not for production.

## Failure Semantics

| Case | Action |
| --- | --- |
| Malformed JSON | `ack` |
| Unsupported payload shape | `ack` |
| Duplicate or currently claimed token | `ack` |
| Mail delivered | mark sent, `ack` |
| Transient delivery error and retries remain | publish to retry queue, `ack` original |
| Retry publish failure | `nack(..., requeue=false)` so the message lands in DLQ |
| Retry exhausted | `nack(..., requeue=false)` when DLQ enabled, otherwise `ack` |
| Mail configuration error | `nack(..., requeue=false)` when DLQ enabled, otherwise `ack` |

This gives production bounded retries plus broker-side persistence for failed valid messages, while malformed payloads never poison-loop.

## Deployment Runbook

### Production baseline

Use at least:

```env
BROKER_DEAD_LETTER_ENABLED=true
PASSWORD_RESET_MAIL_MAX_RETRIES=3
PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS=60000
```

### Queue migration rule

RabbitMQ does not let you redeclare an existing queue with different TTL or dead-letter arguments. If retry queue TTL or queue arguments change, deploy can fail with `PRECONDITION_FAILED`.

### Safe rollout steps

1. Confirm the target environment will run with `BROKER_DEAD_LETTER_ENABLED=true`.
2. Stop or scale down `iam-service` consumers.
3. Inspect backlog before deleting anything:
   ```bash
   rabbitmqadmin list queues name messages
   ```
4. If old retry queues exist and their TTL policy changed, delete them before restart:
   ```bash
   rabbitmqadmin delete queue name=iam.password-reset-mail.retry.30s
   rabbitmqadmin delete queue name=iam.password-reset-mail.retry.2m
   rabbitmqadmin delete queue name=iam.password-reset-mail.retry.10m
   ```
   Apply `BROKER_QUEUE_PREFIX` if configured.
5. If the main queue was previously declared without DLX arguments and must be recreated, drain or otherwise handle backlog first, then delete it:
   ```bash
   rabbitmqadmin delete queue name=iam.password-reset-mail
   ```
6. Start `iam-service` and verify startup logs include:
   - retry queue names
   - DLQ name
   - no warning that DLQ is disabled

### What not to delete casually

- Do not delete the main queue while it still contains backlog you care about.
- Do not purge the DLQ until you understand why messages landed there.
- Do not assume retry queues are safe to delete if they currently hold delayed messages waiting to return.

## DLQ Inspection And Replay

The repo exposes an ops CLI for the IAM password reset mail DLQ:

```bash
pnpm --filter @careerhub/broker-ops build
pnpm ops:iam-email-dlq list --count 5
pnpm ops:iam-email-dlq replay --dry-run --count 1
pnpm ops:iam-email-dlq replay --count 1
pnpm ops:iam-email-dlq replay --message-id <message-id>
```

Implementation entrypoint:

- [packages/broker-ops/src/iam-email-dlq/cli.ts](../packages/broker-ops/src/iam-email-dlq/cli.ts)

Replay discipline:

1. Inspect logs and identify the root cause.
2. Fix the root cause first.
3. Replay one message first.
4. Verify successful send or intentional dedupe behavior in IAM logs.
5. Replay larger batches only after the single-message check passes.

The CLI only acknowledges the DLQ message after publish confirm succeeds, so a failed replay leaves the message parked.

## Observability

RabbitMQ queue depth is now scraped into Prometheus directly from the CloudAMQP Prometheus endpoint.

Useful broker metric:

- `rabbitmq_detailed_queue_messages{queue="..."}`
- `lavinmq_detailed_queue_messages{queue="..."}` on CloudAMQP LavinMQ-backed plans

For IAM mail operations, monitor:

- `{brokerQueuePrefix}dlq.iam.password-reset-mail` current depth
- `{brokerQueuePrefix}dlq.iam.password-reset-mail` backlog trend

The shared Grafana dashboard `CareerHub Observability` includes DLQ backlog panels, and Prometheus alerts when either DLQ stays above zero for five minutes.

## Related Code

- Consumer: [iam-password-reset-mail.consumer.ts](../services/iam-service/src/infrastructure/mail/iam-password-reset-mail.consumer.ts)
- IAM env schema: [iam-env.schema.ts](../services/iam-service/src/config/iam-env.schema.ts)
- IAM runtime config: [iam-runtime-config.ts](../services/iam-service/src/config/iam-runtime-config.ts)
- Shared retry topology helper: [rabbitmq-consumer-retry.ts](../infrastructure/transport/rabbitmq/rabbitmq-consumer-retry.ts)
- Shared parking DLQ helper: [rabbitmq-dead-letter-topology.ts](../infrastructure/transport/rabbitmq/rabbitmq-dead-letter-topology.ts)
