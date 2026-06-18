# Module: Complaints (Pengaduan)

Purpose: manage citizen complaints from submission to resolution.

Users: admin_desa, operator_desa, sekretaris_desa, kepala_desa.

Admin UI: `/admin/pengaduan` (permission `complaints.read`).

Public form: `/pengaduan` → `POST /complaints/public?tenantCode={NEXT_PUBLIC_TENANT_CODE|demo-desa}`.

Response includes complaint `id` — shown to citizen as ticket reference (`PGD-{id prefix}`).

## End-to-end flow

```txt
1. Warga mengisi form di /pengaduan
2. API membuat complaint status=submitted
3. Admin melihat di /admin/pengaduan
4. Admin verifikasi → assign petugas → tanggapan → selesai → tutup
5. Lampiran dapat diunggah admin via POST /files/upload (ownerType=complaint)
```

## Workflow

```txt
submitted (Masuk)
→ verified (Diverifikasi)
→ assigned (Ditugaskan)
→ in_progress (Diproses)
→ resolved (Selesai)
→ closed (Ditutup)

Alternative: rejected (Ditolak) from most active states
```

## Permissions

- `complaints.read` — list, detail, download attachments
- `complaints.create` — create admin / upload files
- `complaints.update` — verify, status transitions (non-close)
- `complaints.assign` — assign petugas
- `complaints.respond` — add response / timeline notes
- `complaints.close` — reject or close

Done when: admin can filter, assign, respond, update status, view timeline, and actions are audit-logged.
