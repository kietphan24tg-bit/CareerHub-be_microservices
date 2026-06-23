# Docker Compose Production Flow

This file is the runtime counterpart to the Docker Hub release workflow.

Use [docker-compose.prod.yml](../docker-compose.prod.yml) to pull and run the 7 app services from Docker Hub:

- `kietphan24/careerhub-gateway`
- `kietphan24/careerhub-iam-service`
- `kietphan24/careerhub-candidate-service`
- `kietphan24/careerhub-employer-service`
- `kietphan24/careerhub-job-service`
- `kietphan24/careerhub-application-service`
- `kietphan24/careerhub-communication-service`

## 1. Prepare environment variables

Load production variables from your shell or a deployment `.env` file.

At minimum you need:

- shared broker variables
- `JWT_SECRET`
- all six Prisma service `DATABASE_URL` / `DIRECT_URL` values
- SMTP variables for `iam-service` and `communication-service`
- `REDIS_URL`
- `MEILISEARCH_HOST` / `MEILISEARCH_API_KEY`

See [production-env-guide.md](./production-env-guide.md) for the full list.

## 2. Choose image tag

Production should normally pin a release by commit SHA:

```bash
export IMAGE_TAG=<short-sha>
```

`latest` works, but it is harder to audit and roll back.

## 3. Pull and run app services

For app services only:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Because the Docker Hub repositories are public, read-only pulls normally do not require `docker login`.

## 4. Redis is bundled with app services

`docker compose up -d` always starts the local `redis` container. `job-service` and
`application-service` wait for Redis to become healthy before starting.

Default connection inside the Compose network:

```bash
REDIS_URL=redis://redis:6379
```

You can omit `REDIS_URL` in `.env.prod` and Compose will use that default. If you use a
managed Redis provider instead, set `REDIS_URL` to the external URL.

## 5. Optional self-hosted infra profile

If you also want Compose to run RabbitMQ, Meilisearch, and PostgreSQL on the same host:

```bash
docker compose -f docker-compose.prod.yml --profile infra pull
docker compose -f docker-compose.prod.yml --profile infra up -d
```

Notes:

- this profile is optional
- managed services such as CloudAMQP, hosted PostgreSQL, or hosted Meilisearch still work fine; just do not enable the profile
- SMTP is not containerized here; keep using your external mail provider
- override the default placeholder passwords and keys before using the infra profile for anything real

## 6. Migration still runs separately

Do **not** rely on Compose startup to run Prisma migrations.

Run migrations before recreating app containers:

```bash
pnpm prisma:migrate:deploy:all
```

Or run per service if you need tighter control.

## Recommended deploy order

```bash
export IMAGE_TAG=<short-sha>
docker compose -f docker-compose.prod.yml pull
pnpm prisma:migrate:deploy:all
docker compose -f docker-compose.prod.yml up -d
```

After rollout:

- check gateway `/health`
- verify login / refresh flow
- verify RabbitMQ backlog is healthy
- verify mail/notification flow for one test action
