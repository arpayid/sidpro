-- AUDIT-FINANCE-P1: make budget realization an append-only ledger.
--
-- `budget_items.realized` remains a denormalized read cache for existing
-- reports. New values may only be derived by inserting ledger entries.

CREATE TABLE "budget_realization_entries" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "budget_item_id" TEXT NOT NULL,
  "entry_type" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "description" TEXT,
  "reference" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "budget_realization_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "budget_realization_entries_entry_type_check"
    CHECK ("entry_type" IN ('realization', 'reversal', 'migration_opening_balance')),
  CONSTRAINT "budget_realization_entries_amount_check" CHECK ("amount" > 0)
);

ALTER TABLE "budget_realization_entries"
  ADD CONSTRAINT "budget_realization_entries_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_realization_entries"
  ADD CONSTRAINT "budget_realization_entries_budget_item_id_fkey"
  FOREIGN KEY ("budget_item_id") REFERENCES "budget_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "budget_realization_entries"
  ADD CONSTRAINT "budget_realization_entries_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "budget_realization_entries_tenant_item_occurred_at_idx"
  ON "budget_realization_entries"("tenant_id", "budget_item_id", "occurred_at" DESC);

CREATE INDEX "budget_realization_entries_budget_item_created_at_idx"
  ON "budget_realization_entries"("budget_item_id", "created_at" DESC);

-- Historical values have no transaction-level provenance. Preserve them as a
-- clearly identified opening balance before direct cache writes are blocked.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "budget_items" WHERE "realized" < 0) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'budget_items.realized contains a negative historical value; reconcile it before applying the realization ledger migration';
  END IF;
END;
$$;

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
)
SELECT
  'migration-opening-balance-' || bi."id",
  budget_year."tenant_id",
  bi."id",
  'migration_opening_balance',
  bi."realized",
  'Saldo realisasi saat migrasi ledger',
  'migration:20260628000800',
  CURRENT_TIMESTAMP,
  NULL
FROM "budget_items" bi
JOIN "budget_years" budget_year ON budget_year."id" = bi."budget_year_id"
WHERE bi."realized" > 0;

CREATE OR REPLACE FUNCTION prevent_budget_item_realized_override()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."realized" <> 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'budget_items.realized must start at zero; create a budget realization ledger entry instead';
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

CREATE TRIGGER budget_items_realized_update_guard
BEFORE UPDATE OF "realized" ON "budget_items"
FOR EACH ROW EXECUTE FUNCTION prevent_budget_item_realized_override();

CREATE OR REPLACE FUNCTION apply_budget_realization_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_realized DECIMAL(15,2);
BEGIN
  SELECT bi."realized"
  INTO current_realized
  FROM "budget_items" bi
  JOIN "budget_years" budget_year ON budget_year."id" = bi."budget_year_id"
  WHERE bi."id" = NEW."budget_item_id"
    AND budget_year."tenant_id" = NEW."tenant_id"
  FOR UPDATE OF bi;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'budget_realization_entries.budget_item_id must belong to the same tenant';
  END IF;

  IF NEW."created_by" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "users" u
      WHERE u."id" = NEW."created_by"
        AND u."tenant_id" = NEW."tenant_id"
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'budget_realization_entries.created_by must belong to the same tenant';
  END IF;

  IF NEW."entry_type" = 'reversal' AND NEW."amount" > current_realized THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'budget realization reversal cannot exceed the current realized balance';
  END IF;

  PERFORM set_config('sidpro.budget_realized_cache_write', 'on', true);
  UPDATE "budget_items"
  SET "realized" = CASE
    WHEN NEW."entry_type" = 'reversal' THEN "realized" - NEW."amount"
    ELSE "realized" + NEW."amount"
  END
  WHERE "id" = NEW."budget_item_id";
  PERFORM set_config('sidpro.budget_realized_cache_write', 'off', true);

  RETURN NEW;
END;
$$;

CREATE TRIGGER budget_realization_entries_apply_cache
BEFORE INSERT ON "budget_realization_entries"
FOR EACH ROW EXECUTE FUNCTION apply_budget_realization_entry();

CREATE OR REPLACE FUNCTION prevent_budget_realization_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'budget realization ledger entries are append-only; create a reversal entry instead';
END;
$$;

CREATE TRIGGER budget_realization_entries_no_update
BEFORE UPDATE ON "budget_realization_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_budget_realization_entry_mutation();

CREATE TRIGGER budget_realization_entries_no_delete
BEFORE DELETE ON "budget_realization_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_budget_realization_entry_mutation();
