# CareerHub — Backend Microservices

Nền tảng tuyển dụng (job board + CV builder) được xây theo kiến trúc **microservices** với **NestJS + TypeScript**, quản lý bằng **pnpm workspace monorepo**.

- **8 service**: `gateway` (API/BFF), `iam-service` (auth/identity), `candidate-service` (hồ sơ/CV), `employer-service` (công ty/phòng ban), `job-service` (tin tuyển dụng + search), `application-service` (ứng tuyển/phỏng vấn/offer), `communication-service` (email/thông báo), `workflow-service` (saga đăng ký).
- **Giao tiếp**: gRPC (đồng bộ, nội bộ) · RabbitMQ (bất đồng bộ, có Outbox + DLQ) · saga orchestration cho luồng đăng ký xuyên service.
- **Hạ tầng phụ**: PostgreSQL (mỗi service 1 database riêng), Redis (cache), Meilisearch (tìm kiếm job), SMTP (gửi mail).

> Tài liệu kiến trúc & nghiệp vụ chi tiết nằm trong thư mục [`docs/`](docs/).

---

## Yêu cầu môi trường

| Công cụ | Phiên bản | Dùng cho |
| --- | --- | --- |
| Docker + Docker Compose | mới nhất | Chạy toàn bộ service + hạ tầng |
| Node.js | 20.x | **Chỉ** để chạy Prisma migration |
| pnpm | 10.12.4 | `corepack enable && corepack prepare pnpm@10.12.4 --activate` |

> Vì sao vẫn cần Node/pnpm? Image Docker của service **không kèm Prisma CLI** — migration được cố ý tách chạy riêng trước khi start app (xem [docs/dockerfile-explanation.md](docs/dockerfile-explanation.md)).

---

## Cách 1 — Chạy toàn bộ bằng Docker (self-host, không cần tài khoản cloud)

Phương án này bật `--profile infra` để Docker tự dựng luôn PostgreSQL, RabbitMQ, Redis, Meilisearch. Không cần Neon/CloudAMQP/Meilisearch Cloud.

### Bước 1. Tạo file cấu hình `.env.prod`

Copy mẫu rồi dùng bộ giá trị self-host dưới đây (đã điền sẵn để chạy local):

```bash
cp .env.prod.example .env.prod
```

Thay toàn bộ nội dung `.env.prod` bằng:

