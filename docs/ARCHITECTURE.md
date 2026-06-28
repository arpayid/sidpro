# SIDPRO Architecture

SIDPRO menggunakan **modular monolith**: satu codebase dan database utama, dengan tiga deployable runtime yang terpisah secara operasional—web, API, dan worker. Modul domain tidak diperlakukan sebagai microservice.

## Stack

- Web: Next.js, React, TailwindCSS, shadcn/ui
- API: NestJS, TypeScript, Prisma
- Database: PostgreSQL
- Cache and queue: Redis, BullMQ
- Storage: MinIO atau storage S3-compatible
- Deployment: Docker Compose dan Nginx

## Repository Structure

| Path | Ownership | Allowed dependencies |
| --- | --- | --- |
| `apps/web` | Presentation layer dan API client | `packages/ui`, `packages/types`, `packages/validators`; HTTP ke API |
| `apps/api` | Business workflows, authorization, REST API, persistence orchestration | `packages/types`, `packages/validators`, Prisma, core infrastructure |
| `apps/worker` | Job processing dan asynchronous orchestration | `packages/types`, Prisma, storage/email/PDF adapters |
| `packages/ui` | Shared UI primitives | React peer dependencies dan utility internal |
| `packages/types` | Shared type dan job contracts | Tidak boleh mengimpor aplikasi |
| `packages/validators` | Shared Zod schemas | Tidak boleh mengimpor aplikasi |
| `packages/config` | Shared TypeScript/ESLint config | Tooling dependencies saja |
| `prisma` | Schema, migrations, dan seed | Database contract untuk API dan worker |
| `docs` | Specification, runbook, audit evidence | Tidak memiliki runtime dependency |

## Backend Layers

### Platform/core

`database`, `config`, `health`, `common`, `addressing`, `auth`, `users`, `roles`, `permissions`, `tenants`, `audit-logs`, `files`, `storage`, `queue`, `settings`, dan `notifications` adalah core/platform concerns.

Core menyediakan kemampuan untuk domain dan **tidak boleh mengimpor code domain**. `core/addressing` adalah capability bersama untuk memvalidasi serta membuat alamat tenant-scoped dari dusun, RT/RW, dan jalan.

### Domain and delivery modules

`village-profile`, `population`, `families`, `territories`, `civil-events`, `letters`, `complaints`, `cms`, `social-assistance`, `assets`, `development`, `finance`, `reports`, `bumdes`, `assistant`, dan `public` adalah domain atau delivery modules.

Domain dapat menggunakan `common`, `database`, dan core services. Domain **tidak boleh** mengimpor source module domain lain secara langsung.

## Dependency Rules

1. Shared package adalah dependency root dan tidak boleh mengimpor `apps/*`.
2. Web tidak boleh mengimpor API atau worker source; komunikasi dilakukan melalui HTTP/API contract.
3. Worker tidak boleh mengimpor web atau API source; worker berkomunikasi melalui job contract dan persistence/infrastructure adapters.
4. Core dapat dipakai domain, tetapi core tidak boleh memakai domain.
5. Domain-to-domain source import dilarang secara default.
6. Cross-domain read aggregation, seperti dashboard/report, dapat memakai query Prisma tenant-scoped tanpa mengimpor domain service lain.
7. Cross-domain write orchestration harus memakai contract, queue/event, atau exported core interface yang terdokumentasi dan diuji.
8. Input API harus tervalidasi; admin route harus dilindungi permission; data tenant-owned harus selalu difilter tenant; perubahan penting harus audit-logged.

## Executable Boundary Gate

`apps/api/test/architecture-boundaries.test.ts` memindai import source dan manifest package pada CI dan menolak:

- core → domain import;
- domain → domain import lintas modul;
- common → core/domain import;
- web → API/worker source import;
- worker → web/API source import;
- shared package → application source import;
- shared package manifest → deployable application dependency.

Workflow **AUDIT-1 Architecture Boundaries** menjalankan scanner yang sama secara terpisah dan mengunggah log diagnostik pada kegagalan. Aturan lengkap, register exception, dan status audit dicatat di [AUDIT-1 — Repository and Architecture](audits/AUDIT-1-REPOSITORY-ARCHITECTURE.md).

## Intentional Exceptions

- `reports` boleh menjalankan read aggregation Prisma lintas tabel domain, tetap dengan tenant filtering dan regression coverage.
- `public` boleh menyajikan data tenant yang memang public, dengan field selection dan visibility rule eksplisit.
- `worker` boleh memakai Prisma dan object storage karena job harus tahan terhadap lifecycle proses API.

Exception baru harus ditambahkan ke register AUDIT-1 beserta rationale, owner, dan regression guard sebelum merge.
