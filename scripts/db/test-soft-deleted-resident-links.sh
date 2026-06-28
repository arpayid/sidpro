#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
DB_URL="${DATABASE_URL%%\?*}"

psql "$DB_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DO $$
DECLARE
  s text := txid_current()::text;
  tenant_id text := 'ci-soft-delete-tenant-' || s;
  resident_head text := 'ci-soft-delete-head-' || s;
  resident_member text := 'ci-soft-delete-member-' || s;
  family_id text := 'ci-soft-delete-family-' || s;
  now_at timestamp(3) := CURRENT_TIMESTAMP;
BEGIN
  INSERT INTO tenants (id, name, code, updated_at)
  VALUES (tenant_id, 'CI Soft Delete Tenant', 'ci-soft-delete-' || s, now_at);

  INSERT INTO residents (
    id, tenant_id, nik, full_name, gender, birth_place, birth_date, updated_at
  ) VALUES
    (resident_head, tenant_id, 'CI-SOFT-HEAD-' || s, 'CI Soft Delete Head', 'M', 'CI', now_at, now_at),
    (resident_member, tenant_id, 'CI-SOFT-MEMBER-' || s, 'CI Soft Delete Member', 'F', 'CI', now_at, now_at);

  INSERT INTO families (id, tenant_id, kk_number, head_resident_id, updated_at)
  VALUES (family_id, tenant_id, 'CI-SOFT-KK-' || s, resident_head, now_at);

  UPDATE residents SET family_id = family_id, updated_at = now_at
  WHERE id IN (resident_head, resident_member);

  INSERT INTO family_members (id, tenant_id, family_id, resident_id, relationship, is_head)
  VALUES
    ('ci-soft-delete-head-member-' || s, tenant_id, family_id, resident_head, 'head', true),
    ('ci-soft-delete-member-member-' || s, tenant_id, family_id, resident_member, 'member', false);

  UPDATE residents SET deleted_at = now_at, updated_at = now_at WHERE id = resident_head;

  IF EXISTS (
    SELECT 1 FROM residents WHERE id = resident_head AND family_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'soft-deleted resident retained a family_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM family_members WHERE resident_id = resident_head
  ) THEN
    RAISE EXCEPTION 'soft-deleted resident remained an active family member';
  END IF;

  IF EXISTS (
    SELECT 1 FROM families WHERE id = family_id AND head_resident_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'soft-deleted resident remained family head';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM family_members WHERE resident_id = resident_member AND family_id = family_id
  ) THEN
    RAISE EXCEPTION 'soft delete removed unrelated active family members';
  END IF;

  UPDATE residents SET deleted_at = NULL, updated_at = now_at WHERE id = resident_head;

  IF EXISTS (
    SELECT 1 FROM residents WHERE id = resident_head AND family_id IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM family_members WHERE resident_id = resident_head
  ) THEN
    RAISE EXCEPTION 'restoring a resident silently restored stale family links';
  END IF;
END;
$$;

ROLLBACK;
SQL

echo "[soft-deleted-resident-test] Resident family-link cleanup verified"
