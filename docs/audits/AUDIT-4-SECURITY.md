# AUDIT-4 — Security

**Marker:** `[[AI-CLI|AUDIT-4|IN_PROGRESS|REPO_CI_READY]]`

**Status:** `In Progress` — threat model, public-endpoint inventory, CORS/header hardening, and public-mutation rate-limit policy are versioned. A browser-token architecture risk is now tracked in issue #105; staging ingress validation is also required.

## Scope

AUDIT-4 reviews authentication, authorization, session lifecycle, secrets/configuration, public API exposure, tenant-isolation handoff, rate limiting, uploads, response headers, dependency/secret scans, and error handling.

It does not claim a penetration test, deployed WAF/proxy configuration, production secret rotation, production identity-provider behavior, or infrastructure patch status.

## Source-Level Findings and Treatment

### A4-P1 Resolved in Source — Credentialed CORS accepted unsafe configuration shapes

The API previously accepted comma-separated CORS values without rejecting wildcard origins, blank values, paths, or URL credentials.

**Treatment:** `parseCredentialedCorsOrigins` normalizes unique HTTP/HTTPS origins, rejects wildcard credentialed CORS, and requires `CORS_ORIGIN` in production. Production environment validation invokes the same parser before startup.

**Regression evidence:** `security-http-config.test.ts` covers development fallback, normalization, wildcard rejection, blank production configuration, and path rejection.

### A4-P2 Resolved in Source — Response-header baseline was implicit

The API and web application now return `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, restrictive `Permissions-Policy`, and `X-Permitted-Cross-Domain-Policies: none`. Web configuration has a focused regression test.

**Limit:** HSTS is deliberately not asserted in application code because it must be coordinated with real HTTPS hosts and proxy topology.

### A4-P3 Resolved in CI — Public mutation routes lacked a regression policy

Public write-like routes include login/refresh/2FA, assistant ask, complaint attachment/create/track, and letter tracking.

**Treatment:** `public-route-security-policy.test.ts` rejects any `@Public()` route using `POST`, `PUT`, `PATCH`, or `DELETE` without route-specific `@Throttle`. The focused AUDIT-4 workflow executes it for relevant changes.

### A4-P4 Evidence Partial — Upload controls are strong but ingress/runtime behavior is unverified

Authenticated and public complaint uploads use MIME allowlists, 5 MiB limits, magic-byte validation, tenant-linked storage records, checksums, audit logs, cleanup controls, and tenant-scoped signed downloads.

**Validation pending:** proxy/body limits, MinIO bucket policy, signed URL hostname exposure, malicious corpus handling, malware-scanning decision, cleanup/retry behavior.

### A4-P5 Evidence Partial — Swagger and proxy configuration require deployment proof

Swagger is disabled in production unless explicitly enabled. Production environment validation requires critical database, JWT, CORS, and object-storage configuration. Actual ingress TLS, trusted proxy settings, logs, and docs exposure cannot be proven from source.

### A4-P6 Open — Browser-readable bearer credential storage

The web client stores access and refresh tokens in `localStorage` and writes an access-token cookie from browser JavaScript for middleware routing. That cookie cannot be `HttpOnly`; a successful XSS event could exfiltrate bearer credentials.

**Treatment:** issue #105 requires an explicit authenticated-session architecture decision and implementation. A same-origin BFF/session, API-issued HttpOnly refresh cookie with short-lived in-memory access token, or an equivalent documented model must specify CSRF, CORS, SameSite/Secure/domain policy, logout/revocation, migration, and regression coverage. Response headers reduce XSS impact but do not resolve browser-readable token storage.

## Controls Observed

| Area | Source-level controls | Remaining boundary |
| --- | --- | --- |
| Authentication | Route throttles, JWT guard, refresh rotation/replay regression tests. | Brute force/replay through deployed ingress; resolve #105. |
| Authorization | JWT/permission guards and AUDIT-3 service-level exception register. | Negative authorization/tenant tests on staging. |
| Public endpoints | Explicit `@Public()`; public mutations require throttle. | Client-IP/rate-limit identity and anti-automation validation. |
| Upload/storage | MIME/size/magic-byte validation, signed URLs, audit/cleanup controls. | Ingress/body limits, bucket policy, malware posture, URL routing. |
| Configuration | Production validation and strict credentialed CORS parser. | Secret source/rotation, TLS/proxy config. |
| Frontend response handling | Security headers and Next strict mode. | XSS rendering audit and token-storage remediation #105. |
| Supply chain | Dependency audit, Security Audit, Gitleaks, governed exceptions. | Continue AUDIT-2 lifecycle/image policy. |

## Required Next Steps

1. Resolve the source architecture decision and implementation in issue #105.
2. On persistent staging, test auth abuse, refresh replay, 2FA, public complaint/assistant/letter rate limits, and client-IP identity through the real reverse proxy.
3. Verify CORS preflight/credentials, TLS, headers, Swagger exposure, proxy trust, and error redaction.
4. Test controlled malicious upload corpus, oversized payloads, MinIO policy, signed URL rewriting, and audit logs.
5. Reconcile with AUDIT-3, AUDIT-5, AUDIT-6, AUDIT-7, and AUDIT-8.

## Closure Criteria

AUDIT-4 may move to `Validation Pending` only after issue #105 is resolved or has an approved, time-boxed risk disposition. It may move to `Closed` only after source controls remain green and required persistent staging evidence is versioned and reviewed.

## Related Documents

- [AUDIT-4 Threat Model](AUDIT-4-THREAT-MODEL.md)
- [AUDIT-4 Public Endpoint Inventory](AUDIT-4-PUBLIC-ENDPOINT-INVENTORY.md)
- [AUDIT-3 API and Domain Logic](AUDIT-3-API-DOMAIN-LOGIC.md)
- [AUDIT-5 Database and Tenant Integrity](AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [Security Audit Automation](../SECURITY_AUDIT.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
