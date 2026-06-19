# Post-MVP Roadmap

Dokumen ringkas untuk modul lanjutan SIDPRO setelah MVP core stabil.

## GIS / Peta Desa

- Layer peta: batas desa, dusun/RT/RW, aset, titik pembangunan.
- Integrasi tile server (self-hosted atau provider) via adapter.
- RBAC: operator input geometri, admin approve publish ke portal.

## Multi-tenant Kabupaten

- Hierarki: kabupaten → kecamatan → desa (tenant tree).
- Role `admin_kabupaten`: dashboard agregat, read-only lintas desa.
- Scope data wajib filter `tenant_id` + parent tenant.

## BUMDes

- Entitas unit usaha desa terpisah dari APBDes.
- Laporan keuangan BUMDes, anggota, dan aset operasional.
- Audit log untuk mutasi sensitif.

## AI Assistant

- Fase setelah auth, RBAC, audit log, dan backup stabil.
- Use case awal: FAQ layanan surat, ringkasan pengaduan (non-PII).
- Wajib adapter eksplisit; tidak menyimpan NIK/KK ke provider eksternal tanpa consent.

## Keamanan Enterprise (berlanjut)

- 2FA wajib admin: kebijakan tenant `security.require_2fa_admin` (Wave 9).
- Rotasi refresh token, rate limit endpoint publik, export audit.
- Hardening staging/production checklist di `docs/SECURITY_CHECKLIST.md`.
