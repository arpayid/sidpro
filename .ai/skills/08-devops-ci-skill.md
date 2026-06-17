# SIDPRO DevOps and CI Skill

Use this skill for Docker, GitHub Actions, deployment, server configuration, environment configuration, health checks, backups, and release automation.

---

## Target Services

```txt
web       : Next.js
api       : NestJS
worker    : BullMQ worker
postgres  : PostgreSQL
redis     : Redis
minio     : Object storage
nginx     : Reverse proxy
backup    : Scheduled backup
```

---

## CI Pipeline

Required CI pipeline:

```txt
install dependencies
→ lint
→ typecheck
→ test
→ build
→ prisma validate
→ docker build when available
```

---

## Deployment Principles

- Use Docker Compose for VPS deployment.
- Keep production config separate from development config.
- Use `.env.example` but never commit real `.env`.
- Add healthchecks where possible.
- Add restart policies for services.
- Add backup strategy before production data is used.
- Nginx should terminate HTTP/HTTPS or sit behind a managed proxy.
- Use clear service names and internal networking.

---

## Required Files

Recommended files:

```txt
docker-compose.yml
docker-compose.prod.yml
.env.example
.github/workflows/ci.yml
.github/workflows/deploy.yml
docker/nginx/default.conf
scripts/backup.sh
scripts/restore.sh
scripts/healthcheck.sh
```

---

## Environment Rules

- Never commit secrets.
- Every required environment variable must be documented in `.env.example`.
- Use strong defaults only for local development.
- Production values must be injected through server/CI secrets.

---

## Validation Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma validate
docker compose config
```

If deployment config changes:

```bash
docker compose up -d --build
docker compose ps
```

---

## Rollback Notes

Every deployment-related PR should include:

- What changed.
- How to deploy.
- How to rollback.
- Required environment variables.
- Data migration risk.
- Health check commands.
