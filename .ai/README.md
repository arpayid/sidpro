# SIDPRO AI Skill Pack

Folder ini berisi skill dan workflow operasional untuk AI CLI/coding agent yang bekerja di repositori `sidpro`.

Acuan wajib sebelum bekerja:

```txt
AGENTS.md
docs/SID_ENTERPRISE_BLUEPRINT.md
.ai/README.md
```

Skill pack ini dibuat agar agent tidak bekerja acak. Setiap task harus diklasifikasikan, diarahkan ke skill yang sesuai, lalu dieksekusi melalui workflow yang tepat.

---

## Skill Files

```txt
.ai/skills/00-master-orchestrator.md
.ai/skills/01-audit-skill.md
.ai/skills/02-planning-skill.md
.ai/skills/03-frontend-ui-skill.md
.ai/skills/04-backend-api-skill.md
.ai/skills/05-database-prisma-skill.md
.ai/skills/06-security-rbac-skill.md
.ai/skills/07-testing-validation-skill.md
.ai/skills/08-devops-ci-skill.md
.ai/skills/09-documentation-skill.md
.ai/skills/10-pr-review-skill.md
```

---

## Workflow Files

```txt
.ai/workflows/feature-workflow.md
.ai/workflows/bugfix-workflow.md
.ai/workflows/audit-workflow.md
.ai/workflows/release-workflow.md
```

---

## Default Execution Order

Untuk pekerjaan fitur baru:

```txt
Read AGENTS.md
→ Read docs/SID_ENTERPRISE_BLUEPRINT.md
→ Read .ai/skills/00-master-orchestrator.md
→ Read relevant skill file
→ Read relevant workflow file
→ AUDIT
→ PLAN
→ IMPLEMENT
→ VALIDATE
→ TEST
→ PR
→ CI GREEN
```

---

## Task Classification

Gunakan skill berikut berdasarkan jenis tugas:

| Task | Skill |
|---|---|
| Audit repo, bug, security, logic salah | `01-audit-skill.md` |
| Membuat rencana implementasi | `02-planning-skill.md` |
| UI, halaman, komponen, dashboard | `03-frontend-ui-skill.md` |
| API, service, controller, DTO | `04-backend-api-skill.md` |
| Prisma schema, migration, seed | `05-database-prisma-skill.md` |
| Auth, RBAC, permission, audit log | `06-security-rbac-skill.md` |
| Lint, typecheck, test, build | `07-testing-validation-skill.md` |
| Docker, GitHub Actions, deploy | `08-devops-ci-skill.md` |
| README, docs, ADR, changelog | `09-documentation-skill.md` |
| Review sebelum PR/merge | `10-pr-review-skill.md` |

---

## Hard Rules

- Jangan coding sebelum audit dan plan.
- Jangan bypass RBAC, permission, tenant scope, audit log, dan validasi.
- Jangan commit secret/API key.
- Jangan mengabaikan error TypeScript, lint, test, atau build.
- Jangan klaim selesai tanpa validasi.
- Prioritaskan MVP sebelum fitur enterprise lanjutan.
