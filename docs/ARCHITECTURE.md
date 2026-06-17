# SIDPRO Architecture

SIDPRO menggunakan modular monolith.

## Stack

- Web: Next.js, React, TailwindCSS, shadcn/ui
- API: NestJS, TypeScript, Prisma
- Database: PostgreSQL
- Cache and queue: Redis, BullMQ
- Storage: MinIO or S3 compatible storage
- Deployment: Docker Compose and Nginx

## Structure

- `apps/web` for frontend
- `apps/api` for backend
- `apps/worker` for background jobs
- `packages/ui` for shared UI
- `packages/types` for shared types
- `packages/validators` for validation schemas
- `prisma` for schema and migrations
- `docs` for specification

## Backend Boundaries

Core modules: auth, users, roles, permissions, tenants, audit logs, files, notifications, settings.

Domain modules: village profile, population, families, civil events, letters, complaints, social assistance, finance, assets, development, CMS, maps, reports.

## Rules

- Keep modules isolated.
- Validate input in API.
- Protect admin routes.
- Apply permission checks.
- Apply tenant filtering for village-owned data.
- Record important changes in audit logs.
- Use background jobs for PDF, import, export, and notification work.
