# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/validators/package.json packages/validators/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm prisma:generate
RUN pnpm --filter @sidpro/types build \
  && pnpm --filter @sidpro/validators build \
  && pnpm --filter @sidpro/api build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && addgroup -S sidpro && adduser -S sidpro -G sidpro
WORKDIR /app
COPY --from=build --chown=sidpro:sidpro /app /app
USER sidpro
EXPOSE 4000
CMD ["pnpm", "--filter", "@sidpro/api", "start:prod"]
