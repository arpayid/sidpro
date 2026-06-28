#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
DB_URL="${DATABASE_URL%%\?*}"

psql "$DB_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DO $$
DECLARE
  s text := txid_current()::text;
  tenant_a text := 'ci-ledger-tenant-a-' || s;
  tenant_b text := 'ci-ledger-tenant-b-' || s;
  user_a text := 'ci-ledger-user-a-' || s;
  user_b text := 'ci-ledger-user-b-' || s;
  year_a text := 'ci-ledger-year-a-' || s;
  year_b text := 'ci-ledger-year-b-' || s;
  item_a text := 'ci-ledger-item-a-' || s;
  item_b text := 'ci-ledger-item-b-' || s;
  entry_a text := 'ci-ledger-entry-a-' || s;
  entry_b text := 'ci-ledger-entry-b-' || s;
  current_realized numeric(15,2);
  now_at timestamp(3) := CURRENT_TIMESTAMP;
BEGIN
  INSERT INTO tenants (id, name, code, updated_at)
  VALUES
    (tenant_a, 'CI Ledger Tenant A', 'ci-ledger-a-' || s, now_at),
    (tenant_b, 'CI Ledger Tenant B', 'ci-ledger-b-' || s, now_at);

  INSERT INTO users (id, tenant_id, email, name, password_hash, status, updated_at)
  VALUES
    (user_a, tenant_a, 'ci-ledger-user-a-' || s || '@example.test', 'CI Ledger User A', 'not-a-real-hash', 'active', now_at),
    (user_b, tenant_b, 'ci-ledger-user-b-' || s || '@example.test', 'CI Ledger User B', 'not-a-real-hash', 'active', now_at);

  INSERT INTO budget_years (id, tenant_id, year, total_budget, status, updated_at)
  VALUES
    (year_a, tenant_a, 2026, 1000.00, 'draft', now_at),
    (year_b, tenant_b, 2026, 1000.00, 'draft', now_at);

  INSERT INTO budget_items (id, budget_year_id, category, name, planned)
  VALUES
    (item_a, year_a, 'CI', 'CI Ledger Item A', 1000.00),
    (item_b, year_b, 'CI', 'CI Ledger Item B', 1000.00);

  INSERT INTO budget_realization_entries (
    id, tenant_id, budget_item_id, entry_type, amount, description, reference, occurred_at, created_by
  ) VALUES (
    entry_a, tenant_a, item_a, 'realization', 100.00, 'CI realization', 'CI-REF-A', now_at, user_a
  );

  SELECT realized INTO current_realized FROM budget_items WHERE id = item_a;
  IF current_realized <> 100.00 THEN
    RAISE EXCEPTION 'ledger realization did not update the realized cache';
  END IF;

  INSERT INTO budget_realization_entries (
    id, tenant_id, budget_item_id, entry_type, amount, description, occurred_at, created_by
  ) VALUES (
    entry_b, tenant_a, item_a, 'reversal', 30.00, 'CI reversal', now_at, user_a
  );

  SELECT realized INTO current_realized FROM budget_items WHERE id = item_a;
  IF current_realized <> 70.00 THEN
    RAISE EXCEPTION 'ledger reversal did not reduce the realized cache';
  END IF;

  BEGIN
    UPDATE budget_items SET realized = 1.00 WHERE id = item_a;
    RAISE EXCEPTION 'direct realized cache edit was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    UPDATE budget_realization_entries SET amount = 1.00 WHERE id = entry_a;
    RAISE EXCEPTION 'ledger update was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    DELETE FROM budget_realization_entries WHERE id = entry_a;
    RAISE EXCEPTION 'ledger delete was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO budget_realization_entries (
      id, tenant_id, budget_item_id, entry_type, amount, occurred_at, created_by
    ) VALUES (
      'ci-ledger-over-reversal-' || s, tenant_a, item_a, 'reversal', 71.00, now_at, user_a
    );
    RAISE EXCEPTION 'over-reversal was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO budget_realization_entries (
      id, tenant_id, budget_item_id, entry_type, amount, occurred_at, created_by
    ) VALUES (
      'ci-ledger-cross-item-' || s, tenant_a, item_b, 'realization', 1.00, now_at, user_a
    );
    RAISE EXCEPTION 'cross-tenant budget item link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO budget_realization_entries (
      id, tenant_id, budget_item_id, entry_type, amount, occurred_at, created_by
    ) VALUES (
      'ci-ledger-cross-user-' || s, tenant_a, item_a, 'realization', 1.00, now_at, user_b
    );
    RAISE EXCEPTION 'cross-tenant ledger author link was accepted';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    UPDATE budget_items SET budget_year_id = year_b WHERE id = item_a;
    RAISE EXCEPTION 'ledger budget item was moved to a year from another tenant';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    UPDATE budget_years SET tenant_id = tenant_b, updated_at = now_at WHERE id = year_a;
    RAISE EXCEPTION 'ledger budget year tenant was changed';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    UPDATE users SET tenant_id = tenant_b, updated_at = now_at WHERE id = user_a;
    RAISE EXCEPTION 'ledger author tenant was changed';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    INSERT INTO budget_items (id, budget_year_id, category, name, planned, realized)
    VALUES ('ci-ledger-direct-cache-' || s, year_a, 'CI', 'Invalid direct cache', 1.00, 1.00);
    RAISE EXCEPTION 'nonzero realized cache was accepted on budget item creation';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;

  BEGIN
    DELETE FROM budget_items WHERE id = item_a;
    RAISE EXCEPTION 'budget item deletion removed ledger history';
  EXCEPTION WHEN SQLSTATE '23503' THEN NULL;
  END;
END;
$$;

ROLLBACK;
SQL

echo "[budget-realization-ledger-test] Budget realization ledger guards verified"
