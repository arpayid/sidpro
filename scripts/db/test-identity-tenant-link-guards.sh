#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
DB_URL="${DATABASE_URL%%\?*}"

preflight="$({
  psql "$DB_URL" -X -A -t -v ON_ERROR_STOP=1 -f scripts/db/verify-tenant-link-integrity.sql
  psql "$DB_URL" -X -A -t -v ON_ERROR_STOP=1 -f scripts/db/verify-identity-tenant-link-integrity.sql
})"
if [ -n "${preflight//[[:space:]]/}" ]; then
  echo "[identity-tenant-link-test] Existing tenant-link integrity violations found:" >&2
  printf '%s\n' "$preflight" >&2
  exit 1
fi

psql "$DB_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DO $$
DECLARE
  s text := txid_current()::text;
  ta text := 'ci-id-ta-' || s;
  tb text := 'ci-id-tb-' || s;
  ug text := 'ci-id-ug-' || s;
  ua text := 'ci-id-ua-' || s;
  ub text := 'ci-id-ub-' || s;
  rg text := 'ci-id-rg-' || s;
  ra text := 'ci-id-ra-' || s;
  rb text := 'ci-id-rb-' || s;
  ca text := 'ci-id-ca-' || s;
  now_at timestamp(3) := CURRENT_TIMESTAMP;
BEGIN
  INSERT INTO tenants (id, name, code, updated_at) VALUES
    (ta, 'CI Identity Tenant A', 'ci-id-a-' || s, now_at),
    (tb, 'CI Identity Tenant B', 'ci-id-b-' || s, now_at);
  INSERT INTO users (id, tenant_id, email, name, password_hash, status, updated_at) VALUES
    (ug, NULL, 'ci-id-g-' || s || '@example.test', 'CI Global', 'not-a-real-hash', 'active', now_at),
    (ua, ta, 'ci-id-a-' || s || '@example.test', 'CI User A', 'not-a-real-hash', 'active', now_at),
    (ub, tb, 'ci-id-b-' || s || '@example.test', 'CI User B', 'not-a-real-hash', 'active', now_at);
  INSERT INTO roles (id, tenant_id, name, code, scope, updated_at) VALUES
    (rg, NULL, 'CI Global Role', 'ci-id-g-' || s, 'system', now_at),
    (ra, ta, 'CI Role A', 'ci-id-ra-' || s, 'tenant', now_at),
    (rb, tb, 'CI Role B', 'ci-id-rb-' || s, 'tenant', now_at);
  INSERT INTO user_roles (user_id, role_id) VALUES (ug, rg), (ua, ra), (ub, rb);
  INSERT INTO complaints (id, tenant_id, reporter_id, assignee_id, title, description, category, updated_at)
    VALUES (ca, ta, ua, ua, 'CI Identity Complaint', 'fixture', 'test', now_at);
  INSERT INTO notifications (id, tenant_id, user_id, type, title, message)
    VALUES ('ci-id-notification-' || s, ta, ua, 'test', 'fixture', 'fixture');
  INSERT INTO complaint_responses (id, complaint_id, responder_id, response, status)
    VALUES ('ci-id-response-' || s, ca, ua, 'fixture', 'in_progress');

  BEGIN INSERT INTO user_roles (user_id, role_id) VALUES (ua, rb); RAISE EXCEPTION 'cross-tenant user role link was accepted'; EXCEPTION WHEN SQLSTATE '23514' THEN NULL; END;
  BEGIN INSERT INTO user_roles (user_id, role_id) VALUES (ua, rg); RAISE EXCEPTION 'tenant user received global role'; EXCEPTION WHEN SQLSTATE '23514' THEN NULL; END;
  BEGIN INSERT INTO user_roles (user_id, role_id) VALUES (ug, ra); RAISE EXCEPTION 'global user received tenant role'; EXCEPTION WHEN SQLSTATE '23514' THEN NULL; END;
  BEGIN INSERT INTO notifications (id, tenant_id, user_id, type, title, message) VALUES ('ci-id-bad-notification-' || s, ta, ub, 'test', 'invalid', 'invalid'); RAISE EXCEPTION 'cross-tenant notification user link was accepted'; EXCEPTION WHEN SQLSTATE '23514' THEN NULL; END;
  BEGIN UPDATE complaints SET reporter_id = ub, updated_at = now_at WHERE id = ca; RAISE EXCEPTION 'cross-tenant complaint reporter link was accepted'; EXCEPTION WHEN SQLSTATE '23514' THEN NULL; END;
  BEGIN UPDATE complaints SET assignee_id = ub, updated_at = now_at WHERE id = ca; RAISE EXCEPTION 'cross-tenant complaint assignee link was accepted'; EXCEPTION WHEN SQLSTATE '23514' THEN NULL; END;
  BEGIN INSERT INTO complaint_responses (id, complaint_id, responder_id, response, status) VALUES ('ci-id-bad-response-' || s, ca, ub, 'invalid', 'in_progress'); RAISE EXCEPTION 'cross-tenant response responder link was accepted'; EXCEPTION WHEN SQLSTATE '23514' THEN NULL; END;
  BEGIN UPDATE users SET tenant_id = tb, updated_at = now_at WHERE id = ua; RAISE EXCEPTION 'user tenant move was accepted'; EXCEPTION WHEN SQLSTATE '23514' THEN NULL; END;
  BEGIN UPDATE roles SET tenant_id = tb, updated_at = now_at WHERE id = ra; RAISE EXCEPTION 'role tenant move was accepted'; EXCEPTION WHEN SQLSTATE '23514' THEN NULL; END;
  BEGIN UPDATE complaints SET tenant_id = tb, updated_at = now_at WHERE id = ca; RAISE EXCEPTION 'complaint tenant move was accepted'; EXCEPTION WHEN SQLSTATE '23514' THEN NULL; END;
END;
$$;

ROLLBACK;
SQL

echo "[identity-tenant-link-test] Identity database tenant-link guards verified"
