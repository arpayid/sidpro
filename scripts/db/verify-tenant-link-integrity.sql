-- Run against staging and production before deploying tenant-link guard migrations.
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

SELECT 'neighborhood_units.hamlet_id', nu.id, nu.tenant_id,
       nu.hamlet_id, h.tenant_id
FROM neighborhood_units nu
LEFT JOIN hamlets h ON h.id = nu.hamlet_id
WHERE h.id IS NULL OR h.tenant_id <> nu.tenant_id

UNION ALL

SELECT 'addresses.hamlet_id', a.id, a.tenant_id,
       a.hamlet_id, h.tenant_id
FROM addresses a
LEFT JOIN hamlets h ON h.id = a.hamlet_id
WHERE a.hamlet_id IS NOT NULL
  AND (h.id IS NULL OR h.tenant_id <> a.tenant_id)

UNION ALL

SELECT 'addresses.neighborhood_unit_id', a.id, a.tenant_id,
       a.neighborhood_unit_id, nu.tenant_id
FROM addresses a
LEFT JOIN neighborhood_units nu ON nu.id = a.neighborhood_unit_id
WHERE a.neighborhood_unit_id IS NOT NULL
  AND (nu.id IS NULL OR nu.tenant_id <> a.tenant_id)

UNION ALL

SELECT 'addresses.neighborhood_unit_hamlet_mismatch', a.id, a.tenant_id,
       a.neighborhood_unit_id, nu.tenant_id
FROM addresses a
JOIN neighborhood_units nu ON nu.id = a.neighborhood_unit_id
WHERE a.hamlet_id IS NOT NULL
  AND a.neighborhood_unit_id IS NOT NULL
  AND nu.hamlet_id <> a.hamlet_id

UNION ALL

SELECT 'residents.family_id', r.id, r.tenant_id,
       r.family_id, f.tenant_id
FROM residents r
LEFT JOIN families f ON f.id = r.family_id
WHERE r.family_id IS NOT NULL
  AND (f.id IS NULL OR f.tenant_id <> r.tenant_id)

UNION ALL

SELECT 'residents.address_id', r.id, r.tenant_id,
       r.address_id, a.tenant_id
FROM residents r
LEFT JOIN addresses a ON a.id = r.address_id
WHERE r.address_id IS NOT NULL
  AND (a.id IS NULL OR a.tenant_id <> r.tenant_id)

UNION ALL

SELECT 'family_members.family_id', fm.id, fm.tenant_id,
       fm.family_id, f.tenant_id
FROM family_members fm
LEFT JOIN families f ON f.id = fm.family_id
WHERE f.id IS NULL OR f.tenant_id <> fm.tenant_id

UNION ALL

SELECT 'family_members.resident_id', fm.id, fm.tenant_id,
       fm.resident_id, r.tenant_id
FROM family_members fm
LEFT JOIN residents r ON r.id = fm.resident_id
WHERE r.id IS NULL OR r.tenant_id <> fm.tenant_id

UNION ALL

SELECT 'civil_events.resident_id', ce.id, ce.tenant_id,
       ce.resident_id, r.tenant_id
FROM civil_events ce
LEFT JOIN residents r ON r.id = ce.resident_id
WHERE r.id IS NULL OR r.tenant_id <> ce.tenant_id

UNION ALL

SELECT 'bumdes_financial_records.unit_id', bfr.id, bfr.tenant_id,
       bfr.unit_id, bu.tenant_id
FROM bumdes_financial_records bfr
LEFT JOIN bumdes_units bu ON bu.id = bfr.unit_id
WHERE bu.id IS NULL OR bu.tenant_id <> bfr.tenant_id

UNION ALL

SELECT 'letter_templates.letter_type_id', lt.id, lt.tenant_id,
       lt.letter_type_id, lty.tenant_id
FROM letter_templates lt
LEFT JOIN letter_types lty ON lty.id = lt.letter_type_id
WHERE lty.id IS NULL OR lty.tenant_id <> lt.tenant_id

UNION ALL

SELECT 'letter_requests.requester_id', lr.id, lr.tenant_id,
       lr.requester_id, u.tenant_id
FROM letter_requests lr
LEFT JOIN users u ON u.id = lr.requester_id
WHERE lr.requester_id IS NOT NULL
  AND (u.id IS NULL OR u.tenant_id IS DISTINCT FROM lr.tenant_id)

UNION ALL

SELECT 'letter_requests.resident_id', lr.id, lr.tenant_id,
       lr.resident_id, r.tenant_id
FROM letter_requests lr
LEFT JOIN residents r ON r.id = lr.resident_id
WHERE lr.resident_id IS NOT NULL
  AND (r.id IS NULL OR r.tenant_id <> lr.tenant_id)

UNION ALL

SELECT 'letter_requests.letter_type_id', lr.id, lr.tenant_id,
       lr.letter_type_id, lty.tenant_id
FROM letter_requests lr
LEFT JOIN letter_types lty ON lty.id = lr.letter_type_id
WHERE lty.id IS NULL OR lty.tenant_id <> lr.tenant_id

UNION ALL

SELECT 'letter_approvals.letter_request_id', la.id, la.tenant_id,
       la.letter_request_id, lr.tenant_id
FROM letter_approvals la
LEFT JOIN letter_requests lr ON lr.id = la.letter_request_id
WHERE lr.id IS NULL OR lr.tenant_id <> la.tenant_id

UNION ALL

SELECT 'letter_approvals.approver_id', la.id, la.tenant_id,
       la.approver_id, u.tenant_id
FROM letter_approvals la
LEFT JOIN users u ON u.id = la.approver_id
WHERE la.approver_id IS NOT NULL
  AND (u.id IS NULL OR u.tenant_id IS DISTINCT FROM la.tenant_id)

UNION ALL

SELECT 'letter_number_sequences.letter_type_id', lns.id, lns.tenant_id,
       lns.letter_type_id, lty.tenant_id
FROM letter_number_sequences lns
LEFT JOIN letter_types lty ON lty.id = lns.letter_type_id
WHERE lty.id IS NULL OR lty.tenant_id <> lns.tenant_id

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
