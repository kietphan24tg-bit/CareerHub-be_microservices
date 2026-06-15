# Live E2E RCA And RabbitMQ Audit - 2026-06-15

## What Was Verified

- `pnpm --filter @careerhub/gateway test:e2e:gap-closure-phase:live` passed.
- `pnpm --filter @careerhub/gateway test:e2e:password-reset:live` passed.
- `pnpm --filter @careerhub/communication-service test` passed.
- `pnpm --filter @careerhub/communication-service build` passed.

## RCA

### 1. `application-service` blocked the gap-closure live flow

Root cause:

- Two migration SQL files were UTF-16 with embedded null bytes.
- Prisma migration deploy failed with `string contains embedded null`.
- A failed migration marker in `_prisma_migrations` blocked later migrations, including `20260614120000_add_outbox`.

Fix:

- Normalized the broken migration files to UTF-8.
- Executed the missing SQL.
- Marked the failed migration as applied.
- Re-ran `prisma migrate deploy` successfully.

Relevant files:

- [services/application-service/prisma/migrations/20250614000000_add_recruiter_notes/migration.sql](../services/application-service/prisma/migrations/20250614000000_add_recruiter_notes/migration.sql)
- [services/application-service/prisma/migrations/20260614120000_add_outbox/migration.sql](../services/application-service/prisma/migrations/20260614120000_add_outbox/migration.sql)

### 2. `communication-service` was pointing at a missing database

Root cause:

- The service expected `communication_service` on Neon.
- That database did not exist.
- The service also lacked a local `prisma.config.ts`, so migrations could not be deployed cleanly.

Fix:

- Added [services/communication-service/prisma.config.ts](../services/communication-service/prisma.config.ts).
- Created the missing `communication_service` database.
- Deployed the communication migrations so `notifications.source_event_id` exists.

### 3. Password reset live e2e was over-coupled to MailHog

Root cause:

- The test used `MAILHOG_API_BASE_URL` and failed when MailHog was unavailable.
- The IAM mail consumer also needed a real SMTP listener on `127.0.0.1:1025`.
- There was no local mail sink in the live test harness.

Fix:

- Replaced MailHog dependency in the live test with a small in-process SMTP sink.
- Kept token resolution deterministic by reading the actual SMTP message captured by the sink.
- This keeps the live test self-contained and removes the Docker/MailHog dependency.

Relevant files:

- [services/gateway/src/presentation/http/tests/password-reset.integration.live.e2e.spec.ts](../services/gateway/src/presentation/http/tests/password-reset.integration.live.e2e.spec.ts)
- [services/gateway/src/presentation/http/tests/helpers/live-smtp-sink.ts](../services/gateway/src/presentation/http/tests/helpers/live-smtp-sink.ts)

### 4. `iam-service` password reset consumer hit stale RabbitMQ topology

Root cause:

- The broker already had `iam.password-reset-mail` declared with old queue args.
- The consumer flapped with `PRECONDITION_FAILED` until the queue was deleted.
- This prevented `mail_sent_at` from progressing and made the live test time out.

Fix:

- Deleted the stale `iam.password-reset-mail` queue on RabbitMQ.
- The consumer re-subscribed successfully and the live password reset flow completed.

## Audit: What Is Still Missing

- There is still no automated broker-queue migration tool for queue-arg changes.
- Queue cleanup for existing RabbitMQ topology is still a manual runbook step.
- Queue depth observability is now backed by CloudAMQP Prometheus scraping and Grafana DLQ backlog panels, with RabbitMQ UI/admin tools kept as fallback inspection paths.
- The live password-reset test now uses a local SMTP sink, but the repo does not yet have a reusable shared mail-sink service for all live tests.
- There is no automatic preflight that validates queue args before `iam-service` starts.

## Current RabbitMQ / Outbox Status

- `application-service` outbox is active and verified.
- `communication-service` now parks valid failures in DLQ.
- `iam-service` publishes password-reset events through outbox and handles mail delivery with bounded retry plus DLQ parking.
- `candidate-service` has no active outbox runtime.
- `gateway` is not the final producer for notification events in the current verified path.

## Operational Note

When queue arguments change, the safe rollout path is still:

1. stop consumers
2. inspect backlog
3. delete stale queues
4. restart services
5. verify reconnection and logs
