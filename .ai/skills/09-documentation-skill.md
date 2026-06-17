# SIDPRO Documentation Skill

Use this skill when creating or updating documentation, README, architecture docs, API contract docs, database docs, deployment docs, security docs, ADRs, or changelogs.

---

## Required Docs

Maintain:

```txt
README.md
AGENTS.md
docs/SID_ENTERPRISE_BLUEPRINT.md
docs/ARCHITECTURE.md
docs/MODULES.md
docs/API_CONTRACT.md
docs/DATABASE.md
docs/SECURITY.md
docs/DEPLOYMENT.md
docs/CHANGELOG.md
```

---

## Documentation Rules

- Document setup commands.
- Document environment variables.
- Document module decisions.
- Document API changes.
- Document database changes.
- Document migration notes.
- Document validation commands.
- Document deployment steps.
- Keep docs practical and actionable.
- Do not let docs drift from code.

---

## Required Sections for Major Feature Docs

Use this structure:

```md
# Feature Name

## Purpose

## Scope

## User Roles

## Permissions

## Database Changes

## API Changes

## UI Changes

## Security Notes

## Validation

## Known Limitations
```

---

## README Minimum Content

`README.md` should include:

- Product summary.
- Tech stack.
- Project structure.
- Local setup.
- Environment variables.
- Development commands.
- Testing commands.
- Docker usage.
- Deployment overview.
- AI CLI instructions.

---

## Changelog Rules

For notable changes, document:

- Added.
- Changed.
- Fixed.
- Security.
- Migration notes.

---

## Agent Output

When documentation is updated, report:

1. Files changed.
2. Why the docs changed.
3. Related implementation.
4. Any docs still missing.
