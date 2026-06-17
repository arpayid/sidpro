# Module: Social Assistance

Purpose: manage aid programs, recipients, eligibility notes, distribution history, and reporting.

Users: admin_desa, kasi_kesejahteraan, operator_desa, kepala_desa, auditor.

Tables: aid_programs, aid_recipients, aid_distributions, aid_documents.

API: GET /aid-programs, POST /aid-programs, GET /aid-recipients, POST /aid-recipients, PATCH /aid-recipients/:id, POST /aid-distributions.

UI: program list, recipient list, recipient detail, distribution form, distribution history, aid dashboard.

Permissions: aid.read, aid.manage, aid.export.

Done when: program can be created, recipient can be managed, distribution can be recorded, report can be exported, and important changes are logged.
