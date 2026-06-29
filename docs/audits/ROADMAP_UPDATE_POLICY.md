# Roadmap Update Policy

Dokumen ini mengatur kapan dan bagaimana roadmap serta register audit SIDPRO harus diperbarui. Tujuannya adalah menjaga status proyek dapat ditelusuri dari perubahan repository, bukan dari ingatan chat atau asumsi.

## Sumber Kebenaran

| Dokumen | Fungsi |
| --- | --- |
| [`docs/ROADMAP.md`](../ROADMAP.md) | Ringkasan status, prioritas, dan blocker audit. |
| [`docs/audits/AUDIT_MASTER_REGISTER.md`](AUDIT_MASTER_REGISTER.md) | Status audit, bukti, batas klaim, dan kriteria closure. |
| [`docs/audits/AUDIT_CHANGELOG.md`](AUDIT_CHANGELOG.md) | Riwayat append-only untuk perubahan material, evidence, dan next action. |
| [`docs/audits/AUDIT_CLI_HANDOFF.json`](AUDIT_CLI_HANDOFF.json) | Queue machine-readable untuk AI provider/operator. |
| [`docs/audits/AI_PROVIDER_HANDOFF_PROTOCOL.md`](AI_PROVIDER_HANDOFF_PROTOCOL.md) | Kontrak koordinasi lintas provider dan state machine pekerjaan. |
| `docs/audits/AUDIT-*.md` | Detail temuan, scope, implementasi, dan validasi audit tertentu. |
| Pull request dan workflow CI | Bukti implementasi dan validasi. |

Bila terdapat perbedaan, detail audit dan bukti PR/CI harus diperiksa terlebih dahulu. `ROADMAP.md` adalah ringkasan, bukan pengganti bukti teknis. Git history adalah sumber canonical untuk revision; provider/agent chat bukan sumber kebenaran.

## Kapan Pembaruan Wajib Dilakukan

Dokumentasi roadmap wajib diperbarui dalam pull request yang sama bila perubahan melakukan satu atau lebih hal berikut:

1. menambah, memperbaiki, atau menutup temuan audit;
2. mengubah status audit atau status temuan;
3. menambah bukti validasi, workflow CI, migration guard, test, runbook, atau observability;
4. menemukan risiko baru, regresi, blocker, atau batasan yang relevan;
5. mengubah scope audit, prioritas, atau syarat closure;
6. mencatat hasil staging/production/restore drill yang sebelumnya belum ada;
7. memindahkan pekerjaan antara `REPO_CI_READY`, `VPS_REQUIRED`, atau `HUMAN_UAT_REQUIRED`.

Bila pull request tidak berdampak pada roadmap, PR tetap harus menyatakan alasan `No roadmap impact` dan mencatat `Change Trace` minimal.

## Format Wajib di Pull Request

Setiap PR yang dibuat atau diedit oleh manusia/provider harus memiliki bagian berikut:

```md
## Roadmap Impact

- Audit: `AUDIT-<number>` atau `None`
- Finding / area:
- Status before:
- Status after:
- Validation evidence:
- Documentation updated:
- No roadmap impact: `N/A` atau alasan singkat

## Change Trace

- Trace ID:
- Execution mode: `REPO_DOCS` | `REPO_CI_READY` | `VPS_REQUIRED` | `HUMAN_UAT_REQUIRED`
- Baseline commit / deployment:
- Remaining action or closure evidence:
- Provider / operator provenance: optional
- Secrets / PII recorded: `None`
```

## Prosedur Pembaruan

### 1. Tentukan audit dan Trace ID

Gunakan scope dalam `AUDIT_MASTER_REGISTER.md`. Satu PR dapat memengaruhi lebih dari satu audit, misalnya release gate dapat berdampak pada AUDIT-7 dan AUDIT-8. Gunakan Trace ID stabil yang dapat dipakai provider berikutnya.

### 2. Perbarui dokumen audit detail

Jika audit memiliki dokumen khusus, perbarui bagian berikut sesuai kebutuhan:

- status;
- finding atau risk;
- implementasi;
- validation evidence;
- pekerjaan tersisa;
- deployment/staging/production evidence.

Jangan menghapus finding lama hanya karena sudah diperbaiki. Ubah statusnya menjadi `Resolved in Source`, `Mitigated`, atau `Accepted`, lalu tautkan bukti.

### 3. Tambahkan entry pada Audit Change Ledger

Untuk setiap perubahan material, tambah entry di `AUDIT_CHANGELOG.md` dengan status before/after, scope, evidence, next action, execution mode, dan konfirmasi tidak ada secret/PII. Jangan menghapus entry lama; gunakan entry koreksi baru bila ada informasi yang berubah.

### 4. Perbarui Master Register dan Handoff

Perbarui status, bukti, batas klaim, kriteria closure, marker, execution mode, atau next action pada `AUDIT_MASTER_REGISTER.md` dan `AUDIT_CLI_HANDOFF.*` bila perubahan bersifat material.

### 5. Perbarui Roadmap Ringkas

Perbarui `docs/ROADMAP.md` bila salah satu hal berikut berubah:

- status audit;
- urutan prioritas;
- blocker;
- klaim readiness;
- rujukan dokumen baru.

### 6. Isi Roadmap Impact dan Change Trace pada PR

Bagian ini wajib diisi meskipun jawabannya `None`. Reviewer harus dapat membedakan perubahan tanpa dampak roadmap dari perubahan yang lupa dicatat.

## Dependabot Exception

PR yang pembuatnya tepat `dependabot[bot]` dikecualikan dari format `Roadmap Impact` dan `Change Trace`, karena body PR tersebut digenerate bot dan bukan handoff manusia/provider. Pengecualian ini sempit: PR Dependabot tetap wajib lolos CI, Security Audit, dan workflow audit yang relevan; major upgrade, perubahan workflow, serta PR gagal tidak boleh di-merge otomatis hanya karena dikecualikan dari format dokumentasi.

Perubahan manual untuk dependency yang dibuat melalui branch manusia/provider tetap tunduk pada format dan gate ini.

## Aturan Status

- `Evidence Partial` tidak boleh dipromosikan ke `Closed` tanpa scope dan closure evidence penuh.
- `In Progress` tidak berarti semua temuan sudah diketahui; temuan baru harus dicatat saat ditemukan.
- `Blocked by Environment` harus menyebut environment/data/akses yang hilang dan bukti yang tertunda.
- `Validation Pending` hanya boleh digunakan bila implementasi sudah ada tetapi evidence yang disyaratkan belum tersedia.
- `Resolved in Source` tidak mengklaim staging/production validation.
- `Closed` harus menyebut dokumen closure, bukti validasi, dan tanggal/commit closure.

## Automation dan Batasannya

PR documentation gate memeriksa heading dan nilai `Roadmap Impact` serta `Change Trace` pada PR manusia/provider. Gate menolak field kosong atau placeholder dan memvalidasi execution mode, tetapi tidak dapat membuktikan ketepatan semantik status atau kualitas evidence. PR Dependabot dikecualikan berdasarkan author yang terverifikasi dan tetap dilindungi CI/security/audit workflows. Reviewer tetap harus memeriksa:

- audit yang dipilih sesuai scope;
- status sebelum/sesudah tidak bertentangan dengan register;
- bukti validasi benar-benar ada;
- dokumen detail, roadmap, handoff, dan ledger konsisten;
- klaim `Closed` memenuhi kriteria closure;
- blocker atau environment limitation tidak disembunyikan;
- provider tidak memasukkan secret atau PII.
