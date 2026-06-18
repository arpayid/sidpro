# Module: Families

## Purpose

Manage family card data, household members, family address, household status, and family-based reporting.

## Users

admin_desa, kasi_pemerintahan, operator_desa, kepala_desa, auditor.

## Tables

families, family_members, residents, addresses.

## Key Fields

tenant_id, kk_number, head_resident_id, address_id, economic_status, house_status, water_source, electricity, sanitation.

## API

GET /families, POST /families, GET /families/:id, PATCH /families/:id, DELETE /families/:id, POST /families/:id/members, DELETE /families/:id/members/:memberId.

## UI

Family list, family detail, create family, **edit family (drawer)**, **remove member**, **soft delete KK**, manage members, household profile.

## Business rules

- Satu kepala keluarga (`isHead=true`) per KK — backend menolak jika sudah ada kepala saat menambah anggota baru sebagai kepala.
- Hapus anggota kepala keluarga akan mengosongkan `headResidentId`.

## Permissions

families.read, families.create, families.update, families.delete, families.export, families.view_sensitive.

## Acceptance Criteria

Family list supports search and filter. Family has one head member. Member relation is required. Data is scoped by tenant. Important changes are logged.
