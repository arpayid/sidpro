# Module: Tenant Hierarchy (Multi-tenant Kabupaten)

Foundation for regency-level monitoring across village tenants.

## Model

- `Tenant.level`: `kabupaten` | `kecamatan` | `desa`
- `Tenant.parentId`: self-reference for hierarchy
- MVP: kabupaten → desa (2 levels)

## RBAC

- Role: `admin_kabupaten` (tenant scope = kabupaten)
- Permission: `tenants.regency_overview`
- Read-only aggregate — no cross-tenant mutation from regency dashboard

## API

| Method | Path | Permission |
|--------|------|------------|
| GET | /tenants/regency/overview | tenants.regency_overview |

Returns aggregate counts and per-village stats for active child desa tenants.

## UI

- `/admin/kabupaten` — dashboard kabupaten (visible when user has `tenants.regency_overview`)

## Seed

- `demo-kabupaten` (parent) → `demo-desa` (child)
- Dev user: `admin.kab@demo-kabupaten.id` (same password as desa admin seed)
