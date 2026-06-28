-- Preserve compatible imports and seed data without allowing mutable realized caches.
-- A positive initial value is immediately rewritten as an append-only opening
-- balance entry. Subsequent realized updates remain prohibited.

DROP TRIGGER IF EXISTS budget_items_realized_insert_guard ON "budget_items";

CREATE OR REPLACE FUNCTION prevent_budget_item_realized_override()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."realized" < 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'budget_items.realized cannot start below zero';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."realized" IS DISTINCT FROM OLD."realized"
    AND COALESCE(current_setting('sidpro.budget_realized_cache_write', true), 'off') <> 'on'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'budget_items.realized is derived from budget_realization_entries and cannot be edited directly';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER budget_items_realized_insert_guard
BEFORE INSERT ON "budget_items"
FOR EACH ROW EXECUTE FUNCTION prevent_budget_item_realized_override();

CREATE OR REPLACE FUNCTION normalize_budget_item_initial_realized()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  item_tenant_id TEXT;
  initial_realized DECIMAL(15,2);
BEGIN
  IF NEW."realized" = 0 THEN
    RETURN NEW;
  END IF;

  initial_realized := NEW."realized";
  SELECT "tenant_id"
  INTO item_tenant_id
  FROM "budget_years"
  WHERE "id" = NEW."budget_year_id";

  IF item_tenant_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'budget_items.budget_year_id must resolve to a tenant before initial realization normalization';
  END IF;

  PERFORM set_config('sidpro.budget_realized_cache_write', 'on', true);
  UPDATE "budget_items" SET "realized" = 0 WHERE "id" = NEW."id";
  PERFORM set_config('sidpro.budget_realized_cache_write', 'off', true);

  INSERT INTO "budget_realization_entries" (
    "id",
    "tenant_id",
    "budget_item_id",
    "entry_type",
    "amount",
    "description",
    "reference",
    "occurred_at",
    "created_by"
  ) VALUES (
    'initial-realization-balance-' || NEW."id",
    item_tenant_id,
    NEW."id",
    'migration_opening_balance',
    initial_realized,
    'Saldo awal realisasi saat pembuatan item',
    'initial-balance:direct-insert',
    CURRENT_TIMESTAMP,
    NULL
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER budget_items_initial_realized_normalization
AFTER INSERT ON "budget_items"
FOR EACH ROW EXECUTE FUNCTION normalize_budget_item_initial_realized();
