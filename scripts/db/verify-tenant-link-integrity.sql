-- Run against staging and production before deploying the tenant-link guard migration.
-- Expected result: zero rows.

SELECT 'families.address_id' AS relation, f.id AS source_id, f.tenant_id AS source_tenant_id,
       f.address_id AS reference_id, a.tenant_id AS reference_tenant_id
FROM families f
LEFT JOIN addresses a ON a.id = f.address_id
WHERE f.address_id IS NOT NULL
  AND (a.id IS NULL OR a.tenant_id <> f.tenant_id)

UNION ALL

SELECT 'families.head_resident_id', f.id, f.tenant_id,
       f.head_resident_id, r.tenant_id
FROM families f
LEFT JOIN residents r ON r.id = f.head_resident_id
WHERE f.head_resident_id IS NOT NULL
  AND (r.id IS NULL OR r.tenant_id <> f.tenant_id)

UNION ALL

SELECT 'letter_templates.letter_type_id', lt.id, lt.tenant_id,
       lt.letter_type_id, lty.tenant_id
FROM letter_templates lt
LEFT JOIN letter_types lty ON lty.id = lt.letter_type_id
WHERE lty.id IS NULL OR lty.tenant_id <> lt.tenant_id

UNION ALL

SELECT 'aid_recipients.program_id', ar.id, ar.tenant_id,
       ar.program_id, ap.tenant_id
FROM aid_recipients ar
LEFT JOIN aid_programs ap ON ap.id = ar.program_id
WHERE ap.id IS NULL OR ap.tenant_id <> ar.tenant_id

UNION ALL

SELECT 'aid_recipients.resident_id', ar.id, ar.tenant_id,
       ar.resident_id, r.tenant_id
FROM aid_recipients ar
LEFT JOIN residents r ON r.id = ar.resident_id
WHERE ar.resident_id IS NOT NULL
  AND (r.id IS NULL OR r.tenant_id <> ar.tenant_id)

UNION ALL

SELECT 'aid_recipients.family_id', ar.id, ar.tenant_id,
       ar.family_id, f.tenant_id
FROM aid_recipients ar
LEFT JOIN families f ON f.id = ar.family_id
WHERE ar.family_id IS NOT NULL
  AND (f.id IS NULL OR f.tenant_id <> ar.tenant_id)

UNION ALL

SELECT 'finance_documents.file_id', fd.id, fd.tenant_id,
       fd.file_id, file.tenant_id
FROM finance_documents fd
LEFT JOIN files file ON file.id = fd.file_id
WHERE fd.file_id IS NOT NULL
  AND (file.id IS NULL OR file.tenant_id <> fd.tenant_id)

UNION ALL

SELECT 'gallery_items.file_id', gi.id, gi.tenant_id,
       gi.file_id, file.tenant_id
FROM gallery_items gi
LEFT JOIN files file ON file.id = gi.file_id
WHERE gi.file_id IS NOT NULL
  AND (file.id IS NULL OR file.tenant_id <> gi.tenant_id)

UNION ALL

SELECT 'letter_outputs.letter_request_id', lo.id, lo.tenant_id,
       lo.letter_request_id, lr.tenant_id
FROM letter_outputs lo
LEFT JOIN letter_requests lr ON lr.id = lo.letter_request_id
WHERE lr.id IS NULL OR lr.tenant_id <> lo.tenant_id

UNION ALL

SELECT 'letter_outputs.file_id', lo.id, lo.tenant_id,
       lo.file_id, file.tenant_id
FROM letter_outputs lo
LEFT JOIN files file ON file.id = lo.file_id
WHERE lo.file_id IS NOT NULL
  AND (file.id IS NULL OR file.tenant_id <> lo.tenant_id)

ORDER BY relation, source_id;
