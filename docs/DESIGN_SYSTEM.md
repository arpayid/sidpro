# SIDPRO Design System

Enterprise civic SaaS design system — SIDPRO 2026.

## Visual Direction

- Clean enterprise SaaS
- Data-dense but readable
- Operator-first workflows
- White surfaces on soft slate background
- Emerald civic primary
- Minimal animation

## Design Tokens

| Token | Value |
|-------|-------|
| Background | `hsl(210 40% 98%)` — soft slate |
| Surface | `#ffffff` |
| Border | `slate-200/80` |
| Text primary | `slate-900` |
| Text secondary | `slate-500` |
| Primary | `emerald-600` |
| Success | `emerald-50/700` |
| Warning | `amber-50/800` |
| Danger | `red-50/700` |
| Info | `sky-50/700` |

## Typography

- Font: Inter (`--font-inter`)
- Page title: `text-xl font-semibold` (sm: `text-2xl`)
- Section: `text-sm font-semibold`
- Body: `text-sm text-slate-700`
- Muted: `text-xs text-slate-500`
- KPI values: `text-2xl font-semibold tabular-nums`

## Layout

### Admin Shell

- Collapsible sidebar (256px / 72px collapsed)
- Sticky topbar (56px)
- Content max-width fluid with `p-4 sm:p-5 lg:p-6`
- Breadcrumb via `PageHeader`

### Spacing

- Card padding: `p-5` or `p-6`
- Form field gap: `space-y-4`
- Section gap: `space-y-6`

## Components

Located in `apps/web/src/components/enterprise/`:

| Component | Purpose |
|-----------|---------|
| `PageHeader` | Title, breadcrumb, actions |
| `DataTable` | Enterprise table with pagination |
| `FilterBar` | Search + filter slot |
| `StatusBadge` | Status chips |
| `DetailDrawer` | Side panel detail/form |
| `ConfirmDialog` | Destructive confirmation |
| `FormSection` | Sectioned form layout |
| `EmptyState` / `ErrorState` | Feedback states |
| `LoadingSkeleton` | Loading placeholders |
| `ApprovalStepper` | Letter workflow |
| `Timeline` | Activity/history |
| `FileUpload` | Drag-drop upload |

## Data Table

- Search, pagination, row actions
- Loading skeleton rows
- Empty and error states
- Click row for detail (optional)

## Forms

- React Hook Form + Zod (`@sidpro/validators`)
- `form-label`, `form-error` utility classes
- Sticky footer in drawers for submit/cancel
- Confirm dialog for delete

## Sensitive Data

- NIK/KK masked by API unless `population.view_sensitive` / `families.view_sensitive`
- Never log sensitive values in client console

## Accessibility

- Focus rings on interactive elements (`ring-emerald-500`)
- `role="alert"` on form errors
- `aria-label` on icon-only buttons
