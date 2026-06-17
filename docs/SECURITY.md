# SIDPRO Security Specification

## Goals

- Protect village data.
- Restrict access by role and permission.
- Apply tenant isolation.
- Record important actions.
- Make data export traceable.

## Access Rules

- Protected routes require login.
- Admin routes require permission.
- Village-owned data uses tenant filtering.
- Citizen users only access their own service data.
- District-level users only access assigned villages.

## Audit Events

Record these events:

- user management
- role management
- resident create, update, delete, export
- family create, update, delete, export
- letter create, verify, approve, reject, generate
- complaint create, assign, respond, close
- finance update and export
- aid update and export
- report export
- setting update

## Data Rules

- Sensitive identity fields are masked in general UI.
- Full sensitive values require special permission.
- Private files require permission.
- Uploads require type and size validation.
- Exports require permission and audit log.

## API Checklist

- DTO validation exists.
- Auth guard exists.
- Permission guard exists.
- Tenant filter exists.
- Audit log exists for important changes.
- Public endpoints use rate limit where needed.

## Production Checklist

- HTTPS enabled.
- Environment values are outside repository.
- Database backup active.
- Logs are monitored.
- Dependency checks are run regularly.
