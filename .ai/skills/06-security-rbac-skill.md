# SIDPRO Security RBAC Skill

Use this skill for authentication, authorization, permission design, audit log, tenant scope, data masking, and data protection.

---

## Security Priorities

- JWT access token.
- Refresh token rotation.
- RBAC.
- Permission-based access.
- Tenant scope.
- Audit log.
- Data masking.
- Rate limiting.
- File upload validation.
- Session management.
- Device/session revoke.
- 2FA for admin in enterprise hardening phase.

---

## Hard Rules

- Never expose full NIK/KK by default.
- Never allow cross-tenant data access.
- Never allow admin endpoint without guard.
- Never allow mutation without permission check.
- Never store secrets/API keys in the repository.
- Never bypass validation because frontend already validates.
- Never trust client-provided `tenant_id` without server-side authorization.

---

## Required Audit Log Events

Record audit log for sensitive actions:

- create resident
- update resident
- delete resident
- export resident data
- create family
- update family
- create letter
- approve letter
- sign letter
- reject letter
- generate letter PDF
- update finance data
- manage aid recipients
- manage users
- manage roles
- manage permissions
- login failure burst
- export sensitive reports

---

## Permission Examples

```txt
population.read
population.create
population.update
population.delete
families.read
families.manage
letters.read
letters.create
letters.verify
letters.approve
letters.sign
finance.read
finance.manage
assets.read
assets.manage
complaints.read
complaints.assign
complaints.respond
reports.read
reports.export
settings.manage
users.manage
roles.manage
audit.read
```

---

## Data Masking

Default display:

```txt
NIK: 7371********0001
KK : 7371********1234
```

Full display requires explicit permission, for example:

```txt
population.view_sensitive
families.view_sensitive
```

---

## Validation Checklist

Before finishing security-related work, confirm:

- Auth guard exists.
- Permission guard exists.
- Tenant filter exists.
- DTO validation exists.
- Audit log is written where needed.
- Sensitive fields are masked where needed.
- Export actions are logged.
- Error messages do not leak internals.
