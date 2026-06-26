import * as React from 'react';
import { cn } from './utils';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  metadata?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  metadata,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm shadow-slate-200/70 backdrop-blur md:flex-row md:items-start md:justify-between',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{eyebrow}</p> : null}
        <div className="space-y-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {metadata ? <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">{metadata}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
