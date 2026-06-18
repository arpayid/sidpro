# Module: Population

## Purpose

Manage village resident data for administration, services, reports, and statistics.

## Users

admin_desa, kasi_pemerintahan, operator_desa, kepala_desa, auditor.

## Tables

residents, addresses, hamlets, neighborhood_units, civil_events, resident_documents.

## Key Fields

tenant_id, nik, full_name, gender, birth_place, birth_date, religion, education, occupation, marital_status, resident_status, address_id.

## API

GET /residents, POST /residents, GET /residents/:id, PATCH /residents/:id, DELETE /residents/:id, POST /residents/:id/mutate, POST /residents/import, GET /residents/export.

Query `residentStatus` on GET /residents filters by status (`permanent`, `temporary`, `moved`, `deceased`).

POST /residents/:id/mutate records moved/deceased status and creates a `civil_events` row (audit action `mutate`).

## UI

Resident list, detail, create form, edit form, import, export, statistics, status filter, mutation drawer (moved/deceased).

## Permissions

population.read, population.create, population.update, population.delete, population.import, population.export, population.view_sensitive.

POST /families accepts optional `address` object (same shape as residents).

## Acceptance Criteria

List supports search, filter, pagination. Create and update validate required fields. Data is scoped by tenant. Export requires permission. Important changes are logged.
