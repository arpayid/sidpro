# SIDPRO AI Provider Handoff Protocol

Dokumen ini adalah kontrak kerja untuk operator manusia dan semua AI provider/agent yang menyentuh repository SIDPRO. Tujuannya adalah mencegah pekerjaan audit, bug, atau hardening diulang karena context chat berbeda.

## Prinsip

- Git repository adalah sumber bukti; chat hanya konteks sementara.
- `docs/ROADMAP.md`, `AUDIT_MASTER_REGISTER.md`, `AUDIT_CLI_HANDOFF.json`, dan `AUDIT_CHANGELOG.md` adalah titik masuk wajib untuk pekerjaan audit/hardening.
- Provider baru tidak boleh mengubah status, menutup issue, atau mengulang scope tanpa memeriksa evidence terbaru.
- Bukti selalu lebih penting daripada klaim provider: verifikasi terhadap commit, PR, CI, artifact, dan environment evidence.
- Tidak ada secret, PII, cookie, access token, refresh token, atau URL bercredential pada prompt, issue, PR, log, atau evidence.

## Protokol Mulai Kerja

Sebelum menganalisis atau mengubah apa pun, provider wajib:

1. Baca `docs/ROADMAP.md` dan `docs/audits/AUDIT_MASTER_REGISTER.md`.
2. Baca `docs/audits/AUDIT_CLI_HANDOFF.json` untuk marker, priority, execution mode, dan next action.
3. Baca entry terbaru yang relevan di `docs/audits/AUDIT_CHANGELOG.md`.
4. Periksa issue/PR yang disebut pada entry; bedakan `Resolved in Source`, `Validation Pending`, `Blocked by Environment`, dan `Closed`.
5. Tulis atau gunakan `TRACE-ID` yang konsisten, misalnya `AUDIT-4-SESSION-STAGING`, `AUDIT-6-ROLE-JOURNEY`, atau `BUG-COMPLAINT-UPLOAD-2026-06`.

Provider harus berhenti dari scope yang sudah `Closed`, kecuali membawa evidence regresi baru. Provider harus melanjutkan `Validation Pending` dari next action yang terdokumentasi, bukan mengimplementasikan ulang source remediation.

## State Machine Pekerjaan

```text
Planned
  → In Progress
  → Resolved in Source
  → Validation Pending
  → Closed

Planned / In Progress
  → Blocked by Environment
  → Validation Pending (saat prerequisite tersedia)

Planned / In Progress
  → Deferred (non-blocking)
```

`Resolved in Source` tidak sama dengan `Closed`. `Validation Pending` berarti source/CI sudah ada, tetapi evidence nyata masih dibutuhkan. `Blocked by Environment` wajib menyebut environment, fixture, akses, atau keputusan yang hilang.

## Handoff Record Minimum

Setiap PR atau issue material harus menyebut:

| Field | Isi wajib |
| --- | --- |
| Trace ID | ID pekerjaan yang stabil antar-provider. |
| Scope | Audit/module/route/issue yang disentuh. |
| Status before → after | Gunakan vocabulary pada Audit Change Ledger. |
| Baseline | Branch/commit/PR atau deployment yang menjadi titik mulai. |
| Change | Perubahan, keputusan, atau validasi yang dilakukan. |
| Evidence | Test, workflow, artifact, screenshot/log tersanitasi, atau runbook. |
| Remaining action | Satu aksi berikutnya yang konkret dan dapat diverifikasi. |
| Execution mode | `REPO_DOCS`, `REPO_CI_READY`, `VPS_REQUIRED`, atau `HUMAN_UAT_REQUIRED`. |
| Documentation | Path yang diperbarui atau alasan `No roadmap impact`. |
| Secrets/PII | Konfirmasi bahwa tidak ada yang direkam. |

## Aturan untuk PR

Gunakan template PR. Bagian `Roadmap Impact` dan `Change Trace` wajib diisi, bahkan bila perubahan tidak berdampak pada roadmap. Untuk perubahan audit/material, update dokumen detail, master register, roadmap, handoff, dan ledger dalam PR yang sama sesuai scope.

PR yang hanya mengubah code tetapi menggeser status audit, priority, blocker, atau next action tanpa pembaruan dokumentasi dianggap belum lengkap.

## Aturan untuk Staging dan Production

- Catat commit/deployment, URL tanpa kredensial, browser/version, viewport, role/tenant fixture, hasil, dan rollback/remaining risk.
- Simpan hanya evidence tersanitasi. Redact cookie, token, authorization header, email, nomor penduduk, dan data pribadi.
- Jangan menutup issue staging dari CI atau Docker smoke. CI hanya membuktikan kontrol repository/ephemeral environment.
- Gunakan issue #112 untuk session/security staging, #108 untuk frontend/browser validation, dan #110 untuk automation setelah kontrak manual stabil.

## Konflik atau Temuan Baru

Bila provider menemukan informasi yang bertentangan:

1. Jangan overwrite dokumen lama secara diam-diam.
2. Tambahkan entry baru di Audit Change Ledger yang menyebut trace ID sebelumnya.
3. Buat issue atau PR kecil dengan scope sempit bila ada regresi/finding baru.
4. Perbarui `nextAction` pada handoff bila urutan kerja berubah.

## Completion Checklist

Sebelum menyerahkan pekerjaan ke provider lain:

- [ ] Semua perubahan dibuktikan oleh commit/PR.
- [ ] CI/test relevan dicatat.
- [ ] Status issue/PR tidak diklaim lebih tinggi daripada evidence.
- [ ] Ledger dan dokumen terdampak diperbarui.
- [ ] Handoff memiliki satu next action yang jelas.
- [ ] Tidak ada secret atau PII di evidence.
