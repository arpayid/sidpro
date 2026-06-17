# SIDPRO Database Specification

Database target: PostgreSQL with Prisma.

## Global Rules

- Every village-owned table has `tenant_id`.
- Important tables use `created_at`, `updated_at`, and optional `deleted_at`.
- Sensitive operational data uses soft delete.
- List pages need indexes for tenant, status, date, and search columns.
- Unique rules must include tenant when data is tenant-specific.

## Core Tables

- tenants: id, name, code, status, created_at, updated_at
- villages: id, tenant_id, name, code, address, province, regency, district, postal_code
- users: id, tenant_id, name, email, phone, password_hash, status
- roles: id, tenant_id, name, code, scope
- permissions: id, code, name, module
- user_roles: user_id, role_id
- role_permissions: role_id, permission_id
- audit_logs: id, tenant_id, actor_id, action, module, entity_type, entity_id, metadata, ip_address, created_at
- files: id, tenant_id, owner_type, owner_id, path, mime_type, size, checksum
- notifications: id, tenant_id, user_id, type, title, message, read_at
- settings: id, tenant_id, key, value

## Population Tables

- residents: id, tenant_id, nik, family_id, full_name, gender, birth_place, birth_date, religion, education, occupation, marital_status, blood_type, disability_status, resident_status, address_id
- families: id, tenant_id, kk_number, head_resident_id, address_id, economic_status, house_status, water_source, electricity, sanitation
- family_members: id, tenant_id, family_id, resident_id, relationship, is_head
- addresses: id, tenant_id, hamlet_id, rt, rw, street, latitude, longitude
- civil_events: id, tenant_id, resident_id, event_type, event_date, notes

## Letter Tables

- letter_types: id, tenant_id, code, name, required_fields, required_files, is_active
- letter_templates: id, tenant_id, letter_type_id, name, content, version, is_active
- letter_requests: id, tenant_id, requester_id, resident_id, letter_type_id, status, purpose, submitted_at, completed_at
- letter_approvals: id, tenant_id, letter_request_id, approver_id, level, status, notes
- letter_outputs: id, tenant_id, letter_request_id, file_id, qr_code, signed_at
- letter_number_sequences: id, tenant_id, letter_type_id, year, last_number

## Important Indexes

- residents: tenant_id, nik, family_id, full_name, resident_status
- families: tenant_id, kk_number, head_resident_id
- letter_requests: tenant_id, status, letter_type_id, submitted_at
- audit_logs: tenant_id, actor_id, module, action, created_at
- files: tenant_id, owner_type, owner_id

## Seed Data

Initial seed should include:

- system permissions
- default superadmin role
- default admin desa role
- default operator role
- default citizen role
- default letter types
- default village settings
