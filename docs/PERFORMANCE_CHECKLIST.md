# Performance Checklist SIDPRO

## Database

- [x] Indexes pada kolom tenant_id, status, tanggal
- [x] Unique constraints dengan tenant scope
- [ ] Query profiling di production
- [ ] Connection pooling tuning

## API

- [x] Pagination di semua list endpoint
- [ ] Response caching dengan Redis (future)
- [ ] Rate limiting (future)

## Frontend

- [x] Next.js App Router dengan static optimization
- [x] TailwindCSS purge
- [ ] Image optimization dengan next/image
- [ ] Code splitting per route group

## Infrastructure

- [x] Docker Compose untuk local dev
- [ ] Nginx reverse proxy di production
- [ ] CDN untuk static assets
- [ ] Worker queue untuk PDF/import heavy tasks

## Targets

| Metric | Target |
|--------|--------|
| API p95 latency | < 500ms |
| Page load (LCP) | < 2.5s |
| Build time | < 5 min |
