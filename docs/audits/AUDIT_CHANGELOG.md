# SIDPRO Audit Change Ledger

Ledger ini adalah riwayat append-only untuk perubahan audit yang material. Gunakan sebagai sumber handoff sebelum agent/provider memulai kerja. Ia tidak menggantikan Git history, PR, atau workflow CI; setiap entry harus menunjuk bukti tersebut.

## Aturan Penggunaan

1. Tambahkan entry pada PR yang sama untuk setiap completion, mitigation, status change, blocker environment, rollout, rollback, atau validasi staging/production.
2. Jangan hapus entry lama. Koreksi dengan entry baru yang menyebut ID entry sebelumnya.
3. Status `Closed` hanya boleh dipakai setelah closure evidence dapat ditautkan.
4. Nama provider/agent adalah metadata provenance, bukan bukti kebenaran. Selalu verifikasi terhadap commit, PR, workflow, dan evidence.
5. Jangan menulis secret, URL bercredential, cookie, access token, refresh token, data penduduk, atau PII.

## Status Vocabulary

| Status | Arti |
| --- | --- |
| `Planned` | Scope sudah disetujui, pekerjaan belum dimulai. |
| `In Progress` | Ada perubahan aktif yang belum tervalidasi/merged. |
| `Validation Pending` | Implementasi merged, tetapi evidence yang disyaratkan belum tersedia. |
| `Blocked by Environment` | Tidak dapat dilanjutkan tanpa environment, data fixture, akses, atau keputusan eksternal yang disebutkan. |
| `Resolved in Source` | Temuan telah dimitigasi oleh code/test/CI, tetapi tidak mengklaim staging/production. |
| `Closed` | Scope dan closure evidence lengkap serta direkonsiliasi. |
| `Deferred` | Bukan blocker saat ini; entry harus menyebut kriteria kapan dibuka kembali. |

## Entry Template

```md
### YYYY-MM-DD — <TRACE-ID> — <judul singkat>

- Status: `<status sebelum>` → `<status sesudah>`
- Scope: <audit/module/issue>
- Change: <apa yang diubah atau diputuskan>
- Evidence: <PR, commit, workflow, test, artifact, runbook>
- Remaining / next action: <aksi terverifikasi berikutnya>
- Execution mode: `REPO_DOCS` | `REPO_CI_READY` | `VPS_REQUIRED` | `HUMAN_UAT_REQUIRED`
- Provider / operator: <opsional; hanya provenance>
- Secrets/PII: `None recorded`
```

## Entries

### 2026-06-29 — AUDIT-4-SESSION-BOUNDARY — Browser refresh credential boundary

- Status: `In Progress` → `Validation Pending`
- Scope: AUDIT-4; issue #105 closed; issue #112 open.
- Change: Browser-persisted refresh token dan JavaScript-readable route cookie diganti dengan rotating host-only `HttpOnly` refresh session cookie. Access token dan profile tetap hanya di memori tab; refresh/logout tidak lagi memakai body refresh token.
- Evidence: PR #115 merge `474901eb92e8094b2f1b51bd7c0f4068c728d8a0`; security/session controller/cookie/browser policy regression tests; `AUDIT-4-SESSION-BOUNDARY.md`.
- Remaining / next action: Jalankan issue #112 pada persistent HTTPS staging di balik reverse proxy/CDN target; simpan evidence yang telah disanitasi.
- Execution mode: `VPS_REQUIRED`
- Provider / operator: `Repository reconciliation`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-2-MAINTAINABILITY-TRIAGE — Email fallback dan triage hotspot

- Status: `In Progress` → `Validation Pending`
- Scope: AUDIT-2; issue #107 closed; issue #111 deferred/non-blocking.
- Change: Hotspot maintainability dan console signal diklasifikasikan; worker production tanpa SMTP memakai no-delivery adapter dan hanya menulis event tersanitasi, bukan penerima/subjek/isi email.
- Evidence: PR #116 merge `ee9d13e41bdd6a2f0623ad5c58808b120eca2e9a`; AUDIT-2 baseline workflow, Security Audit, CI, dan `apps/worker/test/email-factory.test.ts`.
- Remaining / next action: Bandingkan artifact maintainability schema-v2 dengan satu trend berikutnya. Buka #111 hanya untuk refactor yang sempit, test-backed, dan tidak mengganggu staging gates.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Repository reconciliation`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-6-STAGING-EVIDENCE — Sanitasi artifact network probe

- Status: `Resolved in Source` → `Validation Pending`
- Scope: AUDIT-6 staging probe; issues #108 dan #110 tetap open.
- Change: Artifact probe hanya menyimpan `content-type` serta security-header allowlist. URL dengan user/password ditolak. Self-test CI memastikan `Set-Cookie`, `Authorization`, `Proxy-Authorization`, dan secret contoh tidak masuk evidence.
- Evidence: PR #118 merge `6bc907bc45182049b60d290527b817a5723531d9`; AUDIT-6 Staging Probe, Security Audit, dan CI hijau.
- Remaining / next action: Jalankan probe terhadap persistent staging. Hasil probe tidak menutup #108, #110, atau #112 tanpa browser/staging evidence yang diwajibkan.
- Execution mode: `VPS_REQUIRED`
- Provider / operator: `Repository reconciliation`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-0-ROADMAP-RECONCILIATION — Konsistensi handoff lintas provider

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-0; semua roadmap/register/handoff yang terdampak oleh PR #115/#116/#118.
- Change: Status lama yang masih merujuk #105/#107 direkonsiliasi; ditambahkan ledger, protocol lintas provider, dan trace requirement pada PR.
- Evidence: PR ini; `ROADMAP.md`, `AUDIT_MASTER_REGISTER.md`, `AUDIT_CLI_HANDOFF.*`, dan `ROADMAP_UPDATE_POLICY.md`.
- Remaining / next action: Setiap PR material berikutnya harus menambah entry ledger dan menyinkronkan register/roadmap/handoff bila status atau next action berubah.
- Execution mode: `REPO_DOCS`
- Provider / operator: `Repository reconciliation`
- Secrets/PII: `None recorded`
