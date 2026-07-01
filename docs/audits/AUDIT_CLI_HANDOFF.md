# AUDIT AI CLI Handoff Queue

Dokumen ini adalah panduan handoff untuk AI CLI, provider AI lain, operator, dan VPS persisten. Sumber machine-readable adalah [`AUDIT_CLI_HANDOFF.json`](AUDIT_CLI_HANDOFF.json); riwayat keputusan material ada pada [`AUDIT_CHANGELOG.md`](AUDIT_CHANGELOG.md).

## Marker Standard

Setiap audit yang belum `Closed` memiliki marker:

```text
[[AI-CLI|<AUDIT-ID>|<STATUS>|<EXECUTION-MODE>]]
```

| Mode | Arti |
| --- | --- |
| `REPO_DOCS` | Perubahan evidence dan tata kelola repository. |
| `REPO_CI_READY` | Dapat dimulai melalui source repository dan CI, tanpa VPS persisten. |
| `VPS_REQUIRED` | Memerlukan VPS/staging persisten; CI/Docker bukan pengganti bukti ini. |
| `HUMAN_UAT_REQUIRED` | Memerlukan acceptance criteria atau sign-off manusia. |

## Kontrak Lintas Provider

Sebelum bekerja, setiap provider wajib membaca `docs/ROADMAP.md`, `AUDIT_MASTER_REGISTER.md`, manifest JSON ini, entry ledger yang relevan, lalu `entrypoint` audit yang dipilih. Gunakan [AI Provider Handoff Protocol](AI_PROVIDER_HANDOFF_PROTOCOL.md) untuk Trace ID, state machine, bukti, dan aturan sanitasi.

Provider tidak boleh:

- mengulang source remediation yang telah `Resolved in Source` atau `Closed` tanpa bukti regresi baru;
- mengubah `Validation Pending` menjadi `Closed` hanya dari CI atau Docker smoke;
- menulis credential, cookie, token, PII, atau URL bercredential pada repository evidence;
- mengganti status/next action tanpa memperbarui roadmap, register, manifest, dan ledger sesuai scope.

## Cara Pakai oleh AI CLI

1. Baca manifest JSON dan `docs/ROADMAP.md` sebelum memulai.
2. Pilih marker P1 yang cocok dengan environment tersedia.
3. Baca `entrypoint` dan ledger sebelum mengubah source, database, atau infrastruktur.
4. Untuk `VPS_REQUIRED`, version-kan environment target, commit/deploy, perintah, hasil healthcheck, sanitized log, rollback/result, dan keterbatasan.
5. Jangan menutup audit tanpa memenuhi kriteria closure serta memperbarui register/roadmap/handoff/ledger dalam PR sama.

## Queue Saat Ini

| Marker | Prioritas | Next action singkat |
| --- | --- | --- |
| `[[AI-CLI|AUDIT-0|IN_PROGRESS|REPO_DOCS]]` | P3 | Konsistensi evidence, roadmap, marker, ledger, dan handoff lintas provider. |
| `[[AI-CLI|AUDIT-1|VALIDATION_PENDING|VPS_REQUIRED]]` | P1 | Topology web/API/worker, health, queue, storage, config. |
| `[[AI-CLI|AUDIT-2|VALIDATION_PENDING|REPO_CI_READY]]` | P2 | Issue #107 closed; inspeksi artifact schema-v2 dan trend berikutnya sebelum ratchet. |
| `[[AI-CLI|AUDIT-3|VALIDATION_PENDING|VPS_REQUIRED]]` | P1 | Authorization, tenant, retry/concurrency, abuse, proxy rate-limit. |
| `[[AI-CLI|AUDIT-4|VALIDATION_PENDING|VPS_REQUIRED]]` | P1 | Issue #112: HttpOnly session/cookie, CORS/CSRF, ingress/TLS, rate-limit, storage/log, rollback. |
| `[[AI-CLI|AUDIT-5|VALIDATION_PENDING|VPS_REQUIRED]]` | P1 | Query plan, historical preflight, cross-tenant, recovery drill. |
| `[[AI-CLI|AUDIT-6|VALIDATION_PENDING|VPS_REQUIRED]]` | P2 | #108 browser/staging matrix, lalu #110 automation pada journey yang stabil. |
| `[[AI-CLI|AUDIT-7|EVIDENCE_PARTIAL|VPS_REQUIRED]]` | P1 | Jalankan [delivery runbook](AUDIT-7-DEVOPS-DELIVERY.md): deploy, rollback, supervision, secrets, observability. |
| `[[AI-CLI|AUDIT-8|EVIDENCE_PARTIAL|VPS_REQUIRED]]` | P1 | Jalankan [recovery runbook](AUDIT-8-BACKUP-RECOVERY.md): restore PostgreSQL/object storage dan RPO/RTO evidence. |
| `[[AI-CLI|AUDIT-9|NOT_FORMALLY_ASSESSED|VPS_REQUIRED]]` | P2 | Gunakan [workload contract](AUDIT-9-PERFORMANCE-SCALE.md), lalu benchmark API/export/queue/capacity. |
| `[[AI-CLI|AUDIT-10|EVIDENCE_PARTIAL|HUMAN_UAT_REQUIRED]]` | P2 | Gunakan [UAT/cutover runbook](AUDIT-10-UAT-CUTOVER-READINESS.md): UAT, training, sign-off. |

