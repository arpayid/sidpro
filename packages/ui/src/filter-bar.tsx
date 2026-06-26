import * as React from 'react';
import { cn } from './utils';

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  summary?: React.ReactNode;
}

export function FilterBar({ search, filters, actions, summary, className, children, ...props }: FilterBarProps) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)} {...props}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {search ? <div className="min-w-0 flex-1">{search}</div> : null}
          {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
          {children}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {summary ? <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">{summary}</div> : null}
    </section>
  );
}
