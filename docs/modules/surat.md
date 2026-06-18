# Module: Surat

Purpose: manage village document requests from citizen or operator, including PDF generation and public verification.

Users: warga, operator_desa, kaur_umum, sekretaris_desa, kepala_desa, admin_desa.

Tables: letter_types, letter_templates, letter_requests, letter_request_files, letter_approvals, letter_outputs, letter_number_sequences, files.

Main screens: request list, request detail, create request, template manager, approval stepper, PDF download, public verification.

Permissions: letters.read, letters.create, letters.verify, letters.approve, letters.reject, letters.generate, letters.download, letters.manage.

## Workflow

1. Operator/warga membuat permohonan (`submitted`).
2. Verifikasi (`verified`) atau ditolak.
3. Persetujuan kepala/sekretaris (`approved`) atau ditolak.
4. Generate PDF (`completed`) — nomor surat, QR, file PDF di MinIO.
5. Download PDF (signed URL, audit log).
6. Publik verifikasi via QR/kode di `/verifikasi-surat`.

## PDF generation

- Library: `pdfkit` + `qrcode` (API).
- Data sumber: profil desa (`villages`), template aktif (`letter_templates`), pemohon (`residents`), setting `letters.signatory`.
- Output: PDF binary disimpan ke MinIO (`{tenantId}/letters/{requestId}/{nomor}.pdf`), metadata di `files`, referensi di `letter_outputs.file_id`.
- Placeholder template: `{{nama_desa}}`, `{{nama_pemohon}}`, `{{nik}}`, `{{keperluan}}`, dll.

## API endpoints

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| POST | `/api/v1/letter-requests/:id/generate-pdf` | JWT | letters.generate |
| GET | `/api/v1/letter-requests/:id/download` | JWT | letters.download |
| GET | `/api/v1/letters/verify/:qrCode` | Public | — |

## Audit log actions

- `generate` — saat PDF dibuat
- `download` — saat signed URL diberikan
- `verify` — saat publik memverifikasi kode (tanpa actor)

## Configuration

Setting `letters.signatory` (JSON):

```json
{ "name": "Nama Pejabat", "title": "Kepala Desa" }
```

Env `APP_URL` dipakai untuk link verifikasi di QR code.

Done when: request can be created, checked, approved, numbered, generated as real PDF, downloaded, verified publicly, and logged.
