# Production Environment Variables Guide

## Legend

| Symbol | Meaning |
|---|---|
| ✅ Required | Must be set. No safe production default exists. |
| 🔒 Sensitive | Must not be committed. Use a secret manager or CI secret. |
| 🆕 New | Added in the DLQ hardening phase. Verify this before deploy. |
| *(default: X)* | Has a runtime default. Setting explicitly is still recommended. |

> **Critical:** `BROKER_URL` must use `amqps://` when `NODE_ENV=production`. This is enforced in [infrastructure/runtime/config/env.schema.ts](../infrastructure/runtime/config/env.schema.ts).

---

## Shared across all services

| Env Var | Flags | Notes |
|---|---|---|
| `NODE_ENV` | ✅ | Set to `production`. Affects logging defaults and `BROKER_URL` validation. |
| `SERVICE_NAME` | ✅ | Unique service identifier used in logs, traces, and metrics. |
| `PORT` | ✅ | HTTP port for the service container. |
| `LOG_LEVEL` | *(default: `info` in prod)* | Runtime default becomes `info` in production. |
| `LOG_PRETTY` | *(default: `false` in prod)* | Keep `false` in containers so logs stay JSON. |
| `LOG_FILE_PATH` | | Leave unset in production so stdout is collected by the runtime. |
| `BROKER_URL` | ✅ 🔒 | RabbitMQ/CloudAMQP URL. Must use `amqps://` in production. |
| `BROKER_EXCHANGE_PREFIX` | ✅ | Exchange namespace prefix shared across services. |
| `BROKER_QUEUE_PREFIX` | ✅ | Queue namespace prefix shared across services. |
| `BROKER_DEAD_LETTER_PREFIX` | *(default: `dlq`)* | Prefix for dead-letter exchanges and queues. |
| `BROKER_DEAD_LETTER_ENABLED` | *(default: `true`)* | Set explicitly to `true` in production. |
| `BROKER_DURABLE` | *(default: `true`)* | Keep durable queues/exchanges in production. |
| `BROKER_PREFETCH_COUNT` | *(default: `10`)* | Tune per service workload if needed. |
| `OTEL_ENABLED` | *(default: `true`)* | Disable only if no OTLP collector is available. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | | Required when `OTEL_ENABLED=true`. |
| `OTEL_SERVICE_NAME` | | Trace display name override. |
| `HEALTH_ENABLED` | *(default: `true`)* | Enables `/health`, `/health/live`, `/health/ready`. |
| `METRICS_ENABLED` | *(default: `true`)* | Enables `/metrics`. |
| `HTTP_LOG_ENABLED` | *(default: `true`)* | Per-request structured logs. |

### Default ports

| Service | HTTP | gRPC |
|---|---|---|
| gateway | 3000 | - |
| iam-service | 3001 | 50051 |
| candidate-service | 3002 | 50052 |
| employer-service | 3003 | 50053 |
| job-service | 3004 | 50054 |
| application-service | 3005 | 50055 |
| communication-service | 3006 | 50056 |

---

## gateway

| Env Var | Flags | Notes |
|---|---|---|
| `APP_BASE_URL` | | Public API/base URL if required by generated links. |
| `AUTH_REFRESH_COOKIE_DOMAIN` | ✅ | Production cookie domain, for example `.careerhub.io`. |
| `CORS_ORIGIN` | | Explicit frontend origin allowlist value. |
| `AUTH_REFRESH_COOKIE_NAME` | *(default: `refresh_token`)* | Refresh token cookie name. |
| `AUTH_REFRESH_COOKIE_SECURE` | ✅ | Must be `true` in production. |
| `GRPC_APPLICATION_URL` | ✅ | Internal gRPC endpoint for `application-service`. |
| `GRPC_CANDIDATE_URL` | ✅ | Internal gRPC endpoint for `candidate-service`. |
| `GRPC_COMMUNICATION_URL` | ✅ | Internal gRPC endpoint for `communication-service`. |
| `GRPC_EMPLOYER_URL` | ✅ | Internal gRPC endpoint for `employer-service`. |
| `GRPC_IAM_URL` | ✅ | Internal gRPC endpoint for `iam-service`. |
| `GRPC_JOB_URL` | ✅ | Internal gRPC endpoint for `job-service`. |
| `JWT_REFRESH_EXPIRES_IN` | *(default: `7d`)* | Refresh token TTL. |
| `JWT_SECRET` | ✅ 🔒 | Must match `iam-service`. |
| `RESUME_PRINT_BASE_URL` | | Base URL for printable resume flows if used. |
| `THROTTLE_MEDIUM_LIMIT` | *(default: `100`)* | Medium window rate-limit count. |
| `THROTTLE_MEDIUM_TTL_MS` | *(default: `60000`)* | Medium window duration. |
| `THROTTLE_SHORT_LIMIT` | *(default: `10`)* | Short window rate-limit count. |
| `THROTTLE_SHORT_TTL_MS` | *(default: `1000`)* | Short window duration. |

