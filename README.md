<div align="center">

# CareerHub Backend Microservices

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20compatible-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-AMQP-FF6600?logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![gRPC](https://img.shields.io/badge/gRPC-Protobuf-244C5A?logo=grpc&logoColor=white)](https://grpc.io/)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

**Backend microservices cho CareerHub: Gateway HTTP, các bounded-context service, gRPC nội bộ, RabbitMQ eventing, Prisma và PostgreSQL theo từng service.**

[Tổng quan](#-tong-quan) •
[Kiến trúc](#-kien-truc) •
[Quick Start](#-quick-start) •
[Commands](#-available-commands) •
[Docs](#-documentation)

</div>

---

## Table of Contents

- [Tổng quan](#-tong-quan)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Kiến trúc](#-kien-truc)
- [Service Map](#-service-map)
- [Quick Start](#-quick-start)
- [Available Commands](#-available-commands)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Database & Migration](#-database--migration)
- [Messaging & Integration](#-messaging--integration)
- [Observability](#-observability)
- [Testing](#-testing)
- [Documentation](#-documentation)

---

## Tổng quan

`CareerHub-be-microservices` là backend microservices cho nền tảng tuyển dụng CareerHub. Repo này tách backend cũ theo các bounded context chính:

- **Gateway**: HTTP API boundary cho frontend và điều phối request sang các service nội bộ.
- **IAM Service**: identity, đăng ký, đăng nhập, refresh token, password reset.
- **Candidate Service**: hồ sơ candidate, resume, saved jobs.
- **Employer Service**: hồ sơ công ty và employer profile.
- **Job Service**: job posting, job search, slug/cache, Meilisearch integration.
- **Application Service**: applications, ATS pipeline, interview, offer.
- **Communication Service**: notification, mail delivery, DLQ/retry cho mail flow.
- **Workflow Service**: workflow phối hợp candidate/employer/job/application.

Mục tiêu của repo là giữ domain CareerHub rõ ràng theo service boundary, giảm coupling giữa các module, và chuẩn bị nền cho event-driven architecture, outbox, observability và deployment production.

---

## Features

### Platform Foundation

- NestJS 11 + TypeScript workspace bằng pnpm.
- Shared packages cho contracts, DDD primitives, NestJS common runtime và broker ops.
- Gateway HTTP làm public API boundary.
- gRPC nội bộ giữa gateway và domain services.
- RabbitMQ cho integration events, retry và dead-letter queue.
- Prisma schema/migration riêng theo từng service có database.
- Docker Compose production cho gateway, services, Redis, observability và broker/cloud endpoints.

### Domain Capabilities

- Candidate/employer registration và authentication.
- JWT access token, refresh token cookie, session refresh/logout.
- Candidate profile, resume và saved jobs.
- Employer profile và company data.
- Jobs listing/detail/search, slug cache, search cache.
- Applications, ATS stage worklist, interviews và offers.
- Password reset mail flow và notification delivery.

### Reliability & Operations

- Health endpoints và Prometheus-style metrics foundation.
- Request correlation qua HTTP/gRPC/RabbitMQ.
- Outbox pattern foundation cho event publish an toàn hơn.
- DLQ tooling cho communication, IAM email, job search, job slug cache và application cache.
- Smoke/integration test scripts cho các phase chính.

---

## Tech Stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js, NestJS 11, TypeScript 5.x |
| Package manager | pnpm 10 workspace |
| Database | PostgreSQL / Neon-compatible databases |
| ORM | Prisma 7 |
| Sync communication | gRPC + protobuf |
| Async communication | RabbitMQ / AMQP |
| Cache | Redis |
| Search | Meilisearch |
| Observability | Health, metrics, OpenTelemetry/Loki/Tempo/Grafana-oriented stack |
| Testing | Node test runner, service smoke tests, gateway live E2E scripts |
| Deployment | Docker Compose production images |

---

## Kiến trúc

Runtime chính:

```text
Frontend / Client
  -> Gateway HTTP API
  -> gRPC clients
  -> IAM / Candidate / Employer / Job / Application / Communication / Workflow services
  -> Prisma
  -> PostgreSQL databases

Services
  -> RabbitMQ integration events
  -> Redis cache
  -> Meilisearch search index
```

Service nội bộ đi theo layering nhất quán:

```text
presentation
  -> application
  -> domain
  -> infrastructure
```

Shared code nằm trong `packages/*` và `infrastructure/`, tránh để service phụ thuộc trực tiếp vào implementation của service khác.

---

## Service Map

| Service | Package | HTTP Port | gRPC Port | Responsibility |
| --- | --- | ---: | ---: | --- |
| Gateway | `@careerhub/gateway` | `3000` | - | Public HTTP API, auth cookie handling, gRPC orchestration |
| IAM | `@careerhub/iam-service` | `3001` | `50051` | Identity, auth, sessions, password reset |
| Candidate | `@careerhub/candidate-service` | `3002` | `50052` | Candidate profile, resumes, saved jobs |
| Employer | `@careerhub/employer-service` | `3003` | `50053` | Employer/company profile |
| Job | `@careerhub/job-service` | `3004` | `50054` | Job posting, search, cache, indexing |
| Application | `@careerhub/application-service` | `3005` | `50055` | Applications, ATS, interviews, offers |
| Communication | `@careerhub/communication-service` | `3006` | `50056` | Notifications, mail delivery |
| Workflow | `@careerhub/workflow-service` | `3007` | `50057` | Cross-service workflow coordination |

Shared packages:

| Package | Responsibility |
| --- | --- |
| `@careerhub/contracts` | gRPC proto, integration event contracts, outbox contracts |
| `@careerhub/shared-kernel` | DDD primitives, shared domain helpers, reference types |
| `@careerhub/nest-common` | Nest bootstrap, validation, request context, health, metrics, transport helpers |
| `@careerhub/infrastructure` | Runtime infrastructure, RabbitMQ/gRPC adapters, observability helpers |
| `@careerhub/broker-ops` | DLQ and broker operation CLIs |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL hoặc Neon-compatible database
- RabbitMQ local hoặc CloudAMQP
- Redis nếu chạy job/application cache flows
- Meilisearch nếu chạy search indexing đầy đủ

### 1. Install dependencies

```powershell
cd D:\Workspace\Microservices\CareerHub\CareerHub-be-microservices
corepack enable
corepack pnpm install
```

### 2. Configure env files

Root `.env.example` chỉ là shared reference. Khi chạy local, tạo `.env` theo từng service:

```powershell
Copy-Item .env.example .env
Copy-Item services\gateway\.env.example services\gateway\.env
Copy-Item services\iam-service\.env.example services\iam-service\.env
Copy-Item services\candidate-service\.env.example services\candidate-service\.env
Copy-Item services\employer-service\.env.example services\employer-service\.env
Copy-Item services\job-service\.env.example services\job-service\.env
Copy-Item services\application-service\.env.example services\application-service\.env
Copy-Item services\communication-service\.env.example services\communication-service\.env
Copy-Item services\workflow-service\.env.example services\workflow-service\.env
```

Cập nhật tối thiểu:

- `DATABASE_URL` và `DIRECT_URL` cho các service có database.
- `JWT_SECRET` giống nhau ở gateway và IAM.
- `BROKER_URL` cho RabbitMQ.
- `GRPC_*_URL` theo port nội bộ.
- `REDIS_URL` cho job/application cache.
- `MEILISEARCH_HOST` và `MEILISEARCH_API_KEY` cho job search.
- `MAIL_*` và `RESET_PASSWORD_URL_BASE` cho password reset mail.

### 3. Build shared packages

```powershell
corepack pnpm build:packages
```

### 4. Run migrations

```powershell
corepack pnpm prisma:migrate:deploy:all
```

Khi phát triển local schema mới, có thể chạy migration theo service:

```powershell
corepack pnpm --filter @careerhub/iam-service prisma:migrate:dev
corepack pnpm --filter @careerhub/job-service prisma:migrate:dev
```

### 5. Seed reference/demo data

```powershell
corepack pnpm seed:reference-data
corepack pnpm seed:demo-jobs
corepack pnpm seed:demo-applications
```

### 6. Run services

Mở nhiều terminal và chạy các service cần thiết:

```powershell
corepack pnpm --filter @careerhub/iam-service dev
corepack pnpm --filter @careerhub/candidate-service dev
corepack pnpm --filter @careerhub/employer-service dev
corepack pnpm --filter @careerhub/job-service dev
corepack pnpm --filter @careerhub/application-service dev
corepack pnpm --filter @careerhub/communication-service dev
corepack pnpm --filter @careerhub/workflow-service dev
corepack pnpm --filter @careerhub/gateway dev
```

Gateway mặc định chạy tại:

- API: `http://localhost:3000`

---

## Available Commands

### Root workspace

| Command | Description |
| --- | --- |
| `corepack pnpm install` | Install toàn bộ workspace |
| `corepack pnpm build:packages` | Build shared packages và infrastructure |
| `corepack pnpm prisma:migrate:deploy:all` | Apply migrations cho tất cả service databases |
| `corepack pnpm seed:reference-data` | Seed reference data |
| `corepack pnpm seed:demo-jobs` | Seed demo jobs |
| `corepack pnpm seed:demo-applications` | Seed demo applications |
| `corepack pnpm migrate:monolith` | Migrate dữ liệu từ monolith sang microservices |
| `corepack pnpm verify:monolith-mapping` | Kiểm tra mapping monolith -> microservices |
| `corepack pnpm test:core` | Unit tests nhóm service core |
| `corepack pnpm test:smoke:core` | Smoke tests nhóm service core |
| `corepack pnpm observability:up` | Bật observability stack local |
| `corepack pnpm observability:down` | Tắt observability stack local |

### Per service

| Command | Description |
| --- | --- |
| `corepack pnpm --filter @careerhub/<service> build` | Build một service |
| `corepack pnpm --filter @careerhub/<service> dev` | Build rồi chạy service local |
| `corepack pnpm --filter @careerhub/<service> start` | Chạy output đã build |
| `corepack pnpm --filter @careerhub/<service> test` | Chạy unit tests của service |
| `corepack pnpm --filter @careerhub/<service> prisma:generate` | Generate Prisma client |
| `corepack pnpm --filter @careerhub/<service> prisma:migrate:deploy` | Apply Prisma migrations |
| `corepack pnpm --filter @careerhub/<service> prisma:migrate:dev` | Tạo/chạy migration local |

Ví dụ:

```powershell
corepack pnpm --filter @careerhub/gateway test
corepack pnpm --filter @careerhub/application-service build
```

### Integration verification

| Command | Description |
| --- | --- |
| `corepack pnpm test:auth:smoke` | Smoke test auth flow |
| `corepack pnpm test:candidate-phase:verify` | Verify candidate phase |
| `corepack pnpm test:job-phase:verify` | Verify job phase |
| `corepack pnpm test:job-phase:integration` | Live E2E job phase qua gateway |
| `corepack pnpm test:application-phase:verify` | Verify application phase |
| `corepack pnpm test:application-phase:integration` | Live E2E application phase |
| `corepack pnpm test:interview-offer-phase:integration` | Live E2E interview/offer phase |
| `corepack pnpm test:candidate-module:integration` | Live E2E candidate module |
| `corepack pnpm test:resume-export-pdf:integration` | Live E2E resume PDF export |
| `corepack pnpm test:password-reset:e2e` | Live E2E password reset |

### Broker operations

| Command | Description |
| --- | --- |
| `corepack pnpm ops:communication-dlq` | Inspect/retry communication DLQ |
| `corepack pnpm ops:iam-email-dlq` | Inspect/retry IAM email DLQ |
| `corepack pnpm --filter @careerhub/broker-ops dlq:job-search` | Job search DLQ CLI |
| `corepack pnpm --filter @careerhub/broker-ops dlq:job-slug-cache` | Job slug cache DLQ CLI |
| `corepack pnpm --filter @careerhub/broker-ops dlq:application-cache` | Application cache DLQ CLI |

---

## Environment Variables

Root `.env.example` là bản tham chiếu chung. Service runtime đọc `.env` ở từng service.

Các nhóm biến quan trọng:

| Group | Variables |
| --- | --- |
| Common runtime | `SERVICE_NAME`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, `LOG_PRETTY`, `HTTP_LOG_ENABLED` |
| Database | `DATABASE_URL`, `DIRECT_URL` |
| Auth | `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `AUTH_REFRESH_COOKIE_*` |
| gRPC | `GRPC_IAM_URL`, `GRPC_CANDIDATE_URL`, `GRPC_EMPLOYER_URL`, `GRPC_JOB_URL`, `GRPC_APPLICATION_URL`, `GRPC_COMMUNICATION_URL`, `GRPC_WORKFLOW_URL` |
| Broker | `BROKER_URL`, `BROKER_EXCHANGE_PREFIX`, `BROKER_QUEUE_PREFIX`, `BROKER_PREFETCH_COUNT`, `BROKER_DEAD_LETTER_*` |
| Cache | `REDIS_URL`, `REDIS_SLUG_CACHE_TTL_S`, `REDIS_SEARCH_CACHE_TTL_S`, `REDIS_DASHBOARD_CACHE_TTL_S` |
| Search | `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` |
| Mail | `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` |
| Password reset | `PASSWORD_RESET_SECRET`, `PASSWORD_RESET_TOKEN_TTL_MS`, `RESET_PASSWORD_URL_BASE`, `PASSWORD_RESET_MAIL_*` |
| Observability | `OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `HEALTH_ENABLED`, `METRICS_ENABLED` |

Production deployment dùng `.env.prod.example` và `docker-compose.prod.yml`. Không commit secret thật vào repo.

---

## Project Structure

```text
CareerHub-be-microservices/
├── docs/                         # Architecture, domain, ops and deployment docs
├── infrastructure/               # Shared runtime infrastructure and adapters
├── packages/
│   ├── broker-ops/               # DLQ/broker operation CLIs
│   ├── contracts/                # gRPC proto, events, outbox contracts
│   ├── nest-common/              # NestJS common utilities
│   └── shared-kernel/            # DDD/shared domain primitives
├── scripts/                      # Migration, seed, verification and ops scripts
├── services/
│   ├── gateway/                  # Public HTTP gateway
│   ├── iam-service/              # Identity and auth
│   ├── candidate-service/        # Candidate profile and resume
│   ├── employer-service/         # Employer/company profile
│   ├── job-service/              # Jobs and search
│   ├── application-service/      # Applications, interviews, offers
│   ├── communication-service/    # Notifications and mail
│   └── workflow-service/         # Cross-service workflows
├── docker-compose.prod.yml       # Production compose file
├── docker-compose.observability.yml
├── pnpm-workspace.yaml
└── package.json
```

Mỗi service thường có:

```text
service/
├── prisma/                       # Schema and migrations
├── src/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   ├── presentation/
│   └── config/
└── package.json
```

---

## Database & Migration

Microservices dùng database/schema riêng theo service thay vì dùng chung một schema monolith.

| Service | Main database area |
| --- | --- |
| IAM | identities, auth sessions, password reset tokens |
| Candidate | candidate profiles, resumes, saved jobs |
| Employer | employer/company profiles |
| Job | jobs, department/category/search-related data |
| Application | applications, histories, interviews, offers, recruiter notes |
| Communication | notifications, mail deliveries |
| Workflow | workflow state and cross-service coordination data |

Monolith migration được mô tả chi tiết trong [docs/monolith-to-microservices-mapping.md](./docs/monolith-to-microservices-mapping.md).

---

## Messaging & Integration

### gRPC

gRPC là kênh sync nội bộ cho request-response giữa gateway và services. Proto/contracts nằm trong `packages/contracts`.

Ví dụ flow:

```text
Client
  -> Gateway HTTP
  -> Gateway gRPC client
  -> IAM / Job / Application service
  -> Gateway response
```

### RabbitMQ

RabbitMQ dùng cho integration events, cache invalidation, notification/mail side effects và các tác vụ không cần block request chính.

Outbox pattern được dùng cho các service cần đảm bảo event không mất sau khi database transaction commit. Xem thêm [docs/outbox-pattern.md](./docs/outbox-pattern.md).

---

## Observability

Repo có foundation cho:

- Health endpoints.
- Metrics endpoint theo Prometheus text format.
- Request ID/correlation qua HTTP, gRPC và RabbitMQ.
- Local observability stack qua `docker-compose.observability.yml`.
- Tài liệu vận hành Grafana/Loki/Tempo/Prometheus tại [docs/observability-local.md](./docs/observability-local.md).

Chạy local observability:

```powershell
corepack pnpm observability:up
corepack pnpm observability:down
```

---

## Testing

Chạy test core:

```powershell
corepack pnpm test:core
corepack pnpm test:smoke:core
```

Chạy test một service:

```powershell
corepack pnpm --filter @careerhub/iam-service test
corepack pnpm --filter @careerhub/gateway test
```

Các live integration tests yêu cầu service, database, broker và dependency liên quan đang chạy đúng env.

---

## Documentation

| Document | Description |
| --- | --- |
| [docs/system-architecture.md](./docs/system-architecture.md) | Tổng quan kiến trúc hiện tại và target architecture |
| [docs/monolith-to-microservices-mapping.md](./docs/monolith-to-microservices-mapping.md) | Mapping dữ liệu từ monolith sang microservices |
| [docs/schema.md](./docs/schema.md) | Schema/domain data model |
| [docs/business-rule.md](./docs/business-rule.md) | Business rules |
| [docs/recruitment-flow.md](./docs/recruitment-flow.md) | Recruitment flow |
| [docs/state-machine.md](./docs/state-machine.md) | State machines |
| [docs/outbox-pattern.md](./docs/outbox-pattern.md) | Outbox pattern |
| [docs/observability-local.md](./docs/observability-local.md) | Local observability setup |
| [docs/dlq-operations-runbook.md](./docs/dlq-operations-runbook.md) | DLQ operations |
| [docs/production-env-guide.md](./docs/production-env-guide.md) | Production env guide |
| [docs/docker-compose-production.md](./docs/docker-compose-production.md) | Docker Compose production guide |
| [docs/cicd-overview.md](./docs/cicd-overview.md) | CI/CD overview |

---

## License

Repository hiện đang ở trạng thái private/internal. Cần xác định license chính thức trước khi public hoặc phân phối lại.
