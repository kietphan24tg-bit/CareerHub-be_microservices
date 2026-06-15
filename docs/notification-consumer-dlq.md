# Communication Notification Consumer DLQ

## Purpose

`communication-service` consumes `notifications.#` from the `events` exchange and persists in-app notifications. When processing fails after the payload is valid, the consumer must not requeue forever on the main queue.

Phase 1 uses a **parking DLQ** only:

- failed valid messages are dead-lettered to a broker-side queue
- operators inspect and replay manually
- no auto retry queue or TTL loop in this phase

Producer-side transactional outbox in `application-service` is unchanged.

## Production Readiness

`communication-service` is **production-ready for DLQ only when**:

```env
BROKER_DEAD_LETTER_ENABLED=true
```

When DLQ is disabled, the consumer falls back to `nack(..., requeue=true)` for processing failures. This mode is acceptable for **local/dev** or a **short rollback window** only. It is **not** the recommended production mode because failed messages loop on the main queue instead of parking in DLQ.

On startup, the consumer logs the resolved broker topology:

- main exchange
- main queue
- DLX and DLQ (when enabled)
- explicit warning when DLQ is disabled

## Topology

When `BROKER_DEAD_LETTER_ENABLED=true`:

| Resource | Name pattern |
|----------|--------------|
| Main exchange | `{brokerExchangePrefix}events` |
| Main queue | `{brokerQueuePrefix}communication.notifications` |
| DLX | `{brokerExchangePrefix}dlq.events` |
| DLQ | `{brokerQueuePrefix}dlq.communication.notifications` |

Main queue arguments:

- `x-dead-letter-exchange` = DLX
- `x-dead-letter-routing-key` = DLQ queue name

DLQ binds to DLX with the same routing key.

When `BROKER_DEAD_LETTER_ENABLED=false`, the main queue is declared **without** `x-dead-letter-*` arguments and processing failures use `nack(..., requeue=true)`.

## Failure Handling

| Case | Action | Metric `status` | Metric `reason` |
|------|--------|-----------------|-----------------|
| Malformed JSON | `ack` | `error` | `malformed_payload` |
| Unsupported contract payload | `ack` | `error` | `unsupported_payload` |
| Valid event processed | `ack` | `processed` | `created` or `duplicate` |
| Valid event processing error with DLX enabled | `nack(..., requeue=false)` | `dead_lettered` | `dead_lettered` |
| Valid event processing error with DLX disabled | `nack(..., requeue=true)` | `error` | `processing_failed` |

Logs for processing failures include:

- `eventName`
- `messageId` (AMQP property from outbox publisher)
- `sourceEventId` when available

## Queue Migration Runbook

Existing environments may already have `communication.notifications` declared **without** `x-dead-letter-exchange` / `x-dead-letter-routing-key`. RabbitMQ does not allow changing queue arguments in place.

**Default migration path (recommended): stop consumer → handle backlog → delete main queue → restart service**

### Prerequisites

1. Confirm target env will run with `BROKER_DEAD_LETTER_ENABLED=true`.
2. Decide what happens to messages still in the old main queue:
   - **drain** by leaving consumer running until empty
   - **move** to a holding queue
   - **accept drop** (document explicitly)
3. **Do not delete the main queue** until that decision is made.

### Steps (default path)

1. **Stop** `communication-service` consumers (scale to 0 or stop the service).
2. **Inspect backlog** on `{brokerQueuePrefix}communication.notifications`:
   ```bash
   rabbitmqadmin list queues name messages
   ```
3. **Handle remaining messages** per your backlog decision (drain/move/drop).
4. **Delete the old main queue** (only after step 3):
   ```bash
   rabbitmqadmin delete queue name=communication.notifications
   ```
   Use the prefixed name if `BROKER_QUEUE_PREFIX` is set.
5. **Restart** `communication-service`. It will declare:
   - DLX + DLQ
   - main queue with correct `x-dead-letter-*` arguments
6. **Verify startup logs** show parking DLQ enabled and the resolved topology names.
7. **Force a controlled failure** in non-prod (optional) and confirm the message lands in DLQ.

### Alternative: pre-provision queue before consumer start

