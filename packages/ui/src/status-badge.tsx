import * as React from 'react';
import { cn } from './utils';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'draft' | 'archived' | 'info';
  children: React.ReactNode;
}

const statusClasses: Record<NonNullable<StatusBadgeProps['status']>, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-green-50 text-green-700 ring-green-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  draft: 'bg-blue-50 text-blue-700 ring-blue-200',
  archived: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
  info: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
};

export function StatusBadge({ status = 'info', className, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1', statusClasses[status], className)} {...props}>
      {children}
    </span>
  );
}
