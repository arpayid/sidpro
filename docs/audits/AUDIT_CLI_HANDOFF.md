# AUDIT AI CLI Handoff Queue

Dokumen ini adalah panduan handoff untuk AI CLI, operator, dan VPS persisten. Sumber machine-readable adalah [`AUDIT_CLI_HANDOFF.json`](AUDIT_CLI_HANDOFF.json).

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

## Cara Pakai oleh AI CLI

1. Baca manifest JSON dan `docs/ROADMAP.md` sebelum memulai.
2. Pilih marker P1 yang cocok dengan environment tersedia.
3. Baca `entrypoint` sebelum mengubah source, database, atau infrastruktur.
4. Untuk `VPS_REQUIRED`, version-kan environment target, commit/deploy, perintah, hasil healthcheck, sanitized log, rollback/result, dan keterbatasan.
5. Jangan menutup audit tanpa memenuhi kriteria closure serta memperbarui register/roadmap/handoff dalam PR sama.

## Queue Saat Ini

| Marker | Prioritas | Next action singkat |
| --- | --- | --- |
| `[[AI-CLI|AUDIT-0|IN_PROGRESS|REPO_DOCS]]` | P3 | Konsistensi evidence, roadmap, dan marker. |
| `[[AI-CLI|AUDIT-1|VALIDATION_PENDING|VPS_REQUIRED]]` | P1 | Topology web/API/worker, health, queue, storage, config. |
| `[[AI-CLI|AUDIT-2|IN_PROGRESS|REPO_CI_READY]]` | P1 | Coverage kedua, critical-path expectation, maintainability. |
| `[[AI-CLI|AUDIT-3|VALIDATION_PENDING|VPS_REQUIRED]]` | P1 | Authorization, tenant, retry/concurrency, abuse, proxy rate-limit. |
| `[[AI-CLI|AUDIT-4|IN_PROGRESS|REPO_CI_READY]]` | P1 | Pilih dan implementasikan HttpOnly session boundary pada #105; kemudian validasi ingress security di staging. |
| `[[AI-CLI|AUDIT-5|VALIDATION_PENDING|VPS_REQUIRED]]` | P1 | Query plan, historical preflight, cross-tenant, recovery drill. |
| `[[AI-CLI|AUDIT-6|NOT_FORMALLY_ASSESSED|REPO_CI_READY]]` | P2 | Frontend route/state/accessibility/responsive audit. |
| `[[AI-CLI|AUDIT-7|EVIDENCE_PARTIAL|VPS_REQUIRED]]` | P1 | Deploy, rollback, supervision, secrets, observability. |
| `[[AI-CLI|AUDIT-8|EVIDENCE_PARTIAL|VPS_REQUIRED]]` | P1 | Restore PostgreSQL/object storage dan RPO/RTO evidence. |
| `[[AI-CLI|AUDIT-9|NOT_FORMALLY_ASSESSED|VPS_REQUIRED]]` | P2 | Workload lalu benchmark API/export/queue/capacity. |
| `[[AI-CLI|AUDIT-10|EVIDENCE_PARTIAL|HUMAN_UAT_REQUIRED]]` | P2 | UAT, cutover, training, sign-off. |

## Urutan Rekomendasi

### Dapat dikerjakan sekarang tanpa VPS

1. `[[AI-CLI|AUDIT-4|IN_PROGRESS|REPO_CI_READY]]` — resolve architecture decision issue #105.
2. `[[AI-CLI|AUDIT-2|IN_PROGRESS|REPO_CI_READY]]` — coverage dan maintainability.
3. `[[AI-CLI|AUDIT-6|NOT_FORMALLY_ASSESSED|REPO_CI_READY]]` — inventory dan audit frontend.

### Dikerjakan setelah VPS/staging tersedia

1. `[[AI-CLI|AUDIT-1|VALIDATION_PENDING|VPS_REQUIRED]]`
2. `[[AI-CLI|AUDIT-3|VALIDATION_PENDING|VPS_REQUIRED]]`
3. `[[AI-CLI|AUDIT-4|IN_PROGRESS|REPO_CI_READY]]` setelah #105 siap diuji.
4. `[[AI-CLI|AUDIT-5|VALIDATION_PENDING|VPS_REQUIRED]]`
5. `[[AI-CLI|AUDIT-7|EVIDENCE_PARTIAL|VPS_REQUIRED]]`
6. `[[AI-CLI|AUDIT-8|EVIDENCE_PARTIAL|VPS_REQUIRED]]`
7. `[[AI-CLI|AUDIT-9|NOT_FORMALLY_ASSESSED|VPS_REQUIRED]]`

## VPS Preflight Minimum

- branch/commit target;
- staging terpisah dari production;
- backup database/object storage terverifikasi;
- secrets tidak tercetak ke log;
- akses healthcheck;
- rollback plan/service manager;
- lokasi evidence yang dapat di-commit atau ditautkan ke PR.

## Non-Claims

Marker memudahkan urutan dan handoff; ia tidak menggantikan validasi teknis, reviewer, atau bukti staging/production.
