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

  echo "[initial-tenant-link-test] ERROR: psql client not found" >&2
  exit 1
}

PSQL="$(resolve_psql)"
run_psql() {
  "$PSQL" "$DB_URL" -X -v ON_ERROR_STOP=1 "$@"
}

preflight="$(run_psql -A -t -f scripts/db/verify-tenant-link-integrity.sql)"
if [ -n "${preflight//[[:space:]]/}" ]; then
  echo "[initial-tenant-link-test] Existing tenant-link integrity violations found:" >&2
  printf '%s\n' "$preflight" >&2
  exit 1
fi

echo "[initial-tenant-link-test] Preflight clean; exercising initial AUDIT-5 guards"

run_psql <<'SQL'
BEGIN;

DO $$
DECLARE
  suffix text := txid_current()::text;
  tenant_a text := 'ci-initial-tenant-a-' || suffix;
  tenant_b text := 'ci-initial-tenant-b-' || suffix;
  address_a text := 'ci-initial-address-a-' || suffix;
  address_b text := 'ci-initial-address-b-' || suffix;
  family_a text := 'ci-initial-family-a-' || suffix;
  family_b text := 'ci-initial-family-b-' || suffix;
  resident_a text := 'ci-initial-resident-a-' || suffix;
  resident_b text := 'ci-initial-resident-b-' || suffix;
  letter_type_a text := 'ci-initial-letter-type-a-' || suffix;
  letter_type_b text := 'ci-initial-letter-type-b-' || suffix;
  request_a text := 'ci-initial-letter-request-a-' || suffix;
  request_b text := 'ci-initial-letter-request-b-' || suffix;
  aid_program_a text := 'ci-initial-aid-program-a-' || suffix;
  aid_program_b text := 'ci-initial-aid-program-b-' || suffix;
  file_a text := 'ci-initial-file-a-' || suffix;
  file_b text := 'ci-initial-file-b-' || suffix;
  now_at timestamp(3) := CURRENT_TIMESTAMP;
