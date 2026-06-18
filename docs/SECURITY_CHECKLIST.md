# Security Checklist SIDPRO

## Authentication

- [x] Password hashing (bcrypt)
- [x] JWT access token (short-lived)
- [x] Refresh token rotation
- [x] Logout revokes refresh token
- [x] Rate limiting login (5 req/min on `/auth/login`)
- [x] Admin route guard frontend (Next.js middleware + cookie)
- [x] 2FA foundation (twoFaEnabled field on User)

## Authorization

- [x] RBAC dengan role dan permission
- [x] Permission guard di semua endpoint protected
- [x] Tenant scope filtering
- [x] Least privilege default roles

## Data Protection

- [x] NIK/KK masking di list view
- [x] population.view_sensitive permission untuk data penuh
- [x] Soft delete pada data penting
- [x] Audit log untuk mutation sensitif
- [x] Import/export penduduk tercatat audit log

## API Security

- [x] DTO/input validation
- [x] CORS configuration
- [x] Global auth guard
- [x] Public endpoints explicitly marked
- [x] Global API throttling (100 req/min)

## Operations

- [x] .env.example tanpa secret nyata
- [x] Backup script
- [x] Restore script dengan konfirmasi
- [x] Healthcheck script
- [x] Staging deploy guide (`docs/STAGING_DEPLOY.md`)
- [ ] HTTPS di production (deploy time)
- [x] Dependency audit di CI (`pnpm audit --audit-level=high`)

## File Upload

- [x] File metadata foundation
- [x] MinIO/S3 storage adapter
- [x] MIME validation (jpeg, png, webp, pdf)
- [x] Size limit enforcement (5MB)
