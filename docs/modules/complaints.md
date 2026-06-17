# Module: Complaints

Purpose: manage public complaints, assignment, response, status tracking, and service quality.

Users: warga, operator_desa, admin_desa, kepala_desa, perangkat_desa.

Tables: complaints, complaint_categories, complaint_files, complaint_responses, complaint_assignments.

API: GET /complaints, POST /complaints, GET /complaints/:id, PATCH /complaints/:id/assign, PATCH /complaints/:id/respond, PATCH /complaints/:id/close.

Workflow: submitted, verified, assigned, in_progress, resolved, closed, rejected.

UI: complaint list, complaint detail, public complaint form, response timeline, status badge, assignment panel.

Permissions: complaints.read, complaints.create, complaints.assign, complaints.respond, complaints.close.

Done when: complaint can be submitted, verified, assigned, responded to, closed, tracked, and logged.
