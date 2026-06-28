-- Included by verify-tenant-link-integrity.sql.
-- Expected result: zero rows.

SELECT 'user_roles.role_id' AS relation, ur.user_id AS source_id, u.tenant_id AS source_tenant_id,
       ur.role_id AS reference_id, r.tenant_id AS reference_tenant_id
FROM user_roles ur
LEFT JOIN users u ON u.id = ur.user_id
LEFT JOIN roles r ON r.id = ur.role_id
WHERE u.id IS NULL
   OR r.id IS NULL
   OR u.tenant_id IS DISTINCT FROM r.tenant_id

UNION ALL

SELECT 'notifications.user_id', n.id, n.tenant_id,
       n.user_id, u.tenant_id
FROM notifications n
LEFT JOIN users u ON u.id = n.user_id
WHERE u.id IS NULL
   OR n.tenant_id IS DISTINCT FROM u.tenant_id

UNION ALL

SELECT 'complaints.reporter_id', c.id, c.tenant_id,
       c.reporter_id, u.tenant_id
FROM complaints c
LEFT JOIN users u ON u.id = c.reporter_id
WHERE c.reporter_id IS NOT NULL
  AND (u.id IS NULL OR c.tenant_id IS DISTINCT FROM u.tenant_id)

UNION ALL

SELECT 'complaints.assignee_id', c.id, c.tenant_id,
       c.assignee_id, u.tenant_id
FROM complaints c
LEFT JOIN users u ON u.id = c.assignee_id
WHERE c.assignee_id IS NOT NULL
  AND (u.id IS NULL OR c.tenant_id IS DISTINCT FROM u.tenant_id)

UNION ALL

SELECT 'complaint_responses.responder_id', cr.id, c.tenant_id,
       cr.responder_id, u.tenant_id
FROM complaint_responses cr
LEFT JOIN complaints c ON c.id = cr.complaint_id
LEFT JOIN users u ON u.id = cr.responder_id
WHERE cr.responder_id IS NOT NULL
  AND (c.id IS NULL OR u.id IS NULL OR c.tenant_id IS DISTINCT FROM u.tenant_id)

ORDER BY relation, source_id;
