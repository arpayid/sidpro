# AUDIT-4 — HttpOnly Browser Session Boundary

**Marker:** `[[AI-CLI|AUDIT-4|VALIDATION_PENDING|VPS_REQUIRED]]`

## Decision

SIDPRO browser sessions now use a split-token model:

1. The API issues a short-lived access token in the JSON response.
2. The browser keeps the access token and user profile **only in memory** for the current tab runtime.
3. The API sets the rotating refresh token in a host-only `HttpOnly` cookie named `sidpro_refresh_session`.
4. A tab reload invokes `POST /api/v1/auth/refresh` with `credentials: include`; the browser cannot read the refresh credential.
5. The API refresh response returns only a new access token, while the rotated refresh credential is written back to the HttpOnly cookie.
6. Logout uses the refresh cookie for server-side revocation and clears the same cookie attributes.

The admin route no longer uses a JavaScript-readable token cookie or Next middleware as an authorization signal. `AdminSessionBoundary` restores an in-memory session through the API before rendering protected shell content. Backend JWT, permission, and tenant/domain checks remain the security authority.

## Cookie Contract

| Attribute | Value / rule |
| --- | --- |
| Name | `sidpro_refresh_session` |
| HttpOnly | Always true |
| Secure | True when `NODE_ENV=production` |
| SameSite | `Lax` |
| Path | `/api/v1/auth` |
| Lifetime | 7 days, matching refresh-session policy |
| Domain | Not set; browser uses host-only cookie behavior |

## CSRF and Origin Controls

- Access-token-bearing API mutations continue to require the in-memory bearer token.
- Cookie-backed `refresh` and `logout` requests validate a supplied browser `Origin` against the same strict `CORS_ORIGIN` policy used for credentialed CORS.
- Missing Origin is permitted for non-browser/legacy transport scenarios; this is not a substitute for staging verification.
- `SameSite=Lax`, strict credentialed CORS, JSON API request semantics, and origin checks are defense-in-depth controls. Real HTTPS/proxy/browser behavior must be tested on staging.

## Compatibility Decision

This is a deliberate **security breaking change** to the `/api/v1/auth` browser contract:

- Login, 2FA completion, and refresh no longer return `refreshToken` in their JSON payload.
- `POST /auth/refresh` no longer accepts a refresh-token JSON body; it reads only the HttpOnly session cookie.
- `POST /auth/logout` no longer accepts a refresh-token JSON body; it revokes the session cookie token when present.
- Browser clients must send credentialed requests and rely on in-memory access state after the upgrade.

A parallel body-token endpoint is intentionally not retained because it would preserve the browser-readable refresh-token boundary this remediation removes. Any external non-browser consumer must use a separate, documented client authentication design before relying on refresh rotation.

## Migration and Rollback

1. Deploy API and web from the same release revision.
2. Existing browser local storage credentials are ignored; users rehydrate through the new cookie only after a fresh login.
3. Existing browser sessions without the cookie are redirected to login by the admin session boundary.
4. Rollback requires deploying the prior API and web revision together; do not mix a pre-change web client with the new API refresh contract.
5. Preserve normal server refresh-token revocation/audit records during rollout.

## Regression Evidence

- `apps/api/test/session-cookie.test.ts`
- `apps/api/test/auth-session-controller.test.ts`
- `apps/api/test/auth-refresh-token.test.ts`
- `apps/web/test/auth-session-boundary-policy.test.ts`
- `AUDIT-4 Security Policy` workflow

## Persistent Staging Validation

1. HTTPS login, 2FA, tab reload, browser restart, refresh rotation, expired refresh, logout, and replay handling.
2. Cookie attributes/host scope/path, CORS preflight, allowed/disallowed origin behavior, and proxy header preservation.
3. Cross-site form/fetch attempts against refresh/logout, including client IP/rate-limit behavior.
4. Admin session boundary behavior for direct URL, expired session, stale claims, and API 401.
5. Ensure no access/refresh token appears in localStorage, sessionStorage, JavaScript-readable cookies, DOM, URLs, analytics, or sanitized logs.

## Non-Claims

- This design does not prove a deployed reverse proxy or TLS configuration.
- It does not add server-side Next middleware authorization.
- It does not claim malware scanning, WAF, or external penetration testing.