---

## iam-service

| Env Var | Flags | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ 🔒 | Pooled application connection string. |
| `DIRECT_URL` | ✅ 🔒 | Direct database connection for Prisma migrations. |
| `GRPC_IAM_URL` | ✅ | gRPC bind address, usually `0.0.0.0:50051`. |
| `JWT_EXPIRES_IN` | *(default: `15m`)* | Access token TTL. |
| `JWT_REFRESH_EXPIRES_IN` | *(default: `7d`)* | Refresh token TTL. |
| `JWT_SECRET` | ✅ 🔒 | Must match `gateway`. |
| `MAIL_FROM_ADDRESS` | ✅ | Password reset sender address. |
| `MAIL_FROM_NAME` | | Optional display name for sender. |
| `MAIL_HOST` | ✅ 🔒 | SMTP host. |
| `MAIL_PASSWORD` | ✅ 🔒 | SMTP password. |
| `MAIL_PORT` | ✅ | SMTP port. |
| `MAIL_SECURE` | ✅ | `true` for implicit TLS, `false` for STARTTLS. |
| `MAIL_USER` | ✅ 🔒 | SMTP username. |
| `PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS` | ✅ 🆕 | *(default: `60000`)* Prevents duplicate sends on retry. |
| `PASSWORD_RESET_MAIL_MAX_RETRIES` | ✅ 🆕 | *(default: `3`)* Retry cap before DLQ. |
| `PASSWORD_RESET_SECRET` | ✅ 🔒 | Reset-token signing secret. |
| `PASSWORD_RESET_TOKEN_TTL_MS` | *(default: `900000`)* | Password reset token TTL. |
| `RESET_PASSWORD_URL_BASE` | ✅ | Frontend reset-password URL prefix. |
| `OUTBOX_BACKLOG_INTERVAL_MS` | *(default: `30000`)* | Backlog summary poll interval. |
| `OUTBOX_BATCH_SIZE` | *(default: `20`)* | Claimed records per publish cycle. |
| `OUTBOX_CLEANUP_BATCH_SIZE` | *(default: `100`)* | Deleted rows per cleanup batch. |
| `OUTBOX_CLEANUP_ENABLED` | *(default: `true`)* | Keep enabled in production. |
| `OUTBOX_CLEANUP_INTERVAL_MS` | *(default: `60000`)* | Cleanup loop interval. |
| `OUTBOX_FAILED_RETENTION_MS` | *(default: `2592000000`)* | Failed outbox retention. |
| `OUTBOX_MAX_RETRY_COUNT` | *(default: `5`)* | Publish retry cap. |
| `OUTBOX_POLL_INTERVAL_MS` | *(default: `5000`)* | Pending outbox poll interval. |
| `OUTBOX_PROCESSED_RETENTION_MS` | *(default: `604800000`)* | Processed outbox retention. |
| `OUTBOX_PUBLISH_CONCURRENCY` | *(default: `5`)* | Parallel publish workers per cycle. |
| `OUTBOX_PUBLISH_ENABLED` | *(default: `true`)* | Must stay enabled in production. |
| `OUTBOX_RETRY_DELAY_MS` | *(default: `30000`)* | Base exponential backoff delay. |
| `OUTBOX_STALE_PROCESSING_TIMEOUT_MS` | *(default: `60000`)* | Reclaims stale `processing` rows. |

