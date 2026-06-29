# AUDIT-4 — Public Endpoint Inventory

**Marker:** `[[AI-CLI|AUDIT-4|VALIDATION_PENDING|VPS_REQUIRED]]`

All routes below are under the API global prefix `/api/v1`. This is a source inventory, not a claim that a deployed proxy exposes only these routes.

## Policy

1. A public route must use `@Public()` explicitly.
2. Every public mutation (`POST`, `PUT`, `PATCH`, `DELETE`) must also declare route-specific `@Throttle`; `public-route-security-policy.test.ts` enforces this.
3. New public routes require an entry in this inventory, threat classification, payload/response review, and AUDIT-4 workflow pass.
4. Public read routes inherit the global throttler; high-cost/publicly enumerable reads require a route-specific limit after staging evidence.

## Inventory

| Area | Public route class | Mutation? | Source controls | Staging focus |
| --- | --- | ---: | --- | --- |
| Health | `GET /health` | No | Explicit public health endpoint. | Restrict or separate liveness/readiness exposure according to ingress policy. |
| Authentication | Login, refresh, 2FA login/enrollment setup/complete | Yes | Explicit public marker; 5–20 requests/minute route throttles; validation DTOs; refresh/replay controls. | Client IP, replay, brute force, error disclosure, monitoring. |
| Public village/CMS | Village profile, CMS posts/agendas/gallery, public map, development and finance transparency reads | No | Explicit public marker; tenant code/query scoping in public service layer; global throttle. | Enumeration volume, cache policy, data minimization, high-cost query limits. |
| Assistant | FAQ read and assistant ask | Ask only | Ask route has 20/minute throttle; FAQ is read-only. | Payload length, prompt abuse, upstream cost controls, logging/redaction. |
| Complaints | Public attachment upload, complaint create, complaint track | Yes | 10/minute route throttles; image/PDF allowlist, 5 MiB limits, magic-byte validation, tenant code lookup. | Malware corpus, attachment abuse, tracking privacy, ingress body/client-IP limits. |
| Letters | QR verification read and public tracking | Track only | 10/minute route throttles; QR/tracking validators before lookup. | Identifier enumeration, response disclosure, QR data minimization. |

## Review Notes

- No public administrative mutation is listed. CMS, finance administration, resident data, tenant configuration, reports/export, and file management remain JWT/permission-protected in source.
- The inventory distinguishes source access posture from operational exposure. A reverse proxy can still create risk through path rewriting, Swagger exposure, CORS, proxy trust, or rate-limit identity configuration.
- The API currently uses the global default throttle for public read endpoints. This is a baseline rather than a workload-derived security limit; the appropriate limits must be verified against staging traffic and AUDIT-9 workload assumptions.

## Required Update Trigger

Update this inventory in the same PR whenever a controller gains/removes `@Public()`, a public route changes method or payload, or its throttle/abuse policy changes.
