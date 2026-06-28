-- AUDIT-5: protect letter workflow links at the database boundary.
--
-- The initial schema has ordinary foreign keys for letter requests, approvals,
-- and sequences, but none ensure that their referenced rows belong to the same
-- tenant. These guards depend on assert_same_tenant_link from migration 00200
-- and assert_exact_tenant_identity_link / is_tenant_being_deleted from 00400.

CREATE OR REPLACE FUNCTION assert_no_letter_request_tenant_dependent_mismatch(
  p_letter_request_id text,
  p_tenant_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM letter_approvals la
    WHERE la.letter_request_id = p_letter_request_id
      AND la.tenant_id IS DISTINCT FROM p_tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'letter_requests.tenant_id cannot change while letter approvals have a different tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM letter_outputs lo
    WHERE lo.letter_request_id = p_letter_request_id
      AND lo.tenant_id IS DISTINCT FROM p_tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'letter_requests.tenant_id cannot change while letter outputs have a different tenant';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION assert_no_letter_type_tenant_dependent_mismatch(
  p_letter_type_id text,
  p_tenant_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM letter_templates lt
    WHERE lt.letter_type_id = p_letter_type_id
      AND lt.tenant_id IS DISTINCT FROM p_tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'letter_types.tenant_id cannot change while letter templates have a different tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM letter_requests lr
    WHERE lr.letter_type_id = p_letter_type_id
      AND lr.tenant_id IS DISTINCT FROM p_tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'letter_types.tenant_id cannot change while letter requests have a different tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM letter_number_sequences lns
    WHERE lns.letter_type_id = p_letter_type_id
      AND lns.tenant_id IS DISTINCT FROM p_tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'letter_types.tenant_id cannot change while letter number sequences have a different tenant';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_letter_request_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_exact_tenant_identity_link(
    NEW.tenant_id,
    NEW.requester_id,
    'users',
    'letter_requests.requester_id'
  );
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.resident_id,
    'residents',
    'letter_requests.resident_id'
  );
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.letter_type_id,
    'letter_types',
    'letter_requests.letter_type_id'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_letter_request_tenant_dependents()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_no_letter_request_tenant_dependent_mismatch(NEW.id, NEW.tenant_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_letter_approval_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.letter_request_id,
    'letter_requests',
    'letter_approvals.letter_request_id'
  );
  PERFORM assert_exact_tenant_identity_link(
    NEW.tenant_id,
    NEW.approver_id,
    'users',
    'letter_approvals.approver_id'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_letter_number_sequence_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_same_tenant_link(
    NEW.tenant_id,
    NEW.letter_type_id,
    'letter_types',
    'letter_number_sequences.letter_type_id'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_letter_type_tenant_dependents()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_no_letter_type_tenant_dependent_mismatch(NEW.id, NEW.tenant_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_user_letter_tenant_dependents()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.tenant_id IS NOT NULL
    AND NEW.tenant_id IS NULL
    AND is_tenant_being_deleted(OLD.tenant_id)
  THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM letter_requests lr
    WHERE lr.requester_id = NEW.id
      AND lr.tenant_id IS DISTINCT FROM NEW.tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'users.tenant_id cannot change while letter requests reference the user from a different tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM letter_approvals la
    WHERE la.approver_id = NEW.id
      AND la.tenant_id IS DISTINCT FROM NEW.tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'users.tenant_id cannot change while letter approvals reference the user from a different tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_resident_letter_tenant_dependents()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM letter_requests lr
    WHERE lr.resident_id = NEW.id
      AND lr.tenant_id IS DISTINCT FROM NEW.tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'residents.tenant_id cannot change while letter requests reference the resident from a different tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tenant_link_guard_letter_requests
BEFORE INSERT OR UPDATE OF tenant_id, requester_id, resident_id, letter_type_id ON letter_requests
FOR EACH ROW EXECUTE FUNCTION enforce_letter_request_tenant_links();

CREATE TRIGGER tenant_dependent_guard_letter_requests
BEFORE UPDATE OF tenant_id ON letter_requests
FOR EACH ROW EXECUTE FUNCTION enforce_letter_request_tenant_dependents();

CREATE TRIGGER tenant_link_guard_letter_approvals
BEFORE INSERT OR UPDATE OF tenant_id, letter_request_id, approver_id ON letter_approvals
FOR EACH ROW EXECUTE FUNCTION enforce_letter_approval_tenant_links();

CREATE TRIGGER tenant_link_guard_letter_number_sequences
BEFORE INSERT OR UPDATE OF tenant_id, letter_type_id ON letter_number_sequences
FOR EACH ROW EXECUTE FUNCTION enforce_letter_number_sequence_tenant_links();

CREATE TRIGGER tenant_dependent_guard_letter_types
BEFORE UPDATE OF tenant_id ON letter_types
FOR EACH ROW EXECUTE FUNCTION enforce_letter_type_tenant_dependents();

CREATE TRIGGER tenant_dependent_guard_users_letter_links
BEFORE UPDATE OF tenant_id ON users
FOR EACH ROW EXECUTE FUNCTION enforce_user_letter_tenant_dependents();

CREATE TRIGGER tenant_dependent_guard_residents_letter_links
BEFORE UPDATE OF tenant_id ON residents
FOR EACH ROW EXECUTE FUNCTION enforce_resident_letter_tenant_dependents();

ALTER TABLE letter_approvals
  ADD CONSTRAINT letter_approvals_approver_id_fkey
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL;
