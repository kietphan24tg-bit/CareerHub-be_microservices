# Production Deploy Cheat Sheet

This is the shortest practical deploy flow for the current CareerHub setup.

It assumes:

- Docker images are already published to Docker Hub by GitHub Actions
- `.env.prod` exists on the deploy machine
- the deploy machine has `docker compose` and `pnpm`

---

## 1. Publish images

Merge or push into `main`.

GitHub Actions will:

- validate the monorepo
- build 7 service images
- push them to Docker Hub

Images are published as:

- `kietphan24/careerhub-gateway`
- `kietphan24/careerhub-iam-service`
- `kietphan24/careerhub-candidate-service`
- `kietphan24/careerhub-employer-service`
- `kietphan24/careerhub-job-service`
- `kietphan24/careerhub-application-service`
- `kietphan24/careerhub-communication-service`

Recommended:

```bash
export IMAGE_TAG=<short-sha>
```

If you do not set `IMAGE_TAG`, Compose uses `latest`.

---

## 2. Deploy app services

Run on the production server:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
pnpm prisma:migrate:deploy:all
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

What each step does:

- `pull`: downloads the newest image for each service
- `prisma:migrate:deploy:all`: applies Prisma migrations for the 6 database services
- `up -d`: starts or recreates the 7 running service containers

Notes:

- `gateway` does not run Prisma migration
- app runtime config is read from `.env.prod`
- migrations run outside containers on purpose

---

## 3. Start observability

Run:

```bash
docker compose --env-file .env.prod -f docker-compose.observability.yml up -d
```

This starts:

- Prometheus
- Loki
- Promtail
- Tempo
- Grafana

Observability joins the same Docker network as the app stack and scrapes service metrics directly.

---

## 4. Redis starts with app services

`docker compose up -d` now always includes the bundled `redis` container. You do not need
`--profile infra` for Redis.

Default:

```bash
REDIS_URL=redis://redis:6379
```

## 5. Optional infra profile

If you want Docker Compose to also run self-hosted PostgreSQL, RabbitMQ, or Meilisearch from
`docker-compose.prod.yml`, use:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml --profile infra pull
docker compose --env-file .env.prod -f docker-compose.prod.yml --profile infra up -d
```

This is optional. If you use external PostgreSQL, CloudAMQP, or hosted Meilisearch, do not
enable the profile.

---

## 6. Verify after deploy

Minimum checks:

1. Open gateway health endpoint:
   `http://<server>:3000/health`
2. Test login / refresh flow
3. Test one main app flow such as apply-to-job
4. Open Grafana and confirm metrics/logs/traces are arriving
5. Confirm RabbitMQ backlog and DLQ are healthy

---

## 6. One-screen version

```bash
export IMAGE_TAG=<short-sha>
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
pnpm prisma:migrate:deploy:all
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
docker compose --env-file .env.prod -f docker-compose.observability.yml up -d
```

---

## 7. Important reminders

- `.env.prod` is required because images do not contain your production secrets
- production should prefer `IMAGE_TAG=<short-sha>` over `latest`
- do not move Prisma migration into container startup
- if GitHub Actions has not published the target image yet, `pull` will fail
