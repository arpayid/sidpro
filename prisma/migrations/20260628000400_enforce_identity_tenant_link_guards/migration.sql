-- AUDIT-5: protect identity and complaint relationships at the database boundary.
--
-- This migration extends tenant-link enforcement to identity-bearing references
-- that do not carry a tenant_id themselves. It preserves explicit system scope:
-- a global user may only hold a global role, and a tenant user may only hold a
-- role from the same tenant. Run scripts/db/verify-tenant-link-integrity.sql
-- before deployment against databases with existing data.

CREATE OR REPLACE FUNCTION assert_exact_tenant_identity_link(
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
  reference_found boolean := false;
BEGIN
  IF p_reference_id IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('SELECT tenant_id, TRUE FROM %s WHERE id = $1', p_reference_table)
    INTO linked_tenant_id, reference_found
    USING p_reference_id;

  IF NOT COALESCE(reference_found, false) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = format('%s references a missing identity record', p_reference_label);
  END IF;

  IF linked_tenant_id IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = format('%s must reference an identity in the same tenant scope', p_reference_label);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION assert_user_role_tenant_link(
  p_user_id text,
  p_role_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  user_tenant_id text;
  role_tenant_id text;
  user_found boolean := false;
  role_found boolean := false;
BEGIN
  SELECT tenant_id, TRUE
    INTO user_tenant_id, user_found
  FROM users
  WHERE id = p_user_id;

  IF NOT COALESCE(user_found, false) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'user_roles.user_id references a missing user';
  END IF;

  SELECT tenant_id, TRUE
    INTO role_tenant_id, role_found
  FROM roles
  WHERE id = p_role_id;

  IF NOT COALESCE(role_found, false) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'user_roles.role_id references a missing role';
  END IF;

  IF user_tenant_id IS DISTINCT FROM role_tenant_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'user_roles.user_id and user_roles.role_id must have the same tenant scope';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION assert_complaint_response_tenant_link(
  p_complaint_id text,
  p_responder_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  complaint_tenant_id text;
  complaint_found boolean := false;
BEGIN
  SELECT tenant_id, TRUE
    INTO complaint_tenant_id, complaint_found
  FROM complaints
  WHERE id = p_complaint_id;

  IF NOT COALESCE(complaint_found, false) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'complaint_responses.complaint_id references a missing complaint';
  END IF;

  PERFORM assert_exact_tenant_identity_link(
    complaint_tenant_id,
    p_responder_id,
    'users',
    'complaint_responses.responder_id'
  );
END;
$$;

CREATE OR REPLACE FUNCTION assert_no_complaint_response_identity_mismatch(
  p_complaint_id text,
  p_complaint_tenant_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  has_mismatch boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM complaint_responses cr
    LEFT JOIN users u ON u.id = cr.responder_id
    WHERE cr.complaint_id = p_complaint_id
      AND cr.responder_id IS NOT NULL
      AND (u.id IS NULL OR u.tenant_id IS DISTINCT FROM p_complaint_tenant_id)
  )
    INTO has_mismatch;

  IF has_mismatch THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'complaint tenant scope conflicts with an existing response responder';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION is_tenant_being_deleted(p_tenant_id text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  tenant_still_exists boolean;
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id)
    INTO tenant_still_exists;

  RETURN NOT tenant_still_exists;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_user_role_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_user_role_tenant_link(NEW.user_id, NEW.role_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_user_identity_tenant_links()
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
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = NEW.id
      AND r.tenant_id IS DISTINCT FROM NEW.tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'users.tenant_id cannot change while user_roles have a different tenant scope';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM notifications n
    WHERE n.user_id = NEW.id
      AND n.tenant_id IS DISTINCT FROM NEW.tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'users.tenant_id cannot change while notifications have a different tenant scope';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM complaints c
    WHERE (c.reporter_id = NEW.id OR c.assignee_id = NEW.id)
      AND c.tenant_id IS DISTINCT FROM NEW.tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'users.tenant_id cannot change while complaints reference the user from a different tenant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM complaint_responses cr
    JOIN complaints c ON c.id = cr.complaint_id
    WHERE cr.responder_id = NEW.id
      AND c.tenant_id IS DISTINCT FROM NEW.tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'users.tenant_id cannot change while complaint responses reference the user from a different tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_role_identity_tenant_links()
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
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.role_id = NEW.id
      AND u.tenant_id IS DISTINCT FROM NEW.tenant_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'roles.tenant_id cannot change while user_roles have a different tenant scope';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_notification_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_exact_tenant_identity_link(
    NEW.tenant_id,
    NEW.user_id,
    'users',
    'notifications.user_id'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_complaint_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_exact_tenant_identity_link(
    NEW.tenant_id,
    NEW.reporter_id,
    'users',
    'complaints.reporter_id'
  );
  PERFORM assert_exact_tenant_identity_link(
    NEW.tenant_id,
    NEW.assignee_id,
    'users',
    'complaints.assignee_id'
  );
  PERFORM assert_no_complaint_response_identity_mismatch(NEW.id, NEW.tenant_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_complaint_response_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_complaint_response_tenant_link(NEW.complaint_id, NEW.responder_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenant_identity_link_guard_user_roles
BEFORE INSERT OR UPDATE OF user_id, role_id ON user_roles
FOR EACH ROW EXECUTE FUNCTION enforce_user_role_tenant_links();

CREATE TRIGGER tenant_identity_dependent_guard_users
BEFORE UPDATE OF tenant_id ON users
FOR EACH ROW EXECUTE FUNCTION enforce_user_identity_tenant_links();

CREATE TRIGGER tenant_identity_dependent_guard_roles
BEFORE UPDATE OF tenant_id ON roles
FOR EACH ROW EXECUTE FUNCTION enforce_role_identity_tenant_links();

CREATE TRIGGER tenant_identity_link_guard_notifications
BEFORE INSERT OR UPDATE OF tenant_id, user_id ON notifications
FOR EACH ROW EXECUTE FUNCTION enforce_notification_tenant_links();

CREATE TRIGGER tenant_identity_link_guard_complaints
BEFORE INSERT OR UPDATE OF tenant_id, reporter_id, assignee_id ON complaints
FOR EACH ROW EXECUTE FUNCTION enforce_complaint_tenant_links();

CREATE TRIGGER tenant_identity_link_guard_complaint_responses
BEFORE INSERT OR UPDATE OF complaint_id, responder_id ON complaint_responses
FOR EACH ROW EXECUTE FUNCTION enforce_complaint_response_tenant_links();

ALTER TABLE complaint_responses
  ADD CONSTRAINT complaint_responses_responder_id_fkey
  FOREIGN KEY (responder_id) REFERENCES users(id) ON DELETE SET NULL;