# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/validators/package.json packages/validators/package.json
COPY prisma/schema.prisma prisma/schema.prisma
RUN pnpm install --frozen-lockfile

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/validators/package.json packages/validators/package.json
COPY prisma/schema.prisma prisma/schema.prisma
RUN pnpm install --prod --frozen-lockfile

FROM deps AS build
COPY packages/config packages/config
COPY packages/types packages/types
COPY packages/validators packages/validators
COPY apps/api apps/api
COPY prisma prisma
RUN pnpm --filter @sidpro/types --filter @sidpro/validators build
RUN pnpm --filter @sidpro/api build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=4000
WORKDIR /app
RUN addgroup -S sidpro && adduser -S sidpro -G sidpro
COPY --from=prod-deps --chown=sidpro:sidpro /app/node_modules ./node_modules
COPY --from=prod-deps --chown=sidpro:sidpro /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=sidpro:sidpro /app/packages/types/package.json ./packages/types/package.json
COPY --from=prod-deps --chown=sidpro:sidpro /app/packages/validators/package.json ./packages/validators/package.json
COPY --from=build --chown=sidpro:sidpro /app/packages/types/dist ./packages/types/dist
COPY --from=build --chown=sidpro:sidpro /app/packages/validators/dist ./packages/validators/dist
COPY --from=build --chown=sidpro:sidpro /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=sidpro:sidpro /app/apps/api/package.json ./apps/api/package.json
USER sidpro
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main"]
