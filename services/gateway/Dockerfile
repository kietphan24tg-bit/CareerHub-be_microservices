# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate

WORKDIR /app

# Layer 1: package manifests only (cache layer — rarely changes)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared-kernel/package.json ./packages/shared-kernel/
COPY packages/contracts/package.json     ./packages/contracts/
COPY packages/nest-common/package.json   ./packages/nest-common/
COPY packages/broker-ops/package.json    ./packages/broker-ops/
COPY infrastructure/package.json         ./infrastructure/
COPY services/gateway/package.json       ./services/gateway/

RUN pnpm install --frozen-lockfile

# Layer 2: source code + .npmignore files
COPY packages/shared-kernel ./packages/shared-kernel
COPY packages/contracts     ./packages/contracts
COPY packages/nest-common   ./packages/nest-common
COPY packages/broker-ops    ./packages/broker-ops
COPY infrastructure         ./infrastructure
COPY services/gateway       ./services/gateway

# Build shared packages then the service
RUN pnpm build:packages
RUN pnpm --filter @careerhub/gateway build

# Prune to production-only deployment bundle.
# .npmignore in each package overrides .gitignore so that dist/ is included.
RUN pnpm deploy --filter @careerhub/gateway --prod /deploy

# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app
COPY --from=builder /deploy ./

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/services/gateway/src/main.js"]
