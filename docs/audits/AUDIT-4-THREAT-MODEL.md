# AUDIT-4 — Application Threat Model

**Marker:** `[[AI-CLI|AUDIT-4|VALIDATION_PENDING|VPS_REQUIRED]]`

## Assets

| Asset | Security property |
| --- | --- |
| JWT access and refresh credentials | Confidentiality, replay resistance, revocation/rotation integrity. |
| Tenant and resident data | Tenant isolation, least privilege, privacy. |
| Finance ledger and reports | Integrity, append-only business rules, traceability. |
| Letters, attachments, signed download URLs | Tenant authorization, content safety, controlled disclosure. |
| Public complaint/track identifiers | Abuse resistance and privacy-preserving lookup behavior. |
| Database, Redis, MinIO, and environment secrets | Confidentiality and availability. |
| Audit events | Integrity, actor attribution, operational availability. |

## Trust Boundaries

1. Browser/mobile client to Next.js web application.
2. Browser/client to `/api/v1` API through the future reverse proxy/ingress.
3. API to PostgreSQL, Redis/BullMQ, and MinIO/S3-compatible storage.
4. API to background worker/queue processing.
5. Public unauthenticated client to public read, authentication, complaint, letter, and assistant endpoints.
6. Administrator/tenant operator to permissioned API operations.

## Threats and Source Controls

| Threat | Affected surface | Current source control | Runtime validation required |
| --- | --- | --- | --- |
| Credential stuffing and login brute force | Login, refresh, 2FA | Route-specific throttle, JWT guard, refresh rotation/replay controls. | Verify IP identity, throttling persistence, replay responses, lockout/monitoring posture. |
| IDOR/cross-tenant access | Tenant resources, reports, files, finance, letters | JWT/permission guards, tenant-scoped service lookups, AUDIT-3 exception register. | Execute negative cross-tenant scenarios against deployed database/ingress. |
| Public write abuse | Complaint upload/create/track, assistant ask, letter tracking | Explicit `@Public()` and required route-specific throttles for mutation routes. | Verify proxy rate-limit keys, bot/abuse behavior, payload limits, monitoring. |
| Malicious upload/content confusion | Public and authenticated file upload | MIME allowlist, 5 MiB limits, magic-byte check, signed URLs, audit logs. | Test malicious corpus, ingress limits, malware policy, bucket ACL, URL routing. |
| CORS credential misuse | Browser-to-API requests | Strict credentialed-origin parser; production CORS origin required; wildcard rejected. | Verify actual browser preflight, deployed domains, and reverse-proxy headers. |
| Clickjacking/content sniffing/referrer leakage | API/Swagger responses | Response header baseline: DENY framing, nosniff, no-referrer, restrictive permissions. | Verify headers after ingress/CDN and Swagger rendering policy. |
| Secret/configuration weakness | API and storage runtime | Production environment rejects missing/default critical values and enforces CORS validity. | Verify secret source, log redaction, rotation, and deployment manifests. |
| Finance race/retry misuse | Ledger realization/reversal | Domain transactions/invariants and AUDIT-3 idempotency policy. | Exercise concurrency/retry failures on staging with realistic connections. |
| Queue/storage consistency failure | File cleanup, PDF generation, jobs | Queue retry/audit controls and storage compensation. | Inject MinIO/Redis failures and inspect recovery/alerts. |

## Explicit Non-Decisions

- A generic API idempotency middleware is not introduced because financial, provisioning, and document workflows require different replay semantics.
- HSTS is not added in application code until deployed HTTPS host/subdomain policy is verified.
- Proxy trust is not inferred from source; it must be configured and tested with the actual ingress.
- Malware scanning is not claimed. Upload validation is format/size validation only.

## Persistent Staging Test Record Requirements

For each scenario, retain commit SHA, deployment identifier, environment, actor roles/tenant fixtures, request/result, relevant sanitized logs, rollback/cleanup result, and any residual risk.
