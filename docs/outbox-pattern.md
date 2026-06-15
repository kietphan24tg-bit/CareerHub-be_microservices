# Outbox Pattern

## Purpose

This document defines the standard outbox flow for CareerHub services that own a database and need to publish integration events safely.

## Standard Flow

1. A command handler changes domain or application state.
2. In the same database transaction, the service inserts an `outbox` record.
3. An embedded worker polls `pending` outbox records.
4. The worker claims a record as `processing`.
5. The publisher sends the integration event to RabbitMQ.
6. On success, the record is marked `processed`.
7. On failure, the record is marked `failed`, `retry_count` is incremented, and `next_retry_at` is scheduled when retry is still allowed.

## Outbox Record Shape

- `id`
- `event_name`
- `payload`
- `status`
- `retry_count`
- `last_error`
- `occurred_at`
- `processing_at`
- `processed_at`
- `next_retry_at`

## Retention Policy

- Services do not delete records immediately after successful publish.
- Successful records stay in `processed` state for short-term audit and debugging.
- The default retention window is `7 days`.
- A cleanup loop deletes old `processed` records in small batches.
- `failed` records are kept for investigation in the current phase.

## Current Runtime Decision

- The worker stays embedded in the service process for now.
- PostgreSQL `LISTEN/NOTIFY` is not used in the current implementation.
- Cleanup and publish loops rely on database state transitions, not in-memory locks, for cross-instance safety.
- `candidate-service` does not currently publish integration events; its unused outbox runtime was removed and candidate reads remain synchronous over gRPC.

## IAM Event Flows

### `iam.password-reset-requested.v1`

- Producer: `iam-service`
- Consumer: embedded IAM mail consumer in `iam-service`
- Exchange: `events`
- Routing key: `iam.password-reset-requested.v1`
- Queue: `iam.password-reset-mail`

Current runtime behavior:

1. `RequestPasswordResetCommandHandler` stores a hashed reset token and an outbox record in one transaction.
2. The IAM outbox worker publishes the event to RabbitMQ.
3. The embedded mail consumer receives the event, derives the raw token from `resetTokenId`, `identityId`, `expiresAt`, and IAM secret in memory, then calls `MailService.sendPasswordResetMail(...)`.
4. The raw reset token is not stored in the outbox payload or returned in HTTP/gRPC responses.

See [password-reset.md](./password-reset.md) for SMTP and local verification details.

## Application Notification Flows

Producer: `application-service`

Consumer: `communication-service` (`notifications.#` -> `communication.notifications`)

Gateway is not a producer for these events.

Covered actions:

- apply to job
- employer application status updates
- interview create/update/cancel/confirm/decline/reschedule
- offer send/update/withdraw/accept/decline

Concurrency note:

- interview and offer mutations use status-based compare-and-set updates inside the same transaction as outbox persistence
- failed CAS means no history and no outbox row

Payload contract details: [notification-events.md](./notification-events.md)
