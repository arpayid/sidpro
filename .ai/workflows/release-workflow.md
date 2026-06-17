# SIDPRO Release Workflow

Use this workflow for release preparation, production deployment, versioning, deploy validation, and rollback planning.

---

## Required Reading

1. `AGENTS.md`
2. `docs/SID_ENTERPRISE_BLUEPRINT.md`
3. `.ai/skills/08-devops-ci-skill.md`
4. `.ai/skills/07-testing-validation-skill.md`
5. `docs/DEPLOYMENT.md` if it exists

---

## Steps

```txt
RELEASE SCOPE
→ CHECK MAIN BRANCH
→ RUN VALIDATION
→ CHECK MIGRATIONS
→ CHECK ENV
→ BUILD
→ DEPLOY
→ HEALTHCHECK
→ MONITOR
→ ROLLBACK PLAN
```

---

## Pre-Release Checklist

- Branch is up to date.
- CI is green.
- Lint passes.
- Typecheck passes.
- Tests pass or limitations are documented.
- Build passes.
- Prisma schema validates.
- Migrations are reviewed.
- `.env.example` is updated.
- No secrets are committed.
- Docker config is valid.
- Backup strategy is ready if data exists.
- Rollback path is documented.

---

## Deployment Checklist

- Pull latest code.
- Install/build dependencies.
- Run migrations safely.
- Build containers.
- Start services.
- Check service status.
- Check logs.
- Run health checks.
- Validate important user flows.

---

## Healthcheck Targets

Check:

- Web app responds.
- API responds.
- Database connection works.
- Redis connection works.
- Worker is running.
- MinIO/storage is reachable if enabled.
- Nginx routes are correct.

---

## Rollback Plan Format

Every release should include:

```md
## Rollback Plan

- Previous version/commit:
- Database rollback risk:
- Commands:
- Data backup location:
- Verification after rollback:
```

---

## Final Release Report

Return:

1. Version/commit deployed.
2. Changes included.
3. Commands run.
4. Migration status.
5. Healthcheck result.
6. Known risks.
7. Rollback plan.
