-- AUDIT-5: Database-level tenant-link integrity guard.
--
-- This migration is intentionally non-destructive. It adds PostgreSQL triggers
-- that reject future INSERT/UPDATE statements when a tenant-owned row points
-- to a tenant-owned related record from another tenant. Existing rows are not
-- modified; production rollout must run the companion preflight query before
-- enabling strict remediation for historical inconsistencies.

CREATE OR REPLACE FUNCTION assert_same_tenant_reference(
  p_tenant_id uuid,
  p_reference_id uuid,
  p_reference_table regclass,
  p_reference_label text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  linked_tenant_id uuid;
BEGIN
  IF p_reference_id IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('SELECT tenant_id FROM %s WHERE id = $1', p_reference_table)
    INTO linked_tenant_id
    USING p_reference_id;

  IF linked_tenant_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = format('%s references a missing tenant-owned record', p_reference_label);
  END IF;

  IF linked_tenant_id <> p_tenant_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = format('%s must reference a record in the same tenant', p_reference_label);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_families_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.address_id, 'addresses', 'families.address_id');
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.head_resident_id, 'residents', 'families.head_resident_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_residents_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.family_id, 'families', 'residents.family_id');
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.address_id, 'addresses', 'residents.address_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_addresses_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.hamlet_id, 'hamlets', 'addresses.hamlet_id');
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.neighborhood_unit_id, 'neighborhood_units', 'addresses.neighborhood_unit_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_neighborhood_units_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.hamlet_id, 'hamlets', 'neighborhood_units.hamlet_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_family_members_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.family_id, 'families', 'family_members.family_id');
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.resident_id, 'residents', 'family_members.resident_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_civil_events_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.resident_id, 'residents', 'civil_events.resident_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_letter_templates_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.letter_type_id, 'letter_types', 'letter_templates.letter_type_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_letter_requests_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.resident_id, 'residents', 'letter_requests.resident_id');
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.letter_type_id, 'letter_types', 'letter_requests.letter_type_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_letter_approvals_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.letter_request_id, 'letter_requests', 'letter_approvals.letter_request_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_letter_outputs_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.letter_request_id, 'letter_requests', 'letter_outputs.letter_request_id');
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.file_id, 'files', 'letter_outputs.file_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_letter_number_sequences_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.letter_type_id, 'letter_types', 'letter_number_sequences.letter_type_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_aid_recipients_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.program_id, 'aid_programs', 'aid_recipients.program_id');
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.resident_id, 'residents', 'aid_recipients.resident_id');
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.family_id, 'families', 'aid_recipients.family_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_finance_documents_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.file_id, 'files', 'finance_documents.file_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_gallery_items_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.file_id, 'files', 'gallery_items.file_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_bumdes_financial_records_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_reference(NEW.tenant_id, NEW.unit_id, 'bumdes_units', 'bumdes_financial_records.unit_id');
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenant_link_integrity_families
BEFORE INSERT OR UPDATE OF tenant_id, address_id, head_resident_id ON families
FOR EACH ROW EXECUTE FUNCTION enforce_families_tenant_links();

CREATE TRIGGER tenant_link_integrity_residents
BEFORE INSERT OR UPDATE OF tenant_id, family_id, address_id ON residents
FOR EACH ROW EXECUTE FUNCTION enforce_residents_tenant_links();

CREATE TRIGGER tenant_link_integrity_addresses
BEFORE INSERT OR UPDATE OF tenant_id, hamlet_id, neighborhood_unit_id ON addresses
FOR EACH ROW EXECUTE FUNCTION enforce_addresses_tenant_links();

CREATE TRIGGER tenant_link_integrity_neighborhood_units
BEFORE INSERT OR UPDATE OF tenant_id, hamlet_id ON neighborhood_units
FOR EACH ROW EXECUTE FUNCTION enforce_neighborhood_units_tenant_links();

CREATE TRIGGER tenant_link_integrity_family_members
BEFORE INSERT OR UPDATE OF tenant_id, family_id, resident_id ON family_members
FOR EACH ROW EXECUTE FUNCTION enforce_family_members_tenant_links();

CREATE TRIGGER tenant_link_integrity_civil_events
BEFORE INSERT OR UPDATE OF tenant_id, resident_id ON civil_events
FOR EACH ROW EXECUTE FUNCTION enforce_civil_events_tenant_links();

CREATE TRIGGER tenant_link_integrity_letter_templates
BEFORE INSERT OR UPDATE OF tenant_id, letter_type_id ON letter_templates
FOR EACH ROW EXECUTE FUNCTION enforce_letter_templates_tenant_links();

CREATE TRIGGER tenant_link_integrity_letter_requests
BEFORE INSERT OR UPDATE OF tenant_id, resident_id, letter_type_id ON letter_requests
FOR EACH ROW EXECUTE FUNCTION enforce_letter_requests_tenant_links();

CREATE TRIGGER tenant_link_integrity_letter_approvals
BEFORE INSERT OR UPDATE OF tenant_id, letter_request_id ON letter_approvals
FOR EACH ROW EXECUTE FUNCTION enforce_letter_approvals_tenant_links();

CREATE TRIGGER tenant_link_integrity_letter_outputs
BEFORE INSERT OR UPDATE OF tenant_id, letter_request_id, file_id ON letter_outputs
FOR EACH ROW EXECUTE FUNCTION enforce_letter_outputs_tenant_links();

CREATE TRIGGER tenant_link_integrity_letter_number_sequences
BEFORE INSERT OR UPDATE OF tenant_id, letter_type_id ON letter_number_sequences
FOR EACH ROW EXECUTE FUNCTION enforce_letter_number_sequences_tenant_links();

CREATE TRIGGER tenant_link_integrity_aid_recipients
BEFORE INSERT OR UPDATE OF tenant_id, program_id, resident_id, family_id ON aid_recipients
FOR EACH ROW EXECUTE FUNCTION enforce_aid_recipients_tenant_links();

CREATE TRIGGER tenant_link_integrity_finance_documents
BEFORE INSERT OR UPDATE OF tenant_id, file_id ON finance_documents
FOR EACH ROW EXECUTE FUNCTION enforce_finance_documents_tenant_links();

CREATE TRIGGER tenant_link_integrity_gallery_items
BEFORE INSERT OR UPDATE OF tenant_id, file_id ON gallery_items
FOR EACH ROW EXECUTE FUNCTION enforce_gallery_items_tenant_links();

CREATE TRIGGER tenant_link_integrity_bumdes_financial_records
BEFORE INSERT OR UPDATE OF tenant_id, unit_id ON bumdes_financial_records
FOR EACH ROW EXECUTE FUNCTION enforce_bumdes_financial_records_tenant_links();