```dotenv
IMAGE_TAG=latest

# Runtime chung (development: cho phép broker amqp:// thường của RabbitMQ bundled)
NODE_ENV=development
LOG_LEVEL=info
OTEL_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=careerhub

# RabbitMQ (bundled)
BROKER_URL=amqp://careerhub:change-me-rabbitmq@rabbitmq:5672
BROKER_EXCHANGE_PREFIX=careerhub.
BROKER_QUEUE_PREFIX=careerhub.

# Gateway
GATEWAY_HOST_PORT=3000
APP_BASE_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=dev-super-secret-change-me
AUTH_REFRESH_COOKIE_DOMAIN=localhost
AUTH_REFRESH_COOKIE_SECURE=false

# Database — mỗi service 1 DB riêng, dùng chung 1 Postgres bundled
IAM_DATABASE_URL=postgresql://careerhub:change-me-postgres@postgres:5432/iam_service
IAM_DIRECT_URL=postgresql://careerhub:change-me-postgres@postgres:5432/iam_service
CANDIDATE_DATABASE_URL=postgresql://careerhub:change-me-postgres@postgres:5432/candidate_service
CANDIDATE_DIRECT_URL=postgresql://careerhub:change-me-postgres@postgres:5432/candidate_service
EMPLOYER_DATABASE_URL=postgresql://careerhub:change-me-postgres@postgres:5432/employer_service
EMPLOYER_DIRECT_URL=postgresql://careerhub:change-me-postgres@postgres:5432/employer_service
JOB_DATABASE_URL=postgresql://careerhub:change-me-postgres@postgres:5432/job_service
JOB_DIRECT_URL=postgresql://careerhub:change-me-postgres@postgres:5432/job_service
APPLICATION_DATABASE_URL=postgresql://careerhub:change-me-postgres@postgres:5432/application_service
APPLICATION_DIRECT_URL=postgresql://careerhub:change-me-postgres@postgres:5432/application_service
COMMUNICATION_DATABASE_URL=postgresql://careerhub:change-me-postgres@postgres:5432/communication_service
COMMUNICATION_DIRECT_URL=postgresql://careerhub:change-me-postgres@postgres:5432/communication_service
WORKFLOW_DATABASE_URL=postgresql://careerhub:change-me-postgres@postgres:5432/workflow_service
WORKFLOW_DIRECT_URL=postgresql://careerhub:change-me-postgres@postgres:5432/workflow_service

# Meilisearch (bundled) — API key phải trùng MEILI_MASTER_KEY
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_API_KEY=careerhub-local-master-key

# App service
APPLICATION_APP_BASE_URL=http://localhost:3000

# SMTP — mail là side-effect nền, để placeholder vẫn chạy được các luồng chính
IAM_MAIL_FROM_ADDRESS=noreply@careerhub.local
IAM_MAIL_HOST=smtp.invalid
IAM_MAIL_PORT=587
IAM_MAIL_SECURE=false
IAM_MAIL_USER=dev
IAM_MAIL_PASSWORD=dev
PASSWORD_RESET_SECRET=dev-reset-secret-change-me
RESET_PASSWORD_URL_BASE=http://localhost:5173/reset-password
COMMUNICATION_MAIL_FROM_ADDRESS=noreply@careerhub.local
COMMUNICATION_MAIL_HOST=smtp.invalid
COMMUNICATION_MAIL_PORT=587
COMMUNICATION_MAIL_SECURE=false
COMMUNICATION_MAIL_USER=dev
COMMUNICATION_MAIL_PASSWORD=dev

# Mật khẩu hạ tầng bundled (profile infra)
POSTGRES_USER=careerhub
POSTGRES_PASSWORD=change-me-postgres
POSTGRES_DB=careerhub
RABBITMQ_DEFAULT_USER=careerhub
RABBITMQ_DEFAULT_PASS=change-me-rabbitmq
MEILI_MASTER_KEY=careerhub-local-master-key
```

### Bước 2. Kéo image & bật hạ tầng + service

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml --profile infra pull
docker compose --env-file .env.prod -f docker-compose.prod.yml --profile infra up -d
```

### Bước 3. Tạo database cho từng service

Postgres bundled chỉ tự tạo DB `careerhub`, cần tạo thêm DB riêng cho mỗi service:

```bash
for db in iam_service candidate_service employer_service job_service \
          application_service communication_service workflow_service; do
  docker exec careerhub-postgres createdb -U careerhub "$db"
done
```

<details>
<summary>PowerShell (Windows)</summary>

```powershell
'iam_service','candidate_service','employer_service','job_service',
'application_service','communication_service','workflow_service' |
  ForEach-Object { docker exec careerhub-postgres createdb -U careerhub $_ }
```
</details>

### Bước 4. Chạy Prisma migration (từ host)

Postgres bundled expose ở `localhost:55432`. Cài dependency rồi migrate từng service:

```bash
pnpm install --frozen-lockfile
pnpm build:packages

PG="postgresql://careerhub:change-me-postgres@localhost:55432"
migrate() { DATABASE_URL="$PG/$2" DIRECT_URL="$PG/$2" \
  pnpm --filter @careerhub/$1 run prisma:migrate:deploy; }

migrate iam-service          iam_service
migrate candidate-service    candidate_service
migrate employer-service     employer_service
migrate job-service          job_service
migrate application-service  application_service
migrate communication-service communication_service
migrate workflow-service     workflow_service
```

> Container app đã đang chạy; sau khi DB có schema, chúng sẽ kết nối bình thường ở lần retry kế tiếp. Nếu muốn chắc chắn: `docker compose --env-file .env.prod -f docker-compose.prod.yml restart`.

### Bước 5. Kiểm tra

```bash
curl http://localhost:3000/health          # Gateway healthy
docker compose -f docker-compose.prod.yml ps
```

- API Gateway: `http://localhost:3000`
- RabbitMQ Management: `http://localhost:15672` (careerhub / change-me-rabbitmq)
- Meilisearch: `http://localhost:7700`
- Swagger (chỉ khi `NODE_ENV=development`): `http://localhost:3000/api/docs`

