# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# python3/make/g++ required for argon2 native module
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
COPY services/iam-service/package.json   ./services/iam-service/

RUN pnpm install --frozen-lockfile

# Layer 2: source code + .npmignore files
COPY packages/shared-kernel  ./packages/shared-kernel
COPY packages/contracts      ./packages/contracts
COPY packages/nest-common    ./packages/nest-common
COPY packages/broker-ops     ./packages/broker-ops
COPY infrastructure          ./infrastructure
COPY services/iam-service    ./services/iam-service

# Build
RUN pnpm build:packages
RUN pnpm --filter @careerhub/iam-service run prisma:generate
RUN pnpm --filter @careerhub/iam-service build

# The Prisma-generated client consists of pre-compiled .js/.wasm files that tsc
# does not copy to dist/. Mirror them into the compiled output path so that
# resolveGeneratedPrismaModulePath() finds them via the primary (__dirname) check.
RUN mkdir -p services/iam-service/dist/services/iam-service/src/generated/prisma
RUN cp -r services/iam-service/src/generated/prisma/. \
       services/iam-service/dist/services/iam-service/src/generated/prisma/

# Prune to production-only deployment bundle.
# .npmignore in each package overrides .gitignore so that dist/ is included.
RUN pnpm deploy --filter @careerhub/iam-service --prod /deploy

# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# argon2 needs libstdc++ at runtime for the native module
RUN apk add --no-cache dumb-init libstdc++

WORKDIR /app
COPY --from=builder /deploy ./

ENV NODE_ENV=production
EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/services/iam-service/src/main.js"]