1. Stop consumer.
2. Manually declare DLX, DLQ, and main queue with the same arguments the service uses (`assertRabbitMqParkingDeadLetterTopology` in `@careerhub/infrastructure`).
3. Bind main queue to `{brokerExchangePrefix}events` with routing key `notifications.#`.
4. Start consumer with `passive` semantics disabled (default assert path).

Use this when you cannot delete the old queue name or need infra-as-code to own broker objects.

## Observability

### Service metrics (primary signal)

Use existing integration consumer metrics:

- `careerhub_integration_consumer_total`
- `careerhub_integration_consumer_duration_ms`

Standard labels:

| Label | DLQ usage |
|-------|-----------|
| `status` | `dead_lettered` for parked failures |
| `reason` | `dead_lettered`, `malformed_payload`, `unsupported_payload`, `processing_failed`, etc. |
| `event_name` | notification event name |
| `consumer` | `communication-notifications` |
| `service` | `careerhub-communication-service` |

Example PromQL:

```promql
# Dead-lettered count (10m window)
sum by (service, consumer) (
  increase(careerhub_integration_consumer_total{status="dead_lettered"}[10m])
)

# Top dead-lettered event names
topk(5, sum by (event_name) (
  increase(careerhub_integration_consumer_total{status="dead_lettered", consumer="communication-notifications"}[1h])
))

# Processed vs dead-lettered trend
sum by (status) (
  increase(careerhub_integration_consumer_total{consumer="communication-notifications"}[10m])
)

# Consumer latency (summary)
sum by (service, consumer) (
  rate(careerhub_integration_consumer_duration_ms_sum{consumer="communication-notifications"}[5m])
)
/
sum by (service, consumer) (
  rate(careerhub_integration_consumer_duration_ms_count{consumer="communication-notifications"}[5m])
)
```

Grafana dashboard `CareerHub Observability` includes DLQ-focused panels for dead-letter volume, top event names, processed vs dead-lettered trend, and consumer latency.

### Queue depth (secondary signal)

This observability stack now scrapes RabbitMQ queue depth into Prometheus directly from the CloudAMQP Prometheus endpoint.

Prometheus scrape path:

- `/metrics/detailed?family=queue_coarse_metrics`

Primary queue-depth metric for DLQ backlog:

- `rabbitmq_detailed_queue_messages{queue="..."}`
- `lavinmq_detailed_queue_messages{queue="..."}` on CloudAMQP LavinMQ-backed plans

Recommended queue-depth views:

- `{brokerQueuePrefix}dlq.communication.notifications` current depth
- `{brokerQueuePrefix}dlq.communication.notifications` trend over time

Fallback when Prometheus or Grafana is unavailable:

- RabbitMQ Management UI
- `rabbitmqadmin list queues name messages`

### Log search workflow

Search application logs (Loki/local logs) by:

| Field | Example |
|-------|---------|
| `messageId` | outbox record id on the AMQP message |
| `sourceEventId` | idempotency key in event payload |
| `eventName` | e.g. `notifications.application-received.v1` |

Dead-letter log line pattern:

```text
Notification event dead-lettered: <error> (eventName=..., messageId=..., sourceEventId=...)
```

Connection churn (no dedicated metric yet):

```text
Notification RabbitMQ connection closed
Notification RabbitMQ channel closed
```

Correlate repeated connection-close warnings with broker/network incidents.

### Alert guidance

Prometheus rules in `infrastructure/observability/stack/prometheus/alerts/careerhub-observability.rules.yml`:

| Alert | Meaning |
|-------|---------|
| `CareerHubIntegrationConsumerDeadLettered` | Any `dead_lettered` in 5m — investigate immediately in production |
| `CareerHubIntegrationConsumerDeadLetteredSustained` | Sustained dead-letter activity (>3 in 15m) — fix root cause before bulk replay |
| `CareerHubRabbitMqDlqBacklogDetected` | DLQ queue depth stayed above 0 for 5m — inspect backlog and replay only after root cause is fixed |

Recommended operator response:

1. Check logs by `sourceEventId` / `messageId`.
2. Confirm DB/dependency health.
3. Fix root cause.
4. Replay 1–2 messages with the CLI before batch replay.

## Replay Decision Matrix

