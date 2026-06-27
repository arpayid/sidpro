-- AUDIT-5: extend tenant-link integrity protection to population and BUMDes.
--
-- This migration depends on assert_same_tenant_link() from
-- 20260628000200_enforce_tenant_link_guards. It is non-destructive and rejects
-- only future invalid INSERT/UPDATE statements.

CREATE OR REPLACE FUNCTION assert_address_neighborhood_hierarchy(
  p_hamlet_id text,
  p_neighborhood_unit_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  unit_hamlet_id text;
BEGIN
  IF p_hamlet_id IS NULL OR p_neighborhood_unit_id IS NULL THEN
    RETURN;
  END IF;

  SELECT hamlet_id
    INTO unit_hamlet_id
  FROM neighborhood_units
  WHERE id = p_neighborhood_unit_id;

  IF unit_hamlet_id <> p_hamlet_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'addresses.neighborhood_unit_id must belong to addresses.hamlet_id';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_neighborhood_unit_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.hamlet_id,
    'hamlets',
    'neighborhood_units.hamlet_id'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_address_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.hamlet_id,
    'hamlets',
    'addresses.hamlet_id'
  );
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.neighborhood_unit_id,
    'neighborhood_units',
    'addresses.neighborhood_unit_id'
  );
  PERFORM assert_address_neighborhood_hierarchy(
    NEW.hamlet_id,
    NEW.neighborhood_unit_id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_resident_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.family_id,
    'families',
    'residents.family_id'
  );
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.address_id,
    'addresses',
    'residents.address_id'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_family_member_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.family_id,
    'families',
    'family_members.family_id'
  );
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.resident_id,
    'residents',
    'family_members.resident_id'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_civil_event_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.resident_id,
    'residents',
    'civil_events.resident_id'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_bumdes_financial_record_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.unit_id,
    'bumdes_units',
    'bumdes_financial_records.unit_id'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenant_link_guard_neighborhood_units
BEFORE INSERT OR UPDATE OF tenant_id, hamlet_id ON neighborhood_units
FOR EACH ROW EXECUTE FUNCTION enforce_neighborhood_unit_tenant_links();

CREATE TRIGGER tenant_link_guard_addresses
BEFORE INSERT OR UPDATE OF tenant_id, hamlet_id, neighborhood_unit_id ON addresses
FOR EACH ROW EXECUTE FUNCTION enforce_address_tenant_links();

CREATE TRIGGER tenant_link_guard_residents
BEFORE INSERT OR UPDATE OF tenant_id, family_id, address_id ON residents
FOR EACH ROW EXECUTE FUNCTION enforce_resident_tenant_links();

CREATE TRIGGER tenant_link_guard_family_members
BEFORE INSERT OR UPDATE OF tenant_id, family_id, resident_id ON family_members
FOR EACH ROW EXECUTE FUNCTION enforce_family_member_tenant_links();

CREATE TRIGGER tenant_link_guard_civil_events
BEFORE INSERT OR UPDATE OF tenant_id, resident_id ON civil_events
FOR EACH ROW EXECUTE FUNCTION enforce_civil_event_tenant_links();

CREATE TRIGGER tenant_link_guard_bumdes_financial_records
BEFORE INSERT OR UPDATE OF tenant_id, unit_id ON bumdes_financial_records
FOR EACH ROW EXECUTE FUNCTION enforce_bumdes_financial_record_tenant_links();
