# AUDIT-6 — Frontend

**Marker:** `[[AI-CLI|AUDIT-6|VALIDATION_PENDING|VPS_REQUIRED]]`

**Status:** `Validation Pending` — source-level route inventory, callback policy, admin-shell accessibility baseline, and loading/error states are versioned. Browser, assistive-technology, responsive, and deployed-session validation remain required.

## Scope

AUDIT-6 reviews frontend route posture, role/tenant presentation, login navigation, loading/error/empty state handling, accessible shell semantics, responsive navigation, and security-sensitive browser behavior.

It does not claim WCAG conformance, device-browser coverage, successful screen-reader testing, deployed auth/session behavior, or server-side authorization. API authorization remains AUDIT-3/AUDIT-4 responsibility.

## Source Evidence

| Area | Evidence | Assessment |
| --- | --- | --- |
| Admin route entry | Next middleware checks a session marker cookie for `/admin/:path*`; API remains the authorization authority. | UX guard only; not sufficient to authorize resource access. |
| Post-login navigation | `sanitizeAdminCallback` accepts only same-origin `/admin` routes. | Resolved open-redirect-style callback handling. |
| Admin shell | Skip link, focusable main landmark, labelled search and notification controls, semantic nav, active-page state, and mobile dialog semantics. | Source-level accessibility baseline. |
| Route states | `(admin)/loading.tsx` and `(admin)/error.tsx` provide explicit, recoverable UI states. | Admin segment baseline present. |
| Role navigation | Sidebar filters items by roles/permissions from auth state. | Presentation only; API guard/service enforcement remains canonical. |
| Browser credentials | Current auth client stores bearer tokens in `localStorage`. | Cross-audit open security issue #105; not closed by this audit. |

## Findings and Treatment

### A6-P1 Resolved in Source — Login callback allowed arbitrary internal path prefixes

The login page previously used a direct callback query value and only checked whether it started with `/admin` before navigation. This accepted ambiguous paths such as `/adminish` and did not centralize callback rules.

**Treatment:** `route-policy.ts` defines `isAdminRoute` and `sanitizeAdminCallback`. It accepts only `/admin` and descendants, preserves query/fragment for valid admin paths, and falls back to `/admin` for empty, external, protocol-relative, login, or ambiguous paths.

**Regression evidence:** `route-policy.test.ts` covers valid, external, protocol-relative, non-admin, and ambiguous callback values.

### A6-P2 Resolved in Source — Admin shell lacked explicit accessibility landmarks

The admin layout had no skip link or named focus destination; the mobile sidebar lacked dialog semantics; search relied on placeholder text; active navigation had no semantic current-page marker.

**Treatment:** the shell now supplies a skip link to `#main-content`, a focusable main landmark, labelled navigation and search, `aria-current="page"`, dialog/modal semantics for mobile navigation, and accessible notification labels.

**Regression evidence:** `admin-shell-accessibility-policy.test.ts` asserts the source-level baseline.

### A6-P3 Resolved in Source — Admin route segment had no shared loading/error fallback

**Treatment:** `(admin)/loading.tsx` announces loading state and `(admin)/error.tsx` presents a recoverable alert with retry control. Error logging intentionally records only a route error digest, not raw error details.

### A6-P4 Evidence Partial — Role/tenant UI journeys are not browser-validated

Sidebar filtering hides navigation items based on current role/permission claims. This improves UX, but it does not secure resources: direct URLs and API requests remain protected by backend guards and tenant service logic.

**Required staging validation:** test every role navigation map, direct URL attempt, stale permission refresh, tenant switch, logout/login transition, and unauthorized response behavior through the deployed frontend/API boundary.

### A6-P5 Cross-Audit Open — Browser-readable bearer tokens

The frontend auth helper stores access and refresh credentials in browser storage and writes a JavaScript-readable route cookie. This is tracked in AUDIT-4 issue #105. It increases XSS impact and requires a deliberate HttpOnly session-boundary redesign.

### A6-P6 Validation Pending — Responsive and assistive-technology evidence

Source improvements do not prove keyboard focus order, focus trap behavior, screen-reader announcements, contrast, touch targets, 320px/768px/1440px layouts, zoom/reflow, or network/error behavior across real browsers.

## Required Persistent Staging Validation

1. Test admin and public journeys using keyboard-only navigation, screen reader, zoom/reflow, and target mobile/desktop viewports.
2. Verify role/permission/tenant navigation, direct URL denial, stale claims, expired session, logout, and callback behavior.
3. Exercise loading, empty, error, retry, upload, report/export, and public tracking states on realistic latency and failure conditions.
4. Validate no token/session data is exposed through the DOM, logs, storage, or redirect URLs; reconcile with issue #105.
5. Record browser/version, viewport, role fixture, commit/deploy, result, sanitized evidence, and follow-up issue for each failed scenario.

## Closure Criteria

AUDIT-6 may move to `Closed` only when source policy remains green, issue #105 has an approved/implemented disposition, and persistent staging/browser evidence covers role journeys, responsive behavior, accessibility checks, and frontend error states without unowned in-scope findings.

## Related Documents

- [AUDIT-6 Route and UI Inventory](AUDIT-6-ROUTE-UI-INVENTORY.md)
- [AUDIT-3 API and Domain Logic](AUDIT-3-API-DOMAIN-LOGIC.md)
- [AUDIT-4 Security](AUDIT-4-SECURITY.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
