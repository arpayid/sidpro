-- AUDIT-FINANCE-P1: prevent parent-side tenant drift around realization ledger rows.

CREATE OR REPLACE FUNCTION enforce_budget_item_realization_budget_year_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "budget_realization_entries" bre
    JOIN "budget_years" budget_year ON budget_year."id" = NEW."budget_year_id"
    WHERE bre."budget_item_id" = NEW."id"
      AND bre."tenant_id" IS DISTINCT FROM budget_year."tenant_id"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'budget_items.budget_year_id cannot change to a year from another tenant while realization ledger entries exist';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER budget_items_realization_budget_year_scope_guard
BEFORE UPDATE OF "budget_year_id" ON "budget_items"
FOR EACH ROW EXECUTE FUNCTION enforce_budget_item_realization_budget_year_scope();

CREATE OR REPLACE FUNCTION enforce_budget_year_realization_tenant_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "budget_realization_entries" bre
    JOIN "budget_items" bi ON bi."id" = bre."budget_item_id"
    WHERE bi."budget_year_id" = NEW."id"
      AND bre."tenant_id" IS DISTINCT FROM NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'budget_years.tenant_id cannot change while realization ledger entries belong to a different tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER budget_years_realization_tenant_scope_guard
BEFORE UPDATE OF "tenant_id" ON "budget_years"
FOR EACH ROW EXECUTE FUNCTION enforce_budget_year_realization_tenant_scope();

CREATE OR REPLACE FUNCTION enforce_user_realization_author_tenant_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."tenant_id" IS NOT NULL
    AND NEW."tenant_id" IS NULL
    AND is_tenant_being_deleted(OLD."tenant_id")
  THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "budget_realization_entries" bre
    WHERE bre."created_by" = NEW."id"
      AND bre."tenant_id" IS DISTINCT FROM NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'users.tenant_id cannot change while the user authors realization ledger entries for a different tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER users_realization_author_tenant_scope_guard
BEFORE UPDATE OF "tenant_id" ON "users"
FOR EACH ROW EXECUTE FUNCTION enforce_user_realization_author_tenant_scope();
