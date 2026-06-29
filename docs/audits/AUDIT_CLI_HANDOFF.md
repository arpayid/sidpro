# AUDIT AI CLI Handoff Queue

Dokumen ini adalah panduan handoff untuk AI CLI, operator, dan VPS persisten. Sumber machine-readable adalah [`AUDIT_CLI_HANDOFF.json`](AUDIT_CLI_HANDOFF.json).

## Marker Standard

Setiap audit yang belum `Closed` memiliki marker dengan format berikut:

```text
[[AI-CLI|<AUDIT-ID>|<STATUS>|<EXECUTION-MODE>]]
```

### Execution Mode

| Mode | Arti |
| --- | --- |
| `REPO_DOCS` | Perubahan evidence dan tata kelola repository. |
| `REPO_CI_READY` | Dapat dimulai sekarang melalui source repository dan CI, tanpa VPS persisten. |
| `VPS_REQUIRED` | Memerlukan VPS/staging persisten; CI lokal/Docker bukan pengganti bukti ini. |
| `HUMAN_UAT_REQUIRED` | Memerlukan peran manusia, acceptance criteria, atau sign-off selain eksekusi teknis. |

## Cara Pakai oleh AI CLI

1. Baca `docs/audits/AUDIT_CLI_HANDOFF.json` dan `docs/ROADMAP.md` sebelum memulai.
2. Pilih marker dengan prioritas `P1` dan mode yang cocok dengan environment yang tersedia.
3. Baca file pada field `entrypoint` sebelum menyentuh source, dependency, database, atau infrastruktur.
4. Untuk `VPS_REQUIRED`, buat bukti versioned: environment target, versi deploy, perintah yang dijalankan, hasil healthcheck, log relevan, rollback/result, dan keterbatasan.
5. Jangan mengubah status menjadi `Closed` tanpa memenuhi kriteria closure di dokumen audit dan memperbarui roadmap/register/handoff pada PR yang sama.

## Queue Saat Ini

| Marker | Prioritas | Next action singkat |
| --- | --- | --- |
| `[[AI-CLI|AUDIT-0|IN_PROGRESS|REPO_DOCS]]` | P3 | Jaga konsistensi register, roadmap, marker, dan bukti audit. |
| `[[AI-CLI|AUDIT-1|VALIDATION_PENDING|VPS_REQUIRED]]` | P1 | Validasi topology web/API/worker, health, queue, storage, dan config pada staging persisten. |
| `[[AI-CLI|AUDIT-2|IN_PROGRESS|REPO_CI_READY]]` | P1 | Coverage baseline kedua, critical-path expectation, dan assessment maintainability. |
| `[[AI-CLI|AUDIT-3|EVIDENCE_PARTIAL|REPO_CI_READY]]` | P1 | Endpoint/controller inventory dan audit domain/API berisiko tinggi. |
| `[[AI-CLI|AUDIT-4|EVIDENCE_PARTIAL|REPO_CI_READY]]` | P2 | Threat model dan inventory public endpoint/security controls. |
| `[[AI-CLI|AUDIT-5|VALIDATION_PENDING|VPS_REQUIRED]]` | P1 | Query plan nyata, preflight historis, cross-tenant negative test, dan recovery drill. |
| `[[AI-CLI|AUDIT-6|NOT_FORMALLY_ASSESSED|REPO_CI_READY]]` | P2 | Inventory dan audit frontend/responsiveness/accessibility. |
| `[[AI-CLI|AUDIT-7|EVIDENCE_PARTIAL|VPS_REQUIRED]]` | P1 | Deploy, rollback, service supervision, secret, dan observability pada environment persisten. |
| `[[AI-CLI|AUDIT-8|EVIDENCE_PARTIAL|VPS_REQUIRED]]` | P1 | Restore drill PostgreSQL dan object storage beserta RPO/RTO evidence. |
| `[[AI-CLI|AUDIT-9|NOT_FORMALLY_ASSESSED|VPS_REQUIRED]]` | P2 | Target workload lalu benchmark API, export, queue, dan kapasitas staging. |
| `[[AI-CLI|AUDIT-10|EVIDENCE_PARTIAL|HUMAN_UAT_REQUIRED]]` | P2 | UAT roles, skenario acceptance, cutover, training, dan sign-off. |

## Urutan Rekomendasi

### Dapat dikerjakan sekarang tanpa VPS

1. `[[AI-CLI|AUDIT-3|EVIDENCE_PARTIAL|REPO_CI_READY]]`
2. `[[AI-CLI|AUDIT-2|IN_PROGRESS|REPO_CI_READY]]`
3. `[[AI-CLI|AUDIT-4|EVIDENCE_PARTIAL|REPO_CI_READY]]`
4. `[[AI-CLI|AUDIT-6|NOT_FORMALLY_ASSESSED|REPO_CI_READY]]`

### Dikerjakan segera setelah VPS/staging tersedia

1. `[[AI-CLI|AUDIT-1|VALIDATION_PENDING|VPS_REQUIRED]]`
2. `[[AI-CLI|AUDIT-5|VALIDATION_PENDING|VPS_REQUIRED]]`
3. `[[AI-CLI|AUDIT-7|EVIDENCE_PARTIAL|VPS_REQUIRED]]`
4. `[[AI-CLI|AUDIT-8|EVIDENCE_PARTIAL|VPS_REQUIRED]]`
5. `[[AI-CLI|AUDIT-9|NOT_FORMALLY_ASSESSED|VPS_REQUIRED]]`

## VPS Preflight Minimum

Sebelum AI CLI menjalankan audit `VPS_REQUIRED`, pastikan tersedia:

- branch/commit yang akan diuji;
- staging terpisah dari production;
- backup database dan object storage yang terverifikasi;
- environment variables/secrets yang tidak dicetak ke log;
- domain atau akses internal untuk healthcheck;
- rollback plan dan service manager yang jelas;
- lokasi penyimpanan evidence yang akan di-commit atau ditautkan ke PR.

## Non-Claims

Marker ini membantu urutan dan handoff pekerjaan. Ia tidak menggantikan validasi teknis, reviewer manusia, baseline keamanan, atau bukti staging/production.
