# SID Premium Enterprise (SIDPRO)

Platform pemerintahan desa modern — portal publik, dashboard admin, data penduduk, layanan surat, pengaduan, dan modul enterprise.

## Stack

| Layer       | Teknologi                                          |
| ----------- | -------------------------------------------------- |
| Frontend    | Next.js 15, React 19, TailwindCSS, shadcn-style UI |
| Backend     | NestJS 11, TypeScript, Prisma                      |
| Database    | PostgreSQL 17                                      |
| Cache/Queue | Redis, BullMQ                                      |
| Storage     | MinIO (S3-compatible)                              |
| Deploy      | Docker Compose                                     |

## Struktur Monorepo

```txt
sidpro/
├── apps/
│   ├── api/       # NestJS REST API
│   ├── web/       # Next.js frontend
│   └── worker/    # BullMQ background jobs
├── packages/
│   ├── config/    # ESLint, TypeScript configs
│   ├── types/     # Shared TypeScript types
│   ├── validators/# Shared Zod schemas
│   └── ui/        # Shared UI components
├── prisma/        # Database schema & seed
├── scripts/       # Backup, restore, healthcheck
└── docs/          # Spesifikasi produk
```

## Quick Start

### Prasyarat

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Setup

```bash
# Clone dan install
pnpm install

# Salin environment
cp .env.example .env

# Jalankan infrastruktur
docker compose up -d

# Generate Prisma client
pnpm prisma:generate

# Migrasi database
pnpm prisma:migrate

# Seed data awal
pnpm prisma:seed

# Development
pnpm dev
```

### URL Development

| Service            | URL                                   |
| ------------------ | ------------------------------------- |
| Web (Portal)       | http://localhost:3000                 |
| Admin Dashboard    | http://localhost:3000/admin/dashboard |
| API                | http://localhost:4000/api/v1          |
| API Docs (Swagger) | http://localhost:4000/api/docs        |
| MinIO Console      | http://localhost:9001                 |

### Kredensial Default (Seed)

```
Email   : admin@demo-desa.id
Password: Admin123!
Tenant  : demo-desa
```

## Validasi

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate
docker compose config
```

## Roadmap

| Phase | Status | Deskripsi                                         |
| ----- | ------ | ------------------------------------------------- |
| 0     | ✅     | Foundation — monorepo, Docker, CI                 |
| 1     | ✅     | Core Platform — auth, RBAC, tenant, audit         |
| 2     | ✅     | Public Portal — homepage, profil, berita, layanan |
| 3     | ✅     | Population & Families                             |
| 4     | ✅     | Letters — surat online, workflow, QR              |
| 5     | ✅     | Complaints & Notifications                        |
| 6     | ✅     | Enterprise — bansos, aset, pembangunan, keuangan  |
| 7     | ✅     | Hardening — backup, healthcheck, 2FA foundation   |

## Dokumentasi

- [Blueprint](docs/SID_ENTERPRISE_BLUEPRINT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [API Contract](docs/API_CONTRACT.md)
- [RBAC Matrix](docs/RBAC_MATRIX.md)
- [Security](docs/SECURITY.md)
- [Operations](docs/OPERATIONS.md)
- [Operator Runbook](docs/OPERATIONS.md#operator-runbook)
- [Staging Deploy](docs/STAGING_DEPLOY.md)
- [Docker Production](docs/DOCKER_PRODUCTION.md)
- [Guarded Production Release](docs/PRODUCTION_RELEASE.md)

## Scripts Operasional

Runbook lengkap untuk deploy, rollback, backup/restore, rotasi secret, pengecekan log/worker/queue/storage, smoke test, dan checklist insiden tersedia di [Operator Runbook](docs/OPERATIONS.md#operator-runbook).

```bash
# Backup database (atau `pnpm backup`)
./scripts/backup.sh

# Restore database interaktif
./scripts/restore.sh backups/db_YYYYMMDD_HHMMSS.sql.gz

# Healthcheck
./scripts/healthcheck.sh

# Smoke test MVP
STAGING_ADMIN_PASSWORD='<admin-password>' SMOKE_RUN_SEED=0 pnpm smoke

# Production Compose release: backup + restore verification + preflight + migration + validation
SIDPRO_ENV_FILE=/etc/sidpro/production.env \
  SIDPRO_BACKUP_DIR=/var/backups/sidpro \
  bash scripts/production-release.sh
```

## Lisensi

Proprietary — SID Premium Enterprise

## Production Readiness

- Checklist go-live: [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md)
- Kesiapan serah-terima klien: [`docs/CLIENT_HANDOVER_READINESS.md`](docs/CLIENT_HANDOVER_READINESS.md)
- Operasional Docker production: [`docs/DOCKER_PRODUCTION.md`](docs/DOCKER_PRODUCTION.md)
- Template env: `.env.development.example`, `.env.staging.example`, `.env.production.example`
