# Module: Finance

Purpose: manage APBDes monitoring, budget items, realization, finance documents, transparency, and finance reports.

Users: kaur_keuangan, admin_desa, kepala_desa, auditor, admin_kabupaten.

Tables: budget_years, budget_categories, budget_items, revenues, expenses, realizations, cash_books, finance_documents.

API: GET /finance/budget, POST /finance/budget-items, PATCH /finance/budget-items/:id, GET /finance/realization, POST /finance/realization, GET /finance/reports.

UI: budget dashboard, budget item list, realization list, finance document archive, public transparency panel.

Permissions: finance.read, finance.manage, finance.export, reports.finance.

Done when: budget and realization can be managed, finance summary is visible, public transparency data can be published, export is permission-based, and important changes are logged.