> **Mail**: với `smtp.invalid` các email (reset mật khẩu, mời phỏng vấn, gửi offer) sẽ retry rồi vào DLQ — **không ảnh hưởng** các luồng chính (đăng ký, đăng nhập, đăng tin, ứng tuyển, phỏng vấn, offer). Muốn nhận mail thật: điền SMTP thật hoặc chạy MailHog và trỏ `*_MAIL_HOST` vào đó.

---

## Cách 2 — Dùng dịch vụ managed (Neon / CloudAMQP / Meilisearch Cloud)

Đây là luồng production thật của dự án. Không bật `--profile infra`.

1. Điền `.env.prod` từ [`.env.prod.example`](.env.prod.example) với thông tin dịch vụ thật (Postgres pooled/direct URL, `amqps://` broker, Meilisearch host/key, SMTP).
2. Deploy:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
pnpm install --frozen-lockfile && pnpm build:packages
pnpm prisma:migrate:deploy:all      # migrate 7 DB service (đọc DATABASE_URL từng service)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Chi tiết biến môi trường: [docs/production-env-guide.md](docs/production-env-guide.md) · cheat sheet: [docs/production-deploy-cheatsheet.md](docs/production-deploy-cheatsheet.md).

---

## (Tùy chọn) Observability stack

```bash
docker compose --env-file .env.prod -f docker-compose.observability.yml up -d
```

Khởi động Prometheus + Loki + Promtail + Tempo + Grafana (Grafana: `http://localhost:3300`). Xem [docs/observability-local.md](docs/observability-local.md).

---

## Bảng port

| Service | HTTP | gRPC | Prisma |
| --- | --- | --- | --- |
| gateway | 3000 | — | ✗ |
| iam-service | 3001 | 50051 | ✓ |
| candidate-service | 3002 | 50052 | ✓ |
| employer-service | 3003 | 50053 | ✓ |
| job-service | 3004 | 50054 | ✓ |
| application-service | 3005 | 50055 | ✓ |
| communication-service | 3006 | 50056 | ✓ |
| workflow-service | 3007 | 50057 | ✓ |
| PostgreSQL (bundled) | 55432 | — | — |
| RabbitMQ (bundled) | 5672 / 15672 | — | — |
| Redis (bundled) | 6379 | — | — |
| Meilisearch (bundled) | 7700 | — | — |

---

## Lệnh thường dùng

```bash
# Xem log 1 service
docker compose -f docker-compose.prod.yml logs -f gateway

# Dừng toàn bộ (giữ dữ liệu)
docker compose -f docker-compose.prod.yml --profile infra down

# Dừng và xoá luôn dữ liệu (volume)
docker compose -f docker-compose.prod.yml --profile infra down -v
```

---

## Chạy local không dùng Docker (dev)

Dành cho phát triển, dựng hạ tầng nhẹ + chạy service bằng Node:

```bash
pnpm local:infra:up          # Postgres + MailHog qua docker-compose.local.yml
pnpm dev:saga                # build + chạy các service cho luồng saga
```

---

## Cấu trúc thư mục

```
services/          # 8 microservice (mỗi service theo Clean Architecture / DDD)
packages/          # contracts (gRPC proto + integration events), shared-kernel (DDD), nest-common, broker-ops (DLQ replay)
infrastructure/    # observability, outbox processor, RabbitMQ transport, runtime bootstrap dùng chung
docs/              # tài liệu kiến trúc, nghiệp vụ, state machine, saga, event catalog
scripts/           # migrate/seed/observability scripts
docker-compose.*.yml
```
