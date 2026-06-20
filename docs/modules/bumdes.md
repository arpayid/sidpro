# Module: BUMDes

Purpose: manage village-owned business units (Badan Usaha Milik Desa) separately from APBDes.

Users: admin_desa, operator_desa, kepala_desa, auditor.

Tables: `bumdes_units`, `bumdes_financial_records`.

Screens:

- `/admin/bumdes` — unit list, create unit, financial transactions.

API:

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/bumdes/units` | `bumdes.read` |
| POST | `/api/v1/bumdes/units` | `bumdes.manage` |
| PATCH | `/api/v1/bumdes/units/:id` | `bumdes.manage` |
| DELETE | `/api/v1/bumdes/units/:id` | `bumdes.manage` |
| GET | `/api/v1/bumdes/financial-records` | `bumdes.read` |
| POST | `/api/v1/bumdes/financial-records` | `bumdes.manage` |

Permissions: `bumdes.read`, `bumdes.manage`.

Done when: units and financial records can be listed and created with audit log on mutations.

Tag: `mvp-bumdes-v2` (Wave 26 — financial foundation).
