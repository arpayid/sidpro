-- AUDIT-5: soft-deleted residents must not remain active household members.
--
-- Reconcile historical soft deletes first, then keep the invariant at the
-- database boundary for API updates, imports, scripts, and direct operations.
-- Restoring a resident is intentionally explicit: this migration never guesses
-- which prior family relationship should be restored.

DELETE FROM family_members fm
USING residents r
WHERE fm.resident_id = r.id
  AND r.deleted_at IS NOT NULL;

UPDATE families f
SET head_resident_id = NULL
FROM residents r
WHERE f.head_resident_id = r.id
  AND r.deleted_at IS NOT NULL;

UPDATE residents
SET family_id = NULL
WHERE deleted_at IS NOT NULL
  AND family_id IS NOT NULL;

CREATE OR REPLACE FUNCTION detach_soft_deleted_resident_from_family()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    NEW.family_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_soft_deleted_resident_family_dependents()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    DELETE FROM family_members WHERE resident_id = NEW.id;
    UPDATE families SET head_resident_id = NULL WHERE head_resident_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER resident_soft_delete_detach_family
BEFORE UPDATE OF deleted_at ON residents
FOR EACH ROW EXECUTE FUNCTION detach_soft_deleted_resident_from_family();

CREATE TRIGGER resident_soft_delete_cleanup_family_dependents
AFTER UPDATE OF deleted_at ON residents
FOR EACH ROW EXECUTE FUNCTION cleanup_soft_deleted_resident_family_dependents();
