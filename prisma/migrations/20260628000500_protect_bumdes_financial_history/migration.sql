-- AUDIT-5: retain BUMDes financial history.
--
-- A financial record is an accounting fact. Deleting its BUMDes unit must not
-- cascade-delete the record. Units with history are retired by changing their
-- status to inactive instead of deleting them.

ALTER TABLE "bumdes_financial_records"
  DROP CONSTRAINT IF EXISTS "bumdes_financial_records_unit_id_fkey";

ALTER TABLE "bumdes_financial_records"
  ADD CONSTRAINT "bumdes_financial_records_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "bumdes_units"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