---

## application-service

| Env Var | Flags | Notes |
|---|---|---|
| `APP_BASE_URL` | ✅ | Base URL used when building application-facing links. |
| `DATABASE_URL` | ✅ 🔒 | Pooled application connection string. |
| `DIRECT_URL` | ✅ 🔒 | Direct database connection for Prisma migrations. |
| `GRPC_APPLICATION_URL` | ✅ | gRPC bind address, usually `0.0.0.0:50055`. |
| `GRPC_JOB_URL` | ✅ | Internal gRPC endpoint for `job-service`. |
| `OUTBOX_BACKLOG_INTERVAL_MS` | *(default: `30000`)* | Backlog summary poll interval. |
| `OUTBOX_BATCH_SIZE` | *(default: `20`)* | Claimed records per publish cycle. |
| `OUTBOX_CLEANUP_BATCH_SIZE` | *(default: `100`)* | Deleted rows per cleanup batch. |
| `OUTBOX_CLEANUP_ENABLED` | *(default: `true`)* | Keep enabled in production. |
| `OUTBOX_CLEANUP_INTERVAL_MS` | *(default: `60000`)* | Cleanup loop interval. |
| `OUTBOX_FAILED_RETENTION_MS` | *(default: `2592000000`)* | Failed outbox retention. |
| `OUTBOX_MAX_RETRY_COUNT` | *(default: `5`)* | Publish retry cap. |
| `OUTBOX_POLL_INTERVAL_MS` | *(default: `5000`)* | Pending outbox poll interval. |
| `OUTBOX_PROCESSED_RETENTION_MS` | *(default: `604800000`)* | Processed outbox retention. |
| `OUTBOX_PUBLISH_CONCURRENCY` | *(default: `5`)* | Parallel publish workers per cycle. |
| `OUTBOX_PUBLISH_ENABLED` | ✅ | Must stay enabled for notification integration events. |
| `OUTBOX_RETRY_DELAY_MS` | *(default: `30000`)* | Base exponential backoff delay. |
| `OUTBOX_STALE_PROCESSING_TIMEOUT_MS` | *(default: `60000`)* | Reclaims stale `processing` rows. |
| `REDIS_DASHBOARD_CACHE_TTL_S` | *(default: `120`)* | Dashboard cache TTL. |
| `REDIS_URL` | ✅ 🔒 | Redis connection URL. |

---

## candidate-service

| Env Var | Flags | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ 🔒 | Pooled application connection string. |
| `DIRECT_URL` | ✅ 🔒 | Direct database connection for Prisma migrations. |
| `GRPC_CANDIDATE_URL` | ✅ | gRPC bind address, usually `0.0.0.0:50052`. |

---

## employer-service

| Env Var | Flags | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ 🔒 | Pooled application connection string. |
| `DIRECT_URL` | ✅ 🔒 | Direct database connection for Prisma migrations. |
| `GRPC_EMPLOYER_URL` | ✅ | gRPC bind address, usually `0.0.0.0:50053`. |

---

## job-service

