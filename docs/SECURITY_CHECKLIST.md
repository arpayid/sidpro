# Security Checklist SIDPRO

## Authentication

- [x] Password hashing (bcrypt)
- [x] JWT access token (short-lived)
- [x] Refresh token rotation
- [x] Logout revokes refresh token
- [ ] Rate limiting login (Phase 7 placeholder)
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

## API Security

- [x] DTO/input validation
- [x] CORS configuration
- [x] Global auth guard
- [x] Public endpoints explicitly marked

## Operations

- [x] .env.example tanpa secret nyata
- [x] Backup script
- [x] Restore script dengan konfirmasi
- [x] Healthcheck script
- [ ] HTTPS di production (deploy time)
- [ ] Dependency scanning di CI (future)

## File Upload

- [x] File metadata foundation
- [ ] MIME validation (future enhancement)
- [ ] Size limit enforcement (future enhancement)
