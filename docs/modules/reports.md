# Module: Reports

Purpose: provide dashboard metrics and operational reports.

Users: admin_desa, kepala_desa, sekretaris_desa, operator_desa, auditor, admin_kabupaten.

Report groups: population, families, letters, complaints, aid, finance, assets, development, audit logs.

Screens: report dashboard, report filters, report preview, export history, audit log viewer (`/admin/audit-logs`).

Permissions: reports.read, reports.export, reports.population, reports.letters, reports.finance, audit.read.

Done when: reports can be filtered, previewed, exported by permission, export activity is logged, and audit log viewer shows sanitized tenant-scoped activity.