BEGIN
  INSERT INTO tenants (id, name, code, updated_at)
  VALUES
    (tenant_a, 'CI Initial Tenant A', 'ci-initial-a-' || suffix, now_at),
    (tenant_b, 'CI Initial Tenant B', 'ci-initial-b-' || suffix, now_at);

  INSERT INTO addresses (id, tenant_id, street, updated_at)
  VALUES
    (address_a, tenant_a, 'CI Initial Street A', now_at),
    (address_b, tenant_b, 'CI Initial Street B', now_at);

  INSERT INTO families (id, tenant_id, kk_number, address_id, updated_at)
  VALUES
    (family_a, tenant_a, 'CI-INITIAL-KK-A-' || suffix, address_a, now_at),
    (family_b, tenant_b, 'CI-INITIAL-KK-B-' || suffix, address_b, now_at);

  INSERT INTO residents (
    id, tenant_id, nik, family_id, full_name, gender, birth_place, birth_date, address_id, updated_at
  )
  VALUES
    (resident_a, tenant_a, 'CI-INITIAL-NIK-A-' || suffix, family_a, 'CI Initial Resident A', 'M', 'CI', now_at, address_a, now_at),
    (resident_b, tenant_b, 'CI-INITIAL-NIK-B-' || suffix, family_b, 'CI Initial Resident B', 'F', 'CI', now_at, address_b, now_at);

  UPDATE families
  SET head_resident_id = resident_a, updated_at = now_at
  WHERE id = family_a;

  INSERT INTO letter_types (id, tenant_id, code, name, updated_at)
  VALUES
    (letter_type_a, tenant_a, 'CI-INITIAL-LT-A-' || suffix, 'CI Initial Letter Type A', now_at),
    (letter_type_b, tenant_b, 'CI-INITIAL-LT-B-' || suffix, 'CI Initial Letter Type B', now_at);

  INSERT INTO letter_templates (id, tenant_id, letter_type_id, name, content, updated_at)
  VALUES (
    'ci-initial-template-a-' || suffix,
    tenant_a,
    letter_type_a,
    'CI Initial Template A',
    'Template content',
    now_at
  );

  INSERT INTO letter_requests (id, tenant_id, resident_id, letter_type_id, purpose, updated_at)
  VALUES
    (request_a, tenant_a, resident_a, letter_type_a, 'CI initial request A', now_at),
    (request_b, tenant_b, resident_b, letter_type_b, 'CI initial request B', now_at);

  INSERT INTO aid_programs (id, tenant_id, name, code, updated_at)
  VALUES
    (aid_program_a, tenant_a, 'CI Initial Aid A', 'CI-INITIAL-AID-A-' || suffix, now_at),
    (aid_program_b, tenant_b, 'CI Initial Aid B', 'CI-INITIAL-AID-B-' || suffix, now_at);

  INSERT INTO aid_recipients (id, tenant_id, program_id, resident_id, family_id, status, updated_at)
  VALUES (
    'ci-initial-aid-recipient-a-' || suffix,
    tenant_a,
    aid_program_a,
    resident_a,
    family_a,
    'approved',
    now_at
  );

  INSERT INTO files (id, tenant_id, owner_type, path, mime_type, size)
  VALUES
    (file_a, tenant_a, 'ci_test', 'ci/initial/a-' || suffix || '.txt', 'text/plain', 1),
    (file_b, tenant_b, 'ci_test', 'ci/initial/b-' || suffix || '.txt', 'text/plain', 1);

  INSERT INTO finance_documents (id, tenant_id, title, type, file_id)
  VALUES (
    'ci-initial-finance-a-' || suffix,
    tenant_a,
    'CI Initial Finance A',
    'report',
    file_a
  );

  INSERT INTO gallery_items (id, tenant_id, title, type, file_id)
  VALUES (
    'ci-initial-gallery-a-' || suffix,
    tenant_a,
    'CI Initial Gallery A',
    'image',
    file_a
  );

  INSERT INTO letter_outputs (id, tenant_id, letter_request_id, file_id, "qrCode")
  VALUES (
    'ci-initial-output-a-' || suffix,
    tenant_a,
    request_a,
    file_a,
    'CI-INITIAL-QR-A-' || suffix
  );

  BEGIN
    UPDATE families SET address_id = address_b, updated_at = now_at WHERE id = family_a;
    RAISE EXCEPTION 'cross-tenant family address link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    UPDATE families SET head_resident_id = resident_b, updated_at = now_at WHERE id = family_a;
    RAISE EXCEPTION 'cross-tenant family head resident link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO letter_templates (id, tenant_id, letter_type_id, name, content, updated_at)
    VALUES (
      'ci-invalid-template-' || suffix,
      tenant_a,
      letter_type_b,
      'CI Invalid Template',
      'Invalid tenant link',
      now_at
    );
    RAISE EXCEPTION 'cross-tenant letter template type link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO aid_recipients (id, tenant_id, program_id, resident_id, family_id, status, updated_at)
    VALUES (
      'ci-invalid-aid-program-' || suffix,
      tenant_a,
      aid_program_b,
      resident_a,
      family_a,
      'pending',
      now_at
    );
    RAISE EXCEPTION 'cross-tenant aid program link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO aid_recipients (id, tenant_id, program_id, resident_id, family_id, status, updated_at)
    VALUES (
      'ci-invalid-aid-resident-' || suffix,
      tenant_a,
      aid_program_a,
      resident_b,
      family_a,
      'pending',
      now_at
    );
    RAISE EXCEPTION 'cross-tenant aid resident link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO aid_recipients (id, tenant_id, program_id, resident_id, family_id, status, updated_at)
    VALUES (
      'ci-invalid-aid-family-' || suffix,
      tenant_a,
      aid_program_a,
      resident_a,
      family_b,
      'pending',
      now_at
    );
    RAISE EXCEPTION 'cross-tenant aid family link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO finance_documents (id, tenant_id, title, type, file_id)
    VALUES (
      'ci-invalid-finance-' || suffix,
      tenant_a,
      'CI Invalid Finance',
      'report',
      file_b
    );
    RAISE EXCEPTION 'cross-tenant finance file link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO gallery_items (id, tenant_id, title, type, file_id)
    VALUES (
      'ci-invalid-gallery-' || suffix,
      tenant_a,
      'CI Invalid Gallery',
      'image',
      file_b
    );
    RAISE EXCEPTION 'cross-tenant gallery file link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO letter_outputs (id, tenant_id, letter_request_id, file_id, "qrCode")
    VALUES (
      'ci-invalid-output-request-' || suffix,
      tenant_a,
      request_b,
      file_a,
      'CI-INVALID-QR-REQUEST-' || suffix
    );
    RAISE EXCEPTION 'cross-tenant letter output request link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO letter_outputs (id, tenant_id, letter_request_id, file_id, "qrCode")
    VALUES (
      'ci-invalid-output-file-' || suffix,
      tenant_a,
      request_a,
      file_b,
      'CI-INVALID-QR-FILE-' || suffix
    );
    RAISE EXCEPTION 'cross-tenant letter output file link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;
END;
$$;

ROLLBACK;
SQL

echo "[initial-tenant-link-test] Initial database tenant-link guards verified"
