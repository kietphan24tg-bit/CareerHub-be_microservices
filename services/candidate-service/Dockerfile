# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared-kernel/package.json    ./packages/shared-kernel/
COPY packages/contracts/package.json        ./packages/contracts/
COPY packages/nest-common/package.json      ./packages/nest-common/
COPY packages/broker-ops/package.json       ./packages/broker-ops/
COPY infrastructure/package.json            ./infrastructure/
COPY services/candidate-service/package.json ./services/candidate-service/

RUN pnpm install --frozen-lockfile

COPY packages/shared-kernel    ./packages/shared-kernel
COPY packages/contracts        ./packages/contracts
COPY packages/nest-common      ./packages/nest-common
COPY packages/broker-ops       ./packages/broker-ops
COPY infrastructure            ./infrastructure
COPY services/candidate-service ./services/candidate-service

RUN pnpm build:packages
RUN pnpm --filter @careerhub/candidate-service run prisma:generate
RUN pnpm --filter @careerhub/candidate-service build

RUN mkdir -p services/candidate-service/dist/services/candidate-service/src/generated/prisma
RUN cp -r services/candidate-service/src/generated/prisma/. \
       services/candidate-service/dist/services/candidate-service/src/generated/prisma/

RUN pnpm deploy --filter @careerhub/candidate-service --prod /deploy

# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app
COPY --from=builder /deploy ./

ENV NODE_ENV=production
EXPOSE 3002

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/services/candidate-service/src/main.js"]
