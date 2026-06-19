# 2FA Rollout — Admin SIDPRO

Panduan aktivasi 2FA wajib untuk admin desa/kabupaten di staging dan production.

## Kebijakan

- Setting tenant: `security.require_2fa_admin` (boolean)
- Bila aktif, admin tanpa 2FA diarahkan ke **enrollment TOTP** saat login berikutnya
- Admin dengan 2FA aktif wajib memasukkan kode authenticator setiap login
- Token `twoFactorToken` (pending) **tidak** dapat mengakses route JWT lain

## Staging rollout (disarankan)

1. Deploy versi terbaru (`mvp-security-v4` atau lebih baru)
2. Login sebagai admin desa → **Pengaturan** → aktifkan toggle **Wajib 2FA untuk semua admin**
3. Uji dengan akun admin baru:
   - Login → redirect enrollment QR
   - Scan dengan Google Authenticator / Authy
   - Masukkan kode 6 digit → sesi normal terbentuk
4. Verifikasi admin existing tanpa 2FA dipaksa enrollment pada login berikutnya
5. Dokumentasikan recovery: superadmin dapat reset `twoFaEnabled` / `twoFaSecret` via DB bila perangkat hilang

## Environment

Tidak ada env khusus 2FA. Kebijakan disimpan di tabel `settings` per tenant.

## Nonaktivasi 2FA

- Bila kebijakan wajib aktif, admin **tidak dapat** menonaktifkan 2FA dari UI
- Superadmin/system: nonaktifkan kebijakan dulu, atau reset via DB untuk kasus darurat

## Checklist go-live

- [ ] `security.require_2fa_admin` diaktifkan di staging
- [ ] Semua admin desa sudah enrollment
- [ ] Prosedur recovery device loss terdokumentasi
- [ ] Backup codes / kontak superadmin tersedia

Lihat juga: `docs/SECURITY_CHECKLIST.md`, `apps/web/src/components/auth/two-fa-settings.tsx`
