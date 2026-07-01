# AUDIT-4 — Security

**Marker:** `[[AI-CLI|AUDIT-4|VALIDATION_PENDING|VPS_REQUIRED]]`

**Status:** `Validation Pending` — source-level threat model, public-route controls, CORS/headers, upload constraints, worker-log redaction, and the HttpOnly browser session boundary are versioned. Persistent staging ingress/security validation remains required through issue #112.

## Scope

AUDIT-4 reviews authentication, authorization, session lifecycle, secrets/configuration, public API exposure, tenant-isolation handoff, rate limiting, uploads, response headers, dependency/secret scans, and error handling.

It does not claim a penetration test, deployed WAF/proxy configuration, production secret rotation, production identity-provider behavior, or infrastructure patch status.

## Source-Level Findings and Treatment

### A4-P1 Resolved in Source — Credentialed CORS accepted unsafe configuration shapes

The API now normalizes unique HTTP/HTTPS origins, rejects wildcard credentialed CORS, and requires `CORS_ORIGIN` in production. Production environment validation invokes the same parser before startup.

### A4-P2 Resolved in Source — Response-header baseline was implicit

The API and web application return `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, restrictive `Permissions-Policy`, and `X-Permitted-Cross-Domain-Policies: none`.

**Limit:** HSTS remains an ingress/TLS decision and is not asserted in application code.

### A4-P3 Resolved in CI — Public mutation routes lacked a regression policy

`public-route-security-policy.test.ts` rejects any `@Public()` route using `POST`, `PUT`, `PATCH`, or `DELETE` without route-specific `@Throttle`. The focused AUDIT-4 workflow executes it for relevant changes.

### A4-P4 Evidence Partial — Upload controls need ingress/runtime proof

Authenticated and public complaint uploads use MIME allowlists, 5 MiB limits, magic-byte validation, tenant-linked storage records, checksums, audit logs, cleanup controls, and tenant-scoped signed downloads.

**Validation pending:** proxy/body limits, MinIO bucket policy, signed URL hostname exposure, malicious corpus handling, malware-scanning decision, cleanup/retry behavior.

### A4-P5 Evidence Partial — Swagger and proxy configuration require deployment proof

Swagger is disabled in production unless explicitly enabled. Production environment validation requires critical database, JWT, CORS, and object-storage configuration. Actual ingress TLS, trusted proxy settings, logs, and docs exposure cannot be proven from source.

### A4-P6 Resolved in Source; Validation Pending — Browser-readable bearer credential storage

The browser previously stored access and refresh tokens in `localStorage` and wrote a JavaScript-readable route cookie. That made refresh credentials readable by any successful XSS execution.

**Treatment:** PR #115 implemented and closed issue #105 through the HttpOnly session boundary documented in [AUDIT-4 Session Boundary](AUDIT-4-SESSION-BOUNDARY.md): refresh token is now a rotating API-issued `HttpOnly` cookie, access token/user profile live only in tab memory, refresh/logout use the cookie without body-token transport, and admin shell restoration is client-side through authenticated API session hydration. Focused tests verify cookie attributes, controller response stripping, and removal of localStorage/JavaScript-cookie transport.

**Compatibility:** this is an intentional security breaking change to browser auth responses. The migration/rollback contract is documented in the session-boundary record; do not deploy old web assets with the new refresh API.

**Remaining validation:** issue #112 is the persistent staging release gate. It must validate HTTPS cookie scope, session lifecycle, origin/CORS/CSRF behavior, proxy/CDN headers, client-IP rate limiting, absence of token leakage, and rollback against the deployed commit.

### A4-P7 Resolved in Source — Storage cleanup worker logs exposed raw metadata

Storage cleanup completion and failure events now use an opaque, truncated SHA-256 `jobReference` rather than raw job IDs, file IDs, tenant IDs, or object paths. Known job metadata embedded in failure text and URL-like values are redacted before the structured event is emitted. Focused worker and AUDIT-5 repository tests reject regression to raw metadata fields.

**Limit:** this source control does not prove a deployed log collector, reverse proxy, or platform integration cannot add request metadata independently. Persistent staging must still inspect the final collected event stream.

## Controls Observed

| Area | Source-level controls | Remaining boundary |
| --- | --- | --- |
| Authentication | Route throttles, JWT guard, refresh rotation/replay tests, HttpOnly refresh boundary. | Brute force/replay/session restoration through deployed ingress. |
| Authorization | JWT/permission guards and AUDIT-3 service-level exception register. | Negative authorization/tenant tests on staging. |
| Public endpoints | Explicit `@Public()`; public mutations require throttle. | Client-IP/rate-limit identity and anti-automation validation. |
| Upload/storage | MIME/size/magic-byte validation, signed URLs, audit/cleanup controls, and metadata-redacted cleanup JSON events. | Ingress/body limits, bucket policy, malware posture, URL routing, and deployed log-collector validation. |
| Configuration | Production validation and strict credentialed CORS parser. | Secret source/rotation, TLS/proxy config. |
| Browser session | In-memory access state, HttpOnly rotating refresh cookie, origin validation on cookie-backed refresh/logout. | HTTPS cookie scope, CSRF/origin, reverse proxy, and browser behavior validation. |
| Supply chain | Dependency audit, Security Audit, Gitleaks, governed exceptions. | Continue AUDIT-2 lifecycle/image policy. |

## Required Persistent Staging Validation

1. Test HTTPS login, 2FA, tab reload, browser restart, refresh rotation, expired refresh, logout, and replay handling.
2. Verify cookie host/path/Secure/SameSite behavior, allowed/disallowed origin behavior, CORS preflight, TLS, headers, Swagger exposure, and proxy trust.
3. Test auth/public route abuse, cross-tenant IDOR negative cases, client IP/rate-limit identity, error redaction, and collected worker events for absence of raw file/tenant/object-path metadata.
4. Test controlled malicious upload corpus, oversized payloads, MinIO policy, signed URL rewriting, and audit logs.
5. Verify no token appears in localStorage, sessionStorage, JavaScript-readable cookies, DOM, URLs, analytics, or sanitized logs.
6. Reconcile findings with AUDIT-3, AUDIT-5, AUDIT-6, AUDIT-7, and AUDIT-8.
7. Record results with a Trace ID in [Audit Change Ledger](AUDIT_CHANGELOG.md).

## Closure Criteria

AUDIT-4 may move to `Closed` only after source controls remain green and persistent staging evidence above is versioned, reviewed, and free of unowned in-scope findings.

## Related Documents

- [AUDIT-4 Session Boundary](AUDIT-4-SESSION-BOUNDARY.md)
- [AUDIT-4 Threat Model](AUDIT-4-THREAT-MODEL.md)
- [AUDIT-4 Public Endpoint Inventory](AUDIT-4-PUBLIC-ENDPOINT-INVENTORY.md)
- [AUDIT-3 API and Domain Logic](AUDIT-3-API-DOMAIN-LOGIC.md)
- [AUDIT-5 Database and Tenant Integrity](AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [Security Audit Automation](../SECURITY_AUDIT.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
- [Audit Change Ledger](AUDIT_CHANGELOG.md)