## Audit 7–10 Entry Points

| Audit | Document | Status boundary |
| --- | --- | --- |
| AUDIT-7 | [DevOps and Delivery](AUDIT-7-DEVOPS-DELIVERY.md) | Requires persistent staging delivery, observability, and rollback evidence. |
| AUDIT-8 | [Backup and Recovery](AUDIT-8-BACKUP-RECOVERY.md) | Requires isolated restore drill and observed RPO/RTO. |
| AUDIT-9 | [Performance and Scale](AUDIT-9-PERFORMANCE-SCALE.md) | Requires approved workload and capacity targets before a benchmark claim. |
| AUDIT-10 | [UAT and Cutover Readiness](AUDIT-10-UAT-CUTOVER-READINESS.md) | Requires human acceptance and owner sign-off. |

## Urutan Rekomendasi

### Dapat dikerjakan sekarang tanpa VPS

1. `[[AI-CLI|AUDIT-0|IN_PROGRESS|REPO_DOCS]]` — rekonsiliasi ledger dan dokumen pada setiap perubahan material.
2. `[[AI-CLI|AUDIT-2|VALIDATION_PENDING|REPO_CI_READY]]` — review trend maintainability; #111 bukan blocker dan hanya untuk refactor sempit yang test-backed.

### Dikerjakan setelah VPS/staging tersedia

1. `[[AI-CLI|AUDIT-4|VALIDATION_PENDING|VPS_REQUIRED]]` melalui issue #112.
2. `[[AI-CLI|AUDIT-6|VALIDATION_PENDING|VPS_REQUIRED]]` melalui issue #108.
3. `[[AI-CLI|AUDIT-6|VALIDATION_PENDING|VPS_REQUIRED]]` issue #110 setelah kontrak manual stabil.
4. `[[AI-CLI|AUDIT-1|VALIDATION_PENDING|VPS_REQUIRED]]`.
5. `[[AI-CLI|AUDIT-3|VALIDATION_PENDING|VPS_REQUIRED]]`.
6. `[[AI-CLI|AUDIT-5|VALIDATION_PENDING|VPS_REQUIRED]]`.
7. `[[AI-CLI|AUDIT-7|EVIDENCE_PARTIAL|VPS_REQUIRED]]` melalui delivery runbook.
8. `[[AI-CLI|AUDIT-8|EVIDENCE_PARTIAL|VPS_REQUIRED]]` melalui restore-drill runbook.
9. `[[AI-CLI|AUDIT-9|NOT_FORMALLY_ASSESSED|VPS_REQUIRED]]` setelah workload disetujui.
10. `[[AI-CLI|AUDIT-10|EVIDENCE_PARTIAL|HUMAN_UAT_REQUIRED]]` setelah staging dan peran UAT tersedia.

## VPS Preflight Minimum

- branch/commit target;
- staging terpisah dari production;
- backup database/object storage terverifikasi;
- fixture akun/tenant non-production tersedia;
- secrets tidak tercetak ke log;
- akses healthcheck;
- rollback plan/service manager;
- lokasi evidence yang dapat di-commit atau ditautkan ke PR.

## Non-Claims

Marker memudahkan urutan dan handoff; ia tidak menggantikan validasi teknis, reviewer, atau bukti staging/production.
