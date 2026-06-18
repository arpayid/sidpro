import type { ReactNode } from 'react';
import { cn } from '@sidpro/ui';

const variants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20',
  primary: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20',
} as const;

export function StatusBadge({
  children,
  variant = 'default',
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function letterStatusVariant(status: string): keyof typeof variants {
  const map: Record<string, keyof typeof variants> = {
    submitted: 'info',
    verified: 'warning',
    approved: 'primary',
    completed: 'success',
    rejected: 'danger',
  };
  return map[status] ?? 'default';
}

export function complaintStatusVariant(status: string): keyof typeof variants {
  const map: Record<string, keyof typeof variants> = {
    submitted: 'info',
    verified: 'warning',
    in_progress: 'primary',
    resolved: 'success',
    closed: 'default',
  };
  return map[status] ?? 'default';
}

export function auditActionVariant(action: string): keyof typeof variants {
  const normalized = action.toLowerCase();
  const map: Record<string, keyof typeof variants> = {
    create: 'success',
    update: 'info',
    delete: 'danger',
    generate: 'primary',
    download: 'info',
    verify: 'warning',
    login: 'default',
    logout: 'default',
    export: 'primary',
    import: 'primary',
    upload: 'info',
    approve: 'success',
    reject: 'danger',
    upsert: 'warning',
  };
  return map[normalized] ?? 'default';
}
