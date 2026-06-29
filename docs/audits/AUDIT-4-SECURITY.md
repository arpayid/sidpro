# AUDIT-4 — Security

**Marker:** `[[AI-CLI|AUDIT-4|VALIDATION_PENDING|VPS_REQUIRED]]`

**Status:** `Validation Pending` — source-level threat model, public-endpoint inventory, CORS/header hardening, and public-mutation rate-limit policy are reconciled in this PR. Dynamic validation through a persistent staging ingress remains required before closure.

## Scope

AUDIT-4 reviews source-level application security controls for authentication, authorization, public API exposure, tenant isolation handoff, rate limiting, uploads, secrets/configuration, response headers, dependency/secret scanning, and error handling.

It does not claim an external penetration test, deployed WAF/proxy configuration, production secret rotation, production identity-provider behavior, or infrastructure patch status.

## Evidence Boundary

This assessment is based on repository source through PR #103 plus the controls introduced in the current PR. Existing Security Audit, Gitleaks, dependency audit, and CI gates remain supporting evidence, not a substitute for dynamic validation.

## Source-Level Findings and Treatment

### A4-P1 Resolved in Source — Credentialed CORS accepted unsafe configuration shapes

The API enabled credentialed CORS directly from a comma-separated environment variable. The source did not reject wildcard origins, blank values, paths, or URL credentials.

**Treatment:** `parseCredentialedCorsOrigins` now normalizes unique HTTP/HTTPS origins, rejects wildcard credentialed CORS, and requires `CORS_ORIGIN` in production. Production environment validation invokes the same parser before app startup.

**Regression evidence:** `security-http-config.test.ts` covers development fallback, normalization, wildcard rejection, blank production configuration, and path rejection.

### A4-P2 Resolved in Source — API response hardening header baseline was implicit

The API had framework validation and CORS but no explicit HTTP response-header baseline.

**Treatment:** all API responses now include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, restrictive `Permissions-Policy`, and `X-Permitted-Cross-Domain-Policies: none`.

**Limit:** HSTS is deliberately not asserted at application level because it must be coordinated with real HTTPS hosts and proxy topology. Persistent staging must verify TLS and ingress headers.

### A4-P3 Resolved in CI — Public mutation routes lacked a regression policy

Public write-like routes are the highest abuse surface: login, refresh, 2FA enrollment/verification, assistant ask, complaint attachment/create/track, and letter tracking.

**Treatment:** `public-route-security-policy.test.ts` rejects any `@Public()` route using `POST`, `PUT`, `PATCH`, or `DELETE` without a route-specific `@Throttle`. The focused AUDIT-4 workflow executes it for relevant source/evidence changes.

**Limit:** this source policy does not prove that the deployed reverse proxy preserves client identity correctly for rate-limit keys.

### A4-P4 Evidence Partial — Upload controls are strong but ingress/runtime behavior is unverified

Authenticated and public complaint uploads use MIME allowlists, 5 MiB limits, in-memory storage limits, file-content magic-byte checks, tenant-linked storage records, checksums, audit logs, and cleanup controls. File download URLs are signed and scoped through tenant-aware file lookup.

**Validation pending:** verify proxy/body limits, MinIO bucket policy, signed URL hostname exposure, malicious corpus handling, malware-scanning decision, and cleanup/retry behavior in persistent staging.

### A4-P5 Evidence Partial — Swagger and proxy/security configuration require deployment proof

Swagger is disabled in production unless explicitly enabled. Production environment validation already requires critical database, JWT, CORS, and object-storage configuration. However, actual ingress TLS, trusted proxy settings, logs, and docs exposure cannot be proven from repository source.

**Validation pending:** verify that production/staging Swagger policy is intentional, `/api/docs` is not exposed unexpectedly, proxy trust/client IP behavior is configured correctly, and secrets never appear in process/log output.

## Controls Observed

| Area | Source-level controls | Remaining boundary |
| --- | --- | --- |
| Authentication | Public auth flows are route-throttled; protected account actions use JWT; existing refresh rotation/replay tests support the design. | Test brute-force/replay behavior through deployed ingress. |
| Authorization | JWT/permission guards plus AUDIT-3 service-level authorization exceptions. | Run negative authorization and tenant-isolation tests on staging. |
| Tenant isolation | Domain services tenant-scope high-risk reads/mutations; AUDIT-5 owns database integrity closure. | Historical data and persistent database validation. |
| Public endpoints | Explicit `@Public()` markers; public mutations must be route-throttled. | Verify client-IP/rate-limit behavior and anti-automation controls. |
| Upload/storage | MIME allowlists, size limits, magic bytes, signed URLs, audit logs, cleanup queue. | Validate ingress/body limits, bucket policy, malware posture, and signed URL routing. |
| Configuration | Production env rejects missing/default critical secrets; credentialed CORS parser rejects wildcard/invalid origins. | Validate deployed secret source, rotation, and TLS/proxy config. |
| Response handling | DTO/Zod validation, standardized validation error envelope, response security headers. | Probe error redaction and cache/header behavior through staging ingress. |
| Supply chain | Dependency audit, Security Audit, Gitleaks, and governed exceptions. | Continue AUDIT-2 lifecycle and deployment image scanning policy. |

## Required Persistent Staging Validation

1. Execute authentication abuse, refresh replay, 2FA, and public complaint/assistant/letter rate-limit scenarios through the actual reverse proxy.
2. Verify client IP identity behind proxy, CORS preflight/credential behavior, response security headers, TLS, and Swagger exposure.
3. Test cross-tenant IDOR negative cases for finance, files, reports/export, letters, and tenant management.
4. Upload a controlled malicious-file corpus and oversized payloads; confirm body limits, MIME/content checks, object-store policy, signed URL host rewriting, and audit logs.
5. Review runtime secrets/logs and incident/audit event forwarding without printing sensitive data.
6. Reconcile findings with AUDIT-3 API/domain, AUDIT-5 data integrity, AUDIT-7 delivery, and AUDIT-8 recovery evidence.

## Closure Criteria

AUDIT-4 may move to `Closed` only when source controls remain green and the persistent staging validation above is versioned, reviewed, and free of unowned in-scope findings.

## Related Documents

- [AUDIT-4 Threat Model](AUDIT-4-THREAT-MODEL.md)
- [AUDIT-4 Public Endpoint Inventory](AUDIT-4-PUBLIC-ENDPOINT-INVENTORY.md)
- [AUDIT-3 API and Domain Logic](AUDIT-3-API-DOMAIN-LOGIC.md)
- [AUDIT-5 Database and Tenant Integrity](AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [Security Audit Automation](../SECURITY_AUDIT.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
