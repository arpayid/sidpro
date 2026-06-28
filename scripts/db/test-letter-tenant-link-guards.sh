#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
DB_URL="${DATABASE_URL%%\?*}"

preflight="$(psql "$DB_URL" -X -A -t -v ON_ERROR_STOP=1 -f scripts/db/verify-tenant-link-integrity.sql)"
if [ -n "${preflight//[[:space:]]/}" ]; then
  echo "[letter-tenant-link-test] Existing tenant-link integrity violations found:" >&2
  printf '%s\n' "$preflight" >&2
  exit 1
fi

psql "$DB_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DO $$
DECLARE
  s text := txid_current()::text;
  ta text := 'ci-letter-ta-' || s;
  tb text := 'ci-letter-tb-' || s;
  ua text := 'ci-letter-ua-' || s;
  ub text := 'ci-letter-ub-' || s;
  ra text := 'ci-letter-ra-' || s;
  rb text := 'ci-letter-rb-' || s;
  lta text := 'ci-letter-type-a-' || s;
  ltb text := 'ci-letter-type-b-' || s;
  lra text := 'ci-letter-request-a-' || s;
  lrb text := 'ci-letter-request-b-' || s;
  now_at timestamp(3) := CURRENT_TIMESTAMP;
BEGIN
  INSERT INTO tenants (id, name, code, updated_at) VALUES
    (ta, 'CI Letter Tenant A', 'ci-letter-a-' || s, now_at),
    (tb, 'CI Letter Tenant B', 'ci-letter-b-' || s, now_at);

  INSERT INTO users (id, tenant_id, email, name, password_hash, status, updated_at) VALUES
    (ua, ta, 'ci-letter-ua-' || s || '@example.test', 'CI Letter User A', 'not-a-real-hash', 'active', now_at),
    (ub, tb, 'ci-letter-ub-' || s || '@example.test', 'CI Letter User B', 'not-a-real-hash', 'active', now_at);

  INSERT INTO residents (id, tenant_id, nik, full_name, gender, birth_place, birth_date, updated_at) VALUES
    (ra, ta, 'CI-LETTER-NIK-A-' || s, 'CI Letter Resident A', 'M', 'CI', now_at, now_at),
    (rb, tb, 'CI-LETTER-NIK-B-' || s, 'CI Letter Resident B', 'F', 'CI', now_at, now_at);

  INSERT INTO letter_types (id, tenant_id, code, name, is_active, updated_at) VALUES
    (lta, ta, 'ci-letter-a-' || s, 'CI Letter Type A', true, now_at),
    (ltb, tb, 'ci-letter-b-' || s, 'CI Letter Type B', true, now_at);

  INSERT INTO letter_requests (
    id, tenant_id, requester_id, resident_id, letter_type_id, status, purpose, updated_at
  ) VALUES
    (lra, ta, ua, ra, lta, 'submitted', 'CI letter request A', now_at),
    (lrb, tb, ub, rb, ltb, 'submitted', 'CI letter request B', now_at);

  INSERT INTO letter_approvals (
    id, tenant_id, letter_request_id, approver_id, level, status
  ) VALUES
    ('ci-letter-approval-a-' || s, ta, lra, ua, 'verify', 'verified');

  INSERT INTO letter_number_sequences (id, tenant_id, letter_type_id, year, last_number)
  VALUES ('ci-letter-sequence-a-' || s, ta, lta, 2026, 1);

  BEGIN
    INSERT INTO letter_requests (id, tenant_id, requester_id, letter_type_id, status, purpose, updated_at)
    VALUES ('ci-letter-bad-requester-' || s, ta, ub, lta, 'submitted', 'invalid', now_at);
    RAISE EXCEPTION 'cross-tenant letter requester link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO letter_requests (id, tenant_id, resident_id, letter_type_id, status, purpose, updated_at)
    VALUES ('ci-letter-bad-resident-' || s, ta, rb, lta, 'submitted', 'invalid', now_at);
    RAISE EXCEPTION 'cross-tenant letter resident link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO letter_requests (id, tenant_id, requester_id, letter_type_id, status, purpose, updated_at)
    VALUES ('ci-letter-bad-type-' || s, ta, ua, ltb, 'submitted', 'invalid', now_at);
    RAISE EXCEPTION 'cross-tenant letter type link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO letter_approvals (id, tenant_id, letter_request_id, approver_id, level, status)
    VALUES ('ci-letter-bad-approval-request-' || s, ta, lrb, ua, 'verify', 'verified');
    RAISE EXCEPTION 'cross-tenant letter approval request link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO letter_approvals (id, tenant_id, letter_request_id, approver_id, level, status)
    VALUES ('ci-letter-bad-approval-user-' || s, ta, lra, ub, 'verify', 'verified');
    RAISE EXCEPTION 'cross-tenant letter approval user link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO letter_number_sequences (id, tenant_id, letter_type_id, year, last_number)
    VALUES ('ci-letter-bad-sequence-' || s, ta, ltb, 2027, 1);
    RAISE EXCEPTION 'cross-tenant letter sequence link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    UPDATE users SET tenant_id = tb, updated_at = now_at WHERE id = ua;
    RAISE EXCEPTION 'letter requester tenant move was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    UPDATE residents SET tenant_id = tb, updated_at = now_at WHERE id = ra;
    RAISE EXCEPTION 'letter resident tenant move was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    UPDATE letter_types SET tenant_id = tb, updated_at = now_at WHERE id = lta;
    RAISE EXCEPTION 'letter type tenant move was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  DELETE FROM users WHERE id = ua;
  IF NOT EXISTS (
    SELECT 1 FROM letter_requests WHERE id = lra AND requester_id IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM letter_approvals
    WHERE id = 'ci-letter-approval-a-' || s AND approver_id IS NULL
  ) THEN
    RAISE EXCEPTION 'letter user deletion did not preserve rows and clear nullable identity links';
  END IF;
END;
$$;

ROLLBACK;
SQL

echo "[letter-tenant-link-test] Letter database tenant-link guards verified"
