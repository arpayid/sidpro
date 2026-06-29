# AUDIT-6 — Frontend

**Marker:** `[[AI-CLI|AUDIT-6|VALIDATION_PENDING|VPS_REQUIRED]]`

**Status:** `Validation Pending` — source-level route inventory, callback policy, admin-shell accessibility baseline, loading/error states, HttpOnly session integration, and a manual staging probe are versioned. Browser, assistive-technology, responsive, and deployed-session validation remain required.

## Scope

AUDIT-6 reviews frontend route posture, role/tenant presentation, login navigation, loading/error/empty state handling, accessible shell semantics, responsive navigation, and security-sensitive browser behavior.

It does not claim WCAG conformance, device-browser coverage, successful screen-reader testing, deployed auth/session behavior, or server-side authorization. API authorization remains AUDIT-3/AUDIT-4 responsibility.

## Source Evidence

| Area | Evidence | Assessment |
| --- | --- | --- |
| Admin route entry | `AdminSessionBoundary` restores in-memory access state through credentialed refresh and `/auth/me` before rendering the admin shell; API remains the authorization authority. | Source-level session guard, not server-side authorization. |
| Post-login navigation | `sanitizeAdminCallback` accepts only same-origin `/admin` routes. | Resolved open-redirect-style callback handling. |
| Admin shell | Skip link, focusable main landmark, labelled search and notification controls, semantic nav, active-page state, and mobile dialog semantics. | Source-level accessibility baseline. |
| Route states | `(admin)/loading.tsx` and `(admin)/error.tsx` provide explicit, recoverable UI states. | Admin segment baseline present. |
| Role navigation | Sidebar filters items by roles/permissions from auth state. | Presentation only; API guard/service enforcement remains canonical. |
| Browser credentials | Access token/profile live only in tab memory; rotating refresh credential is host-only `HttpOnly` cookie. | Source remediation from #105; HTTPS/proxy/browser behavior remains under #112. |
| Staging probe | Manual `AUDIT-6 Staging Probe` checks public/login/admin reachability, security headers, and optional API health with sanitized artifact output. | Preparation only; #108 browser matrix remains required. |

## Findings and Treatment

### A6-P1 Resolved in Source — Login callback allowed arbitrary internal path prefixes

The login page previously used a direct callback query value and only checked whether it started with `/admin` before navigation. This accepted ambiguous paths such as `/adminish` and did not centralize callback rules.

**Treatment:** `route-policy.ts` defines `isAdminRoute` and `sanitizeAdminCallback`. It accepts only `/admin` and descendants, preserves query/fragment for valid admin paths, and falls back to `/admin` for empty, external, protocol-relative, login, or ambiguous paths.

**Regression evidence:** `route-policy.test.ts` covers valid, external, protocol-relative, non-admin, and ambiguous callback values.

### A6-P2 Resolved in Source — Admin shell lacked explicit accessibility landmarks

The admin layout had no skip link or named focus destination; the mobile sidebar lacked dialog semantics; search relied on placeholder text; active navigation had no semantic current-page marker.

**Treatment:** the shell supplies a skip link to `#main-content`, a focusable main landmark, labelled navigation and search, `aria-current="page"`, dialog/modal semantics for mobile navigation, and accessible notification labels.

**Regression evidence:** `admin-shell-accessibility-policy.test.ts` asserts the source-level baseline.

### A6-P3 Resolved in Source — Admin route segment had no shared loading/error fallback

**Treatment:** `(admin)/loading.tsx` announces loading state and `(admin)/error.tsx` presents a recoverable alert with retry control. Error logging records only a route error digest, not raw error details.

### A6-P4 Evidence Partial — Role/tenant UI journeys are not browser-validated

Sidebar filtering hides navigation items based on current role/permission claims. This improves UX, but it does not secure resources: direct URLs and API requests remain protected by backend guards and tenant service logic.

**Required staging validation:** test every role navigation map, direct URL attempt, stale permission refresh, tenant switch, logout/login transition, and unauthorized response behavior through the deployed frontend/API boundary.

### A6-P5 Resolved in Source / Validation Pending in Runtime — Browser-readable bearer tokens

Issue #105 replaced browser-persisted access/refresh credentials and JavaScript-readable route cookies. Refresh is now an API-issued `HttpOnly` cookie and the browser retains only in-memory access state. The new admin session boundary restores state through credentialed refresh.

**Remaining:** issue #112 must verify HTTPS cookie scope, origin/CORS behavior, reload/restart/expiry/logout, proxy handling, and absence of token exposure in actual browser storage, DOM, URL, analytics, and logs.

### A6-P6 Validation Pending — Responsive and assistive-technology evidence

Source improvements do not prove keyboard focus order, focus trap behavior, screen-reader announcements, contrast, touch targets, 320px/768px/1440px layouts, zoom/reflow, or network/error behavior across real browsers.

## Required Persistent Staging Validation

1. Run the manual `AUDIT-6 Staging Probe` workflow and retain its sanitized artifact.
2. Execute the browser/role/session matrix in [AUDIT-6 Staging Validation Runbook](AUDIT-6-STAGING-VALIDATION-RUNBOOK.md).
3. Test admin and public journeys using keyboard-only navigation, screen reader, zoom/reflow, and target mobile/desktop viewports.
4. Verify role/permission/tenant navigation, direct URL denial, stale claims, expired session, logout, and callback behavior.
5. Exercise loading, empty, error, retry, upload, report/export, and public tracking states on realistic latency and failure conditions.
6. Reconcile browser token/session evidence with AUDIT-4 issue #112 and record browser/version, viewport, role fixture, commit/deploy, result, sanitized evidence, and follow-up issue for each failed scenario.

## Closure Criteria

AUDIT-6 may move to `Closed` only when source policy remains green and persistent staging/browser evidence from #108 and #112 covers role journeys, responsive behavior, accessibility checks, session behavior, and frontend error states without unowned in-scope findings.

## Related Documents

- [AUDIT-6 Route and UI Inventory](AUDIT-6-ROUTE-UI-INVENTORY.md)
- [AUDIT-6 Staging Validation Runbook](AUDIT-6-STAGING-VALIDATION-RUNBOOK.md)
- [AUDIT-3 API and Domain Logic](AUDIT-3-API-DOMAIN-LOGIC.md)
- [AUDIT-4 Security](AUDIT-4-SECURITY.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
