-- AUDIT-5: protect tenant-owned relationships at the database boundary.
--
-- IDs and tenant IDs are TEXT in the existing Prisma migrations. These guards
-- reject future invalid INSERT/UPDATE statements. The foreign-key safeguards
-- below also prevent deletion of files while tenant-owned records reference
-- them. Run scripts/db/verify-tenant-link-integrity.sql before deployment.

CREATE OR REPLACE FUNCTION assert_same_tenant_link(
  p_tenant_id text,
  p_reference_id text,
  p_reference_table regclass,
  p_reference_label text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  linked_tenant_id text;
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

CREATE OR REPLACE FUNCTION enforce_family_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(NEW.tenant_id, NEW.address_id, 'addresses', 'families.address_id');
  PERFORM assert_same_tenant_link(NEW.tenant_id, NEW.head_resident_id, 'residents', 'families.head_resident_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_letter_template_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(NEW.tenant_id, NEW.letter_type_id, 'letter_types', 'letter_templates.letter_type_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_aid_recipient_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(NEW.tenant_id, NEW.program_id, 'aid_programs', 'aid_recipients.program_id');
  PERFORM assert_same_tenant_link(NEW.tenant_id, NEW.resident_id, 'residents', 'aid_recipients.resident_id');
  PERFORM assert_same_tenant_link(NEW.tenant_id, NEW.family_id, 'families', 'aid_recipients.family_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_finance_document_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(NEW.tenant_id, NEW.file_id, 'files', 'finance_documents.file_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_gallery_item_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(NEW.tenant_id, NEW.file_id, 'files', 'gallery_items.file_id');
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenant_link_guard_families
BEFORE INSERT OR UPDATE OF tenant_id, address_id, head_resident_id ON families
FOR EACH ROW EXECUTE FUNCTION enforce_family_tenant_links();

CREATE TRIGGER tenant_link_guard_letter_templates
BEFORE INSERT OR UPDATE OF tenant_id, letter_type_id ON letter_templates
FOR EACH ROW EXECUTE FUNCTION enforce_letter_template_tenant_links();

CREATE TRIGGER tenant_link_guard_aid_recipients
BEFORE INSERT OR UPDATE OF tenant_id, program_id, resident_id, family_id ON aid_recipients
FOR EACH ROW EXECUTE FUNCTION enforce_aid_recipient_tenant_links();

CREATE TRIGGER tenant_link_guard_finance_documents
BEFORE INSERT OR UPDATE OF tenant_id, file_id ON finance_documents
FOR EACH ROW EXECUTE FUNCTION enforce_finance_document_tenant_links();

CREATE TRIGGER tenant_link_guard_gallery_items
BEFORE INSERT OR UPDATE OF tenant_id, file_id ON gallery_items
FOR EACH ROW EXECUTE FUNCTION enforce_gallery_item_tenant_links();

ALTER TABLE finance_documents
  ADD CONSTRAINT finance_documents_file_id_restrict_fkey
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE RESTRICT;

ALTER TABLE gallery_items
  ADD CONSTRAINT gallery_items_file_id_restrict_fkey
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE RESTRICT;

ALTER TABLE letter_outputs
  ADD CONSTRAINT letter_outputs_file_id_restrict_fkey
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE RESTRICT;