| Env Var | Flags | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ 🔒 | Pooled application connection string. |
| `DIRECT_URL` | ✅ 🔒 | Direct database connection for Prisma migrations. |
| `GRPC_JOB_URL` | ✅ | gRPC bind address, usually `0.0.0.0:50054`. |
| `MEILISEARCH_API_KEY` | ✅ 🔒 | Meilisearch API key. |
| `MEILISEARCH_HOST` | ✅ | Meilisearch base URL. |
| `OUTBOX_BACKLOG_INTERVAL_MS` | *(default: `30000`)* | Backlog summary poll interval. |
| `OUTBOX_BATCH_SIZE` | *(default: `20`)* | Claimed records per publish cycle. |
| `OUTBOX_CLEANUP_BATCH_SIZE` | *(default: `100`)* | Deleted rows per cleanup batch. |
| `OUTBOX_CLEANUP_ENABLED` | *(default: `true`)* | Keep enabled in production. |
| `OUTBOX_CLEANUP_INTERVAL_MS` | *(default: `60000`)* | Cleanup loop interval. |
| `OUTBOX_MAX_RETRY_COUNT` | *(default: `5`)* | Publish retry cap. |
| `OUTBOX_POLL_INTERVAL_MS` | *(default: `5000`)* | Pending outbox poll interval. |
| `OUTBOX_PROCESSED_RETENTION_MS` | *(default: `604800000`)* | Processed outbox retention. |
| `OUTBOX_PUBLISH_ENABLED` | *(default: `true`)* | Keep enabled if job events are published. |
| `OUTBOX_RETRY_DELAY_MS` | *(default: `30000`)* | Base exponential backoff delay. |
| `OUTBOX_STALE_PROCESSING_TIMEOUT_MS` | *(default: `60000`)* | Reclaims stale `processing` rows. |
| `REDIS_SEARCH_CACHE_TTL_S` | *(default: `30`)* | Search cache TTL. |
| `REDIS_SLUG_CACHE_TTL_S` | *(default: `300`)* | Slug cache TTL. |
| `REDIS_URL` | ✅ 🔒 | Redis connection URL. |

---

## communication-service

| Env Var | Flags | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ 🔒 | Pooled application connection string. |
| `DIRECT_URL` | ✅ 🔒 | Direct database connection for Prisma migrations. |
| `GRPC_COMMUNICATION_URL` | ✅ | gRPC bind address, usually `0.0.0.0:50056`. |
| `GRPC_IAM_URL` | ✅ | Internal gRPC endpoint for `iam-service`. |
| `MAIL_DELIVERY_CLAIM_TIMEOUT_MS` | *(default: `60000`)* | Prevents duplicate delivery on retry. |
| `MAIL_FROM_ADDRESS` | ✅ | Sender address for notification emails. |
| `MAIL_FROM_NAME` | | Optional sender display name. |
| `MAIL_HOST` | ✅ 🔒 | SMTP host. |
| `MAIL_INTERVIEW_MAX_RETRIES` | *(default: `3`)* | Interview notification retry cap. |
| `MAIL_OFFER_MAX_RETRIES` | *(default: `3`)* | Offer notification retry cap. |
| `MAIL_PASSWORD` | ✅ 🔒 | SMTP password. |
| `MAIL_PORT` | ✅ | SMTP port. |
| `MAIL_SECURE` | ✅ | `true` for implicit TLS, `false` for STARTTLS. |
| `MAIL_USER` | ✅ 🔒 | SMTP username. |
| `NOTIFICATION_MAX_RETRIES` | ✅ 🆕 | *(default: `3`)* Retry cap before DLQ. |

---

## Migration

`prisma migrate deploy` is **not** run inside Docker containers. Run it as a deploy-time step before starting new app containers. `gateway` does not use Prisma and is excluded.

### One-command helper

```bash
DATABASE_URL=<pooled-url> DIRECT_URL=<direct-url> pnpm prisma:migrate:deploy:all
```

### Per-service commands

```bash
DATABASE_URL=<pooled-url> DIRECT_URL=<direct-url> pnpm --filter @careerhub/iam-service run prisma:migrate:deploy
DATABASE_URL=<pooled-url> DIRECT_URL=<direct-url> pnpm --filter @careerhub/application-service run prisma:migrate:deploy
DATABASE_URL=<pooled-url> DIRECT_URL=<direct-url> pnpm --filter @careerhub/candidate-service run prisma:migrate:deploy
DATABASE_URL=<pooled-url> DIRECT_URL=<direct-url> pnpm --filter @careerhub/employer-service run prisma:migrate:deploy
DATABASE_URL=<pooled-url> DIRECT_URL=<direct-url> pnpm --filter @careerhub/job-service run prisma:migrate:deploy
DATABASE_URL=<pooled-url> DIRECT_URL=<direct-url> pnpm --filter @careerhub/communication-service run prisma:migrate:deploy
```

> Use `DIRECT_URL` for migrations. Do not point migrations at pooled PgBouncer transaction-mode connections for DDL.
