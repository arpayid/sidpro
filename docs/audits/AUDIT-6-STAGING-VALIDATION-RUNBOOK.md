# AUDIT-6 — Persistent Staging Validation Runbook

**Marker:** `[[AI-CLI|AUDIT-6|VALIDATION_PENDING|VPS_REQUIRED]]`

## Purpose

This runbook executes issue #108 after a persistent non-production environment is available. It combines a safe GitHub Actions network probe with human browser and assistive-technology validation. Neither source tests nor the network probe alone closes AUDIT-6.

## Preconditions

- A staging web URL is reachable over HTTPS.
- The deployed web/API revision and commit SHA are recorded.
- Non-production role/tenant fixtures exist for superadmin, village admin, district/regency admin where applicable, and a user with no relevant permission.
- A test inbox/object-store fixture exists for non-destructive upload/export checks.
- No production credentials or resident data are used.

## Automated Network Probe

Run **AUDIT-6 Staging Probe** from GitHub Actions with:

- `staging_web_url`: persistent staging web base URL.
- `staging_api_url`: optional persistent API base URL.

The probe records public home, login, unauthenticated admin entry, response security headers, and optional API health in `audit-6-staging-probe/result.json` for 30 days. It does not authenticate, upload, submit forms, or record credentials/tokens.

A failed probe is actionable for reachability/header/HTML marker regressions. A passing probe is not a claim of responsive, role, or accessibility conformance.

## Human Browser Matrix

| Scenario | Required evidence |
| --- | --- |
| Keyboard navigation | Skip link reaches main content; visible focus order is sensible; mobile sidebar opens/closes without trapping focus. |
| Screen reader | Navigation/search/notification labels announced; loading/error status announced; route title/context understandable. |
| Viewports | At least 320px, 768px, and desktop width for public, login, and admin shell. Record browser zoom/reflow observations. |
| Auth/session | Login, 2FA, reload, browser restart, expired session, logout, direct `/admin` route, and safe callback return. |
| Role/tenant | Sidebar and direct routes for each role; stale permission refresh; tenant hierarchy switch/denial. |
| State handling | Loading, empty, error/retry, slow network, upload, public complaint tracking, report/export failure/success. |
| Browser storage | Confirm no access/refresh token in localStorage, sessionStorage, JavaScript-readable cookie, URL, DOM, or telemetry. Coordinate with AUDIT-4 issue #112. |

## Evidence Record Template

```text
Commit/deployment:
Staging web/API URL:
Browser and version:
Viewport/zoom:
Role and tenant fixture:
Scenario:
Expected result:
Actual result:
Automated probe artifact:
Sanitized screenshot/log reference:
Follow-up issue or residual risk:
Tester/date:
```

## Failure Handling

1. Create a scoped issue for a reproducible defect, with commit/deployment, role, viewport, browser, and sanitized evidence.
2. Do not hide a failed test by changing the probe expectation unless the accepted UI/security contract has changed and the relevant AUDIT-6 documents are updated in the same PR.
3. Re-run the affected automated probe and human scenario after remediation.

## Closure Gate

Issue #108 and AUDIT-6 may be closed only after the automated artifact and the human browser matrix are recorded against a persistent staging deployment, with no unowned in-scope failures.
