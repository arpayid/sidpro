# Staging — Runbook Stabilitas 2 Minggu

Proses operasional setelah deploy staging (Wave 25). Tidak otomatis di workspace dev — dijalankan di server staging.

## Hari 0 — Go-live staging

- [ ] Deploy tag stabil terbaru (`mvp-staging-v2` atau lebih baru)
- [ ] `./scripts/staging-readiness.sh` → semua PASS
- [ ] `STAGING_ADMIN_PASSWORD='...' ./scripts/smoke-test.sh` → PASS
- [ ] Backup drill: `pnpm backup` + verifikasi file

## Hari 1–3 — Security hardening

- [ ] Aktifkan `security.require_2fa_admin` (Pengaturan admin desa)
- [ ] Semua admin desa/kabupaten/kecamatan enrollment 2FA
- [ ] Verifikasi login warga & endpoint publik tidak terpengaruh
- [ ] Review `docs/SECURITY_CHECKLIST.md` — tidak ada item P1 terbuka

## Minggu 1 — Observasi

- [ ] CI `main` hijau setiap merge
- [ ] Smoke manual 1× setelah setiap release tag
- [ ] Monitor audit log untuk export data sensitif
- [ ] Tidak ada restore/backup gagal

## Minggu 2 — Sign-off

- [ ] Ulangi smoke + backup drill
- [ ] Dokumentasikan incident (jika ada) di `docs/OPERATIONS.md`
- [ ] Tandai stabil → lanjut Post-MVP penuh (Wave 28+)

## Escalation

| Severity | Contoh | Tindakan |
|----------|--------|----------|
| P1 | Data warga bocor, auth bypass | Rollback tag + freeze merge |
| P2 | Smoke fail, backup gagal | Hotfix branch + re-smoke |
| P3 | UI polish | Backlog wave berikutnya |
