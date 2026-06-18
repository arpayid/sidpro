# SIDPRO Security Specification

## Goals

- Protect village data.
- Restrict access by role and permission.
- Apply tenant isolation.
- Record important actions.
- Make data export traceable.

## Access Rules

- Protected routes require login.
- Admin routes require permission.
- Village-owned data uses tenant filtering.
- Citizen users only access their own service data.
- District-level users only access assigned villages.

## Audit Events

Record these events:

- user management
- role management
- resident create, update, delete, export
- family create, update, delete, export
- letter create, verify, approve, reject, generate, download
- letter settings and template update
- QR verification (public verify endpoint)
- file upload
- auth login and logout
- complaint create, assign, respond, close
- finance update and export
- aid update and export
- report export
- setting update

## Audit Log Viewer

Admin UI: `/admin/audit-logs` (permission `audit.read`).

- Lists tenant-scoped audit entries with filters (module, action, actor, date range, search).
- Detail drawer shows sanitized metadata — no raw secrets in API or UI.
- Sensitive keys (`password`, `token`, `apiKey`, etc.) are redacted server-side.
- NIK/KK in metadata are masked before response.
- Reading audit logs does not create additional audit entries.

## Users & RBAC Admin UI

Admin UI:

- `/admin/users` — `users.read` (create/update/disable via respective permissions)
- `/admin/roles` — `roles.read` (permission matrix via `roles.assign_permissions`)

Rules:

- Password hash never returned in API responses.
- Password only accepted on create or optional reset via PATCH user.
- Users cannot disable/delete their own account.
- Cannot disable the last active village admin in a tenant.
- `superadmin_system` role assignment and mutation requires superadmin role.
- User/role mutations write audit log entries (password fields never stored in metadata).

## Data Rules

- Sensitive identity fields are masked in general UI.
- Full sensitive values require special permission.
- Private files require permission.
- Uploads require type and size validation.
- Exports require permission and audit log.

## API Checklist

- DTO validation exists.
- Auth guard exists.
- Permission guard exists.
- Tenant filter exists.
- Audit log exists for important changes.
- Public endpoints use rate limit where needed.

## Production Checklist

- HTTPS enabled.
- Environment values are outside repository (`/etc/sidpro/sidpro.env` or `.env` gitignored).
- Staging/production seed uses `SEED_ADMIN_PASSWORD` — never default dev password.
- Database backup active.
- Logs are monitored (`journalctl` for systemd units).
- Dependency checks are run regularly.
- API/web managed by systemd with `Restart=on-failure` on VPS staging (`/opt/sidpro`).
- Daily backup cron to `/var/backups/sidpro` — DB (`db_*.sql.gz`) and MinIO/uploads (`uploads_*.tar.gz`) via `scripts/staging-backup-cron.sh`.
- Deploy secrets only in `/etc/sidpro/sidpro.env` — never in repository.
