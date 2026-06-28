#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

DB_URL="${DATABASE_URL%%\?*}"

resolve_psql() {
  if command -v psql >/dev/null 2>&1; then
    command -v psql
    return
  fi

  local candidate
  for candidate in /usr/lib/postgresql/*/bin/psql; do
    if [ -x "$candidate" ]; then
      echo "$candidate"
      return
    fi
  done

  echo "[tenant-link-test] ERROR: psql client not found" >&2
  exit 1
}

PSQL="$(resolve_psql)"
run_psql() {
  "$PSQL" "$DB_URL" -X -v ON_ERROR_STOP=1 "$@"
}

preflight="$(run_psql -A -t -f scripts/db/verify-tenant-link-integrity.sql)"
if [ -n "${preflight//[[:space:]]/}" ]; then
  echo "[tenant-link-test] Existing tenant-link integrity violations found:" >&2
  printf '%s\n' "$preflight" >&2
  exit 1
fi

echo "[tenant-link-test] Preflight clean; exercising database guards"

run_psql <<'SQL'
BEGIN;

DO $$
DECLARE
  suffix text := txid_current()::text;
  tenant_a text := 'ci-tenant-a-' || suffix;
  tenant_b text := 'ci-tenant-b-' || suffix;
  hamlet_a_one text := 'ci-hamlet-a-one-' || suffix;
  hamlet_a_two text := 'ci-hamlet-a-two-' || suffix;
  hamlet_b text := 'ci-hamlet-b-' || suffix;
  unit_a_one text := 'ci-unit-a-one-' || suffix;
  unit_a_two text := 'ci-unit-a-two-' || suffix;
  address_a text := 'ci-address-a-' || suffix;
  family_a text := 'ci-family-a-' || suffix;
  family_b text := 'ci-family-b-' || suffix;
  resident_a text := 'ci-resident-a-' || suffix;
  resident_b text := 'ci-resident-b-' || suffix;
  bumdes_unit_a text := 'ci-bumdes-a-' || suffix;
  bumdes_unit_b text := 'ci-bumdes-b-' || suffix;
  now_at timestamp(3) := CURRENT_TIMESTAMP;
BEGIN
  INSERT INTO tenants (id, name, code, updated_at)
  VALUES
    (tenant_a, 'CI Tenant A', 'ci-a-' || suffix, now_at),
    (tenant_b, 'CI Tenant B', 'ci-b-' || suffix, now_at);

  INSERT INTO hamlets (id, tenant_id, name, code, updated_at)
  VALUES
    (hamlet_a_one, tenant_a, 'CI Dusun A1', 'ci-a1-' || suffix, now_at),
    (hamlet_a_two, tenant_a, 'CI Dusun A2', 'ci-a2-' || suffix, now_at),
    (hamlet_b, tenant_b, 'CI Dusun B', 'ci-b-' || suffix, now_at);

  INSERT INTO neighborhood_units (id, tenant_id, hamlet_id, rt, rw, updated_at)
  VALUES
    (unit_a_one, tenant_a, hamlet_a_one, '001', '001', now_at),
    (unit_a_two, tenant_a, hamlet_a_two, '002', '001', now_at);

  INSERT INTO addresses (id, tenant_id, hamlet_id, neighborhood_unit_id, rt, rw, street, updated_at)
  VALUES
    (address_a, tenant_a, hamlet_a_one, unit_a_one, '001', '001', 'CI Street', now_at);

  INSERT INTO families (id, tenant_id, kk_number, address_id, updated_at)
  VALUES
    (family_a, tenant_a, 'CI-KK-A-' || suffix, address_a, now_at),
    (family_b, tenant_b, 'CI-KK-B-' || suffix, NULL, now_at);

  INSERT INTO residents (
    id, tenant_id, nik, family_id, full_name, gender, birth_place, birth_date, address_id, updated_at
  )
  VALUES
    (resident_a, tenant_a, 'CI-NIK-A-' || suffix, family_a, 'CI Resident A', 'M', 'CI', now_at, address_a, now_at),
    (resident_b, tenant_b, 'CI-NIK-B-' || suffix, family_b, 'CI Resident B', 'F', 'CI', now_at, NULL, now_at);

  INSERT INTO family_members (id, tenant_id, family_id, resident_id, relationship, is_head)
  VALUES ('ci-member-a-' || suffix, tenant_a, family_a, resident_a, 'head', true);

  INSERT INTO civil_events (id, tenant_id, resident_id, event_type, event_date)
  VALUES ('ci-event-a-' || suffix, tenant_a, resident_a, 'moved', now_at);

  INSERT INTO bumdes_units (id, tenant_id, name, code, updated_at)
  VALUES
    (bumdes_unit_a, tenant_a, 'CI BUMDes A', 'ci-bumdes-a-' || suffix, now_at),
    (bumdes_unit_b, tenant_b, 'CI BUMDes B', 'ci-bumdes-b-' || suffix, now_at);

  INSERT INTO bumdes_financial_records (
    id, tenant_id, unit_id, type, amount, record_date, updated_at
  )
  VALUES ('ci-bumdes-record-a-' || suffix, tenant_a, bumdes_unit_a, 'income', 1.00, CURRENT_DATE, now_at);

  BEGIN
    INSERT INTO neighborhood_units (id, tenant_id, hamlet_id, rt, rw, updated_at)
    VALUES ('ci-invalid-unit-' || suffix, tenant_a, hamlet_b, '003', '001', now_at);
    RAISE EXCEPTION 'cross-tenant neighborhood unit was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO addresses (id, tenant_id, hamlet_id, street, updated_at)
    VALUES ('ci-invalid-address-tenant-' || suffix, tenant_a, hamlet_b, 'CI', now_at);
    RAISE EXCEPTION 'cross-tenant address hamlet was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO addresses (id, tenant_id, hamlet_id, neighborhood_unit_id, street, updated_at)
    VALUES ('ci-invalid-address-hierarchy-' || suffix, tenant_a, hamlet_a_one, unit_a_two, 'CI', now_at);
    RAISE EXCEPTION 'address with mismatched hamlet and neighborhood unit was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO residents (
      id, tenant_id, nik, family_id, full_name, gender, birth_place, birth_date, updated_at
    )
    VALUES (
      'ci-invalid-resident-' || suffix,
      tenant_a,
      'CI-NIK-CROSS-' || suffix,
      family_b,
      'CI Resident Cross',
      'M',
      'CI',
      now_at,
      now_at
    );
    RAISE EXCEPTION 'cross-tenant resident family link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO family_members (id, tenant_id, family_id, resident_id, relationship)
    VALUES ('ci-invalid-member-' || suffix, tenant_a, family_a, resident_b, 'member');
    RAISE EXCEPTION 'cross-tenant family member was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO civil_events (id, tenant_id, resident_id, event_type, event_date)
    VALUES ('ci-invalid-event-' || suffix, tenant_a, resident_b, 'moved', now_at);
    RAISE EXCEPTION 'cross-tenant civil event was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO bumdes_financial_records (
      id, tenant_id, unit_id, type, amount, record_date, updated_at
    )
    VALUES (
      'ci-invalid-bumdes-record-' || suffix,
      tenant_a,
      bumdes_unit_b,
      'income',
      1.00,
      CURRENT_DATE,
      now_at
    );
    RAISE EXCEPTION 'cross-tenant BUMDes financial record was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    DELETE FROM bumdes_units WHERE id = bumdes_unit_a;
    RAISE EXCEPTION 'BUMDes unit deletion cascaded financial history';
  EXCEPTION WHEN SQLSTATE '23503' THEN NULL;
  END;
END;
$$;

ROLLBACK;
SQL

echo "[tenant-link-test] Database tenant-link guards verified"
