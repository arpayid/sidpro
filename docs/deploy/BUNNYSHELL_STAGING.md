# Bunnyshell staging

This topology runs the complete non-production SIDPRO stack from `docker-compose.staging.yml`:

- `web`: Next.js
- `api`: NestJS on port `4000`
- `worker`: BullMQ worker
- `postgres`: PostgreSQL 16
- `redis`: Redis 7 with a password
- `minio`: S3-compatible object storage

## Bunnyshell setup

1. Create an environment from the `main` branch.
2. Select `docker-compose.staging.yml` as the Compose definition.
3. Create public endpoints for `web:3000` and `api:4000`.
4. Copy `.env.staging.example` into Bunnyshell environment variables, replacing every placeholder with a unique staging-only secret.
5. Update these variables to the generated public domains before the first deployment:
   - `WEB_ORIGIN=https://<web-domain>`
   - `CORS_ORIGIN=https://<web-domain>`
   - `NEXT_PUBLIC_API_URL=https://<api-domain>/api/v1`
6. Redeploy so the frontend receives `NEXT_PUBLIC_API_URL` at build time.

## Required safety rules

- Use a database and object-storage bucket dedicated to staging only.
- Do not use production credentials, personal data, or production backups.
- Keep `NODE_ENV=production` so staging exercises the production security configuration; do not use placeholder secrets.
- The API performs `prisma migrate deploy` before it starts. Apply only committed migrations to staging.
- Do not expose PostgreSQL, Redis, MinIO, or the worker as public endpoints.

## First verification

After the environment is ready, record the web and API URLs, deployed commit SHA, and test:

1. `GET https://<api-domain>/api/v1/health`.
2. Login, logout, refresh, and 2FA flows with staging-only accounts.
3. Upload and download using the staging bucket.
4. One queue-backed job and worker completion.
5. Web responsive and role/tenant checks required by audit issues #108 and #112.

Do not mark staging validation complete until browser evidence is collected with secrets and tokens redacted.