| Failure class | Replay? | Action |
|---------------|---------|--------|
| `malformed_payload` | **No** | Fix producer/schema; message was acked and is not in DLQ |
| `unsupported_payload` | **No** | Fix contract/producer; message was acked and is not in DLQ |
| Transient infra (DB unavailable, network, dependency timeout) | **Yes, after fix** | Restore dependency, replay 1–2 messages, then batch |
| Code/business mapping bug | **Yes, after deploy** | Deploy fix first, then replay |
| Duplicate `sourceEventId` on replay | **Expected** | Idempotent — no duplicate notification row |

Replay is a **controlled manual retry**, not an auto-retry mechanism. Always replay 1–2 messages first, confirm consumer processes them, then replay larger batches.

**Follow-up (out of scope for phase 1):** consider broker-level auto retry only if observability shows most DLQ entries are transient and manual replay becomes a frequent operational burden.

## Replay From DLQ

Replay is safe because notification persistence is idempotent on `sourceEventId`.

### Replay CLI (recommended)

Internal ops tool: `@careerhub/broker-ops`

```bash
# Install/build from repo root
pnpm install
pnpm --filter @careerhub/broker-ops build

# Inspect without ack
pnpm ops:communication-dlq list --count 5

# Dry-run replay
pnpm ops:communication-dlq replay --dry-run --count 2

# Replay first message
pnpm ops:communication-dlq replay --count 1

# Replay by AMQP messageId (scans DLQ)
pnpm ops:communication-dlq replay --message-id <outbox-record-id>

# Override routing key
pnpm ops:communication-dlq replay --count 1 --routing-key notifications.application-received.v1
```

CLI behavior:

1. Reads from `{brokerQueuePrefix}dlq.communication.notifications`
2. Parses payload for `event.name`, `messageId`, `sourceEventId`
3. Resolves routing key in order: `--routing-key` → AMQP `type` property → `x-death` header → event `name`
4. Publishes to `{brokerExchangePrefix}events` using a confirm channel
5. **Acks DLQ message only after publish confirm succeeds**
6. On publish failure: **does not ack** — message stays in DLQ

Uses the same `BROKER_*` environment variables as `communication-service`.

### RabbitMQ Management UI

1. Open queue `{brokerQueuePrefix}dlq.communication.notifications`.
2. Inspect the failed message payload.
3. Use **Move messages** or **Get message(s)** and publish back to exchange `{brokerExchangePrefix}events`.
4. Use the original routing key from the message, typically `notifications.<type>.v1`.
5. Confirm the main queue drains and the notification row is created or deduplicated.

### RabbitMQ CLI example

```bash
# Inspect DLQ depth
rabbitmqadmin list queues name messages

# Manual publish after extracting payload body:
rabbitmqadmin publish exchange=careerhub.events routing_key=notifications.application-received.v1 payload='...'
```

If the same `sourceEventId` already exists, replay creates no duplicate notification row.

## Runbook

### Poison loop on main queue

Symptom:

- `communication.notifications` depth stays high
- same `sourceEventId` repeats in logs

Check:

- `BROKER_DEAD_LETTER_ENABLED=true`
- main queue has `x-dead-letter-exchange` arguments (see migration runbook if not)
- consumer metrics show `dead_lettered` instead of endless `processing_failed`
- startup logs do **not** show DLQ disabled warning

### DLQ backlog growing

Symptom:

- `dlq.communication.notifications` depth increases

Check:

1. `communication-service` database availability
2. application logs for `database unavailable` or repository errors
3. Grafana panel **Integration Consumer Dead-Lettered**
4. fix root cause
5. replay 1–2 messages via CLI, then batch replay

### Replay did nothing

Check:

- routing key matches event `name`
- payload still passes `NotificationRequestedIntegrationEvent` validation
- `sourceEventId` may already exist, which is expected dedupe behavior
- CLI outcome was `replayed`, not `skipped` or `publish_failed`

### Consumer reconnect loop

Symptom:

- repeated logs: `Notification RabbitMQ connection closed` / `channel closed`

Check:

1. RabbitMQ broker health and network
2. credentials / vhost / TLS config
3. broker resource limits
4. pause replay until consumer is stable

## Related Docs

- [outbox-pattern.md](./outbox-pattern.md)
- [observability-local.md](./observability-local.md)
