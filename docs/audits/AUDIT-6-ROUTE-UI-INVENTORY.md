# AUDIT-6 — Route and UI Inventory

**Marker:** `[[AI-CLI|AUDIT-6|VALIDATION_PENDING|VPS_REQUIRED]]`

This inventory groups the frontend surface by journey. It is based on repository route/source documentation and must be updated in the same PR when a user-facing route, role gate, public interaction, or major state pattern changes.

## Route Groups

| Area | Route / screen group | Primary users | Source-level posture | Validation focus |
| --- | --- | --- | --- | --- |
| Public portal | Home, profile desa, news, agenda, gallery, development, finance transparency, public map/FAQ | Public visitors | Public rendering and API reads; no admin session assumed. | Data minimization, slow/error states, responsive content, public API rate limits. |
| Authentication | Login, 2FA challenge/enrollment, logout callback | Admin/operator | Callback restricted to `/admin` descendants; backend owns credential validation. | Expired session, 2FA error/retry, focus/error announcements, issue #105 session model. |
| Admin overview | Dashboard, notifications, profile/topbar/sidebar | Authenticated operator | Middleware provides UX route marker; API still enforces auth/permissions. | Role/tenant display, stale claims, navigation focus, mobile menu. |
| Population | Residents, families, territory, civil events | Village/district/regency operators | Sidebar filters by current role/permission claims. | Empty/filter/pagination states, direct URL denial, tenant isolation response. |
| Service workflows | Letters, complaints, social assistance, assets, development, BUMDes | Authorized operators/public tracking visitors | Admin actions require API authorization; selected public flows are rate limited. | Long-running/PDF/upload states, error recovery, public tracking disclosure. |
| Finance/reporting | Budget, realizations, ledger, reports/export | Authorized finance/admin roles | API permission/domain controls are canonical. | Loading/export progress, failed download, unauthorized access, concurrent refresh. |
| Platform administration | Users, roles, permissions, settings, tenants, audit logs | System/admin roles | Navigation hides unauthorized items; service/API controls must deny direct access. | Role changes, direct URLs, audit log pagination/filtering, tenant hierarchy. |

## Shared UI State Expectations

| State | Source coverage now | Required browser validation |
| --- | --- | --- |
| Loading | Admin route segment has announced loading fallback. Individual screens may implement their own state. | Ensure route, query, and button loading states are not silent or focus-blocking. |
| Error | Admin route segment has retryable error boundary; forms commonly render `role="alert"`. | Verify API/network errors are actionable and do not expose sensitive detail. |
| Empty | Screen-specific; no system-wide empty-state contract asserted by this audit. | Review each high-value list and dashboard widget with real fixtures. |
| Unauthorized | Middleware is an UX gate and API is source of truth. | Validate direct URL/API denial and user-facing recovery to login/403 state. |
| Responsive navigation | Mobile sidebar is semantic dialog/overlay. | Keyboard escape/focus behavior, touch target, viewport/reflow testing. |
| Accessibility | Skip link, main landmark, nav/search/notification labels are enforced statically. | Screen reader, color contrast, reduced motion, browser compatibility testing. |

## Rule: Presentation Is Not Authorization

Frontend role-based filtering improves discoverability and reduces accidental actions. It must never be treated as a security boundary. Any route, form action, download, mutation, or export must remain guarded by backend authentication, permission, and tenant/domain enforcement. AUDIT-3 and AUDIT-4 own those server-side guarantees.

## Update Trigger

Update this inventory and `AUDIT-6-FRONTEND.md` when:

- a new public, admin, system, tenant, or citizen route is added;
- a route changes its user/permission/tenant posture;
- a shared loading/error/auth/navigation component changes;
- a public form, upload, export, or tracking flow changes; or
- a browser validation finding changes the source-level posture.
