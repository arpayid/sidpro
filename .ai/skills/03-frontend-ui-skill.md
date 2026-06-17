# SIDPRO Frontend UI Skill

Use this skill for Next.js, React, TailwindCSS, shadcn/ui, dashboard, portal publik, forms, tables, charts, layouts, and frontend UX work.

---

## Target Stack

- Next.js 15 App Router
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui
- Lucide React
- TanStack Table
- React Hook Form
- Zod
- TanStack Query
- Zustand
- Recharts or Tremor
- Leaflet or MapLibre

---

## UI Direction

SIDPRO UI must be:

- Modern SaaS dashboard.
- Clean enterprise.
- Mobile-first.
- Operator-friendly.
- Fast and accessible.
- Not like old generic templates.

---

## Required Admin Components

- Sidebar.
- Topbar.
- Breadcrumb.
- Global search.
- Notification center.
- User menu.
- Stat cards.
- Data tables.
- Advanced filters.
- Bulk actions.
- Export buttons.
- Drawer details.
- Modal forms.
- Empty states.
- Loading skeletons.
- Error states.
- Timeline activity.
- Approval stepper.

---

## Public Portal Components

- Hero section.
- Village profile summary.
- Service shortcuts.
- News cards.
- Agenda list.
- Public statistics.
- Transparency section.
- UMKM/potensi desa section.
- Complaint CTA.
- Footer with contact links.

---

## Frontend Rules

- Do not put heavy business logic inside UI components.
- Use feature folders for feature-specific code.
- Use shared components for reusable UI.
- Forms must use validation schema.
- Tables must support pagination, search, sort, and filter when relevant.
- Sensitive data such as NIK/KK must be masked unless permission allows full view.
- Loading, error, and empty states are required for data-heavy pages.
- Keep components typed.
- Avoid duplicated UI logic.
- Keep accessibility in mind.

---

## Recommended Route Structure

```txt
apps/web/src/app/
├── (public)/
├── (auth)/
└── (admin)/
```

---

## Validation

Run available commands:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

If these commands do not exist yet, document the limitation and propose adding them.
