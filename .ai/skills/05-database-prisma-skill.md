# SIDPRO Database and Prisma Skill

Use this skill for Prisma schema, migrations, seeds, indexes, relations, PostgreSQL design, and data modeling.

---

## Target Database

```txt
PostgreSQL 17
```

Target ORM:

```txt
Prisma
```

---

## Database Rules

- All tenant-owned tables must include `tenant_id`.
- Important data should use `created_at`, `updated_at`, and `deleted_at` where needed.
- Use proper indexes for `tenant_id`, foreign keys, search fields, and status fields.
- Avoid destructive migration unless explicitly approved.
- Use soft delete for sensitive operational data.
- Add unique constraints carefully, especially in multi-tenant context.
- NIK and KK uniqueness must consider tenant rules.
- Use migrations, not manual database changes.
- Use transactions for multi-table writes.
- Do not store secrets in the database without clear encryption/handling strategy.

---

## Core Tables

```txt
tenants
villages
users
roles
permissions
user_roles
role_permissions
audit_logs
files
notifications
settings
sessions
refresh_tokens
```

---

## Domain Tables

Population:

```txt
residents
families
family_members
addresses
hamlets
neighborhood_units
civil_events
resident_documents
```

Letters:

```txt
letter_types
letter_templates
letter_requests
letter_request_files
letter_approvals
letter_outputs
letter_number_sequences
letter_qr_validations
```

Finance:

```txt
budget_years
budget_categories
budget_items
revenues
expenses
realizations
cash_books
finance_documents
```

Aid:

```txt
aid_programs
aid_recipients
aid_distributions
aid_eligibility_scores
aid_documents
```

Assets:

```txt
asset_categories
assets
asset_maintenance_logs
asset_documents
asset_locations
```

CMS:

```txt
posts
pages
categories
tags
media
menus
```

---

## Required Validation

Run:

```bash
pnpm prisma validate
```

When migrations exist, also validate migration flow where possible.

---

## Migration Safety

Before migration:

1. Identify affected tables.
2. Check destructive operations.
3. Confirm data preservation.
4. Check indexes and constraints.
5. Add rollback notes.
6. Update docs if schema changes are major.
