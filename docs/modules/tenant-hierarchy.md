# Module: Tenant Hierarchy (Multi-tenant Kabupaten)

Foundation for regency and district-level monitoring across village tenants.

## Model

- `Tenant.level`: `kabupaten` | `kecamatan` | `desa`
- `Tenant.parentId`: self-reference for hierarchy
- Hierarchy: kabupaten → kecamatan → desa (3 levels)

## RBAC

| Role | Scope | Permission |
|------|-------|------------|
| `admin_kabupaten` | kabupaten tenant | `tenants.regency_overview` |
| `admin_kecamatan` | kecamatan tenant | `tenants.district_overview` |

Read-only aggregate — no cross-tenant mutation from overview dashboards.

Provisioning desa baru: `settings.manage` atau `superadmin_system` via `POST /tenants/provision/village`.

## API

| Method | Path | Permission |
|--------|------|------------|
| GET | /tenants/regency/overview | tenants.regency_overview |
| GET | /tenants/district/overview | tenants.district_overview |
| GET | /tenants/villages/:id/summary | tenants.regency_overview |
| POST | /tenants/provision/village | settings.manage (implicit) |

## UI

- `/admin/kabupaten` — dashboard kabupaten (drill-down desa read-only)
- `/admin/kecamatan` — dashboard kecamatan

## Seed

- `demo-kabupaten` → `demo-kecamatan` → `demo-desa`
- Dev users:
  - `admin.kab@demo-kabupaten.id` (kabupaten)
  - `admin.kec@demo-kecamatan.id` (kecamatan)
  - Same password as desa admin seed
