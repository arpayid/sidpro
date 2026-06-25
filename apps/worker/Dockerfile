# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --prod --frozen-lockfile

FROM deps AS build
COPY packages/config packages/config
COPY packages/types packages/types
COPY apps/worker apps/worker
RUN pnpm --filter @sidpro/types build
RUN pnpm --filter @sidpro/worker build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S sidpro && adduser -S sidpro -G sidpro
COPY --from=prod-deps --chown=sidpro:sidpro /app/node_modules ./node_modules
COPY --from=prod-deps --chown=sidpro:sidpro /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=prod-deps --chown=sidpro:sidpro /app/packages/types/package.json ./packages/types/package.json
COPY --from=build --chown=sidpro:sidpro /app/packages/types/dist ./packages/types/dist
COPY --from=build --chown=sidpro:sidpro /app/apps/worker/dist ./apps/worker/dist
COPY --from=build --chown=sidpro:sidpro /app/apps/worker/package.json ./apps/worker/package.json
USER sidpro
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
