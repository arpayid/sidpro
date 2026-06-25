# Module: Complaints (Pengaduan)

Purpose: manage citizen complaints from submission to resolution.

Users: admin_desa, operator_desa, sekretaris_desa, kepala_desa.

Admin UI: `/admin/pengaduan` (permission `complaints.read`).

Public form: `/pengaduan` → `POST /complaints/public?tenantCode={NEXT_PUBLIC_TENANT_CODE|demo-desa}`.

Public tracking: `/pengaduan/cek` → `POST /complaints/public/track?tenantCode={tenantCode}` with ticket (`PGD-{8 char UUID prefix}`) + reporter phone.

Response includes complaint `id` — shown to citizen as ticket reference (`PGD-{id prefix}`).

## End-to-end flow

```txt
1. Warga mengisi form di /pengaduan
2. API membuat complaint status=submitted
3. Warga menyimpan nomor tiket PGD-* dan dapat cek status di /pengaduan/cek
4. Admin melihat di /admin/pengaduan
5. Admin verifikasi → assign petugas → tanggapan → selesai → tutup
6. Lampiran dapat diunggah admin via POST /files/upload (ownerType=complaint)
7. Saat status berubah, email notifikasi dikirim ke reporterEmail via BullMQ queue `notifications` (job `complaint-status-email`)
```

## Email notifications (NT.4.2)

- Trigger: status change via `PATCH /complaints/:id/status`, assign, atau respond yang mengubah status
- Queue: BullMQ `notifications` → worker memproses job `complaint-status-email`
- Adapter: `console` (default, log ke stdout) atau `smtp` bila `SMTP_HOST` dikonfigurasi
- Env wajib untuk queue: `REDIS_URL`. Env email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`; bila `SMTP_HOST` tidak diset, worker memakai fallback console adapter dan menulis email ke stdout. `APP_URL` dipakai untuk link pelacakan. Lihat `.env.example`.

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
